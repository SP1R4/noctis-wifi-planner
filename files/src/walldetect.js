// Automatic wall detection from a floor-plan bitmap. Classical CV, zero
// dependencies: grayscale → Otsu binarization → Hough line transform → walk
// each detected line to extract contiguous dark segments. Pure array-in /
// array-out so it's unit-testable without a DOM; the caller rasterizes the
// plan into an ImageData-shaped {data,width,height} (downscaled — ~900 px on
// the long edge is plenty and keeps the Hough accumulator cheap).

// Otsu's method on a 256-bin histogram. Returns the threshold that maximizes
// between-class variance — the classic "ink vs paper" split for scanned plans.
/**
 * @param {Uint32Array|number[]} hist  256-bin histogram
 * @param {number} total  total pixel count
 * @returns {number} threshold in [0,255]
 */
export function otsuThreshold(hist, total) {
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, best = 0, bestT = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) { best = between; bestT = t; }
  }
  return bestT;
}

// Binarize RGBA image data into a Uint8Array mask (1 = "ink"/wall candidate).
// Plans are usually dark ink on light paper; when the dark side dominates
// (dark-theme exports, blueprints) the mask is inverted so "ink" stays sparse.
/**
 * @param {{data:Uint8ClampedArray|number[],width:number,height:number}} img
 * @returns {Uint8Array}
 */
export function binarize(img) {
  const { data, width, height } = img;
  const n = width * height;
  const gray = new Uint8Array(n);
  const hist = new Uint32Array(256);
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    // Luma approximation; alpha-weighted so transparent pixels read as paper.
    const a = data[o + 3] / 255;
    const g = Math.round((0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2]) * a + 255 * (1 - a));
    gray[i] = g;
    hist[g]++;
  }
  const t = otsuThreshold(hist, n);
  const mask = new Uint8Array(n);
  let dark = 0;
  for (let i = 0; i < n; i++) if (gray[i] <= t) { mask[i] = 1; dark++; }
  if (dark > n / 2) for (let i = 0; i < n; i++) mask[i] ^= 1;  // inverted plan
  return mask;
}

/**
 * Detect straight wall segments in a floor-plan bitmap.
 * @param {{data:Uint8ClampedArray|number[],width:number,height:number}} img
 * @param {{maxLines?:number,minLenPx?:number,gapPx?:number,minVotes?:number}=} opts
 * @returns {Array<{x1:number,y1:number,x2:number,y2:number}>} segments in px
 *   coords of the analyzed image (caller maps to fractional coords).
 */
