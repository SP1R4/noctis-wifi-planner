// Bundled sample project — a small office floor, used by the "Load sample
// project" button on the empty state so first-time visitors (and the E2E
// suite) see a populated plan without hunting for a floor-plan image.
//
// The floor-plan SVG and the project's WALLS array are generated from the
// same PLAN_WALLS data, so the picture and the RF model can never drift
// apart. Pure module: no DOM access, unit-testable.

import {PROJECT_VERSION} from './migrate.js';

// Plan canvas in px. The building is 48 m × 32 m → scaleM = 4 m per 100 px.
const W=1200, H=800;
const SCALE_M=4;
const mToPx=m=>m*100/SCALE_M;

// Walls in plan px. Gaps between collinear segments are doorways.
const PLAN_WALLS=[
  // Outer shell — concrete
  {x1:40,  y1:40,  x2:1160,y2:40,  material:'concrete'},
  {x1:1160,y1:40,  x2:1160,y2:760, material:'concrete'},
  {x1:1160,y1:760, x2:40,  y2:760, material:'concrete'},
  {x1:40,  y1:760, x2:40,  y2:40,  material:'concrete'},
  // Left column: reception / meeting room / kitchen
  {x1:40,  y1:330, x2:340, y2:330, material:'drywall'},
  {x1:120, y1:560, x2:420, y2:560, material:'drywall'},
  // Main divider (two doorways; the meeting-room stretch is glass)
  {x1:420, y1:40,  x2:420, y2:150, material:'drywall'},
  {x1:420, y1:230, x2:420, y2:480, material:'glass'},
  {x1:420, y1:540, x2:420, y2:760, material:'drywall'},
  // Server room — brick, top right
  {x1:950, y1:40,  x2:950, y2:250, material:'brick'},
  {x1:950, y1:250, x2:1080,y2:250, material:'brick'},
  // Storage — bottom right
  {x1:950, y1:560, x2:950, y2:700, material:'drywall'},
  {x1:950, y1:560, x2:1160,y2:560, material:'drywall'},
];

const ROOMS=[
  {x:40,  y:40,  w:380, h:290, fill:'#edf2f6', label:'Reception',    lx:230, ly:120},
  {x:40,  y:330, w:380, h:230, fill:'#eaf3ee', label:'Meeting Room', lx:230, ly:450},
  {x:40,  y:560, w:380, h:200, fill:'#f6efe4', label:'Kitchen',      lx:230, ly:670},
  {x:420, y:40,  w:530, h:720, fill:'#f7f7f1', label:'Open Office',  lx:690, ly:430},
  {x:950, y:40,  w:210, h:210, fill:'#f4e9e6', label:'Server Room',  lx:1055,ly:110},
  {x:950, y:560, w:210, h:200, fill:'#efefef', label:'Storage',      lx:1055,ly:630},
];

// SVG stroke styling per material — visual only; RF attenuation comes from
// WALL_MATERIALS in geometry.js via the project WALLS.
const WALL_STYLE={
  concrete:{stroke:'#3f3f3f',width:7},
  brick:   {stroke:'#8a5a44',width:5},
  drywall: {stroke:'#9a9a9a',width:3},
  glass:   {stroke:'#7fb3c8',width:2.5,dash:'7 5'},
};

function planSvg(){
  const rects=ROOMS.map(r=>
    `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${r.fill}"/>`).join('');
  const labels=ROOMS.map(r=>
    `<text x="${r.lx}" y="${r.ly}" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="26" letter-spacing="3" fill="#a0a6ad">${r.label.toUpperCase()}</text>`).join('');
  const lines=PLAN_WALLS.map(wl=>{
    const s=WALL_STYLE[wl.material];
    const dash=s.dash?` stroke-dasharray="${s.dash}"`:'';
    return `<line x1="${wl.x1}" y1="${wl.y1}" x2="${wl.x2}" y2="${wl.y2}" stroke="${s.stroke}" stroke-width="${s.width}" stroke-linecap="square"${dash}/>`;
  }).join('');
  // Scale bar: 100 px = 4 m.
  const bar=`<g font-family="Helvetica,Arial,sans-serif" font-size="16" fill="#8a8f94">`+
    `<line x1="1040" y1="785" x2="1140" y2="785" stroke="#8a8f94" stroke-width="2"/>`+
    `<line x1="1040" y1="779" x2="1040" y2="791" stroke="#8a8f94" stroke-width="2"/>`+
    `<line x1="1140" y1="779" x2="1140" y2="791" stroke="#8a8f94" stroke-width="2"/>`+
    `<text x="1090" y="778" text-anchor="middle">4 m</text></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`+
    `<rect width="${W}" height="${H}" fill="#fbfaf7"/>${rects}${labels}${lines}${bar}</svg>`;
}

/** @returns {string} the sample floor plan as an SVG data URL */
export function sampleFloorPlanDataUrl(){
  return 'data:image/svg+xml;utf8,'+encodeURIComponent(planSvg());
}

