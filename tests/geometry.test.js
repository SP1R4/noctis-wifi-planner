import {describe,test,expect} from 'vitest';
import {
  attenuationFactor,
  rayWallIntersect,
  computeCoveragePath,
  coveredThroughWalls,
  sampleFloorCoverage,
  WALL_MATERIALS,
  BAND_LOSS,
  bandLossMultiplier,
  wallToPx,
  dbmAt,
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

describe('bandLossMultiplier',()=>{
  test('5 GHz baseline is 1.0',()=>{
    expect(bandLossMultiplier('5 GHz only')).toBe(1.0);
  });
  test('2.4 GHz penetrates better (factor < 1)',()=>{
    expect(bandLossMultiplier('2.4 GHz only')).toBeLessThan(1);
    expect(bandLossMultiplier('2.4 / 5 GHz')).toBeLessThan(1);
  });
  test('6 GHz penetrates worse (factor > 1)',()=>{
    expect(bandLossMultiplier('6 GHz (WiFi 6E)')).toBeGreaterThan(1);
  });
  test('unknown band falls back to 1.0',()=>{
    expect(bandLossMultiplier('mystery')).toBe(1.0);
    expect(bandLossMultiplier(undefined)).toBe(1.0);
  });
  test('2.4 GHz coverage reaches further through walls than 5 GHz',()=>{
    // AP at center of 200x200 image, r=100. One drywall wall (3 dB) at x=120.
    // Sample at (160, 100) is 60 px from AP, through one drywall.
    //   5 GHz:  effective = 100 * 0.5^(3/3)    = 50    → not covered (50 < 60)
    //   2.4:    effective = 100 * 0.5^(1.8/3) ≈ 65.9  → covered (65.9 > 60)
    const ap={fx:0.5,fy:0.5,r:100};
    const walls=[{x1:120,y1:0,x2:120,y2:200,material:'drywall'}];
    expect(coveredThroughWalls(ap,160,100,200,200,walls,1.0)).toBe(false);
    expect(coveredThroughWalls(ap,160,100,200,200,walls,0.6)).toBe(true);
  });
});

describe('wallToPx',()=>{
  test('resolves fractional walls against image size',()=>{
    expect(wallToPx({fx1:0.1,fy1:0.2,fx2:0.5,fy2:0.6},1000,500)).toEqual({x1:100,y1:100,x2:500,y2:300});
  });
  test('passes through legacy pixel walls untouched',()=>{
    expect(wallToPx({x1:10,y1:20,x2:30,y2:40},1000,500)).toEqual({x1:10,y1:20,x2:30,y2:40});
  });
  test('prefers fractional when both are present',()=>{
    expect(wallToPx({fx1:0.5,fy1:0.5,fx2:0.5,fy2:0.5,x1:9,y1:9,x2:9,y2:9},100,100)).toEqual({x1:50,y1:50,x2:50,y2:50});
  });
});

describe('computeCoveragePath with fractional walls',()=>{
  test('matches pixel-wall output for the same geometry',()=>{
    const ap={fx:0.5,fy:0.5,r:50};
    const pxWall=[{x1:90,y1:0,x2:90,y2:200,material:'concrete'}];
    const fxWall=[{fx1:90/200,fy1:0,fx2:90/200,fy2:1,material:'concrete'}];
    const pxPath=computeCoveragePath(ap,200,200,pxWall);
    const fxPath=computeCoveragePath(ap,200,200,fxWall);
    expect(fxPath).toBe(pxPath);
  });
});

describe('BAND_LOSS table',()=>{
  test('has expected keys',()=>{
    expect(Object.keys(BAND_LOSS).sort()).toEqual([
      '2.4 / 5 GHz','2.4 GHz only','5 GHz only','6 GHz (WiFi 6E)',
    ].sort());
  });
});

describe('computeCoveragePath with directional pattern',()=>{
  test('omni covers all angles',()=>{
    const path=computeCoveragePath({fx:0.5,fy:0.5,r:50},200,200,[],{arcDeg:180,headingDeg:0});
    // 72 points, all close to r distance from centre.
    const matches=path.match(/-?\d+\.\d+,-?\d+\.\d+/g);
    expect(matches.length).toBe(72);
  });
  test('narrow sector (arcDeg=15) leaves most rays collapsed near the centre',()=>{
    // 15° half-width = a 30° wedge — about 30/360 = 8% of rays at full reach.
    // The rest should be a near-zero stub right next to the centre.
    const path=computeCoveragePath({fx:0.5,fy:0.5,r:100},200,200,[],{arcDeg:15,headingDeg:0});
    // Strip the leading M and the trailing Z, split on L.
    const pts=path.slice(1,-1).split(/[ML]/).filter(Boolean).map(p=>p.split(',').map(Number));
    const farFromCentre=pts.filter(([x,y])=>Math.hypot(x-100,y-100)>20).length;
    expect(farFromCentre).toBeLessThan(20);  // most should be near centre
    expect(farFromCentre).toBeGreaterThan(0); // but some should reach
  });
});

describe('dbmAt',()=>{
  const ap={fx:0.5,fy:0.5,r:100};
  test('returns null beyond range',()=>{
    expect(dbmAt(ap,250,100,200,200,[])).toBeNull();
  });
  test('returns a number inside range',()=>{
    const d=dbmAt(ap,120,100,200,200,[]);
    expect(d).not.toBeNull();
    expect(d).toBeLessThan(-30);
    expect(d).toBeGreaterThan(-95);
  });
  test('closer-to-AP means stronger signal',()=>{
    const near=dbmAt(ap,110,100,200,200,[]);
    const far=dbmAt(ap,180,100,200,200,[]);
    expect(near).toBeGreaterThan(far);
  });
  test('directional gating excludes points outside the cone',()=>{
    // Cone centred at heading=0 (east), arc 15° → point due south is excluded.
    expect(dbmAt(ap,100,180,200,200,[],{arcDeg:15,headingDeg:0})).toBeNull();
    // Point due east at the same distance is inside the cone.
    expect(dbmAt(ap,180,100,200,200,[],{arcDeg:15,headingDeg:0})).not.toBeNull();
  });
  test('walls drop the dBm value',()=>{
    const walls=[{x1:110,y1:0,x2:110,y2:200,material:'brick'}];
    const open=dbmAt(ap,120,100,200,200,[]);
    const blocked=dbmAt(ap,120,100,200,200,walls);
    // Either it's null (walls killed coverage) or significantly weaker.
    if(blocked!==null)expect(blocked).toBeLessThan(open-5);
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
