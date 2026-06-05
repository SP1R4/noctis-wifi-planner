// Generates the desktop-app icons into electron/resources/:
//   icon.png  (1024²)  — Linux + electron-builder source
//   icon.icns          — macOS
//   icon.ico  (256²)   — Windows
//
// The 1024² master is drawn here with zero dependencies (a warm-black squircle
// with the cream Plexus node-mesh mark). .icns/.ico are derived via `sips`/`iconutil`,
// so run this once on a Mac and commit the results — CI just consumes them.
//
//   node scripts/make-icons.mjs

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'electron', 'resources');
mkdirSync(OUT, { recursive: true });

const W = 1024;
const M = 84;            // outer margin
const RR = 190;          // corner radius
// Plexus palette: a warm-black tile with a cream node-mesh mark — a network of
// interconnected nodes — matching the app's dark-theme chrome
// (--bg #14140e, --ink #efece5).
const MARK = [239, 236, 229];   // cream #efece5
const BG_TOP = [30, 30, 24];    // warm near-black, subtle top→bottom gradient
const BG_BOT = [12, 12, 9];
// Node-mesh geometry (in the 1024² master): a centre node fully connected to a
// triangle of three outer nodes — a small "plexus".
const NODES = [
  [512, 512],   // centre
  [512, 300],   // top
  [336, 660],   // bottom-left
  [688, 660],   // bottom-right
];
const EDGES = [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];  // full mesh
const NODE_R = 60;              // node disc radius
const EDGE_HALF = 17;           // half the connecting-line width
// Subtle cream hairline frame, echoing the app's 1px panel borders.
const FRAME_M = 150, FRAME_RR = 120, FRAME_W = 4, FRAME_ALPHA = 28;

const lerp = (a, b, t) => a + (b - a) * t;

// Signed distance to a rounded square centred in the canvas (<0 inside).
function sdRoundRect(px, py, margin, rr) {
  const hx = (W - 2 * margin) / 2, hy = (W - 2 * margin) / 2;
  const dx = Math.abs(px - W / 2) - (hx - rr);
  const dy = Math.abs(py - W / 2) - (hy - rr);
  const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  const inside = Math.min(Math.max(dx, dy), 0);
  return outside + inside - rr;
}

// Distance from a point to a line segment (for the mesh edges).
function distToSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// Is the point on the node-mesh (a disc at any node, or on any connecting edge)?
function onMesh(px, py) {
  for (const [x, y] of NODES) if (Math.hypot(px - x, py - y) <= NODE_R) return true;
  for (const [a, b] of EDGES) {
    if (distToSeg(px, py, NODES[a][0], NODES[a][1], NODES[b][0], NODES[b][1]) <= EDGE_HALF) return true;
  }
  return false;
}

function colorAt(px, py) {
  if (sdRoundRect(px, py, M, RR) >= 0) return [0, 0, 0, 0];
  if (onMesh(px, py)) return [MARK[0], MARK[1], MARK[2], 255];
  const t = (py - M) / (W - 2 * M);
  const bg = [
    Math.round(lerp(BG_TOP[0], BG_BOT[0], t)),
    Math.round(lerp(BG_TOP[1], BG_BOT[1], t)),
    Math.round(lerp(BG_TOP[2], BG_BOT[2], t)),
  ];
  // Composite the faint hairline frame over the background.
  if (Math.abs(sdRoundRect(px, py, FRAME_M, FRAME_RR)) <= FRAME_W / 2) {
    const a = FRAME_ALPHA / 255;
    return [
      Math.round(bg[0] + (MARK[0] - bg[0]) * a),
      Math.round(bg[1] + (MARK[1] - bg[1]) * a),
      Math.round(bg[2] + (MARK[2] - bg[2]) * a),
      255,
    ];
  }
  return [bg[0], bg[1], bg[2], 255];
}

// Render with 3×3 supersampling for clean edges.
function render(size) {
  const buf = Buffer.alloc(size * size * 4);
  const SS = 3, scale = W / size;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = (x + (sx + 0.5) / SS) * scale;
          const py = (y + (sy + 0.5) / SS) * scale;
          const c = colorAt(px, py);
          r += c[0] * c[3]; g += c[1] * c[3]; b += c[2] * c[3]; a += c[3];
        }
      }
      const n = SS * SS, o = (y * size + x) * 4;
      // Premultiplied average → straight RGBA.
      buf[o]     = a ? Math.round(r / a) : 0;
      buf[o + 1] = a ? Math.round(g / a) : 0;
      buf[o + 2] = a ? Math.round(b / a) : 0;
      buf[o + 3] = Math.round(a / n);
    }
  }
  return buf;
}

// ── Minimal PNG encoder ──────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit, RGBA
  // Filter byte 0 (none) per scanline.
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Emit master PNG ──────────────────────────────────────────────────
const masterPng = encodePng(W, render(W));
const masterPath = join(OUT, 'icon.png');
writeFileSync(masterPath, masterPng);
console.log(`✓ icon.png (${W}²)`);

// ── .icns via sips + iconutil ────────────────────────────────────────
const iconset = join(OUT, 'icon.iconset');
rmSync(iconset, { recursive: true, force: true });
mkdirSync(iconset, { recursive: true });
const sizes = [16, 32, 128, 256, 512];
for (const s of sizes) {
  for (const [px, name] of [[s, `icon_${s}x${s}.png`], [s * 2, `icon_${s}x${s}@2x.png`]]) {
    spawnSync('sips', ['-z', String(px), String(px), masterPath, '--out', join(iconset, name)], { stdio: 'ignore' });
  }
}
const icns = spawnSync('iconutil', ['-c', 'icns', iconset, '-o', join(OUT, 'icon.icns')], { stdio: 'inherit' });
rmSync(iconset, { recursive: true, force: true });
console.log(icns.status === 0 ? '✓ icon.icns' : '✗ icon.icns (iconutil failed — macOS only)');

// ── .ico (PNG-in-ICO, 256²) ──────────────────────────────────────────
const png256 = encodePng(256, render(256));
const dir = Buffer.alloc(6);
dir.writeUInt16LE(0, 0); dir.writeUInt16LE(1, 2); dir.writeUInt16LE(1, 4);
const entry = Buffer.alloc(16);
entry[0] = 0; entry[1] = 0;            // 0 ⇒ 256
entry.writeUInt16LE(1, 4);             // planes
entry.writeUInt16LE(32, 6);            // bit depth
entry.writeUInt32LE(png256.length, 8); // size
entry.writeUInt32LE(22, 12);           // offset (6 + 16)
writeFileSync(join(OUT, 'icon.ico'), Buffer.concat([dir, entry, png256]));
console.log('✓ icon.ico (256²)');
