import {describe,test,expect} from 'vitest';
import {buildSampleProject,sampleFloorPlanDataUrl} from '../files/src/sampleProject.js';
import {migrateProject,PROJECT_VERSION,syncNidFromFloors} from '../files/src/migrate.js';
import {AP_RANGE_M,CAM_SPECS,SW_POE_BUDGET_W} from '../files/src/constants.js';
import {WALL_MATERIALS} from '../files/src/geometry.js';

describe('buildSampleProject',()=>{
  test('is current-schema and survives the migrator without warnings',()=>{
    const [data,warnings]=migrateProject(buildSampleProject());
    expect(warnings).toEqual([]);
    expect(data.version).toBe(PROJECT_VERSION);
    expect(data.floors).toHaveLength(1);
  });
  test('all fractional coordinates are inside [0,1]',()=>{
    const f=buildSampleProject().floors[0];
    const coords=[];
    for(const ap of f.APS)coords.push(ap.fx,ap.fy);
    for(const c of f.CAMS)coords.push(c.fx,c.fy);
    for(const s of f.SWS)coords.push(s.fx,s.fy);
    for(const w of f.WALLS)coords.push(w.fx1,w.fy1,w.fx2,w.fy2);
    for(const v of coords){
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
  test('every wall uses a known material',()=>{
    for(const w of buildSampleProject().floors[0].WALLS){
      expect(WALL_MATERIALS[w.material]).toBeDefined();
    }
  });
  test('device models exist in the catalogs',()=>{
    const f=buildSampleProject().floors[0];
    for(const ap of f.APS)expect(AP_RANGE_M[ap.model]).toBeDefined();
    for(const c of f.CAMS)expect(CAM_SPECS[c.model]).toBeDefined();
    for(const s of f.SWS)expect(SW_POE_BUDGET_W[s.model]).toBeDefined();
  });
  test('every device swId points at a switch that exists',()=>{
    const f=buildSampleProject().floors[0];
    const swIds=new Set(f.SWS.map(s=>s.id));
    for(const d of [...f.APS,...f.CAMS]){
      if(d.swId)expect(swIds.has(d.swId)).toBe(true);
    }
  });
  test('ids are unique and nid syncs past the highest suffix',()=>{
    const f=buildSampleProject().floors[0];
    const ids=[...f.APS,...f.CAMS,...f.SWS,...f.WALLS,...f.DZS,...f.ANNOS].map(x=>x.id);
    expect(new Set(ids).size).toBe(ids.length);
    const nid=syncNidFromFloors(buildSampleProject().floors);
    for(const id of ids){
      const m=id.match(/(\d+)$/);
      if(m)expect(nid).toBeGreaterThanOrEqual(Number(m[1]));
    }
  });
  test('floor plan data URL is a self-contained SVG with room labels',()=>{
    const url=sampleFloorPlanDataUrl();
    expect(url.startsWith('data:image/svg+xml')).toBe(true);
    const svg=decodeURIComponent(url.split(',').slice(1).join(','));
    expect(svg).toContain('<svg');
    expect(svg).toContain('RECEPTION');
    expect(svg).toContain('SERVER ROOM');
    // No external fetches (href/url() resources) — must render offline from
    // file://. The xmlns namespace URI is an identifier, not a fetch.
    expect(svg).not.toMatch(/href=|url\(/);
  });
  test('returns a fresh object every call (no shared mutable state)',()=>{
    const a=buildSampleProject(), b=buildSampleProject();
    a.floors[0].APS[0].fx=0.999;
    expect(b.floors[0].APS[0].fx).not.toBe(0.999);
  });
});
