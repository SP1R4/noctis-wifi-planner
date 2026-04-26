import {describe,test,expect} from 'vitest';
import {migrateProject,syncNidFromFloors,nextNameSuffix,PROJECT_VERSION,DEFAULT_SETTINGS} from '../files/src/migrate.js';

const baseAP={id:'ap1',name:'AP-01',fx:0.5,fy:0.5,r:80};

describe('migrateProject',()=>{
  test('throws on non-object',()=>{
    expect(()=>migrateProject(null)).toThrow();
    expect(()=>migrateProject('hi')).toThrow();
  });
  test('throws on missing floors',()=>{
    expect(()=>migrateProject({version:1})).toThrow(/floors/i);
  });
  test('v1 → v5: fills AP defaults',()=>{
    const [data]=migrateProject({version:1,floors:[{id:'f1',APS:[{id:'ap1',fx:.5,fy:.5}],DZS:[],SWS:[],WALLS:[]}]});
    const ap=data.floors[0].APS[0];
    expect(ap.model).toBe('U6 Pro');
    expect(ap.locked).toBe(false);
    expect(ap.sig).toBe('strong');
    expect(ap.r).toBe(80);
    expect(ap.channel).toBe('auto');
    expect(ap.txPower).toBe('auto');
    expect(ap.color).toBe('');
    expect(data.version).toBe(PROJECT_VERSION);
  });
  test('v3 → v5: adds WALLS array per floor',()=>{
    const [data]=migrateProject({version:3,floors:[{id:'f1',APS:[],DZS:[],SWS:[]}]});
    expect(Array.isArray(data.floors[0].WALLS)).toBe(true);
  });
  test('v4 → v5: adds settings + imgId',()=>{
    const [data]=migrateProject({version:4,floors:[{id:'f1',APS:[],DZS:[],SWS:[],WALLS:[]}]});
    expect(data.settings.company).toBe(DEFAULT_SETTINGS.company);
    expect(data.floors[0].imgId).toBe('');
  });
  test('settings merge keeps user overrides',()=>{
    const [data]=migrateProject({version:5,settings:{company:'ACME',contact:'x@y.com'},floors:[{APS:[],DZS:[],SWS:[],WALLS:[]}]});
    expect(data.settings.company).toBe('ACME');
    expect(data.settings.contact).toBe('x@y.com');
    expect(data.settings.locale).toBe(DEFAULT_SETTINGS.locale);  // default for unset
  });
  test('settings ignores non-string values',()=>{
    const [data]=migrateProject({version:5,settings:{company:123,contact:null,tagline:{}},floors:[{APS:[],DZS:[],SWS:[],WALLS:[]}]});
    expect(data.settings.company).toBe(DEFAULT_SETTINGS.company);
  });
  test('newer version returns warning',()=>{
    const [,warnings]=migrateProject({version:99,floors:[{APS:[],DZS:[],SWS:[],WALLS:[]}]});
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toMatch(/newer/i);
  });
  test('coerces invalid wall material to drywall',()=>{
    const [data]=migrateProject({version:4,floors:[{APS:[],DZS:[],SWS:[],WALLS:[{x1:0,y1:0,x2:1,y2:1,material:'mystery-material'}]}]});
    expect(data.floors[0].WALLS[0].material).toBe('drywall');
  });
  test('preserves valid AP r',()=>{
    const ap={...baseAP,r:42};
    const [data]=migrateProject({version:4,floors:[{APS:[ap],DZS:[],SWS:[],WALLS:[]}]});
    expect(data.floors[0].APS[0].r).toBe(42);
  });
  test('coerces zero/NaN r → 80',()=>{
    const [data]=migrateProject({version:4,floors:[{APS:[{...baseAP,r:0}],DZS:[],SWS:[],WALLS:[]}]});
    expect(data.floors[0].APS[0].r).toBe(80);
  });
});

describe('syncNidFromFloors',()=>{
  test('returns 1 for empty floors',()=>{
    expect(syncNidFromFloors([{APS:[],DZS:[],SWS:[],WALLS:[]}])).toBe(1);
  });
  test('finds highest numeric suffix across types',()=>{
    const floors=[{APS:[{id:'ap5'},{id:'ap22'}],DZS:[{id:'dz3'}],SWS:[{id:'sw7'}],WALLS:[{id:'w19'}]}];
    expect(syncNidFromFloors(floors)).toBe(23);
  });
  test('walks multiple floors',()=>{
    const floors=[
      {APS:[{id:'ap1'}],DZS:[],SWS:[],WALLS:[]},
      {APS:[{id:'ap99'}],DZS:[],SWS:[],WALLS:[]},
    ];
    expect(syncNidFromFloors(floors)).toBe(100);
  });
  test('ignores ids without numeric suffix',()=>{
    const floors=[{APS:[{id:'apX'},{id:'ap5'}],DZS:[],SWS:[],WALLS:[]}];
    expect(syncNidFromFloors(floors)).toBe(6);
  });
});

describe('nextNameSuffix',()=>{
  test('starts at 1 with no items',()=>{
    expect(nextNameSuffix([],/^AP-(\d+)/)).toBe(1);
  });
  test('finds the gap-aware max+1',()=>{
    const items=[{name:'AP-01'},{name:'AP-05'},{name:'AP-03'}];
    expect(nextNameSuffix(items,/^AP-(\d+)/)).toBe(6);
  });
  test('ignores non-matching names',()=>{
    const items=[{name:'AP-02'},{name:'random'},{name:'Custom Name'}];
    expect(nextNameSuffix(items,/^AP-(\d+)/)).toBe(3);
  });
});
