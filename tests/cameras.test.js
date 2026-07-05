import { describe, it, expect } from 'vitest';
import {
  CAM_RES_HPX, DORI_LEVELS, ppmAt, doriDistancesM,
  cameraBitrateMbps, storageGb,
} from '../files/src/cameras.js';

describe('DORI', () => {
  it('ppm falls off linearly with distance', () => {
    const a = ppmAt(1920, 90, 5);
    const b = ppmAt(1920, 90, 10);
    expect(a / b).toBeCloseTo(2, 5);
  });
  it('distances follow the lens equation (1080p @ 90° checks out)', () => {
    // ppm·d = hpx / (2·tan(45°)) = 1920/2 = 960 → Identify (250 ppm) at 3.84 m.
    const d = doriDistancesM('1080p', 90);
    const identify = d.find((x) => x.key === 'identify');
    expect(identify.m).toBeCloseTo(960 / 250, 2);
    // Tiers are ordered nearest → farthest.
    for (let i = 1; i < d.length; i++) expect(d[i].m).toBeGreaterThan(d[i - 1].m);
  });
  it('higher resolution sees farther; wider FoV sees shorter', () => {
    const d1080 = doriDistancesM('1080p', 90)[0].m;
    const d4k = doriDistancesM('4K', 90)[0].m;
    expect(d4k).toBeGreaterThan(d1080);
    const narrow = doriDistancesM('4K', 60)[0].m;
    expect(narrow).toBeGreaterThan(d4k);
  });
  it('clamps fisheye FoV instead of blowing up', () => {
    const d = doriDistancesM('5MP', 360);
    expect(d.every((x) => Number.isFinite(x.m) && x.m > 0)).toBe(true);
  });
  it('has all four IEC 62676-4 tiers with canonical thresholds', () => {
    expect(DORI_LEVELS.map((l) => l.ppm)).toEqual([250, 125, 63, 25]);
  });
});

describe('storage calculator', () => {
  it('uses the resolution table with codec scaling', () => {
    expect(cameraBitrateMbps('4K', 'h264')).toBe(8);
    expect(cameraBitrateMbps('4K', 'h265')).toBeCloseTo(4.8, 2);
    expect(cameraBitrateMbps('1080p', 'h265')).toBeCloseTo(1.2, 2);
  });
  it('per-camera override wins', () => {
    expect(cameraBitrateMbps('4K', 'h265', 12)).toBe(12);
    expect(cameraBitrateMbps('4K', 'h265', 0)).toBeCloseTo(4.8, 2);
  });
  it('storageGb: 8 Mbps for 30 days ≈ 2.6 TB', () => {
    const gb = storageGb(8, 30);
    expect(gb).toBeCloseTo(2592, 0);   // (8/8)·86400·30/1000
  });
  it('unknown resolution falls back sanely', () => {
    expect(cameraBitrateMbps('9000MP', 'h264')).toBe(4);
    expect(CAM_RES_HPX['4K']).toBe(3840);
  });
});
