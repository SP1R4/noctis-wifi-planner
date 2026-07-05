import { describe, it, expect } from 'vitest';
import { zipStore, zipRead } from '../files/src/zip.js';
import { importEsx, buildEsx, buildEsxZip, materialForWallType } from '../files/src/esx.js';

describe('zipRead', () => {
  it('round-trips zipStore output (STORE entries)', async () => {
    const bytes = zipStore([
      { name: 'a.txt', data: 'hello' },
      { name: 'dir/b.json', data: '{"x":1}' },
    ], new Date(2026, 0, 2, 3, 4, 6));
    const entries = await zipRead(bytes);
    expect(entries.map((e) => e.name)).toEqual(['a.txt', 'dir/b.json']);
    expect(new TextDecoder().decode(entries[0].data)).toBe('hello');
    expect(JSON.parse(new TextDecoder().decode(entries[1].data))).toEqual({ x: 1 });
  });
  it('rejects non-zip bytes', async () => {
    await expect(zipRead(new Uint8Array([1, 2, 3, 4]))).rejects.toThrow(/zip/i);
  });
});

describe('materialForWallType', () => {
  it('maps by name keyword', () => {
    expect(materialForWallType({ name: 'Concrete Wall' })).toBe('concrete');
    expect(materialForWallType({ name: 'Glass Window' })).toBe('glass');
    expect(materialForWallType({ name: 'Wooden Door' })).toBe('wood');
  });
  it('falls back to attenuation, then drywall', () => {
    expect(materialForWallType({ name: 'Mystery', propagationProperties: [{ attenuationFactor: 14 }] })).toBe('concrete');
    expect(materialForWallType({ name: 'Mystery', propagationProperties: [{ attenuationFactor: 2 }] })).toBe('drywall');
    expect(materialForWallType(null)).toBe('drywall');
  });
});

describe('esx round-trip', () => {
  const floor = {
    name: 'Ground', imgW: 1000, imgH: 800, scaleM: 50,
    imageBytes: null,
    walls: [
      { fx1: 0.1, fy1: 0.1, fx2: 0.9, fy2: 0.1, material: 'concrete' },
      { fx1: 0.1, fy1: 0.1, fx2: 0.1, fy2: 0.9, material: 'glass' },
    ],
    aps: [
      { name: 'AP-01', fx: 0.5, fy: 0.5, model: 'U6 Pro', channel: '36', txPowerDbm: 17 },
    ],
  };

  it('buildEsx emits the expected document set', () => {
    const files = buildEsx([floor], { projectName: 'Test' });
    const names = files.map((f) => f.name);
    for (const n of ['project.json', 'floorPlans.json', 'wallTypes.json', 'wallPoints.json', 'wallSegments.json', 'accessPoints.json']) {
      expect(names).toContain(n);
    }
    const fp = JSON.parse(String(files.find((f) => f.name === 'floorPlans.json').data)).floorPlans[0];
    expect(fp.metersPerUnit).toBeCloseTo(0.5, 6);   // scaleM 50 → 0.5 m/px
  });

  it('importEsx reads back what buildEsxZip wrote', async () => {
    const bytes = buildEsxZip([floor], { projectName: 'Test' });
    const { floors, warnings } = await importEsx(bytes);
    expect(warnings).toEqual([]);
    expect(floors.length).toBe(1);
    const f = floors[0];
    expect(f.name).toBe('Ground');
    expect(f.scaleM).toBeCloseTo(50, 6);
    expect(f.walls.length).toBe(2);
    expect(f.walls[0].material).toBe('concrete');
    expect(f.walls[0].fx1).toBeCloseTo(0.1, 6);
    expect(f.walls[0].fx2).toBeCloseTo(0.9, 6);
    expect(f.aps.length).toBe(1);
    expect(f.aps[0].fx).toBeCloseTo(0.5, 6);
    expect(f.aps[0].fy).toBeCloseTo(0.5, 6);
  });

  it('rejects archives that are not Ekahau projects', async () => {
    const bytes = zipStore([{ name: 'readme.txt', data: 'nope' }]);
    await expect(importEsx(bytes)).rejects.toThrow(/floorPlans/);
  });
});
