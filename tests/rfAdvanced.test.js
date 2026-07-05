import { describe, it, expect } from 'vitest';
import {
  CHANNEL_WIDTHS, noiseFloorForWidth, widthThroughputMult,
  bandKey, channelCenterMhz, channelRangeMhz, channelsOverlapMhz,
  sinrFromContributions, sinrWithWidthNoise,
  snrAt, mbpsAt,
} from '../files/src/geometry.js';
import { bestMetricAt, computeHeatGrid } from '../files/src/heatmap.js';
import { airtimeUtilization } from '../files/src/network.js';

describe('channel width', () => {
  it('noise floor rises 3 dB per doubling from the 20 MHz baseline', () => {
    expect(noiseFloorForWidth(-95, 20)).toBe(-95);
    expect(noiseFloorForWidth(-95, 40)).toBeCloseTo(-92, 1);
    expect(noiseFloorForWidth(-95, 160)).toBeCloseTo(-86, 1);
    expect(noiseFloorForWidth(-95, 999)).toBe(-95);   // unknown width → baseline
  });
  it('throughput multiplier follows tone counts and is monotonic', () => {
    expect(widthThroughputMult(20)).toBe(1);
    let prev = 0;
    for (const w of CHANNEL_WIDTHS) {
      const m = widthThroughputMult(w);
      expect(m).toBeGreaterThan(prev);
      prev = m;
    }
    expect(widthThroughputMult(320)).toBeCloseTo(3920 / 242, 3);
  });
  it('wider channel raises throughput but lowers SNR for the same AP', () => {
    const ap = { fx: 0.5, fy: 0.5, r: 200, freq: '5 GHz only' };
    const base = { noiseFloorDbm: -95 };
    const s20 = snrAt(ap, 520, 500, 1000, 1000, [], { ...base, chanWidthMhz: 20 });
    const s160 = snrAt(ap, 520, 500, 1000, 1000, [], { ...base, chanWidthMhz: 160 });
    expect(s160).toBeCloseTo(s20 - 9, 1);
    const m20 = mbpsAt(ap, 520, 500, 1000, 1000, [], { ...base, chanWidthMhz: 20 });
    const m160 = mbpsAt(ap, 520, 500, 1000, 1000, [], { ...base, chanWidthMhz: 160 });
    expect(m160).toBeGreaterThan(m20);
  });
});

describe('channel geometry', () => {
  it('maps channels to centre frequencies', () => {
    expect(channelCenterMhz('2.4', 6)).toBe(2437);
    expect(channelCenterMhz('2.4', 14)).toBe(2484);
    expect(channelCenterMhz('5', 36)).toBe(5180);
    expect(channelCenterMhz('6', 1)).toBe(5955);
  });
  it('detects 2.4 GHz adjacent-channel overlap and clean separation', () => {
    expect(channelsOverlapMhz('2.4', 1, 20, '2.4', 3, 20)).toBe(true);
    expect(channelsOverlapMhz('2.4', 1, 20, '2.4', 6, 20)).toBe(false);
  });
  it('handles 5 GHz widths: 36 and 40 clash at 40 MHz, not at 20', () => {
    expect(channelsOverlapMhz('5', 36, 20, '5', 40, 20)).toBe(false);
    expect(channelsOverlapMhz('5', 36, 40, '5', 40, 40)).toBe(true);
  });
  it('different bands never overlap; auto/unknown never overlaps', () => {
    expect(channelsOverlapMhz('2.4', 1, 20, '5', 36, 20)).toBe(false);
    expect(channelsOverlapMhz('5', null, 20, '5', 36, 20)).toBe(false);
  });
  it('bandKey mirrors the app band mapping', () => {
    expect(bandKey('2.4 GHz only')).toBe('2.4');
    expect(bandKey('2.4 / 5 GHz')).toBe('5');
    expect(bandKey('6 GHz (WiFi 6E)')).toBe('6');
  });
  it('320 MHz is only honoured on 6 GHz-style ranges (2.4 clamps to 20)', () => {
    const r = channelRangeMhz('2.4', 6, 320);
    expect(r.hi - r.lo).toBe(20);
  });
});

describe('SINR', () => {
  it('equals SNR when there is no interferer', () => {
    const c = [{ dbm: -60, band: '5', channel: 36, widthMhz: 20 }];
    expect(sinrFromContributions(c, -95)).toBeCloseTo(35, 5);
  });
  it('co-channel interferer of equal power caps SINR near 0 dB', () => {
    const c = [
      { dbm: -60, band: '5', channel: 36, widthMhz: 20 },
      { dbm: -60, band: '5', channel: 36, widthMhz: 20 },
    ];
    const sinr = sinrFromContributions(c, -95);
    expect(sinr).toBeGreaterThan(-1);
    expect(sinr).toBeLessThan(1);
  });
  it('ignores interferers on non-overlapping channels', () => {
    const c = [
      { dbm: -60, band: '5', channel: 36, widthMhz: 20 },
      { dbm: -60, band: '5', channel: 149, widthMhz: 20 },
    ];
    expect(sinrFromContributions(c, -95)).toBeCloseTo(35, 5);
  });
  it('width-adjusted variant charges the server its own noise bandwidth', () => {
    const c = [{ dbm: -60, band: '5', channel: 36, widthMhz: 80 }];
    expect(sinrWithWidthNoise(c, -95)).toBeCloseTo(35 - 6, 1);
  });
  it('returns null with no contributions', () => {
    expect(sinrFromContributions([], -95)).toBeNull();
    expect(sinrWithWidthNoise([], -95)).toBeNull();
  });
});

describe('heatmap grid', () => {
  const mkJob = (metric, aps, extra = {}) => ({
    w: 400, h: 400, step: 40, metric,
    aps, neighbour: [], walls: [],
    propModel: 'logd', slabDb: 18, noiseFloorDbm: -95,
    metersPerPx: 0.1,
    stops: [{ v: 0 }, { v: -75 }, { v: -1000 }],
    ...extra,
  });
  const ap = {
    fx: 0.5, fy: 0.5, r: 150, freq: '5 GHz only', band: '5',
    channel: 36, widthMhz: 20, arcDeg: 180, headingDeg: 0,
    eirpDbm: 23, bandFactor: 1,
  };
  it('paints cells inside the AP radius and leaves the rest empty', () => {
    const { grid, cols, rows } = computeHeatGrid(mkJob('dbm', [ap]));
    expect(cols).toBe(10);
    expect(rows).toBe(10);
    const centre = grid[5 * cols + 5];
    expect(centre).toBeGreaterThanOrEqual(0);
    expect(grid[0]).toBe(-1);          // far corner is out of range
  });
  it('sinr metric drops where a co-channel neighbour overlaps', () => {
    const ap2 = { ...ap, fx: 0.6 };
    const job = mkJob('sinr', [ap, ap2]);
    const clean = bestMetricAt('sinr', 200, 200, mkJob('sinr', [ap]));
    const contested = bestMetricAt('sinr', 200, 200, job);
    expect(contested).toBeLessThan(clean);
  });
});

describe('airtime', () => {
  it('is demand over supply', () => {
    expect(airtimeUtilization(20, 5, 200)).toBeCloseTo(0.5, 5);
  });
  it('is 0 with no clients and Infinity with no cell throughput', () => {
    expect(airtimeUtilization(0, 5, 100)).toBe(0);
    expect(airtimeUtilization(10, 5, 0)).toBe(Infinity);
  });
});
