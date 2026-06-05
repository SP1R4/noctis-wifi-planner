// Generates the desktop-app icons into electron/resources/:
//   icon.png  (1024²)  — Linux + electron-builder source
//   icon.icns          — macOS
//   icon.ico  (256²)   — Windows
//
// The 1024² master is drawn here with zero dependencies (a dark squircle with
// the NOCTIS WiFi mark). .icns/.ico are derived via macOS `sips`/`iconutil`,
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
const CX = 512;
const APEX_Y = 694;      // wifi dot centre
const DOT_R = 52;
const BANDS = [[150, 212], [290, 352], [430, 492]]; // [innerR, outerR]
const FAN = Math.cos((48 * Math.PI) / 180); // half-angle of the signal fan
const ACCENT = [51, 214, 194];
const BG_TOP = [18, 24, 38];
const BG_BOT = [10, 14, 22];

const lerp = (a, b, t) => a + (b - a) * t;

// Signed distance to the rounded square (<0 inside).
function sdRoundRect(px, py) {
  const hx = (W - 2 * M) / 2, hy = (W - 2 * M) / 2;
  const dx = Math.abs(px - W / 2) - (hx - RR);
  const dy = Math.abs(py - W / 2) - (hy - RR);
  const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  const inside = Math.min(Math.max(dx, dy), 0);
  return outside + inside - RR;
}

function colorAt(px, py) {
  if (sdRoundRect(px, py) >= 0) return [0, 0, 0, 0];
  const t = (py - M) / (W - 2 * M);
  const bg = [
    lerp(BG_TOP[0], BG_BOT[0], t),
    lerp(BG_TOP[1], BG_BOT[1], t),
    lerp(BG_TOP[2], BG_BOT[2], t),
  ];
  const dx = px - CX, dy = py - APEX_Y, rho = Math.hypot(dx, dy);
  let onMark = rho <= DOT_R;
  if (!onMark && dy < 0 && -dy >= FAN * rho) {
    for (const [inR, outR] of BANDS) {
      if (rho >= inR && rho <= outR) { onMark = true; break; }
    }
  }
  return onMark ? [...ACCENT, 255] : [bg[0], bg[1], bg[2], 255];
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