export function detectWalls(img, opts = {}) {
  const { width: w, height: h } = img;
  if (!w || !h) return [];
  const mask = binarize(img);

  const maxLines = opts.maxLines ?? 48;
  const minLen = opts.minLenPx ?? Math.max(18, Math.round(Math.min(w, h) * 0.06));
  const gapPx = opts.gapPx ?? 4;

  // ── Hough accumulator ──
  // theta ∈ [0,180) at 1° steps; rho ∈ [-D, D] at 2 px steps.
  const THETAS = 180, RHO_STEP = 2;
  const diag = Math.ceil(Math.hypot(w, h));
  const rhoBins = Math.ceil((2 * diag) / RHO_STEP) + 1;
  const acc = new Uint32Array(THETAS * rhoBins);
  const sinT = new Float64Array(THETAS), cosT = new Float64Array(THETAS);
  for (let t = 0; t < THETAS; t++) {
    const rad = (t * Math.PI) / 180;
    sinT[t] = Math.sin(rad); cosT[t] = Math.cos(rad);
  }
  // Vote. On big/busy plans, stride the mask so the accumulator stays cheap
  // without biasing any direction.
  let inkCount = 0;
  for (let i = 0; i < mask.length; i++) inkCount += mask[i];
  const stride = inkCount > 90000 ? Math.ceil(inkCount / 90000) : 1;
  let seen = 0;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      if (!mask[row + x]) continue;
      if (stride > 1 && (seen++ % stride) !== 0) continue;
      for (let t = 0; t < THETAS; t++) {
        const rho = x * cosT[t] + y * sinT[t];
        const rb = Math.round((rho + diag) / RHO_STEP);
        acc[t * rhoBins + rb]++;
      }
    }
  }

  const minVotes = opts.minVotes ?? Math.max(20, Math.round(minLen * 0.6 / stride));
  const segments = [];

  // Iteratively pull the strongest line, harvest its segments, suppress its
  // accumulator neighbourhood, repeat.
  for (let iter = 0; iter < maxLines; iter++) {
    let best = 0, bestIdx = -1;
    for (let i = 0; i < acc.length; i++) if (acc[i] > best) { best = acc[i]; bestIdx = i; }
    if (best < minVotes || bestIdx < 0) break;
    const tIdx = Math.floor(bestIdx / rhoBins);
    const rIdx = bestIdx % rhoBins;
    const rho = rIdx * RHO_STEP - diag;
    // Suppress a window around the peak so near-duplicates don't re-emerge.
    for (let dt = -2; dt <= 2; dt++) {
      const tt = (tIdx + dt + THETAS) % THETAS;
      for (let dr = -3; dr <= 3; dr++) {
        const rr = rIdx + dr;
        if (rr >= 0 && rr < rhoBins) acc[tt * rhoBins + rr] = 0;
      }
    }
    // Walk the line p(s) = p0 + s·dir, dir ⟂ normal(θ).
    const ct = cosT[tIdx], st = sinT[tIdx];
    const p0x = rho * ct, p0y = rho * st;
    const dx = -st, dy = ct;
    // Clip the parametric range to the image rectangle.
    let sMin = -diag, sMax = diag;
    const clip = (p, d, lo, hi) => {
      if (Math.abs(d) < 1e-9) return p >= lo && p <= hi ? [-Infinity, Infinity] : null;
      let a = (lo - p) / d, b = (hi - p) / d;
      if (a > b) [a, b] = [b, a];
      return [a, b];
    };
    const cx = clip(p0x, dx, 0, w - 1), cy = clip(p0y, dy, 0, h - 1);
    if (!cx || !cy) continue;
    sMin = Math.max(sMin, cx[0], cy[0]);
    sMax = Math.min(sMax, cx[1], cy[1]);
    if (sMax - sMin < minLen) continue;
    // Hit test with a ±1.5 px perpendicular tolerance (walls are thick).
    const hit = (x, y) => {
      const xi = Math.round(x), yi = Math.round(y);
      if (xi < 0 || yi < 0 || xi >= w || yi >= h) return false;
      if (mask[yi * w + xi]) return true;
      const nx = Math.round(x + ct), ny = Math.round(y + st);
      if (nx >= 0 && ny >= 0 && nx < w && ny < h && mask[ny * w + nx]) return true;
      const mx = Math.round(x - ct), my = Math.round(y - st);
      return mx >= 0 && my >= 0 && mx < w && my < h && !!mask[my * w + mx];
    };
    let runStart = null, lastHit = null;
    const flush = () => {
      if (runStart === null || lastHit === null) return;
      if (lastHit - runStart >= minLen) {
        segments.push({
          x1: p0x + runStart * dx, y1: p0y + runStart * dy,
          x2: p0x + lastHit * dx, y2: p0y + lastHit * dy,
        });
      }
      runStart = null; lastHit = null;
    };
    for (let s = sMin; s <= sMax; s += 1) {
      if (hit(p0x + s * dx, p0y + s * dy)) {
        if (runStart === null) runStart = s;
        lastHit = s;
      } else if (lastHit !== null && s - lastHit > gapPx) {
        flush();
      }
    }
    flush();
  }

  // Drop near-duplicate segments (both endpoints within a few px of an
  // already-kept segment, either orientation).
  const kept = [];
  const close = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by) < 6;
  for (const s of segments) {
    const dup = kept.some(k =>
      (close(s.x1, s.y1, k.x1, k.y1) && close(s.x2, s.y2, k.x2, k.y2)) ||
      (close(s.x1, s.y1, k.x2, k.y2) && close(s.x2, s.y2, k.x1, k.y1)));
    if (!dup) kept.push(s);
  }
  return kept.slice(0, 300);
}
