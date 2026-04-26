import {describe,test,expect} from 'vitest';
import {
  attenuationFactor,
  rayWallIntersect,
  computeCoveragePath,
  coveredThroughWalls,
  sampleFloorCoverage,
  WALL_MATERIALS,
} from '../files/src/geometry.js';

describe('attenuationFactor',()=>{
  test('zero loss → full reach',()=>{
    expect(attenuationFactor(0)).toBe(1);
  });
  test('3 dB ≈ half range',()=>{
    expect(attenuationFactor(3)).toBeCloseTo(0.5,5);
  });
  test('6 dB ≈ quarter range',()=>{
    expect(attenuationFactor(6)).toBeCloseTo(0.25,5);
  });
  test('clamped at 0.05 floor',()=>{
    expect(attenuationFactor(1000)).toBe(0.05);
  });
  test('never returns NaN for finite input',()=>{
    for(const db of [0,1,3,7.5,15,30,99]){
      expect(Number.isFinite(attenuationFactor(db))).toBe(true);
    }
  });
});

describe('rayWallIntersect',()=>{
  test('perpendicular crossing returns midpoint t',()=>{
    // ray from (0,0)→(10,0); wall vertical at x=5
    const t=rayWallIntersect(0,0,10,0, 5,-5, 5,5);
    expect(t).toBeCloseTo(0.5,5);
  });
  test('parallel rays don\'t intersect',()=>{
    const t=rayWallIntersect(0,0,10,0, 0,1, 10,1);
    expect(t).toBeNull();
  });
  test('hit beyond ray endpoint returns null',()=>{
    const t=rayWallIntersect(0,0,1,0, 5,-1, 5,1);
    expect(t).toBeNull();
  });
  test('hit before ray start returns null',()=>{
    const t=rayWallIntersect(10,0,20,0, 5,-1, 5,1);
    expect(t).toBeNull();
  });
});

describe('coveredThroughWalls',()=>{
  const ap={fx:0.5,fy:0.5,r:100};
  const w=200,h=200;
  test('point inside r with no walls is covered',()=>{
    expect(coveredThroughWalls(ap,150,100,w,h,[])).toBe(true);
  });
  test('point outside r is never covered',()=>{
    expect(coveredThroughWalls(ap,300,100,w,h,[])).toBe(false);
  });
  test('thick concrete wall blocks short range',()=>{
    const wall={x1:120,y1:0,x2:120,y2:200,material:'concrete'}; // 15 dB
    // distance from (100,100) to (150,100) = 50; with concrete: 100*atten(15) = ~3px
    expect(coveredThroughWalls(ap,150,100,w,h,[wall])).toBe(false);
  });
  test('drywall barely affects coverage',()=>{
    const wall={x1:120,y1:0,x2:120,y2:200,material:'drywall'}; // 3 dB
    // 100 * atten(3) = 50; sample distance = 50, so right at edge
    expect(coveredThroughWalls(ap,140,100,w,h,[wall])).toBe(true);
  });
});

describe('computeCoveragePath',()=>{
  test('no walls → polygon approximating circle',()=>{
    const path=computeCoveragePath({fx:0.5,fy:0.5,r:50},200,200,[]);
    expect(path).toMatch(/^M[\d.,LZ -]+Z$/);
    // Should have all 72 points (one M then 71 L)
    expect((path.match(/L/g)||[]).length).toBe(71);
  });
  test('zero-image-size returns empty path',()=>{
    expect(computeCoveragePath({fx:0.5,fy:0.5,r:50},0,0,[])).toBe('M0,0Z');
  });
  test('invalid AP returns empty path',()=>{
    expect(computeCoveragePath({fx:NaN,fy:0.5,r:50},200,200,[])).toBe('M0,0Z');
    expect(computeCoveragePath({fx:0.5,fy:0.5,r:0},200,200,[])).toBe('M0,0Z');
  });
});

describe('sampleFloorCoverage',()=>{
  test('no APs → 0/0',()=>{
    expect(sampleFloorCoverage({APS:[],WALLS:[]},200,200)).toEqual({covered:0,total:0});
  });
  test('one AP covering most of floor',()=>{
    const r=sampleFloorCoverage({APS:[{fx:0.5,fy:0.5,r:200}],WALLS:[]},200,200);
    expect(r.covered).toBeGreaterThan(0);
    expect(r.covered/r.total).toBeGreaterThan(0.5);
  });
  test('walls reduce coverage versus no walls',()=>{
    const aps=[{fx:0.5,fy:0.5,r:80}];
    const noWalls=sampleFloorCoverage({APS:aps,WALLS:[]},200,200);
    const withWalls=sampleFloorCoverage({APS:aps,WALLS:[
      {x1:90,y1:0,x2:90,y2:200,material:'concrete'},
      {x1:110,y1:0,x2:110,y2:200,material:'concrete'},
    ]},200,200);
    expect(withWalls.covered).toBeLessThan(noWalls.covered);
  });
});

describe('WALL_MATERIALS table',()=>{
  test('contains the five expected keys',()=>{
    expect(Object.keys(WALL_MATERIALS).sort()).toEqual(['brick','concrete','drywall','glass','wood']);
  });
  test('losses are monotonic drywall < wood < glass < brick < concrete',()=>{
    const {drywall,wood,glass,brick,concrete}=WALL_MATERIALS;
    expect(drywall.loss).toBeLessThan(wood.loss);
    expect(wood.loss).toBeLessThan(glass.loss);
    expect(glass.loss).toBeLessThan(brick.loss);
    expect(brick.loss).toBeLessThan(concrete.loss);
  });
});
