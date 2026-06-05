// Pure network-planning helpers — switch PoE/port load, cable-run length, and
// IP-subnet math. Extracted from app.js so this logic is unit-testable without
// a DOM. Everything here takes plain values/arrays; no app globals.

import { POE_CLASS_RANK } from './constants.js';

// ── Cable runs ────────────────────────────────────────────────────────────
// Real-world length (m) of a device→switch run. fx/fy are fractional image
// coordinates; w/h the image pixel size; scaleM metres per 100 px; factor the
// routing multiplier (1 = straight line).
export function runLengthM(fx1, fy1, fx2, fy2, w, h, scaleM, factor = 1) {
  const dx = (fx1 - fx2) * w, dy = (fy1 - fy2) * h;
  return Math.hypot(dx, dy) * ((scaleM || 100) / 100) * (factor > 0 ? factor : 1);
}

// ── Switch load ───────────────────────────────────────────────────────────
// Given the devices on a switch (each {w: watts, cls: 'af'|'at'|'bt'|null})
// and the switch's limits, return the PoE/port/class verdict.
//   budget : PoE budget in W (0 ⇒ no budget check)
//   ports  : usable port count (null ⇒ unknown, skip the check)
//   swCls  : PoE class the switch delivers ('af'|'at'|'bt'|null)
export function analyzeLoad(clients, { budget = 0, ports = null, swCls = null } = {}) {
  const draw = clients.reduce((n, c) => n + (c.w || 0), 0);
  const used = clients.length;
  const overBudget = budget > 0 && draw > budget;
  const overPorts = ports != null && used > ports;
  const headroom = budget > 0 ? Math.round((1 - draw / budget) * 100) : null;
  const classFails = clients.filter(
    (c) => c.cls && (!swCls || POE_CLASS_RANK[c.cls] > POE_CLASS_RANK[swCls])
  );
  return { draw, used, overBudget, overPorts, headroom, classFails };
}

// ── IP subnets ────────────────────────────────────────────────────────────
export function ipToInt(ip) {
  const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(String(ip || '').trim());
  if (!m) return null;
  const o = m.slice(1).map(Number);
  if (o.some((n) => n < 0 || n > 255)) return null;
  return ((o[0] << 24) | (o[1] << 16) | (o[2] << 8) | o[3]) >>> 0;
}
export function intToIp(n) {
  n >>>= 0;
  return `${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`;
}

// Next free host in a CIDR (e.g. "10.0.10.0/24"), skipping network (.0) and
// gateway (.1) and any address already in `used`. Returns '' if no subnet, a
// /1.. /30 only, or the (capped) range is full. The scan is capped so a huge
// subnet (e.g. /8) can't lock up a caller.
/**
 * @param {string} cidr
 * @param {Array<string>|Set<string>} [used]
 * @param {number} [maxScan]
 * @returns {string}
 */
export function nextFreeIp(cidr, used = [], maxScan = 4094) {
  const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)\/(\d+)$/.exec(String(cidr || '').trim());
  if (!m) return '';
  const base = ipToInt(`${m[1]}.${m[2]}.${m[3]}.${m[4]}`);
  if (base == null) return '';
  const bits = parseInt(m[5], 10);
  if (bits < 1 || bits > 30) return '';
  const size = 2 ** (32 - bits);
  const net = base & (~(size - 1) >>> 0);
  const taken = used instanceof Set ? used : new Set((used || []).map((x) => String(x).trim()));
  const end = Math.min(size - 1, 2 + maxScan);
  for (let i = 2; i < end; i++) {
    const ip = intToIp((net + i) >>> 0);
    if (!taken.has(ip)) return ip;
  }
  return '';
}

// Boxes of cable needed for a total length, given metres per box.
export function cableBoxCount(totalM, boxM = 305) {
  if (!(totalM > 0)) return 0;
  return Math.ceil(totalM / (boxM > 0 ? boxM : 305));
}