// Shared device-field boilerplate so the sample objects match what the
// placement handlers in app.js create.
const AP_BASE={
  freq:'2.4 / 5 GHz',channel:'auto',txPower:'auto',sig:'strong',color:'',
  mac:'',notes:'',comment:'',locked:false,pattern:'omni',heading:0,
  cableLossDb:0,txPowerDbm:20,mountHeightM:2.7,downtiltDeg:0,capacityClients:25,
  status:'planned',serial:'',assetTag:'',firmware:'',
};

/**
 * Build the full sample project (current schema). Fresh object every call —
 * callers may mutate the result freely.
 * @returns {any}
 */
export function buildSampleProject(){
  const f=(px,total)=>px/total;            // px → fractional
  const walls=PLAN_WALLS.map((wl,i)=>({
    id:'w'+(i+1),
    fx1:f(wl.x1,W),fy1:f(wl.y1,H),fx2:f(wl.x2,W),fy2:f(wl.y2,H),
    material:wl.material,
  }));
  // Effective radii below catalog range (25 m / 18 m) — on a 48×32 m building
  // full-power APs spill far past the exterior walls and the coverage
  // outlines swamp the plan. A real designer would turn Tx power down too.
  const aps=[
    // Mixed install statuses so the inventory/rollout view has a story to tell.
    {...AP_BASE,id:'ap14',name:'AP-01',model:'U6 Pro', r:mToPx(17),fx:f(230,W),fy:f(180,H),
     ip:'10.0.10.11',vlan:'10',swId:'sw17',port:'1',antennaGainDbi:3,
     status:'live',serial:'UAP6P-2231A41',assetTag:'PLX-0001',firmware:'6.6.55'},
    {...AP_BASE,id:'ap15',name:'AP-02',model:'U6 Pro', r:mToPx(18),fx:f(690,W),fy:f(300,H),
     ip:'10.0.10.12',vlan:'10',swId:'sw17',port:'2',antennaGainDbi:3,
     status:'installed',serial:'UAP6P-2231A42',assetTag:'PLX-0002'},
    {...AP_BASE,id:'ap16',name:'AP-03',model:'U6 Lite',r:mToPx(13),fx:f(230,W),fy:f(640,H),
     ip:'10.0.10.13',vlan:'10',swId:'sw17',port:'3',antennaGainDbi:3,
     status:'planned'},
  ];
  const sws=[
    {id:'sw17',name:'SW-01',model:'USW-24-PoE',ip:'10.0.1.2',notes:'Server room rack',
     fx:f(1055,W),fy:f(150,H),size:22,locked:false,poeBudget:95,ports:0,uplinkId:'',
     status:'live',serial:'USW24P-77001',assetTag:'PLX-0010',firmware:'7.1.26',mac:''},
  ];
  const cams=[
    // Camera ranges trimmed below spec so the FoV cones stay readable on a
    // building this size (the cone is a sightline, not a wall-clipped shape).
    {id:'cm18',name:'CAM-01',model:'G5 Dome',fx:f(70,W),fy:f(70,H),
     fov:102,range:mToPx(10),heading:45,resolution:'4MP',
     ip:'10.0.20.21',mac:'',swId:'sw17',port:'5',vlan:'20',notes:'',color:'',locked:false,
     status:'tested',serial:'G5D-91002',assetTag:'PLX-0020'},
    {id:'cm19',name:'CAM-02',model:'G5 Bullet',fx:f(1130,W),fy:f(730,H),
     fov:103,range:mToPx(13),heading:225,resolution:'4MP',
     ip:'10.0.20.22',mac:'',swId:'sw17',port:'6',vlan:'20',notes:'',color:'',locked:false,
     status:'ordered'},
  ];
  const dzs=[
    {id:'dz20',label:'Dead Zone 1',fx:f(1055,W),fy:f(660,H),r:40,locked:false},
  ];
  const annos=[
    {id:'an21',kind:'text',fx:f(690,W),fy:f(95,H),fx2:f(690,W),fy2:f(95,H),
     text:'Sample project — drag the APs around'},
  ];
  return {
    version:PROJECT_VERSION,
    settings:{
      company:'Plexus',
      reportTitle:'Sample Office — Network Plan',
      // ITU-R P.1238 (n=3.0): in a building this small, pure free space
      // (multi-wall, n=2.0) leaves the whole floor in the top RSSI band —
      // the office exponent gives the heatmap a realistic gradient.
      propagationModel:'itu-indoor',
      // Organization demo: subnet-backed VLANs (feeds IP+ / the IP plan) and
      // a naming convention every sample device already follows.
      vlans:[
        {id:'1', name:'Mgmt',    color:'#6a1b9a',subnet:'10.0.1.0/24'},
        {id:'10',name:'Corp',    color:'#1565c0',subnet:'10.0.10.0/24'},
        {id:'20',name:'Cameras', color:'#00838f',subnet:'10.0.20.0/24'},
      ],
      namePattern:'{type}-{nn}',
    },
    floors:[{
      id:'f1',name:'Ground Floor',
      img:sampleFloorPlanDataUrl(),imgId:'',imgName:'sample-office.svg',
      APS:aps,DZS:dzs,SWS:sws,WALLS:walls,CAMS:cams,ANNOS:annos,SAMPLES:[],
      scaleM:SCALE_M,
    }],
    revisions:[],
  };
}
