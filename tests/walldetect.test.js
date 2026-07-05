import { describe, it, expect } from 'vitest';
import { detectWalls, binarize, otsuThreshold } from '../files/src/walldetect.js';

// Build an RGBA image: white paper, then paint callbacks draw black ink.
function makeImage(w, h, paint) {
  const data = new Uint8ClampedArray(w * h * 4).fill(255);
  const ink = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const o = (y * w + x) * 4;
    data[o] = data[o + 1] = data[o + 2] = 0; data[o + 3] = 255;
  };
  paint(ink);
  return { data, width: w, height: h };
}

const hline = (ink, y, x1, x2, thick = 3) => {
  for (let x = x1; x <= x2; x++) for (let t = 0; t < thick; t++) ink(x, y + t);
};
const vline = (ink, x, y1, y2, thick = 3) => {
  for (let y = y1; y <= y2; y++) for (let t = 0; t < thick; t++) ink(x + t, y);
};

describe('otsuThreshold', () => {
  it('splits a clean bimodal histogram', () => {
    const hist = new Uint32Array(256);
    hist[10] = 500; hist[240] = 500;
    const t = otsuThreshold(hist, 1000);
    expect(t).toBeGreaterThanOrEqual(10);
    expect(t).toBeLessThan(240);
  });
});

describe('binarize', () => {
  it('marks dark ink on light paper', () => {
    const img = makeImage(50, 50, (ink) => hline(ink, 25, 5, 45));
    const mask = binarize(img);
    expect(mask[25 * 50 + 20]).toBe(1);
    expect(mask[5 * 50 + 20]).toBe(0);
  });
  it('inverts dark-background plans so ink stays sparse', () => {
    // Black background, one white line: "ink" should be the line.
    const w = 50, h = 50;
    const data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) data[i * 4 + 3] = 255; // opaque black
    for (let x = 5; x <= 45; x++) {
      const o = (25 * w + x) * 4;
      data[o] = data[o + 1] = data[o + 2] = 255;
    }
    const mask = binarize({ data, width: w, height: h });
    expect(mask[25 * w + 20]).toBe(1);
    expect(mask[5 * w + 20]).toBe(0);
  });
});

describe('detectWalls', () => {
  it('finds a horizontal wall', () => {
    const img = makeImage(200, 200, (ink) => hline(ink, 100, 20, 180));
    const segs = detectWalls(img);
    expect(segs.length).toBeGreaterThanOrEqual(1);
    const s = segs[0];
    const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
    expect(len).toBeGreaterThan(130);
    // Horizontal-ish and near y=100.
    expect(Math.abs(s.y2 - s.y1)).toBeLessThan(8);
    expect(Math.abs((s.y1 + s.y2) / 2 - 101)).toBeLessThan(6);
  });

  it('finds a room outline (2 horizontal + 2 vertical)', () => {
    const img = makeImage(240, 240, (ink) => {
      hline(ink, 30, 30, 210); hline(ink, 200, 30, 210);
      vline(ink, 30, 30, 200); vline(ink, 210, 30, 200);
    });
    const segs = detectWalls(img);
    expect(segs.length).toBeGreaterThanOrEqual(4);
    const horiz = segs.filter(s => Math.abs(s.y2 - s.y1) < 10 && Math.hypot(s.x2 - s.x1, s.y2 - s.y1) > 120);
    const vert = segs.filter(s => Math.abs(s.x2 - s.x1) < 10 && Math.hypot(s.x2 - s.x1, s.y2 - s.y1) > 120);
    expect(horiz.length).toBeGreaterThanOrEqual(2);
    expect(vert.length).toBeGreaterThanOrEqual(2);
  });

  it('ignores a blank image', () => {
    const img = makeImage(120, 120, () => {});
    expect(detectWalls(img)).toEqual([]);
  });

  it('does not bridge a doorway gap wider than gapPx', () => {
    const img = makeImage(200, 200, (ink) => {
      hline(ink, 100, 10, 80);   // wall — door — wall
      hline(ink, 100, 120, 190);
    });
    const segs = detectWalls(img);
    // Expect two separate segments rather than one spanning the gap.
    const spanning = segs.filter(s => Math.min(s.x1, s.x2) < 90 && Math.max(s.x1, s.x2) > 110);
    expect(spanning.length).toBe(0);
    expect(segs.length).toBeGreaterThanOrEqual(2);
  });
});
