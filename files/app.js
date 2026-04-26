// Pure helpers (geometry + migrate) live in files/src/*.js so they can be
// unit-tested under vitest without the DOM. The local copies further down in
// this file are the runtime source of truth — keep them in sync with the
// modules. We don't import the modules here so the app still runs when the
// user opens index.html directly via file:// (ES modules require HTTP/CORS).

// ═══ CONSTANTS ════════════════════════════════════
// AP models grouped by manufacturer. Rendered as <optgroup> in the model dropdown.
const AP_MODEL_GROUPS=[
  {label:'Ubiquiti UniFi — WiFi 6', models:[
    'U6 Lite','U6 Pro','U6 Plus','U6 Mesh','U6 Long-Range',
    'U6 Enterprise','U6 Enterprise In-Wall','U6 Extender',
    'U6 IW','U6+',
  ]},
  {label:'Ubiquiti UniFi — WiFi 7', models:[
    'U7 Pro','U7 Pro Max','U7 Pro Wall','U7 Pro XG',
    'U7 Outdoor','U7 Lite','U7 IW','U7 In-Wall',
    'E7','U7 Enterprise','U7 Enterprise Campus',
  ]},
  {label:'Ubiquiti UniFi — WiFi 5 (legacy)', models:[
    'UAP-AC-Pro','UAP-AC-Lite','UAP-AC-Mesh','UAP-AC-Mesh-Pro',
    'UAP-AC-HD','UAP-AC-SHD','UAP-nanoHD',
    'UAP-IW-HD','UAP-IW','UAP-BeaconHD',
    'UAP-AC-M','UAP-AC-M-Pro',
  ]},
  {label:'MikroTik — WiFi 6 / ax', models:[
    'cAP ax','cAP-XL ax','hAP ax²','hAP ax³','hAP ax lite',
    'wAP ax','wAP ax R','Chateau ax',
  ]},
  {label:'MikroTik — WiFi 5 / ac', models:[
    'cAP ac','cAP ac XL','hAP ac','hAP ac²','hAP ac³','hAP ac lite',
    'wAP ac','wAP-60G','mAP','mAP lite','Audience',
    'RBwAPGR-5HacD2HnD','Chateau LTE6 ac',
  ]},
  {label:'Other', models:['Custom/Other']},
];
// Flat list for code that just wants the names
const MODELS=AP_MODEL_GROUPS.flatMap(g=>g.models);

// Typical coverage radius in metres (conservative indoor estimate) for each model.
// Used as a sensible default when placing an AP and when the user changes model.
// Converted to pixel radius at place-time using current scaleM.
const AP_RANGE_M={
  // UniFi WiFi 6
  'U6 Lite':               18,
  'U6 Pro':                25,
  'U6 Plus':               22,
  'U6 Mesh':               20,
  'U6 Long-Range':         40,
  'U6 Enterprise':         30,
  'U6 Enterprise In-Wall': 20,
  'U6 Extender':           15,
  'U6 IW':                 18,
  'U6+':                   20,
  // UniFi WiFi 7
  'U7 Pro':                28,
  'U7 Pro Max':            32,
  'U7 Pro Wall':           22,
  'U7 Pro XG':             28,
  'U7 Outdoor':            50,
  'U7 Lite':               20,
  'U7 IW':                 20,
  'U7 In-Wall':            20,
  'E7':                    32,
  'U7 Enterprise':         35,
  'U7 Enterprise Campus':  40,
  // UniFi WiFi 5
  'UAP-AC-Pro':            22,
  'UAP-AC-Lite':           16,
  'UAP-AC-Mesh':           18,
  'UAP-AC-Mesh-Pro':       30,
  'UAP-AC-HD':             30,
  'UAP-AC-SHD':            30,
  'UAP-nanoHD':            20,
  'UAP-IW-HD':             18,
  'UAP-IW':                15,
  'UAP-BeaconHD':          15,
  'UAP-AC-M':              22,
  'UAP-AC-M-Pro':          30,
  // MikroTik WiFi 6 / ax
  'cAP ax':                28,
  'cAP-XL ax':              35,
  'hAP ax²':               20,
  'hAP ax³':               30,
  'hAP ax lite':           15,
  'wAP ax':                45,
  'wAP ax R':              40,
  'Chateau ax':            25,
  // MikroTik WiFi 5 / ac
  'cAP ac':                22,
  'cAP ac XL':             28,
  'hAP ac':                18,
  'hAP ac²':               18,
  'hAP ac³':               22,
  'hAP ac lite':           14,
  'wAP ac':                35,
  'wAP-60G':               20,
  'mAP':                   12,
  'mAP lite':              10,
  'Audience':              22,
  'RBwAPGR-5HacD2HnD':     30,
  'Chateau LTE6 ac':       22,
  // Fallback
  'Custom/Other':          25,
};

// Switch / router models — also grouped. Same structure so the dropdown code
// can render either list identically.
const SW_MODEL_GROUPS=[
  {label:'Ubiquiti UniFi — Switches', models:[
    // Standard UniFi switches
    'USW-Flex-Mini','USW-Flex','USW-Flex-Utility',
    'USW-Lite-8-PoE','USW-Lite-16-PoE',
    'USW-16','USW-16-PoE',
    'USW-24','USW-24-PoE',
    'USW-48','USW-48-PoE',
    // Pro line
    'USW-Pro-8-PoE','USW-Pro-24','USW-Pro-24-PoE',
    'USW-Pro-48','USW-Pro-48-PoE',
    'USW-Pro-Max-16','USW-Pro-Max-24','USW-Pro-Max-48',
    'USW-Pro-Max-24-PoE','USW-Pro-Max-48-PoE',
    // Aggregation / 10G
    'USW-Aggregation','USW-Pro-Aggregation',
    'USW-EnterpriseXG-24','USW-Enterprise-24-PoE','USW-Enterprise-48-PoE','USW-Enterprise-8-PoE',
    // Industrial / outdoor
    'USW-Industrial','USW-Mission-Critical',
  ]},
  {label:'Ubiquiti UniFi — Routers & Gateways', models:[
    'UDM','UDM-Pro','UDM-SE','UDM-Pro-Max',
    'UXG-Lite','UXG-Pro','UXG-Max','UXG-Enterprise',
    'UCG-Fiber','UCG-Max','UCG-Ultra',
    'USG','USG-Pro-4','USG-3P',
    'Dream Router','Dream Router 7','Dream Machine',
    'Cloud Gateway Fiber','Cloud Gateway Max','Cloud Gateway Ultra',
  ]},
  {label:'MikroTik — Routers (Home / SMB)', models:[
    'hEX (RB750Gr4)','hEX S (RB760iGS)','hEX refresh',
    'hAP mini','hAP lite','hAP','hAP ac lite','hAP ac²','hAP ac³',
    'hAP ax lite','hAP ax²','hAP ax³',
    'RB4011iGS+RM','RB4011iGS+5HacQ2HnD-IN',
    'RB5009UG+S+IN','RB5009UPr+S+IN','RB5009UG+S+IN PoE',
    'RB3011UiAS-RM','RB2011UiAS-RM','RB2011iL-RM','RB2011iL-IN',
  ]},
  {label:'MikroTik — Routers (ISP / Enterprise)', models:[
    'L009UiGS-RM','L009UiGS-2HaxD-IN','L009UiGS-RM+Rack',
    'CCR1009-7G-1C-1S+','CCR1016-12G','CCR1036-12G-4S','CCR1036-8G-2S+',
    'CCR1072-1G-8S+',
    'CCR2004-1G-12S+2XS','CCR2004-16G-2S+','CCR2004-1G-2XS-PCIe',
    'CCR2116-12G-4S+','CCR2216-1G-12XS-2XQ',
  ]},
  {label:'MikroTik — Switches (Smart)', models:[
    'CSS326-24G-2S+RM','CSS610-8G-2S+IN','CSS318-16G-2S+IN','CSS318-16P-4S+RM',
  ]},
  {label:'MikroTik — Switches (CRS3xx — Managed)', models:[
    'CRS305-1G-4S+IN',
    'CRS309-1G-8S+IN','CRS309-1G-8S+IN Rackmount',
    'CRS310-1G-5S-4S+IN','CRS310-1G-5S-4S+OUT','CRS310-8G+2S+IN',
    'CRS312-4C+8XG-RM',
    'CRS317-1G-16S+RM',
    'CRS318-1Fi-15Fr-2S','CRS318-16P-2S+OUT',
    'CRS326-24G-2S+RM','CRS326-24G-2S+IN','CRS326-4C+20G+2Q+RM','CRS326-24S+2Q+RM',
    'CRS328-24P-4S+RM','CRS328-4C-20S-4S+RM',
    'CRS354-48G-4S+2Q+RM','CRS354-48P-4S+2Q+RM',
  ]},
  {label:'MikroTik — Switches (CRS5xx — High End)', models:[
    'CRS504-4XQ-IN','CRS510-8XS-2XQ-IN','CRS518-16XS-2XQ-RM','CRS520-4XS-16XQ-RM',
  ]},
  {label:'Other', models:['Custom/Other']},
];
const SW_MODELS=SW_MODEL_GROUPS.flatMap(g=>g.models);

// Wall materials. `loss` is approximate signal attenuation in dB per traversal
// (for a typical 5 GHz signal through an interior wall of that construction).
// `strokeWidth` is the on-map visual weight — heavier materials render thicker.
const WALL_MATERIALS={
  drywall:  {label:'Drywall',  loss:3,  strokeWidth:1.2},
  wood:     {label:'Wood',     loss:5,  strokeWidth:1.8},
  glass:    {label:'Glass',    loss:6,  strokeWidth:1,   dash:'2 2'},
  brick:    {label:'Brick',    loss:10, strokeWidth:2.4},
  concrete: {label:'Concrete', loss:15, strokeWidth:3.5},
};
const WALL_MATERIAL_KEYS=Object.keys(WALL_MATERIALS);
// Convert "N dB traversed" → "radius shrinks by this factor".
// A rough heuristic: each 3 dB of loss ≈ halves the usable range in that direction.
// So attenuation factor = (0.5)^(lossDb / 3). We floor it at 0.05 so walls can't
// completely zero-out coverage (a thick bunker wouldn't be 0, just very small).
function attenuationFactor(totalLossDb){
  return Math.max(0.05, Math.pow(0.5, totalLossDb/3));
}

// Curated AP color palette — chosen to read clearly on the cream NOCTIS canvas.
// The empty string key means "use default ink (#000)" — this is the default for
// APs with no explicit color. Users can still edit an AP's `color` to any hex.
const AP_COLORS=[
  {value:'',         label:'Default'},
  {value:'#c0382b',  label:'Red'},
  {value:'#d68910',  label:'Amber'},
  {value:'#1e7d3c',  label:'Green'},
  {value:'#1565c0',  label:'Blue'},
  {value:'#6a1b9a',  label:'Purple'},
  {value:'#00838f',  label:'Teal'},
  {value:'#6d4c41',  label:'Brown'},
];

// ═══ COVERAGE GEOMETRY (wall-clipped) ═════════════
// For each AP we cast N rays outward. For each ray we find how many walls
// it crosses and sum the dB loss, then shrink the ray's max length by the
// attenuation factor. The resulting polygon is the coverage shape. We cache
// the polygon's SVG path on the AP object and invalidate it only when walls
// or AP position/radius change.
const COVERAGE_RAYS=72;   // one ray every 5°. Compromise between smoothness and CPU.

// Segment-segment intersection. Returns the parametric t along ray (from ap
// out to direction*r) where it hits the wall, or null if no hit within 0..1.
function rayWallIntersect(ax,ay, bx,by, wx1,wy1, wx2,wy2){
  const rdx=bx-ax, rdy=by-ay;
  const sdx=wx2-wx1, sdy=wy2-wy1;
  const denom=rdx*sdy - rdy*sdx;
  if(Math.abs(denom)<1e-9)return null;  // parallel
  const t=((wx1-ax)*sdy - (wy1-ay)*sdx)/denom;
  const u=((wx1-ax)*rdy - (wy1-ay)*rdx)/denom;
  if(t<0||t>1||u<0||u>1)return null;
  return t;
}

// Compute the polygon of reachable points around an AP considering walls.
// Returns an SVG path "d" string. If no walls, returns a circle-approximation
// (which renders identically to a <circle>).
function computeCoveragePath(ap){
  const w=mapImg.naturalWidth,h=mapImg.naturalHeight;
  // If the image hasn't finished loading (or we're rendering off-screen for export
  // before the image is ready), all AP coords would collapse to near-origin because
  // fx/fy are fractions. Return an empty path rather than drawing a bogus circle
  // stack at (0,0).
  if(!w||!h){return 'M0,0Z';}
  // Also guard against invalid AP data — occasionally a migration might leave
  // an AP without valid fx/fy/r. Skip these rather than NaN-propagate.
  if(!Number.isFinite(ap.fx)||!Number.isFinite(ap.fy)||!Number.isFinite(ap.r)||ap.r<=0){return 'M0,0Z';}
  const cx=ap.fx*w, cy=ap.fy*h;
  const r=ap.r;
  const walls=WALLS();
  const pts=[];
  for(let i=0;i<COVERAGE_RAYS;i++){
    const angle=(i/COVERAGE_RAYS)*Math.PI*2;
    const dx=Math.cos(angle), dy=Math.sin(angle);
    const ex=cx+dx*r, ey=cy+dy*r;
    // Walk along the ray, accumulating loss from each wall crossed.
    // Each hit's t gives us the fraction of r at which the wall is; we
    // collect all hits, sort by t, then compute cumulative loss & attenuated reach.
    const hits=[];
    for(const wall of walls){
      const t=rayWallIntersect(cx,cy,ex,ey,wall.x1,wall.y1,wall.x2,wall.y2);
      if(t!==null){
        const mat=WALL_MATERIALS[wall.material]||WALL_MATERIALS.drywall;
        hits.push({t,loss:mat.loss});
      }
    }
    hits.sort((a,b)=>a.t-b.t);
    // Find the reach: ray continues until cumulative attenuation makes the
    // remaining range too small to extend past the next hit.
    let reachT=1;  // default: full range
    let cumLoss=0;
    for(const hit of hits){
      // The ray has already traveled hit.t*r metres-in-image before hitting this wall.
      // After the wall, its effective max range becomes r*attenuationFactor(cumLoss+hit.loss).
      // So it can continue to min(1, hit.t + (1-hit.t) * attenuationFactor(newLoss))
      //                      in units where 1 = r.
      cumLoss+=hit.loss;
      const atten=attenuationFactor(cumLoss);
      // New reach from AP = hit position + remaining * atten
      const newReach=hit.t + (1-hit.t)*atten;
      if(newReach<reachT)reachT=newReach;
      // If we're already below hit.t we've stopped before this wall anyway
      if(reachT<=hit.t)break;
    }
    pts.push({x:cx+dx*r*reachT, y:cy+dy*r*reachT});
  }
  // Build an SVG path from the polygon points. Close it.
  return 'M'+pts.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('L')+'Z';
}

// Cache lookups — both outer (full r) and inner (r * 0.54) coverage paths are
// memoized on the AP. Cache fields are prefixed `_` so the save/autosave
// stripper drops them, keeping JSON small and avoiding stale cache resurrection.
function _cacheKey(ap,r){return `${ap.fx},${ap.fy},${r},${WALLS().length},${_wallsCacheKey}`;}
function getCoveragePath(ap){
  const key=_cacheKey(ap,ap.r);
  if(ap._coveragePath&&ap._coverageFor===key)return ap._coveragePath;
  const path=computeCoveragePath(ap);
  ap._coveragePath=path;
  ap._coverageFor=key;
  return path;
}
function getInnerCoveragePath(ap){
  const innerR=ap.r*.54;
  const key=_cacheKey(ap,innerR);
  if(ap._innerCoveragePath&&ap._innerCoverageFor===key)return ap._innerCoveragePath;
  const path=computeCoveragePath({fx:ap.fx,fy:ap.fy,r:innerR});
  ap._innerCoveragePath=path;
  ap._innerCoverageFor=key;
  return path;
}
let _wallsCacheKey=0;
function invalidateCoverageCache(){_wallsCacheKey++;}

// Convert metres → pixels using current scale (scaleM = metres per 100 px)
function rangeMToPx(m){return Math.round(m*100/(scaleM||100));}

// HTML-escape for safely interpolating user-controlled strings into templates.
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

// Convert "#rrggbb" to "rgba(r,g,b,a)" — used for AP color fills where we want
// the stroke at full opacity but the fill semi-transparent so overlaps blend.
function hexToRgba(hex,alpha){
  if(!hex||hex[0]!=='#'||hex.length!==7)return `rgba(0,0,0,${alpha})`;
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Theme-aware color helpers for inline SVG attributes (which can't reference CSS
// custom properties). These read the current values from :root at call time, so
// they automatically follow theme switches without re-rendering bookkeeping.
// `_themeCache` memoizes both --ink and --bg per render pass; reset by
// `_resetThemeCache()` (called at the start of render() and on theme toggle).
let _themeCache={ink:null,bg:null};
function _resetThemeCache(){_themeCache.ink=null;_themeCache.bg=null;}
function tInk(alpha){
  // Get the current --ink color and apply alpha. CSS may compute the var as
  // a 3-char hex (#000), a 6-char hex (#000000), or rgb()/rgba(), depending on
  // how the var is declared and how the browser normalizes it. Handle all three.
  const ink=_themeCache.ink||(_themeCache.ink=(getComputedStyle(document.documentElement).getPropertyValue('--ink').trim()||'#000'));
  if(alpha===undefined||alpha>=1)return ink;
  let r,g,b;
  if(ink[0]==='#'&&ink.length===4){
    // Shorthand hex like #abc → expands to #aabbcc
    r=parseInt(ink[1]+ink[1],16);g=parseInt(ink[2]+ink[2],16);b=parseInt(ink[3]+ink[3],16);
  }else if(ink[0]==='#'&&ink.length===7){
    r=parseInt(ink.slice(1,3),16);g=parseInt(ink.slice(3,5),16);b=parseInt(ink.slice(5,7),16);
  }else{
    // Already in rgb()/rgba() form. Pull out the first three numbers.
    const m=ink.match(/(\d+)\s*[, ]\s*(\d+)\s*[, ]\s*(\d+)/);
    if(m){r=+m[1];g=+m[2];b=+m[3];}
    else return ink;
  }
  return `rgba(${r},${g},${b},${alpha})`;
}
function tBg(){
  return _themeCache.bg||(_themeCache.bg=(getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()||'#efece5'));
}

// Build an <optgroup>-structured <option> list for a grouped dropdown.
// If `selected` isn't in any group's list, the "Custom/Other" option (if present) gets selected
// and the panel will show a free-text override input.
function buildGroupedOptions(groups,selected){
  const flat=groups.flatMap(g=>g.models);
  const known=flat.includes(selected);
  return groups.map(g=>{
    const opts=g.models.map(m=>{
      const isSel=(m===selected)||(!known&&m==='Custom/Other');
      return `<option${isSel?' selected':''}>${esc(m)}</option>`;
    }).join('');
    return `<optgroup label="${esc(g.label)}">${opts}</optgroup>`;
  }).join('');
}
const HINTS={
  add: 'Click map to place an AP',
  sel: 'Click an item to select · drag to move · Shift+click to duplicate',
  dz:  'Click to mark a dead zone',
  sw:  'Click to place a switch or router',
  ruler:'Click two points to measure · Esc to clear',
  wall:'Click two points to draw a wall · Shift for 45° · Esc to cancel'
};

// ═══ IMAGE STORE (IndexedDB) ══════════════════════
// Floor-plan images can be megabytes. Putting them inside FLOORS would mean
// every save/autosave JSON contains the full image as base64, blowing past
// the 5 MB localStorage quota almost immediately. Instead the floor object
// only carries `imgId` + `imgName`; the actual data URL lives in IndexedDB.
//
// Saved project files bundle the images alongside the JSON so the project is
// still self-contained when shared. Older save files (with `img` data URLs
// inline) are migrated on load — see migrateProject.
const IDB_NAME='noctis_wifi';
const IDB_STORE='images';
const IDB_VERSION=1;
let _idbPromise=null;
function _openIdb(){
  if(_idbPromise)return _idbPromise;
  _idbPromise=new Promise((resolve,reject)=>{
    if(typeof indexedDB==='undefined'){reject(new Error('No IndexedDB'));return;}
    const req=indexedDB.open(IDB_NAME,IDB_VERSION);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains(IDB_STORE))db.createObjectStore(IDB_STORE);
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
  return _idbPromise;
}
async function idbPutImage(id,dataUrl){
  const db=await _openIdb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(IDB_STORE,'readwrite');
    tx.objectStore(IDB_STORE).put(dataUrl,id);
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
  });
}
async function idbGetImage(id){
  const db=await _openIdb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(IDB_STORE,'readonly');
    const r=tx.objectStore(IDB_STORE).get(id);
    r.onsuccess=()=>resolve(r.result||null);
    r.onerror=()=>reject(r.error);
  });
}
async function idbDeleteImage(id){
  if(!id)return;
  const db=await _openIdb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(IDB_STORE,'readwrite');
    tx.objectStore(IDB_STORE).delete(id);
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
  });
}
function _newImgId(){return 'img_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);}
// In-memory cache so multiple loads of the same image don't re-hit IDB.
const _imgCache=new Map();
async function resolveFloorImage(f){
  if(!f.imgId)return '';
  if(_imgCache.has(f.imgId))return _imgCache.get(f.imgId);
  const data=await idbGetImage(f.imgId);
  if(data)_imgCache.set(f.imgId,data);
  return data||'';
}

// ═══ PROJECT SETTINGS ═════════════════════════════
// Per-project branding/locale surfaced in HTML & PDF exports. Editable via the
// Settings modal (gear button), persisted on the project file. Defaults are
// the planner's own brand (NOCTIS); each project can override.
const DEFAULT_SETTINGS={
  company:    'NOCTIS',
  tagline:    'Network Planning',
  contact:    '',
  locale:     'en-GB',  // affects toLocaleDateString in exports
  metaLine:   '',       // freeform top-line under the cover, e.g. "Athens HQ"
  reportTitle:'Network Audit Report',
};
let SETTINGS={...DEFAULT_SETTINGS};

// ═══ STATE ════════════════════════════════════════
let FLOORS=[{id:'f1',name:'Floor 1',img:'',imgName:'',APS:[],DZS:[],SWS:[],WALLS:[]}];
let curFloor=0;
let nid=1;
let mode='add';
let selId=null,selType=null;
let showOL=false,showHeat=false,showGrid=false;
let showCoverage=true;  // coverage circles/polygons. Toggle to declutter the map.
let pres=false;
let pendDel=null,modalCB=null;
let scaleM=100; // metres per 100px
// Undo/redo
let undoStack=[],redoStack=[];
// Zoom/pan
let scale=1,panX=0,panY=0;
let panning=false,panStartX=0,panStartY=0,panPrevX=0,panPrevY=0;
// Drag
let dragId=null,dragType=null,dragOffX=0,dragOffY=0;
let resId=null,resizeStartX=0,resizeStartR=0;
// Ruler (measurement tool)
let rulerStart=null;      // {x,y} in image coords, once the user has placed the first point
let rulerEnd=null;        // {x,y} once two clicks have happened; null while still hovering
let rulerHover=null;      // {x,y} current pointer position while waiting for 2nd click
// Wall (draw tool)
let wallStart=null;       // {x,y} in image coords
let wallHover=null;       // {x,y} while dragging out second point
// Grid
const GRID_SZ=50; // px in image space
// Search filter for left sidebar list. Empty string = show all.
let searchQuery='';
let _searchT=null;

// Shortcuts
const F=()=>FLOORS[curFloor];
const APS=()=>F().APS;
const DZS=()=>F().DZS;
const SWS=()=>F().SWS;
const WALLS=()=>F().WALLS||(F().WALLS=[]);

// ═══ DOM ══════════════════════════════════════════
const viewport=document.getElementById('vp'),canvas=document.getElementById('cv'),mapImg=document.getElementById('mi');
const svgLayer=document.getElementById('sl');
const apLayer=document.getElementById('ap-layer'),dzLayer=document.getElementById('dz-layer');
const swLayer=document.getElementById('sw-layer');
const olLayer=document.getElementById('ol-layer'),heatLayer=document.getElementById('heat-layer');
const gridLayer=document.getElementById('grid-layer');
const rulerLayer=document.getElementById('ruler-layer');
const wallLayer=document.getElementById('wall-layer');
// Minimap was removed. These references are kept as nulls so the rest of the
// codebase doesn't need changes; renderMM is a no-op below, and mmImg.src
// assignments are guarded with `if(mmImg)` checks throughout.
const mmImg=null,mmVp=null;
const leftList=document.getElementById('left-list'),rpBody=document.getElementById('rp-body');

// ═══ FLOORS ═══════════════════════════════════════
function renderFloorTabs(){
  const c=document.getElementById('floor-tabs');c.innerHTML='';
  const canDelete=FLOORS.length>1;
  FLOORS.forEach((f,i)=>{
    const t=document.createElement('div');
    t.className='ftab'+(i===curFloor?' active':'');
    // Name label
    const name=document.createElement('span');name.className='ftab-name';name.textContent=f.name;
    t.appendChild(name);
    // Delete × (only shown when more than one floor exists)
    if(canDelete){
      const x=document.createElement('button');
      x.className='ftab-del';x.textContent='×';x.title='Delete floor';
      x.addEventListener('click',e=>{
        e.stopPropagation();
        askDeleteFloor(i);
      });
      t.appendChild(x);
    }
    t.addEventListener('click',e=>{
      // Ignore clicks that originated on the delete × or while editing the name
      if(e.target.closest('.ftab-del'))return;
      if(t.classList.contains('editing'))return;
      switchFloor(i);
    });
    t.addEventListener('dblclick',e=>{
      // Also ignore double-clicks on the × (would otherwise open rename)
      if(e.target.closest('.ftab-del'))return;
      e.stopPropagation();
      startFloorRename(name,f);
    });
    c.appendChild(t);
  });
  document.getElementById('fl-cnt').textContent=FLOORS.length;
}
function askDeleteFloor(i){
  if(FLOORS.length<=1){toast('Cannot delete the only floor');return;}
  const f=FLOORS[i];
  const total=(f.APS?.length||0)+(f.DZS?.length||0)+(f.SWS?.length||0);
  const body=total>0
    ? `Delete <strong>${esc(f.name)}</strong>?<br><br>This will remove ${total} item${total===1?'':'s'} on this floor.`
    : `Delete <strong>${esc(f.name)}</strong>?`;
  showModal('Delete Floor',body,()=>deleteFloor(i));
}
function deleteFloor(i){
  if(FLOORS.length<=1)return;
  if(i<0||i>=FLOORS.length)return;
  snapshot();
  const removed=FLOORS[i];
  if(removed&&removed.imgId)idbDeleteImage(removed.imgId).catch(()=>{});
  FLOORS.splice(i,1);
  // Adjust curFloor so we stay on a valid index. If we deleted the current
  // floor, move to the one before it (or stay at 0 if it was the first).
  if(curFloor===i)curFloor=Math.max(0,i-1);
  else if(curFloor>i)curFloor--;
  selId=null;selType=null;
  loadFloorImage();renderFloorTabs();render();renderList();renderRP();
  toast('Floor deleted');
}
function startFloorRename(nameEl,floor){
  const tabEl=nameEl.parentElement;
  tabEl.classList.add('editing');
  nameEl.setAttribute('contenteditable','true');
  nameEl.focus();
  // Select all text inside the name span
  const range=document.createRange();range.selectNodeContents(nameEl);
  const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);
  const commit=()=>{
    const newName=nameEl.textContent.trim();
    tabEl.classList.remove('editing');
    nameEl.removeAttribute('contenteditable');
    if(newName&&newName!==floor.name){floor.name=newName;renderFloorTabs();}
    else{nameEl.textContent=floor.name;}
  };
  const cancel=()=>{
    tabEl.classList.remove('editing');
    nameEl.removeAttribute('contenteditable');
    nameEl.textContent=floor.name;
  };
  nameEl.addEventListener('blur',commit,{once:true});
  nameEl.addEventListener('keydown',function onKey(e){
    if(e.key==='Enter'){e.preventDefault();nameEl.removeEventListener('keydown',onKey);nameEl.blur();}
    else if(e.key==='Escape'){e.preventDefault();nameEl.removeEventListener('keydown',onKey);nameEl.removeEventListener('blur',commit);cancel();}
  });
}
function switchFloor(i){curFloor=i;selId=null;selType=null;loadFloorImage();renderFloorTabs();render();renderList();renderRP();}
function addFloor(){
  const defaultName='Floor '+(FLOORS.length+1);
  FLOORS.push({id:'f'+(++nid),name:defaultName,img:'',imgId:'',imgName:'',APS:[],DZS:[],SWS:[],WALLS:[]});
  switchFloor(FLOORS.length-1);
  toast('Floor added');
  // Immediately enter rename mode on the new tab so user can pick a real name
  setTimeout(()=>{
    const tabs=document.querySelectorAll('#floor-tabs .ftab');
    const last=tabs[tabs.length-1];
    if(last){
      const name=last.querySelector('.ftab-name');
      if(name)startFloorRename(name,FLOORS[FLOORS.length-1]);
    }
  },50);
}
function updateEmptyState(){
  const es=document.getElementById('empty-state');
  if(!es)return;
  const hasImage=F().img||F().imgId||(mapImg.src&&mapImg.naturalWidth>0);
  es.classList.toggle('hidden',!!hasImage);
}

function loadFloorImage(){
  const f=F();
  // Prefer the IDB-stored image (new path); fall back to the inline `img`
  // data URL so legacy projects loaded into memory (pre-migration) still
  // render correctly during the transition.
  const applySrc=(src,name)=>{
    mapImg.src=src||'';if(mmImg)mmImg.src=src||'';
    document.getElementById('brand-lbl').textContent=src?(SETTINGS.company||'NOCTIS')+' · '+(name||''):(SETTINGS.company||'NOCTIS')+' Planner';
    if(src&&mapImg.complete&&mapImg.naturalWidth>0){fitZoom();render();renderMM();updateScaleBar();calcCoverage();}
    updateEmptyState();
  };
  if(f.imgId){
    resolveFloorImage(f).then(src=>applySrc(src,f.imgName)).catch(()=>applySrc('',''));
  }else if(f.img){
    applySrc(f.img,f.imgName);
  }else{
    applySrc('','');
  }
}

// ═══ IMAGE UPLOAD ══════════════════════════════════
function uploadMap(input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=async e=>{
    const name=file.name.replace(/\.[^/.]+$/,'');
    const dataUrl=e.target.result;
    const oldId=F().imgId;
    const id=_newImgId();
    try{
      await idbPutImage(id,dataUrl);
      _imgCache.set(id,dataUrl);
      // Drop any stale inline data URL — IDB is now the source of truth.
      F().img='';F().imgId=id;F().imgName=name;
      mapImg.src=dataUrl;if(mmImg)mmImg.src=dataUrl;
      document.getElementById('brand-lbl').textContent=(SETTINGS.company||'NOCTIS')+' · '+name;
      updateEmptyState();
      toast('Map loaded: '+file.name);
      // Best-effort cleanup of the previous image, if any.
      if(oldId&&oldId!==id)idbDeleteImage(oldId).catch(()=>{});
    }catch(err){
      // IndexedDB unavailable or quota exceeded — fall back to inline so the
      // user isn't stuck. They'll see the autosave-quota toast if relevant.
      F().img=dataUrl;F().imgName=name;F().imgId='';
      mapImg.src=dataUrl;if(mmImg)mmImg.src=dataUrl;
      document.getElementById('brand-lbl').textContent=(SETTINGS.company||'NOCTIS')+' · '+name;
      updateEmptyState();
      toast('Map loaded (inline fallback)');
    }
  };
  reader.readAsDataURL(file);input.value='';
}
// onload handled in loadFloorImage()

// ═══ SAVE / LOAD PROJECT ══════════════════════════
// ═══ PROJECT VERSIONING ═══════════════════════════
const PROJECT_VERSION=5;  // bump this when FLOORS/APS schema changes in a breaking way

// Upgrade a loaded project's data to the current schema. Returns [migratedData, warnings[]].
// v4 → v5: floor images move from inline `img` data URLs to IndexedDB, keyed
// by `imgId`. Inline images stay in `img` here — applyLoadedProject() promotes
// them into IDB asynchronously after load (so the migrate function itself
// stays sync and pure for unit testing).
function migrateProject(data){
  const warnings=[];
  if(!data||typeof data!=='object'){throw new Error('Not a NOCTIS project file');}
  if(!Array.isArray(data.floors)){throw new Error('Missing floors');}
  const v=typeof data.version==='number'?data.version:1;
  if(v>PROJECT_VERSION){
    warnings.push(`Project was saved with a newer version (v${v}) — some fields may be ignored.`);
  }
  // v1 → v2: ensure every AP has a model, every item has a locked flag.
  // v2 → v3: APs get channel + txPower defaults.
  // v3 → v4: each floor gets a WALLS array.
  // v4 → v5: floor images move to IndexedDB; inline data URL kept until promoted.
  // (Note: prior versions had a cables feature — that data is ignored if present in old project files.)
  if(data.settings&&typeof data.settings==='object'){
    // Pull through known keys only — don't trust unknown values.
    const s={};for(const k of Object.keys(DEFAULT_SETTINGS)){if(typeof data.settings[k]==='string')s[k]=data.settings[k];}
    data.settings={...DEFAULT_SETTINGS,...s};
  }else{
    data.settings={...DEFAULT_SETTINGS};
  }
  data.floors.forEach(f=>{
    if(!f.imgId)f.imgId='';
    (f.APS||[]).forEach(ap=>{
      if(!ap.model)ap.model='U6 Pro';
      if(typeof ap.locked!=='boolean')ap.locked=false;
      if(!ap.sig)ap.sig='strong';
      if(typeof ap.r!=='number'||ap.r<=0)ap.r=80;
      if(!ap.channel)ap.channel='auto';
      if(!ap.txPower)ap.txPower='auto';
      if(typeof ap.color!=='string')ap.color='';
    });
    (f.DZS||[]).forEach(dz=>{if(typeof dz.locked!=='boolean')dz.locked=false;if(typeof dz.r!=='number')dz.r=40;});
    (f.SWS||[]).forEach(sw=>{
      if(typeof sw.locked!=='boolean')sw.locked=false;
      if(typeof sw.size!=='number'||sw.size<=0)sw.size=22;
    });
    if(!Array.isArray(f.WALLS))f.WALLS=[];
    f.WALLS.forEach(w=>{if(!w.material||!WALL_MATERIALS[w.material])w.material='drywall';});
  });
  data.version=PROJECT_VERSION;
  return [data,warnings];
}

// Strip per-item cache fields (`_coveragePath`, `_coverageFor`, etc.) so saved
// JSON stays small and never round-trips stale geometry into a future load.
function _stripCacheReplacer(k,v){return k.startsWith('_')?undefined:v;}
async function saveProject(){
  // Inline the IDB-stored images into the saved file so the project remains
  // self-contained when shared. The in-memory FLOORS keeps `imgId` only —
  // we serialize a copy with `img` populated for portability.
  const floorsForExport=await Promise.all(FLOORS.map(async f=>{
    const out={...f};
    if(f.imgId&&!f.img){
      try{const data=await idbGetImage(f.imgId);if(data)out.img=data;}catch(_){}
    }
    return out;
  }));
  const data={version:PROJECT_VERSION,settings:SETTINGS,floors:floorsForExport,scaleM,savedAt:new Date().toISOString()};
  const blob=new Blob([JSON.stringify(data,_stripCacheReplacer,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download='noctis_project.json';a.click();
  toast('Project saved');
}

// Clears all floors and starts a single fresh blank floor.
// Confirms first if there's anything to lose; also removes the autosave snapshot
// so the next page load doesn't offer to restore what the user just wiped.
function newProject(){
  const hasAny=FLOORS.some(f=>(f.APS?.length||f.DZS?.length||f.SWS?.length||(f.WALLS&&f.WALLS.length)||f.img||f.imgId));
  const doIt=async ()=>{
    // Drop any IDB-stored images for the floors we're discarding so the
    // database doesn't grow without bound across "New Project" cycles.
    const oldIds=FLOORS.map(f=>f.imgId).filter(Boolean);
    // Mutate FLOORS in place rather than reassigning the binding — this keeps
    // any existing references (tests, inspector debugging, closures) valid.
    FLOORS.length=0;
    FLOORS.push({id:'f1',name:'Floor 1',img:'',imgId:'',imgName:'',APS:[],DZS:[],SWS:[],WALLS:[]});
    curFloor=0;selId=null;selType=null;nid=1;
    scaleM=100;document.getElementById('scale-m').value=scaleM;
    try{localStorage.removeItem(AUTOSAVE_KEY);}catch(_){}
    for(const id of oldIds){idbDeleteImage(id).catch(()=>{});}
    lastAutosavePayload='';
    invalidateCoverageCache();
    loadFloorImage();renderFloorTabs();render();renderList();renderRP();calcCoverage();
    toast('New project');
  };
  if(hasAny){
    showModalText('New Project','Start a new project? Unsaved changes will be lost.',doIt);
  }else{
    doIt();
  }
}
function loadProject(input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=async e=>{
    try{
      const raw=JSON.parse(e.target.result);
      const [data,warnings]=migrateProject(raw);
      FLOORS=data.floors;scaleM=data.scaleM||100;
      SETTINGS={...DEFAULT_SETTINGS,...(data.settings||{})};
      document.getElementById('scale-m').value=scaleM;
      curFloor=0;selId=null;selType=null;
      syncNidFromFloors();
      // Promote any inline `img` data URL into IDB so subsequent autosaves
      // stay tiny. Done in parallel; failures fall back to the inline image.
      await Promise.all(FLOORS.map(async f=>{
        if(f.img&&!f.imgId){
          const id=_newImgId();
          try{await idbPutImage(id,f.img);_imgCache.set(id,f.img);f.imgId=id;f.img='';}catch(_){}
        }
      }));
      applySettingsToBrand();
      loadFloorImage();renderFloorTabs();render();renderList();renderRP();calcCoverage();
      if(warnings.length){toast(warnings[0]);}else{toast('Project loaded');}
    }catch(err){toast('Error loading project: '+(err.message||'invalid file'));}
  };
  reader.readAsText(file);input.value='';
}
// Update the top-bar brand label to whatever the current SETTINGS specify.
// Called after settings change or a project load.
function applySettingsToBrand(){
  const lbl=document.getElementById('brand-lbl');
  if(!lbl)return;
  const co=SETTINGS.company||'NOCTIS';
  const f=F();
  lbl.textContent=f&&f.imgName?co+' · '+f.imgName:co+' Planner';
}

// ═══ ID SYNC ══════════════════════════════════════
// After loading a project (from file or autosave), the global `nid` counter
// might be lower than the highest ID already in use. If we let `nid` reset
// to 1, the next placed AP gets an ID like "ap1" — which collides with an
// existing item. The collision causes findIndex() to return the wrong item
// later, so e.g. clicking "AP-22" in the list might select AP-16 (whichever
// has the same internal id).
//
// Run this whenever FLOORS is loaded or restored from outside.
function syncNidFromFloors(){
  let maxNum=0;
  for(const f of FLOORS){
    for(const list of [f.APS,f.DZS,f.SWS,f.WALLS]){
      if(!Array.isArray(list))continue;
      for(const item of list){
        if(!item.id)continue;
        // IDs look like "ap42", "dz3", "sw7", "cb12", "w19" — strip leading
        // letters and parse the trailing number.
        const m=String(item.id).match(/(\d+)$/);
        if(m){
          const n=parseInt(m[1],10);
          if(n>maxNum)maxNum=n;
        }
      }
    }
  }
  nid=maxNum+1;
}

// Pick the next available numeric suffix for an AP/DZ/SW name. Walks the
// existing names, finds the highest "AP-NN" / "Dead Zone N" / "SW-N" number,
// returns the next one. Prevents duplicate display names after deletions.
function nextNameSuffix(items,prefixRegex){
  let max=0;
  for(const it of items){
    const m=String(it.name||'').match(prefixRegex);
    if(m){const n=parseInt(m[1],10);if(n>max)max=n;}
  }
  return max+1;
}
function applyT(){
  // Clamp pan so the image stays connected to the viewport. Two regimes:
  //  - Image smaller than viewport on an axis → center it on that axis
  //  - Image larger than viewport → allow pan but keep at least an edge visible
  const va=viewport.getBoundingClientRect();
  const iw=(mapImg.naturalWidth||0)*scale;
  const ih=(mapImg.naturalHeight||0)*scale;
  if(iw>0&&ih>0){
    if(iw<=va.width){
      // Image fits horizontally — center it
      panX=(va.width-iw)/2;
    }else{
      // Image wider than viewport — allow pan, but keep a margin visible
      const margin=Math.min(va.width*.5,iw*.3);
      panX=Math.max(va.width-iw-margin,Math.min(margin,panX));
    }
    if(ih<=va.height){
      panY=(va.height-ih)/2;
    }else{
      const margin=Math.min(va.height*.5,ih*.3);
      panY=Math.max(va.height-ih-margin,Math.min(margin,panY));
    }
  }
  canvas.style.transform=`translate(${panX}px,${panY}px) scale(${scale})`;
  document.getElementById('zval').textContent=Math.round(scale*100)+'%';
  renderMM();updateScaleBar();
}

// Trigger a short transition on #cv so a discrete zoom (button click, keyboard)
// glides smoothly instead of snapping. Wheel/pinch do NOT call this — they're
// continuous and a transition would make them feel laggy.
let smoothTimeout=null;
function smoothZoom(delta){
  canvas.classList.add('smooth-zoom');
  doZoom(delta);
  clearTimeout(smoothTimeout);
  smoothTimeout=setTimeout(()=>canvas.classList.remove('smooth-zoom'),200);
}
function fitZoom(){
  if(!mapImg.naturalWidth)return;
  const va=viewport.getBoundingClientRect();
  scale=Math.min(va.width/mapImg.naturalWidth,va.height/mapImg.naturalHeight)*.96;
  panX=(va.width-mapImg.naturalWidth*scale)/2;panY=(va.height-mapImg.naturalHeight*scale)/2;applyT();
}
function doZoom(delta,cx,cy){
  const va=viewport.getBoundingClientRect();cx=cx??va.width/2;cy=cy??va.height/2;
  const prev=scale;
  // Multiplicative zoom: each step changes scale by the same *percentage* so
  // zooming feels consistent at any level. `delta` is now a factor-per-step
  // in the neighbourhood of ±0.15 (treat as a log-space delta).
  const factor=Math.exp(delta);
  scale=Math.max(.15,Math.min(8,prev*factor));
  const r=scale/prev;
  panX=cx-r*(cx-panX);panY=cy-r*(cy-panY);applyT();
}
viewport.addEventListener('wheel',e=>{
  e.preventDefault();
  const va=viewport.getBoundingClientRect();
  // Normalize wheel deltas across mouse / trackpad / mac / win.
  // deltaMode 0 = pixels (trackpads), 1 = lines (~16-40px), 2 = pages.
  // Clamp per-event delta so a big mouse-wheel kick doesn't jump half a screen.
  let d=e.deltaY;
  if(e.deltaMode===1)d*=16;            // convert lines → px equivalent
  else if(e.deltaMode===2)d*=va.height;
  d=Math.max(-120,Math.min(120,d));
  // Scale factor is a fraction of the delta magnitude, inverted (scroll up = zoom in).
  // 0.0025 gives a comfortable feel across hardware; at d=120 that's ~30% per tick.
  const factor=-d*0.0025;
  doZoom(factor,e.clientX-va.left,e.clientY-va.top);
},{passive:false});

let spaceDown=false;
document.addEventListener('keydown',e=>{if(e.code==='Space'&&e.target.tagName!=='INPUT'&&e.target.tagName!=='TEXTAREA'){spaceDown=true;e.preventDefault();}});
document.addEventListener('keyup',e=>{if(e.code==='Space')spaceDown=false;});

// Pointer events: unified handling for mouse, touch, and pen.
// When two touch points are active we yield to the pinch-zoom path below.
let activePointers=0;
viewport.addEventListener('pointerdown',e=>{
  activePointers++;
  // Don't engage drag/pan if this is the 2nd finger of a pinch gesture
  if(e.pointerType==='touch'&&activePointers>1){panning=false;dragId=null;resId=null;return;}
  // Middle-click / right-click / space+click = pan
  if(e.button===1||e.button===2||(e.button===0&&spaceDown)){
    e.preventDefault();panning=true;panStartX=e.clientX;panStartY=e.clientY;panPrevX=panX;panPrevY=panY;viewport.classList.add('cur-grabbing');
  }
});
viewport.addEventListener('contextmenu',e=>{
  e.preventDefault();
  // Find what was right-clicked: AP / DZ / SW group
  const apGroup=e.target.closest('.ap-grp');
  const dzGroup=e.target.closest('.dz-grp');
  const swGroup=e.target.closest('.sw-grp');
  if(apGroup){openItemContextMenu('ap',apGroup.dataset.id,e.clientX,e.clientY);return;}
  if(dzGroup){openItemContextMenu('dz',dzGroup.dataset.id,e.clientX,e.clientY);return;}
  if(swGroup){openItemContextMenu('sw',swGroup.dataset.id,e.clientX,e.clientY);return;}
});
document.addEventListener('pointermove',e=>{
  if(panning){panX=panPrevX+(e.clientX-panStartX);panY=panPrevY+(e.clientY-panStartY);applyT();return;}
  if(dragId)doDrag(e.clientX,e.clientY);
  if(resId)doResize(e.clientX);
  if(mode==='ruler'&&rulerStart&&!rulerEnd)updateRuler(e.clientX,e.clientY);
  if(mode==='wall'&&wallStart)updateWallPreview(e.clientX,e.clientY,e.shiftKey);
});
document.addEventListener('pointerup',()=>{activePointers=Math.max(0,activePointers-1);panning=false;viewport.classList.remove('cur-grabbing');endDrag();resId=null;});
document.addEventListener('pointercancel',()=>{activePointers=0;panning=false;viewport.classList.remove('cur-grabbing');endDrag();resId=null;});

let lastPD=0;
viewport.addEventListener('touchstart',e=>{if(e.touches.length===2)lastPD=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);},{passive:true});
viewport.addEventListener('touchmove',e=>{
  if(e.touches.length===2){e.preventDefault();const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);const va=viewport.getBoundingClientRect();doZoom((d-lastPD)*.008,(e.touches[0].clientX+e.touches[1].clientX)/2-va.left,(e.touches[0].clientY+e.touches[1].clientY)/2-va.top);lastPD=d;}
},{passive:false});

// ═══ COORDS ═══════════════════════════════════════
function vpToImg(cx,cy){const va=viewport.getBoundingClientRect();return{x:(cx-va.left-panX)/scale,y:(cy-va.top-panY)/scale};}
function snapPt(x,y){if(!showGrid)return{x,y};return{x:Math.round(x/GRID_SZ)*GRID_SZ,y:Math.round(y/GRID_SZ)*GRID_SZ};}
function imgToFrac(x,y){const w=mapImg.naturalWidth||1,h=mapImg.naturalHeight||1;return{fx:x/w,fy:y/h};}
function fracToImg(fx,fy){return{x:fx*(mapImg.naturalWidth||1),y:fy*(mapImg.naturalHeight||1)};}

// ═══ UNDO / REDO ══════════════════════════════════
// Snapshot the entire FLOORS array + curFloor + scaleM, not just the current
// floor — so cross-floor changes (delete floor, reorder, etc.) are reversible.
// Strips per-AP cache fields (anything starting with `_`) so the snapshot
// stays small and never resurrects stale geometry caches on undo.
function _serializeState(){
  return JSON.stringify({floors:FLOORS,curFloor,scaleM},(k,v)=>k.startsWith('_')?undefined:v);
}
function _restoreState(json){
  const s=JSON.parse(json);
  FLOORS=s.floors;
  curFloor=Math.max(0,Math.min(FLOORS.length-1,s.curFloor??0));
  scaleM=s.scaleM??100;
  const sEl=document.getElementById('scale-m');if(sEl)sEl.value=scaleM;
  invalidateCoverageCache();
}
function snapshot(){
  // Cancel any pending debounced snapshot — committing one synchronously
  // means we already have the right "before" state captured here.
  _snapPending=false;clearTimeout(_snapT);_snapT=null;
  undoStack.push(_serializeState());
  if(undoStack.length>50)undoStack.shift();
  redoStack=[];
  document.getElementById('btn-undo').disabled=false;
  document.getElementById('btn-redo').disabled=true;
}
// Debounced snapshot for streaming edits (sliders, text inputs). The first
// call within a quiet window captures the *pre-edit* state, then 400ms after
// the last call we commit. This way Undo jumps back across the whole edit
// burst (one visible step) instead of per-keystroke (many).
let _snapT=null,_snapPending=false,_snapPreState=null;
function snapshotSoon(){
  if(!_snapPending){
    _snapPending=true;
    _snapPreState=_serializeState();
  }
  clearTimeout(_snapT);
  _snapT=setTimeout(()=>{
    if(!_snapPending)return;
    _snapPending=false;
    undoStack.push(_snapPreState);
    if(undoStack.length>50)undoStack.shift();
    redoStack=[];
    document.getElementById('btn-undo').disabled=false;
    document.getElementById('btn-redo').disabled=true;
    _snapPreState=null;
  },400);
}
// Force commit immediately — call from blur handlers so leaving a field
// finalizes its snapshot without waiting for the timer.
function snapshotFlush(){
  if(!_snapPending)return;
  clearTimeout(_snapT);_snapT=null;
  _snapPending=false;
  undoStack.push(_snapPreState);
  if(undoStack.length>50)undoStack.shift();
  redoStack=[];
  document.getElementById('btn-undo').disabled=false;
  document.getElementById('btn-redo').disabled=true;
  _snapPreState=null;
}
function undo(){
  if(!undoStack.length)return;
  redoStack.push(_serializeState());
  _restoreState(undoStack.pop());
  selId=null;selType=null;
  loadFloorImage();renderFloorTabs();render();renderList();renderRP();calcCoverage();
  document.getElementById('btn-undo').disabled=!undoStack.length;
  document.getElementById('btn-redo').disabled=false;
  toast('Undo');
}
function redo(){
  if(!redoStack.length)return;
  undoStack.push(_serializeState());
  _restoreState(redoStack.pop());
  selId=null;selType=null;
  loadFloorImage();renderFloorTabs();render();renderList();renderRP();calcCoverage();
  document.getElementById('btn-redo').disabled=!redoStack.length;
  document.getElementById('btn-undo').disabled=false;
  toast('Redo');
}

// ═══ MODE ═════════════════════════════════════════
function setMode(m){
  mode=m;
  // Clear any in-progress ruler measurement when leaving ruler mode
  if(m!=='ruler'){rulerStart=null;renderRuler();}
  // Clear any in-progress wall when leaving wall mode
  if(m!=='wall'){wallStart=null;wallHover=null;renderWallPreview();}
  ['add','sel','dz','sw','ruler','wall'].forEach(mm=>document.getElementById('btn-'+mm)?.classList.toggle('active',mm===m));
  viewport.className=m==='sel'?'':m==='dz'?'cur-cell':m==='sw'?'cur-cell':'cur-cross';
  // Hint pill: show prominently for 3.5s on mode change, then fade to background.
  // The auto-fade keeps it visible enough to consult but unobtrusive while you work.
  const hintEl=document.getElementById('hint-bar');
  if(hintEl){
    hintEl.textContent=HINTS[m]||'';
    hintEl.classList.remove('faded');
    clearTimeout(hintEl._fadeT);
    hintEl._fadeT=setTimeout(()=>hintEl.classList.add('faded'),3500);
  }
}

// ═══ MAP CLICK ════════════════════════════════════
viewport.addEventListener('click',e=>{
  if(panning||spaceDown||e.button!==0)return;
  if(e.target.closest('.ap-grp,.dz-grp,.sw-grp'))return;
  if(!mapImg.naturalWidth){toast('Upload a map image first');return;}
  const raw=vpToImg(e.clientX,e.clientY);
  const {x,y}=snapPt(raw.x,raw.y);
  const {fx,fy}=imgToFrac(x,y);
  if(fx<0||fx>1||fy<0||fy>1){desel();return;}

  if(mode==='add'){
    snapshot();
    const id='ap'+nid++;
    const num=nextNameSuffix(APS(),/^AP-(\d+)/);
    APS().push({id,name:'AP-'+String(num).padStart(2,'0'),model:'U6 Pro',freq:'2.4 / 5 GHz',channel:'auto',txPower:'auto',sig:'strong',color:'',ip:'',mac:'',port:'',vlan:'',notes:'',fx,fy,r:rangeMToPx(AP_RANGE_M['U6 Pro']),locked:false});
    sel(id,'ap');setMode('sel');render();renderList();calcCoverage();toast('AP placed — edit in panel');
  }else if(mode==='dz'){
    snapshot();
    const id='dz'+nid++;
    const num=nextNameSuffix(DZS(),/^Dead Zone (\d+)/);
    DZS().push({id,label:'Dead Zone '+num,fx,fy,r:40,locked:false});
    sel(id,'dz');setMode('sel');render();renderList();toast('Dead zone marked');
  }else if(mode==='sw'){
    snapshot();
    const id='sw'+nid++;
    const num=nextNameSuffix(SWS(),/^SW-(\d+)/);
    SWS().push({id,name:'SW-'+num,model:'USW-24-PoE',ip:'',notes:'',fx,fy,size:22,locked:false});
    sel(id,'sw');setMode('sel');render();renderList();toast('Switch placed');
  }else if(mode==='ruler'){
    if(!rulerStart){
      rulerStart={x,y};rulerEnd=null;rulerHover={x,y};
    }else if(!rulerEnd){
      rulerEnd={x,y};
      const distM=Math.hypot(rulerEnd.x-rulerStart.x,rulerEnd.y-rulerStart.y)*(scaleM/100);
      toast(`${distM.toFixed(1)} m · Click again for new measurement`);
    }else{
      // Start a new measurement
      rulerStart={x,y};rulerEnd=null;rulerHover={x,y};
    }
    renderRuler();
  }else if(mode==='wall'){
    // Two-click wall drawing: first click = start, second click = commit
    if(!wallStart){
      wallStart={x,y};wallHover={x,y};renderWallPreview();
    }else{
      commitWall(x,y);
    }
  }else{
    desel();render();
  }
});

// ═══ ITEM GEOMETRY HELPERS ════════════════════════
function getItemCenter(type,id){
  const w=mapImg.naturalWidth||1,h=mapImg.naturalHeight||1;
  if(type==='ap'){const ap=APS().find(a=>a.id===id);return ap?{x:ap.fx*w,y:ap.fy*h}:null;}
  if(type==='sw'){const sw=SWS().find(a=>a.id===id);return sw?{x:sw.fx*w,y:sw.fy*h}:null;}
  if(type==='dz'){const dz=DZS().find(a=>a.id===id);return dz?{x:dz.fx*w,y:dz.fy*h}:null;}
  if(type==='wall'){const wl=WALLS().find(a=>a.id===id);return wl?{x:(wl.x1+wl.x2)/2,y:(wl.y1+wl.y2)/2}:null;}
  return null;
}
// Returns {x,y,w,h} in image coords describing the item's bounding box —
// used by zoomToSelected to pick an appropriate target scale.
function getItemBounds(type,id){
  const w=mapImg.naturalWidth||1,h=mapImg.naturalHeight||1;
  if(type==='ap'){const ap=APS().find(a=>a.id===id);return ap?{x:ap.fx*w-ap.r,y:ap.fy*h-ap.r,w:ap.r*2,h:ap.r*2}:null;}
  if(type==='dz'){const dz=DZS().find(a=>a.id===id);return dz?{x:dz.fx*w-dz.r,y:dz.fy*h-dz.r,w:dz.r*2,h:dz.r*2}:null;}
  if(type==='sw'){const sw=SWS().find(a=>a.id===id);if(!sw)return null;const sz=sw.size||22;return {x:sw.fx*w-sz,y:sw.fy*h-sz*.6,w:sz*2,h:sz*1.2};}
  if(type==='wall'){const wl=WALLS().find(a=>a.id===id);if(!wl)return null;const x=Math.min(wl.x1,wl.x2),y=Math.min(wl.y1,wl.y2);return {x,y,w:Math.abs(wl.x2-wl.x1)+1,h:Math.abs(wl.y2-wl.y1)+1};}
  return null;
}

// ═══ RULER ════════════════════════════════════════
function renderRuler(){
  rulerLayer.innerHTML='';
  if(!rulerStart)return;
  // Endpoint: either the locked second click, or the current hover
  const end=rulerEnd||rulerHover;
  if(!end)return;
  const a=rulerStart,b=end;
  const distPx=Math.hypot(b.x-a.x,b.y-a.y);
  const distM=(distPx*(scaleM/100)).toFixed(1);
  const mx=(a.x+b.x)/2,my=(a.y+b.y)/2;

  const line=mk('line');
  line.setAttribute('x1',a.x);line.setAttribute('y1',a.y);
  line.setAttribute('x2',b.x);line.setAttribute('y2',b.y);
  line.setAttribute('class','ruler-line');
  rulerLayer.appendChild(line);

  // Endpoint markers
  for(const p of [a,b]){
    const c=mk('circle');
    c.setAttribute('cx',p.x);c.setAttribute('cy',p.y);c.setAttribute('r',4);
    c.setAttribute('class','ruler-pt');
    rulerLayer.appendChild(c);
  }
  // Tick marks at each end, perpendicular to the line
  const angle=Math.atan2(b.y-a.y,b.x-a.x);
  const tickLen=10;
  const perp={x:-Math.sin(angle)*tickLen,y:Math.cos(angle)*tickLen};
  for(const p of [a,b]){
    const tick=mk('line');
    tick.setAttribute('x1',p.x-perp.x);tick.setAttribute('y1',p.y-perp.y);
    tick.setAttribute('x2',p.x+perp.x);tick.setAttribute('y2',p.y+perp.y);
    tick.setAttribute('class','ruler-tick');
    rulerLayer.appendChild(tick);
  }
  // Distance label — background pill + text
  const lblBg=mk('rect');
  const lblW=60,lblH=18;
  lblBg.setAttribute('x',mx-lblW/2);lblBg.setAttribute('y',my-lblH/2);
  lblBg.setAttribute('width',lblW);lblBg.setAttribute('height',lblH);
  lblBg.setAttribute('rx',9);lblBg.setAttribute('class','ruler-lbl-bg');
  rulerLayer.appendChild(lblBg);
  const lbl=mk('text');
  lbl.setAttribute('x',mx);lbl.setAttribute('y',my);
  lbl.setAttribute('class','ruler-lbl');
  lbl.textContent=distM+' m';
  rulerLayer.appendChild(lbl);
}
function updateRuler(cx,cy){
  if(mode!=='ruler'||!rulerStart||rulerEnd)return;
  const img=vpToImg(cx,cy);
  rulerHover={x:img.x,y:img.y};
  renderRuler();
}
function clearRuler(){
  rulerStart=null;rulerEnd=null;rulerHover=null;
  renderRuler();
}

// ═══ WALLS ════════════════════════════════════════
// Drawn as straight line segments between two points, with per-material
// stroke width. Selected wall gets a highlight + a small material label pill.
function renderWalls(){
  wallLayer.innerHTML='';
  WALLS().forEach(w=>{
    const mat=WALL_MATERIALS[w.material]||WALL_MATERIALS.drywall;
    const isSel=(selType==='wall'&&selId===w.id);
    // Thin highlight underlay when selected
    if(isSel){
      const hl=mk('line');
      hl.setAttribute('x1',w.x1);hl.setAttribute('y1',w.y1);
      hl.setAttribute('x2',w.x2);hl.setAttribute('y2',w.y2);
      hl.setAttribute('class','wall-sel-hl');
      wallLayer.appendChild(hl);
    }
    const ln=mk('line');
    ln.setAttribute('x1',w.x1);ln.setAttribute('y1',w.y1);
    ln.setAttribute('x2',w.x2);ln.setAttribute('y2',w.y2);
    ln.setAttribute('class','wall-line');
    ln.setAttribute('stroke-width',mat.strokeWidth);
    if(mat.dash)ln.setAttribute('stroke-dasharray',mat.dash);
    ln.dataset.id=w.id;
    ln.style.pointerEvents='stroke';
    ln.style.cursor='pointer';
    ln.addEventListener('pointerdown',e=>{
      if(mode==='sel'){e.stopPropagation();sel(w.id,'wall');}
    });
    wallLayer.appendChild(ln);
    // Draw a small material pill near the midpoint when selected
    if(isSel){
      const mx=(w.x1+w.x2)/2,my=(w.y1+w.y2)/2;
      const bg=mk('rect');
      bg.setAttribute('x',mx-22);bg.setAttribute('y',my-9);
      bg.setAttribute('width',44);bg.setAttribute('height',18);
      bg.setAttribute('rx',9);bg.setAttribute('class','wall-lbl-bg');
      wallLayer.appendChild(bg);
      const lbl=mk('text');
      lbl.setAttribute('x',mx);lbl.setAttribute('y',my);
      lbl.setAttribute('class','wall-lbl');
      lbl.textContent=mat.label;
      wallLayer.appendChild(lbl);
    }
  });
  renderWallPreview();
}
function renderWallPreview(){
  // Remove any existing preview line
  const prev=wallLayer.querySelector('.wall-preview');
  if(prev)prev.remove();
  if(!wallStart||!wallHover)return;
  const ln=mk('line');
  ln.setAttribute('x1',wallStart.x);ln.setAttribute('y1',wallStart.y);
  ln.setAttribute('x2',wallHover.x);ln.setAttribute('y2',wallHover.y);
  ln.setAttribute('class','wall-line wall-preview');
  ln.setAttribute('stroke-width','1.5');
  wallLayer.appendChild(ln);
}
function updateWallPreview(cx,cy,shift){
  if(mode!=='wall'||!wallStart)return;
  const img=vpToImg(cx,cy);
  let x=img.x,y=img.y;
  if(shift){
    // Constrain to nearest 45° multiple
    const dx=x-wallStart.x,dy=y-wallStart.y;
    const angle=Math.atan2(dy,dx);
    const snapped=Math.round(angle/(Math.PI/4))*(Math.PI/4);
    const len=Math.hypot(dx,dy);
    x=wallStart.x+Math.cos(snapped)*len;
    y=wallStart.y+Math.sin(snapped)*len;
  }
  wallHover={x,y};
  renderWallPreview();
}
function commitWall(x2,y2){
  if(!wallStart)return;
  // Avoid zero-length walls from accidental double-clicks
  if(Math.hypot(x2-wallStart.x,y2-wallStart.y)<3){wallStart=null;wallHover=null;renderWallPreview();return;}
  snapshot();
  WALLS().push({
    id:'w'+(++nid),
    x1:wallStart.x,y1:wallStart.y,
    x2,y2,
    material:'drywall',
  });
  wallStart=null;wallHover=null;
  invalidateCoverageCache();
  render();renderList();
  toast('Wall added — drywall by default');
}

// ═══ SELECTION ════════════════════════════════════
function sel(id,type,options){
  selId=id;selType=type;
  render();renderList();renderRP();
  // When selection came from a non-map source (list item, context menu from list),
  // ease the viewport so the item is centered & visible. The caller passes
  // {zoom:true} to request this. Direct map clicks leave the viewport alone.
  if(options&&options.zoom){zoomToItem(type,id);}
}

// Smoothly pan + zoom so the given item fills a comfortable portion of the viewport.
// Uses the same .smooth-zoom CSS transition the zoom buttons use.
function zoomToItem(type,id){
  const bounds=getItemBounds(type,id);
  if(!bounds)return;
  const va=viewport.getBoundingClientRect();
  if(!va.width||!va.height)return;
  // Target scale: fit the item into ~40% of the viewport (so there's generous padding).
  // Bounded to the same [.08, 8] that doZoom uses.
  const padding=0.4;
  const sx=va.width/(bounds.w/padding);
  const sy=va.height/(bounds.h/padding);
  const targetScale=Math.max(0.4, Math.min(4, Math.min(sx,sy)));
  // Target pan: put the item's center at the viewport center at the new scale.
  const centerX=bounds.x+bounds.w/2;
  const centerY=bounds.y+bounds.h/2;
  const targetPanX=va.width/2-centerX*targetScale;
  const targetPanY=va.height/2-centerY*targetScale;
  // Apply with transition
  canvas.classList.add('smooth-zoom');
  scale=targetScale;panX=targetPanX;panY=targetPanY;applyT();
  clearTimeout(smoothTimeout);
  smoothTimeout=setTimeout(()=>canvas.classList.remove('smooth-zoom'),220);
}
function desel(){selId=null;selType=null;renderRP();render();renderList();}

// ═══ DUPLICATE ════════════════════════════════════
function duplicateSelected(){
  if(selType!=='ap')return;
  const ap=APS().find(a=>a.id===selId);if(!ap)return;
  snapshot();
  const id='ap'+nid++;
  APS().push({...ap,id,name:ap.name+'-copy',fx:Math.min(1,ap.fx+0.05),fy:Math.min(1,ap.fy+0.05)});
  sel(id,'ap');render();renderList();calcCoverage();toast('AP duplicated');
}

// ═══ LOCK ═════════════════════════════════════════
function toggleLock(){
  if(!selId)return;
  if(selType==='ap'){const ap=APS().find(a=>a.id===selId);if(ap){ap.locked=!ap.locked;render();renderList();renderRP();}}
  else if(selType==='dz'){const dz=DZS().find(a=>a.id===selId);if(dz){dz.locked=!dz.locked;render();renderList();renderRP();}}
  else if(selType==='sw'){const sw=SWS().find(a=>a.id===selId);if(sw){sw.locked=!sw.locked;render();renderList();renderRP();}}
}

// ═══ RENDER ═══════════════════════════════════════
function mk(tag){return document.createElementNS('http://www.w3.org/2000/svg',tag);}

function renderAPs(){
  apLayer.innerHTML='';
  const w=mapImg.naturalWidth,h=mapImg.naturalHeight;
  // If no image loaded yet, don't render APs at all — they'd land at (0,0)
  // as a phantom cluster.
  if(!w||!h)return;
  APS().forEach(ap=>{
    // Skip APs with invalid data rather than render a bogus circle at origin.
    if(!Number.isFinite(ap.fx)||!Number.isFinite(ap.fy)||!Number.isFinite(ap.r)||ap.r<=0){
      console.warn('Skipping AP with invalid coords:',ap);
      return;
    }
    const cx=ap.fx*w,cy=ap.fy*h,r=ap.r,isSel=ap.id===selId;
    const ls=Math.max(8,Math.min(14,r*.17));
    const g=mk('g');g.setAttribute('class','ap-grp');g.dataset.id=ap.id;g.style.pointerEvents='all';
    if(ap.locked)g.style.opacity='.7';

    const hasWalls=WALLS().length>0;
    // Per-AP color (empty string = use default ink — no override)
    const apColor=ap.color||'';
    // Outer coverage: wall-clipped path if walls exist, else simple circle
    let ro;
    if(hasWalls){
      ro=mk('path');
      ro.setAttribute('d',getCoveragePath(ap));
    }else{
      ro=mk('circle');ro.setAttribute('cx',cx);ro.setAttribute('cy',cy);ro.setAttribute('r',r);
    }
    ro.setAttribute('class',isSel?'ap-sel-outer':ap.sig==='medium'?'ap-outer-m':ap.sig==='weak'?'ap-outer-w':'ap-outer');
    if(apColor){
      // Override the ink-black defaults with the AP's color. We keep the fill
      // transparent-ish (8% alpha) so overlapping coverage areas still mix visually.
      ro.style.stroke=apColor;
      ro.style.fill=hexToRgba(apColor,.08);
    }
    // Only animate the spin when we're showing a plain circle — spinning a
    // polygon looks wrong because its shape is directional.
    if(!hasWalls){ro.style.transformOrigin=`${cx}px ${cy}px`;ro.style.animation='spin 20s linear infinite';}

    // Inner ring: same trick but at 54% radius. Compute a second path with
    // a temporarily smaller r so we reuse computeCoveragePath.
    let ri;
    if(hasWalls){
      ri=mk('path');
      ri.setAttribute('d',getInnerCoveragePath(ap));
    }else{
      ri=mk('circle');ri.setAttribute('cx',cx);ri.setAttribute('cy',cy);ri.setAttribute('r',r*.54);
    }
    ri.setAttribute('class',isSel?'ap-sel-inner':ap.sig==='medium'?'ap-inner-m':ap.sig==='weak'?'ap-inner-w':'ap-inner');
    if(apColor){
      ri.style.stroke=apColor;
      ri.style.fill=hexToRgba(apColor,.12);
    }

    const dot=mk('circle');dot.setAttribute('cx',cx);dot.setAttribute('cy',cy);dot.setAttribute('r',7);
    dot.setAttribute('class',isSel?'ap-sel-dot':'ap-dot');dot.setAttribute('filter','url(#gf)');
    dot.style.animation='pulse 2.2s ease-in-out infinite';
    if(apColor)dot.style.fill=apColor;

    // On-map label: just the AP name. Model + all other technical details are
    // visible in the right-side properties panel when an AP is selected.
    const lbl=mk('text');lbl.setAttribute('x',cx);lbl.setAttribute('y',cy);
    lbl.setAttribute('class',isSel?'ap-lbl-sel':'ap-lbl');lbl.setAttribute('font-size',ls);lbl.textContent=ap.name;
    if(apColor)lbl.style.fill=apColor;

    // Notes dot
    if(ap.notes&&ap.notes.trim()){
      const nd=mk('circle');nd.setAttribute('cx',cx+r*.22);nd.setAttribute('cy',cy-r*.22);
      nd.setAttribute('r',Math.max(3,ls*.38));nd.setAttribute('fill',isSel?tInk():tInk(.55));nd.setAttribute('opacity','.85');
      g.appendChild(nd);
    }
    // Locked APs are indicated in the left sidebar list (🔒 next to name) and
    // in the properties panel — no on-map icon, since it clutters the map.

    // Range is edited via the properties panel slider only — no on-map handle.

    // The coverage rings (outer + inner, including the selection-highlighted
    // versions) are part of the coverage visualization — they hide when the
    // user toggles coverage off. The center dot stays because it's the AP
    // marker itself, not a coverage indicator.
    const parts=[dot,lbl];
    if(showCoverage){parts.unshift(ro,ri);}
    parts.forEach(el=>g.appendChild(el));
    g.addEventListener('pointerdown',e=>{
      if(e.target.dataset.resize)return;
      e.stopPropagation();
      if(e.shiftKey&&mode==='sel'){duplicateSelected();return;}
      sel(ap.id,'ap');
      if(!ap.locked){const img=vpToImg(e.clientX,e.clientY);dragOffX=ap.fx*w-img.x;dragOffY=ap.fy*h-img.y;dragId=ap.id;dragType='ap';_dragInitialFx=ap.fx;_dragInitialFy=ap.fy;}
    });
    apLayer.appendChild(g);
  });
}

function renderDZs(){
  dzLayer.innerHTML='';
  const w=mapImg.naturalWidth,h=mapImg.naturalHeight;
  if(!w||!h)return;
  DZS().forEach(dz=>{
    if(!Number.isFinite(dz.fx)||!Number.isFinite(dz.fy)||!Number.isFinite(dz.r)||dz.r<=0)return;
    const cx=dz.fx*w,cy=dz.fy*h,isSel=dz.id===selId;
    const g=mk('g');g.setAttribute('class','dz-grp');g.dataset.id=dz.id;g.style.pointerEvents='all';
    const pulse=mk('circle');pulse.setAttribute('cx',cx);pulse.setAttribute('cy',cy);pulse.setAttribute('r',dz.r);
    pulse.setAttribute('class','dz-pulse');pulse.style.transformOrigin=`${cx}px ${cy}px`;pulse.style.animation='dzs 8s linear infinite';
    if(isSel){pulse.style.stroke=tInk();pulse.style.strokeWidth='2.5';pulse.style.fill=tInk(.1);}
    const icon=mk('text');icon.setAttribute('x',cx);icon.setAttribute('y',cy);icon.setAttribute('text-anchor','middle');icon.setAttribute('dominant-baseline','central');icon.setAttribute('font-size','18');icon.setAttribute('fill',tInk());icon.textContent='⚠';
    const lbl=mk('text');lbl.setAttribute('x',cx);lbl.setAttribute('y',cy+dz.r+11);lbl.setAttribute('text-anchor','middle');lbl.setAttribute('font-size','10');lbl.setAttribute('font-family','Rajdhani,sans-serif');lbl.setAttribute('font-weight','700');lbl.setAttribute('letter-spacing','.1em');lbl.setAttribute('fill',tInk());lbl.setAttribute('paint-order','stroke');lbl.setAttribute('stroke',tBg());lbl.setAttribute('stroke-width','3');lbl.textContent=(dz.label||'').toUpperCase();
    if(isSel&&!dz.locked){const rh=mk('circle');rh.setAttribute('cx',cx+dz.r);rh.setAttribute('cy',cy);rh.setAttribute('r',8);rh.setAttribute('class','rh-sel');rh.dataset.resizeDz=dz.id;rh.style.pointerEvents='all';rh.addEventListener('pointerdown',e=>{e.stopPropagation();resId=dz.id;resizeStartX=e.clientX;resizeStartR=dz.r;});g.appendChild(rh);}
    [pulse,icon,lbl].forEach(el=>g.appendChild(el));
    g.addEventListener('pointerdown',e=>{e.stopPropagation();sel(dz.id,'dz');if(!dz.locked){const img=vpToImg(e.clientX,e.clientY);dragOffX=dz.fx*w-img.x;dragOffY=dz.fy*h-img.y;dragId=dz.id;dragType='dz';_dragInitialFx=dz.fx;_dragInitialFy=dz.fy;}});
    dzLayer.appendChild(g);
  });
}

function renderSWs(){
  swLayer.innerHTML='';
  const w=mapImg.naturalWidth,h=mapImg.naturalHeight;
  if(!w||!h)return;
  SWS().forEach(sw=>{
    if(!Number.isFinite(sw.fx)||!Number.isFinite(sw.fy))return;
    const cx=sw.fx*w,cy=sw.fy*h,isSel=sw.id===selId;
    const g=mk('g');g.setAttribute('class','sw-grp');g.dataset.id=sw.id;g.style.pointerEvents='all';
    const sz=sw.size||22;
    // Box and icon sizes scale with sz so a bigger switch reads as a bigger icon, not just a bigger empty box.
    const iconFs=Math.max(8,sz*.65);
    const lblFs=Math.max(7,sz*.42);
    const box=mk('rect');box.setAttribute('x',cx-sz);box.setAttribute('y',cy-sz*.6);
    box.setAttribute('width',sz*2);box.setAttribute('height',sz*1.2);box.setAttribute('rx',2);
    box.setAttribute('fill',isSel?tInk(.1):tInk(.04));
    box.setAttribute('stroke',tInk());box.setAttribute('stroke-width',isSel?'2':'1.2');
    const icon=mk('text');icon.setAttribute('x',cx);icon.setAttribute('y',cy);icon.setAttribute('text-anchor','middle');icon.setAttribute('dominant-baseline','central');icon.setAttribute('font-size',iconFs);icon.setAttribute('fill',tInk());icon.textContent='⊞';
    const lbl=mk('text');lbl.setAttribute('x',cx);lbl.setAttribute('y',cy+sz*.9);lbl.setAttribute('text-anchor','middle');lbl.setAttribute('font-size',lblFs);lbl.setAttribute('font-family','Rajdhani,sans-serif');lbl.setAttribute('font-weight','700');lbl.setAttribute('letter-spacing','.08em');lbl.setAttribute('fill',tInk());lbl.setAttribute('paint-order','stroke');lbl.setAttribute('stroke',tBg());lbl.setAttribute('stroke-width','2.5');lbl.textContent=(sw.name||'').toUpperCase();
    [box,icon,lbl].forEach(el=>g.appendChild(el));
    g.addEventListener('pointerdown',e=>{
      e.stopPropagation();
      sel(sw.id,'sw');
      if(!sw.locked){const img=vpToImg(e.clientX,e.clientY);dragOffX=sw.fx*w-img.x;dragOffY=sw.fy*h-img.y;dragId=sw.id;dragType='sw';_dragInitialFx=sw.fx;_dragInitialFy=sw.fy;}
    });
    swLayer.appendChild(g);
  });
}

function renderOL(){
  olLayer.innerHTML='';if(!showOL)return;
  const w=mapImg.naturalWidth||1,h=mapImg.naturalHeight||1;
  for(let i=0;i<APS().length;i++)for(let j=i+1;j<APS().length;j++){
    const a=APS()[i],b=APS()[j];
    const ax=a.fx*w,ay=a.fy*h,bx=b.fx*w,by=b.fy*h;
    const dist=Math.hypot(ax-bx,ay-by);
    if(dist<a.r+b.r){const c=mk('circle');c.setAttribute('cx',(ax+bx)/2);c.setAttribute('cy',(ay+by)/2);c.setAttribute('r',Math.max(8,(a.r+b.r-dist)*.42));c.setAttribute('class','ol-zone');olLayer.appendChild(c);}
  }
}

function renderHeat(){
  heatLayer.innerHTML='';if(!showHeat)return;
  const w=mapImg.naturalWidth||1,h=mapImg.naturalHeight||1;
  APS().forEach(ap=>{
    const cx=ap.fx*w,cy=ap.fy*h;
    [{r:ap.r*.55,cls:'heatmap-strong'},{r:ap.r*.78,cls:'heatmap-medium'},{r:ap.r,cls:'heatmap-weak'}].forEach(({r,cls})=>{
      const c=mk('circle');c.setAttribute('cx',cx);c.setAttribute('cy',cy);c.setAttribute('r',r);c.setAttribute('class',cls);
      heatLayer.appendChild(c);
    });
  });
}

function renderGrid(){
  gridLayer.innerHTML='';if(!showGrid)return;
  const w=mapImg.naturalWidth||1,h=mapImg.naturalHeight||1;
  const g=mk('g');g.setAttribute('class','snap-grid');
  for(let x=0;x<=w;x+=GRID_SZ){const l=mk('line');l.setAttribute('x1',x);l.setAttribute('y1',0);l.setAttribute('x2',x);l.setAttribute('y2',h);g.appendChild(l);}
  for(let y=0;y<=h;y+=GRID_SZ){const l=mk('line');l.setAttribute('x1',0);l.setAttribute('y1',y);l.setAttribute('x2',w);l.setAttribute('y2',y);g.appendChild(l);}
  gridLayer.appendChild(g);
}

function render(){_resetThemeCache();renderGrid();renderHeat();renderOL();renderWalls();renderSWs();renderAPs();renderDZs();renderRuler();updateCnt();}

// ═══ DRAG ═════════════════════════════════════════
// During an active drag we update the moved item's geometry directly via a
// `transform` translate on its <g>, rather than re-running render() (which
// wipes and rebuilds every SVG layer). This keeps drag at 60fps even with
// dozens of items + walls (where coverage is O(rays * walls) per AP).
// On pointerup the full render runs once and clears the transform.
let _dragInitialFx=0,_dragInitialFy=0;
function doDrag(cx,cy){
  const img=vpToImg(cx,cy);
  const {x,y}=snapPt(img.x,img.y);
  const w=mapImg.naturalWidth||1,h=mapImg.naturalHeight||1;
  const fx=Math.max(0,Math.min(1,(x+dragOffX)/w)),fy=Math.max(0,Math.min(1,(y+dragOffY)/h));
  let item=null;
  if(dragType==='ap')item=APS().find(a=>a.id===dragId);
  else if(dragType==='dz')item=DZS().find(a=>a.id===dragId);
  else if(dragType==='sw')item=SWS().find(a=>a.id===dragId);
  if(!item)return;
  item.fx=fx;item.fy=fy;
  // For APs with walls the coverage *shape* depends on position, so we still
  // need a full re-render. Plain circle coverage rotates with the AP, so a
  // transform is fine. DZ/SW are always handled as transforms.
  const apHasWalls=(dragType==='ap'&&WALLS().length>0);
  if(apHasWalls){
    invalidateCoverageCache();
    render();
    return;
  }
  const layer=dragType==='ap'?apLayer:dragType==='dz'?dzLayer:swLayer;
  const grp=layer.querySelector(`[data-id="${dragId}"]`);
  if(grp){
    const dx=(fx-_dragInitialFx)*w;
    const dy=(fy-_dragInitialFy)*h;
    grp.setAttribute('transform',`translate(${dx},${dy})`);
  }else{
    render();
  }
}
function endDrag(){
  if(!dragId)return;
  // Clear the per-element transform and do one full render so the item's real
  // coords (now updated on the data) are reflected everywhere.
  const layer=dragType==='ap'?apLayer:dragType==='dz'?dzLayer:dragType==='sw'?swLayer:null;
  if(layer){const grp=layer.querySelector(`[data-id="${dragId}"]`);if(grp)grp.removeAttribute('transform');}
  if(dragType==='ap')invalidateCoverageCache();
  dragId=null;dragType=null;
  render();calcCoverage();
}
function doResize(cx){
  const img=vpToImg(cx,0);
  const ap=APS().find(a=>a.id===resId);
  if(ap){ap.r=Math.max(15,Math.min(500,Math.abs(img.x-ap.fx*(mapImg.naturalWidth||1))));const slider=document.getElementById('ep-r');if(slider){slider.value=Math.round(ap.r);document.getElementById('ep-rv').textContent=Math.round(ap.r*(scaleM/100))+'m';}render();calcCoverage();return;}
  const dz=DZS().find(a=>a.id===resId);
  if(dz){dz.r=Math.max(10,Math.min(300,Math.abs(img.x-dz.fx*(mapImg.naturalWidth||1))));const slider=document.getElementById('dz-r');if(slider){slider.value=Math.round(dz.r);document.getElementById('dz-rv').textContent=Math.round(dz.r*(scaleM/100))+'m';}render();}
}

// ═══ COVERAGE CALC ════════════════════════════════
// Sample a floor for coverage: return {covered, total} pixel-equivalent counts.
// Wall-aware: when walls are present, a sample point is "covered" only if at
// least one AP can reach it through the walls (cumulative dB attenuation
// applied along the line from AP to sample). When there are no walls we use
// the cheap distance check. The wall-aware path is O(samples * APs * walls)
// — bounded by the coarse sample step (~60 across the smaller axis).
function _coveredThroughWalls(ap,sx,sy,w,h,walls){
  const ax=ap.fx*w, ay=ap.fy*h;
  const dist=Math.hypot(sx-ax,sy-ay);
  if(dist>ap.r)return false;
  if(!walls.length)return true;
  // Sum dB loss for every wall segment between AP and sample point.
  let lossDb=0;
  for(const wl of walls){
    const t=rayWallIntersect(ax,ay,sx,sy, wl.x1,wl.y1, wl.x2,wl.y2);
    if(t!==null){
      const mat=WALL_MATERIALS[wl.material]||WALL_MATERIALS.drywall;
      lossDb+=mat.loss;
    }
  }
  // Effective reach after attenuation (same factor used by computeCoveragePath).
  return dist <= ap.r * attenuationFactor(lossDb);
}
function sampleFloorCoverage(floor){
  const w=mapImg.naturalWidth||1,h=mapImg.naturalHeight||1;
  const aps=floor.APS||[];
  if(!aps.length)return {covered:0,total:0};
  const walls=floor.WALLS||[];
  const step=Math.max(4,Math.round(Math.min(w,h)/60));
  let total=0,covered=0;
  for(let x=0;x<w;x+=step)for(let y=0;y<h;y+=step){
    total++;
    if(aps.some(ap=>_coveredThroughWalls(ap,x,y,w,h,walls)))covered++;
  }
  return {covered,total};
}
// Wall-aware sampling is heavier than the old circle check, so coalesce calls
// during fast operations (drag, slider scrub). `calcCoverage()` schedules the
// real work; `_calcCoverageNow()` does it. Skipped when the tab is hidden.
let _covScheduled=false;
function calcCoverage(){
  if(_covScheduled)return;
  if(typeof document!=='undefined'&&document.hidden)return;
  _covScheduled=true;
  const run=()=>{_covScheduled=false;_calcCoverageNow();};
  if(typeof requestIdleCallback==='function')requestIdleCallback(run,{timeout:200});
  else setTimeout(run,80);
}
function _calcCoverageNow(){
  const el=document.getElementById('cov-pct');
  if(!el)return;
  // Current floor
  const cur=sampleFloorCoverage(F());
  if(!cur.total){el.textContent='—';return;}
  const curPct=Math.round(cur.covered/cur.total*100);
  // Whole building — but only show it if >1 floor exists
  if(FLOORS.length>1){
    let totalC=0,totalT=0;
    FLOORS.forEach(f=>{const s=sampleFloorCoverage(f);totalC+=s.covered;totalT+=s.total;});
    const allPct=totalT?Math.round(totalC/totalT*100):0;
    el.innerHTML=`${curPct}%<span class="cov-all"> · All: ${allPct}%</span>`;
  }else{
    el.textContent=curPct+'%';
  }
}

// ═══ SCALE ════════════════════════════════════════
function updateScale(){scaleM=parseFloat(document.getElementById('scale-m').value)||100;updateScaleBar();calcCoverage();render();}
function updateScaleBar(){
  const bar=document.getElementById('scale-bar');
  if(!scaleM||!mapImg.naturalWidth){bar.style.display='none';return;}
  bar.style.display='flex';
  // 100px in image space = scaleM metres; in screen space = 100*sc px
  const screenPx=100*scale;
  document.getElementById('sbar-line').style.width=screenPx+'px';
  document.getElementById('sbar-txt').textContent=scaleM+'m';
}

// ═══ TOGGLES ══════════════════════════════════════
function toggleOL(){showOL=!showOL;document.getElementById('btn-ol').classList.toggle('active',showOL);document.getElementById('leg-ol').style.display=showOL?'flex':'none';render();}
function toggleHeat(){showHeat=!showHeat;document.getElementById('btn-heat').classList.toggle('active',showHeat);render();}
function toggleGrid(){showGrid=!showGrid;document.getElementById('btn-grid').classList.toggle('active',showGrid);render();}
function toggleCoverage(){
  showCoverage=!showCoverage;
  document.getElementById('btn-cov').classList.toggle('active',showCoverage);
  render();
}

// ═══ MINIMAP ══════════════════════════════════════
// Minimap was removed by user request. renderMM kept as a no-op so call sites
// throughout the codebase don't have to be ripped out.
function renderMM(){}

// ═══ RIGHT PANEL ══════════════════════════════════
function renderRP(){
  const rph=document.getElementById('rp-head');
  if(!selId){rph.textContent='Properties';rpBody.innerHTML='<div class="rp-empty"><div class="rp-empty-icon">◎</div><div class="rp-empty-txt">Select an item<br>to edit properties</div></div>';return;}
  if(selType==='ap')renderAPPanel();
  else if(selType==='dz')renderDZPanel();
  else if(selType==='sw')renderSWPanel();
  else if(selType==='wall')renderWallPanel();
}

function renderWallPanel(){
  const w=WALLS().find(x=>x.id===selId);if(!w)return;
  document.getElementById('rp-head').textContent='Edit Wall';
  const mat=WALL_MATERIALS[w.material]||WALL_MATERIALS.drywall;
  const lengthPx=Math.hypot(w.x2-w.x1,w.y2-w.y1);
  const lengthM=(lengthPx*(scaleM/100)).toFixed(1);
  const opts=WALL_MATERIAL_KEYS.map(k=>{
    const m=WALL_MATERIALS[k];
    return `<option value="${k}"${k===w.material?' selected':''}>${esc(m.label)} · ${m.loss} dB</option>`;
  }).join('');
  rpBody.innerHTML=`
    <div class="ep-section">Material</div>
    <div class="ep-row">
      <select class="ep-sel" id="wall-mat" data-change-action="upd-wall">${opts}</select>
    </div>
    <div class="ep-section">Info</div>
    <div class="ep-row">
      <div class="ep-lbl">Length</div>
      <div class="ep-readout">${lengthM} m</div>
    </div>
    <div class="ep-row">
      <div class="ep-lbl">Signal Loss</div>
      <div class="ep-readout">${mat.loss} dB</div>
    </div>
    <button class="btn ep-del" data-action="ask-del">✕ Delete Wall</button>`;
}

function updWall(){
  const w=WALLS().find(x=>x.id===selId);if(!w)return;
  snapshot();
  const sel=document.getElementById('wall-mat');
  if(sel){w.material=sel.value;}
  invalidateCoverageCache();
  render();renderRP();renderList();calcCoverage();
}

function renderAPPanel(){
  const ap=APS().find(a=>a.id===selId);if(!ap)return;
  document.getElementById('rp-head').textContent='Edit AP';
  const mOpts=buildGroupedOptions(AP_MODEL_GROUPS,ap.model||'U6 Pro');
  const realR=Math.round(ap.r*(scaleM/100));
  rpBody.innerHTML=`
    <div class="ep-section">Identity</div>
    <div class="ep-row"><label class="ep-lbl">Name</label><input class="ep-in" id="ep-name" value="${ap.name}" data-input-action="upd-ap"/></div>
    <div class="ep-row"><label class="ep-lbl">AP Model</label><select class="ep-sel" id="ep-model" data-input-action="upd-ap">${mOpts}</select></div>
    <div class="ep-row"><label class="ep-lbl">Frequency</label>
      <select class="ep-sel" id="ep-freq" data-input-action="upd-ap">
        <option ${ap.freq==='2.4 / 5 GHz'?'selected':''}>2.4 / 5 GHz</option>
        <option ${ap.freq==='5 GHz only'?'selected':''}>5 GHz only</option>
        <option ${ap.freq==='2.4 GHz only'?'selected':''}>2.4 GHz only</option>
        <option ${ap.freq==='6 GHz (WiFi 6E)'?'selected':''}>6 GHz (WiFi 6E)</option>
      </select></div>
    <div class="ep-section">Signal</div>
    <div class="sig-chips">
      <div class="sig-chip ${ap.sig==='strong'?'on':''}" data-action="set-sig" data-arg="strong">Strong</div>
      <div class="sig-chip ${ap.sig==='medium'?'on':''}" data-action="set-sig" data-arg="medium">Medium</div>
      <div class="sig-chip ${ap.sig==='weak'?'on':''}" data-action="set-sig" data-arg="weak">Weak</div>
    </div>
    <div class="ep-section">Color</div>
    <div class="color-swatches">
      ${AP_COLORS.map(c=>{
        const isSel=(ap.color||'')===c.value;
        const swatchStyle=c.value?`style="background:${c.value}"`:'class-default';
        return `<button class="color-swatch${c.value?'':' color-default'}${isSel?' on':''}" ${c.value?`style="background:${c.value}"`:''} data-action="set-color" data-arg="${esc(c.value)}" title="${esc(c.label)}" aria-label="${esc(c.label)}"></button>`;
      }).join('')}
    </div>
    <div class="ep-section">Coverage Range</div>
    <div class="ep-row ep-slider-row">
      <input class="ep-rng" id="ep-r" type="range" min="15" max="500" value="${Math.round(ap.r)}" data-input-action="upd-ap-r"/>
      <span class="ep-rng-val" id="ep-rv">${realR}m</span>
    </div>
    <div class="ep-section">Radio</div>
    <div class="ep-row"><label class="ep-lbl">Channel</label><input class="ep-in ep-mono" id="ep-channel" value="${esc(ap.channel||'auto')}" data-input-action="upd-ap" placeholder="auto · 6 · 36 · 149 …"/></div>
    <div class="ep-row"><label class="ep-lbl">TX Power</label><input class="ep-in ep-mono" id="ep-txpower" value="${esc(ap.txPower||'auto')}" data-input-action="upd-ap" placeholder="auto · low · medium · high · 20 dBm"/></div>
    <div class="ep-section">Network Info</div>
    <div class="ep-row"><label class="ep-lbl">IP Address</label><input class="ep-in" id="ep-ip" value="${ap.ip||''}" data-input-action="upd-ap" placeholder="192.168.1.x"/></div>
    <div class="ep-row"><label class="ep-lbl">MAC Address</label><input class="ep-in ep-mono" id="ep-mac" value="${ap.mac||''}" data-input-action="upd-ap" placeholder="aa:bb:cc:dd:ee:ff"/></div>
    <div class="ep-row"><label class="ep-lbl">Switch Port</label><input class="ep-in" id="ep-port" value="${ap.port||''}" data-input-action="upd-ap" placeholder="SW1 Port 4"/></div>
    <div class="ep-row"><label class="ep-lbl">VLAN</label><input class="ep-in" id="ep-vlan" value="${ap.vlan||''}" data-input-action="upd-ap" placeholder="10"/></div>
    <div class="ep-section">Options</div>
    <label class="ep-check"><input type="checkbox" ${ap.locked?'checked':''} data-change-action="toggle-lock"/><span>Lock position</span></label>
    <div class="ep-btn-row">
      <button class="btn" data-action="duplicate">⧉ Duplicate</button>
    </div>
    <div class="ep-section">Notes</div>
    <div class="ep-row"><textarea class="ep-txt" id="ep-notes" rows="4" data-input-action="upd-ap" placeholder="Cable run, switch port, install notes...">${ap.notes||''}</textarea></div>
    <button class="btn ep-del" data-action="ask-del">✕ Delete AP</button>`;
}

function renderDZPanel(){
  const dz=DZS().find(a=>a.id===selId);if(!dz)return;
  document.getElementById('rp-head').textContent='Edit Dead Zone';
  const realR=Math.round(dz.r*(scaleM/100));
  rpBody.innerHTML=`
    <div class="ep-section">Label</div>
    <div class="ep-row"><input class="ep-in" id="dz-lbl" value="${dz.label}" data-input-action="upd-dz"/></div>
    <div class="ep-section">Radius</div>
    <div class="ep-row ep-slider-row">
      <input class="ep-rng" id="dz-r" type="range" min="10" max="300" value="${Math.round(dz.r)}" data-input-action="upd-dz-r"/>
      <span class="ep-rng-val" id="dz-rv">${realR}m</span>
    </div>
    <label class="ep-check"><input type="checkbox" ${dz.locked?'checked':''} data-change-action="toggle-lock"/><span>Lock position</span></label>
    <button class="btn ep-del" data-action="ask-del">✕ Delete</button>`;
}

function renderSWPanel(){
  const sw=SWS().find(a=>a.id===selId);if(!sw)return;
  document.getElementById('rp-head').textContent='Edit Switch/Router';
  const mOpts=buildGroupedOptions(SW_MODEL_GROUPS,sw.model||'USW-24-PoE');
  // If the stored model isn't in our known list, treat it as a custom override
  const isCustom=!SW_MODELS.includes(sw.model||'');
  rpBody.innerHTML=`
    <div class="ep-section">Identity</div>
    <div class="ep-row"><label class="ep-lbl">Name</label><input class="ep-in" id="sw-name" value="${esc(sw.name)}" data-input-action="upd-sw"/></div>
    <div class="ep-row"><label class="ep-lbl">Model</label><select class="ep-sel" id="sw-model" data-input-action="upd-sw">${mOpts}</select></div>
    <div class="ep-row" id="sw-custom-row" style="${isCustom?'':'display:none'}">
      <label class="ep-lbl">Custom Model Name</label>
      <input class="ep-in" id="sw-model-custom" value="${isCustom?esc(sw.model||''):''}" data-input-action="upd-sw" placeholder="Enter model name"/>
    </div>
    <div class="ep-row"><label class="ep-lbl">IP Address</label><input class="ep-in ep-mono" id="sw-ip" value="${esc(sw.ip||'')}" data-input-action="upd-sw" placeholder="192.168.1.1"/></div>
    <div class="ep-section">Icon Size</div>
    <div class="ep-row ep-slider-row">
      <input class="ep-rng" id="sw-size" type="range" min="10" max="80" value="${sw.size||22}" data-input-action="upd-sw-size"/>
      <span class="ep-rng-val" id="sw-size-v">${sw.size||22}px</span>
    </div>
    <div class="ep-section">Notes</div>
    <div class="ep-row"><textarea class="ep-txt" id="sw-notes" rows="3" data-input-action="upd-sw" placeholder="Location, uplink, config notes...">${sw.notes||''}</textarea></div>
    <label class="ep-check"><input type="checkbox" ${sw.locked?'checked':''} data-change-action="toggle-lock"/><span>Lock position</span></label>
    <button class="btn ep-del" data-action="ask-del">✕ Delete</button>`;
}

function updAP(){
  const ap=APS().find(a=>a.id===selId);if(!ap)return;
  snapshotSoon();
  const prevModel=ap.model;
  ap.name=document.getElementById('ep-name').value||ap.name;
  ap.model=document.getElementById('ep-model').value;
  ap.freq=document.getElementById('ep-freq').value;
  const chEl=document.getElementById('ep-channel');if(chEl)ap.channel=chEl.value;
  const pwEl=document.getElementById('ep-txpower');if(pwEl)ap.txPower=pwEl.value;
  ap.ip=document.getElementById('ep-ip').value;
  ap.mac=document.getElementById('ep-mac').value;
  ap.port=document.getElementById('ep-port').value;
  ap.vlan=document.getElementById('ep-vlan').value;
  ap.notes=document.getElementById('ep-notes').value;
  // If the user just picked a different model, auto-adjust coverage radius
  // to the typical range for that model (user can still override via slider).
  if(ap.model!==prevModel && AP_RANGE_M[ap.model]){
    ap.r=rangeMToPx(AP_RANGE_M[ap.model]);
    // Keep the range slider UI in sync if it's visible
    const slider=document.getElementById('ep-r');
    if(slider){slider.value=ap.r;document.getElementById('ep-rv').textContent=Math.round(ap.r*(scaleM/100))+'m';}
    calcCoverage();
  }
  render();renderList();
}
function updR(v){const ap=APS().find(a=>a.id===selId);if(!ap)return;snapshotSoon();ap.r=parseInt(v);if(WALLS().length)invalidateCoverageCache();document.getElementById('ep-rv').textContent=Math.round(v*(scaleM/100))+'m';render();calcCoverage();}
function setSig(s){const ap=APS().find(a=>a.id===selId);if(!ap)return;snapshot();ap.sig=s;render();renderList();renderAPPanel();}
function setApColor(c){
  const ap=APS().find(a=>a.id===selId);
  if(!ap)return;
  snapshot();
  ap.color=c||'';
  render();renderList();renderAPPanel();
}
function updDZ(){const dz=DZS().find(a=>a.id===selId);if(!dz)return;snapshotSoon();dz.label=document.getElementById('dz-lbl').value||dz.label;render();renderList();}
function updDZR(v){const dz=DZS().find(a=>a.id===selId);if(!dz)return;snapshotSoon();dz.r=parseInt(v);document.getElementById('dz-rv').textContent=Math.round(v*(scaleM/100))+'m';render();}
function updSW(){
  const sw=SWS().find(a=>a.id===selId);if(!sw)return;
  snapshotSoon();
  sw.name=document.getElementById('sw-name').value||sw.name;
  const dropdown=document.getElementById('sw-model').value;
  const customRow=document.getElementById('sw-custom-row');
  const customInput=document.getElementById('sw-model-custom');
  if(dropdown==='Custom/Other'){
    if(customRow)customRow.style.display='';
    sw.model=customInput&&customInput.value?customInput.value:'Custom/Other';
  }else{
    if(customRow)customRow.style.display='none';
    sw.model=dropdown;
  }
  sw.ip=document.getElementById('sw-ip').value;
  sw.notes=document.getElementById('sw-notes').value;
  render();renderList();
}
function updSWSize(v){
  const sw=SWS().find(a=>a.id===selId);if(!sw)return;
  snapshotSoon();
  sw.size=parseInt(v,10);
  const lbl=document.getElementById('sw-size-v');if(lbl)lbl.textContent=sw.size+'px';
  render();
}

// ═══ LEFT LIST ════════════════════════════════════
function renderList(){
  leftList.innerHTML='';
  const apN=APS().length,swN=SWS().length,dzN=DZS().length,wN=WALLS().length;
  const total=apN+swN+dzN+wN;
  // Per-category counters in the header. Each one styled subtly so the eye lands
  // on the most populous one but they're all readable at a glance.
  const cnts=document.getElementById('sb-counters');
  if(cnts){
    cnts.innerHTML=`
      <span class="cnt-pill" title="Access Points"><span class="cnt-icon">●</span><span class="cnt-num">${apN}</span><span class="cnt-lbl">APs</span></span>
      <span class="cnt-pill" title="Switches / Routers"><span class="cnt-icon">⊞</span><span class="cnt-num">${swN}</span><span class="cnt-lbl">SW</span></span>
      <span class="cnt-pill" title="Dead Zones"><span class="cnt-icon">⚠</span><span class="cnt-num">${dzN}</span><span class="cnt-lbl">DZ</span></span>
      <span class="cnt-pill" title="Walls"><span class="cnt-icon">▌</span><span class="cnt-num">${wN}</span><span class="cnt-lbl">W</span></span>`;
  }
  if(!total){leftList.innerHTML='<div class="empty-msg">Nothing yet.<br>Click map to place items.</div>';return;}

  // Search filter — case-insensitive, matches against multiple fields per item.
  // Empty query returns true for everything, so the no-search case is no-op fast.
  const q=(searchQuery||'').trim().toLowerCase();
  const matches=(...fields)=>{
    if(!q)return true;
    return fields.some(f=>String(f||'').toLowerCase().includes(q));
  };

  const filteredAPs=APS().filter(ap=>matches(ap.name,ap.model,ap.freq,ap.ip,ap.mac,ap.notes));
  const filteredSWs=SWS().filter(sw=>matches(sw.name,sw.model,sw.ip,sw.notes));
  const filteredDZs=DZS().filter(dz=>matches(dz.label));
  const filteredWalls=WALLS().filter(w=>matches((WALL_MATERIALS[w.material]||{}).label));
  const matchTotal=filteredAPs.length+filteredSWs.length+filteredDZs.length+filteredWalls.length;

  // No matches when there IS a query → friendly "no results" instead of empty space
  if(q&&matchTotal===0){
    leftList.innerHTML=`<div class="no-match-msg">No items match <span class="nm-query">"${esc(searchQuery)}"</span><br>Try a different search.</div>`;
    return;
  }

  if(filteredAPs.length){
    const h=document.createElement('div');h.className='sec-lbl';h.textContent='Access Points';leftList.appendChild(h);
    filteredAPs.forEach(ap=>{
      const d=document.createElement('div');d.className='list-item'+(ap.id===selId?' active':'')+(ap.locked?' locked':'');
      const sigDots={strong:'●●●',medium:'●●○',weak:'●○○'}[ap.sig||'strong'];
      const sigClass={strong:'sig-s',medium:'sig-m',weak:'sig-w'}[ap.sig||'strong'];
      const dotStyle=ap.color?` style="background:${esc(ap.color)}"`:'';
      d.innerHTML=`<div class="li-dot"${dotStyle}></div><div class="li-info"><div class="li-name">${esc(ap.name)}</div><div class="li-sub">${esc(ap.model||'U6 Pro')}</div></div><span class="li-sig ${sigClass}">${sigDots}</span>${ap.locked?'<span class="li-lock">🔒</span>':''}<button class="li-del" data-action="quick-del" data-id="${ap.id}" data-type="ap">✕</button>`;
      d.addEventListener('click',e=>{if(e.target.closest('.li-del'))return;sel(ap.id,'ap',{zoom:true});setMode('sel');});leftList.appendChild(d);
    });
  }
  if(filteredSWs.length){
    const h=document.createElement('div');h.className='sec-lbl';h.textContent='Switches/Routers';leftList.appendChild(h);
    filteredSWs.forEach(sw=>{
      const d=document.createElement('div');d.className='list-item sw-item'+(sw.id===selId?' active':'');
      d.innerHTML=`<span style="font-size:12px">⊞</span><div class="li-info"><div class="li-name">${esc(sw.name)}</div><div class="li-sub">${esc(sw.model||'')}</div></div><button class="li-del" data-action="quick-del" data-id="${sw.id}" data-type="sw">✕</button>`;
      d.addEventListener('click',e=>{if(e.target.closest('.li-del'))return;sel(sw.id,'sw',{zoom:true});setMode('sel');});leftList.appendChild(d);
    });
  }
  if(filteredDZs.length){
    const h=document.createElement('div');h.className='sec-lbl';h.textContent='Dead Zones';leftList.appendChild(h);
    filteredDZs.forEach(dz=>{
      const d=document.createElement('div');d.className='list-item dz-item'+(dz.id===selId?' active':'');
      d.innerHTML=`<span style="font-size:12px">⚠</span><span class="li-name">${esc(dz.label)}</span><button class="li-del" data-action="quick-del" data-id="${dz.id}" data-type="dz">✕</button>`;
      d.addEventListener('click',e=>{if(e.target.closest('.li-del'))return;sel(dz.id,'dz',{zoom:true});setMode('sel');});leftList.appendChild(d);
    });
  }
  if(filteredWalls.length){
    const h=document.createElement('div');h.className='sec-lbl';h.textContent=`Walls (${filteredWalls.length}${q?' / '+wN:''})`;leftList.appendChild(h);
    filteredWalls.forEach(w=>{
      // Use original WALLS() index for display (W-1, W-2, etc.) so numbers match the master list
      const i=WALLS().indexOf(w);
      const mat=WALL_MATERIALS[w.material]||WALL_MATERIALS.drywall;
      const lenM=(Math.hypot(w.x2-w.x1,w.y2-w.y1)*(scaleM/100)).toFixed(1);
      const d=document.createElement('div');
      d.className='list-item'+(w.id===selId?' active':'');
      d.innerHTML=`<span style="font-size:12px">▌</span><div class="li-info"><div class="li-name">Wall ${i+1}</div><div class="li-sub">${esc(mat.label)} · ${lenM} m</div></div><button class="li-del" data-action="quick-del" data-id="${w.id}" data-type="wall">✕</button>`;
      d.addEventListener('click',e=>{if(e.target.closest('.li-del'))return;sel(w.id,'wall',{zoom:true});setMode('sel');});
      leftList.appendChild(d);
    });
  }
}

// ═══ DELETE ═══════════════════════════════════════
function askDel(){
  if(selId==null)return;
  const target={id:selId,type:selType};
  showModalText('Delete Item','Remove this item from the map?',()=>doDelete(target));
}
function qDel(id,type){
  const target={id,type};
  showModalText('Delete Item','Remove this item?',()=>doDelete(target));
}
function doDelete(target){
  if(!target)return;
  const {id,type}=target;
  snapshot();
  const list=type==='ap'?APS():type==='dz'?DZS():type==='sw'?SWS():type==='wall'?WALLS():null;
  if(!list)return;
  const idx=list.findIndex(a=>a.id===id);
  if(idx<0)return;  // already deleted; bail silently
  list.splice(idx,1);
  if(selId===id){selId=null;selType=null;}
  // Wall removal changes coverage shapes everywhere
  if(type==='wall'||type==='ap')invalidateCoverageCache();
  render();renderList();renderRP();calcCoverage();toast('Deleted');
}
let modalCancelCB=null;
// Internal: install a body element + buttons + callbacks. `bodyEl` must be a
// DOM node; callers wanting to pass plain text should use showModalText.
function _showModalEl(title,bodyEl,okCB,cancelCB){
  document.getElementById('mdl-title').textContent=title;
  const body=document.getElementById('mdl-body');
  body.replaceChildren(bodyEl);
  modalCB=okCB||null;modalCancelCB=cancelCB||null;
  document.getElementById('mdl').classList.remove('help-modal');
  const ok=document.getElementById('mdl-ok');
  if(ok){ok.style.display=okCB?'':'none';}
  const cancel=document.querySelector('#mdl .mdl-actions .btn:not(#mdl-ok)');
  if(cancel)cancel.textContent=okCB?'Cancel':'Close';
  document.getElementById('mbg').classList.add('vis');
}
// Plain-text body (auto-escaped). Newlines become <br>.
function showModalText(title,text,okCB,cancelCB){
  const div=document.createElement('div');
  String(text||'').split(/\n/).forEach((line,i,arr)=>{
    div.appendChild(document.createTextNode(line));
    if(i<arr.length-1)div.appendChild(document.createElement('br'));
  });
  _showModalEl(title,div,okCB,cancelCB);
}
// DOM body (caller built the nodes). Safe by construction.
function showModalNode(title,node,okCB,cancelCB){
  _showModalEl(title,node,okCB,cancelCB);
}
// Legacy HTML-string entrypoint. Deprecated — kept so existing callers still
// work, but new code should use showModalText / showModalNode. A template tag
// parses the markup; we then move it into the body. Callers must still esc()
// any user-controlled values they interpolate into the string.
function showModal(title,body,okCB,cancelCB){
  const tpl=document.createElement('template');
  tpl.innerHTML=String(body??'');
  _showModalEl(title,tpl.content,okCB,cancelCB);
}
function closeModal(){
  document.getElementById('mbg').classList.remove('vis');
  pendDel=null;
  if(modalCancelCB){const cb=modalCancelCB;modalCancelCB=null;modalCB=null;cb();return;}
  modalCB=null;
}
function modalOK(){
  const cb=modalCB;modalCB=null;modalCancelCB=null;
  document.getElementById('mbg').classList.remove('vis');pendDel=null;
  if(cb)cb();
}

// ═══ CONTEXT MENU ═════════════════════════════════
// Right-click on any placed item (AP/DZ/SW) opens a floating menu
// with Edit / Duplicate / Lock / Delete. Escape or outside-click closes it.
function showContextMenu(clientX,clientY,items){
  const m=document.getElementById('ctx-menu');
  m.innerHTML=items.map((it,i)=>{
    if(it==='-')return '<div class="ctx-sep"></div>';
    return `<div class="ctx-item${it.disabled?' disabled':''}${it.danger?' danger':''}" data-ctx-idx="${i}">${esc(it.label)}${it.key?`<span class="ctx-key">${esc(it.key)}</span>`:''}</div>`;
  }).join('');
  m.classList.add('vis');
  // Position: keep menu on-screen
  const rect=m.getBoundingClientRect();
  const maxX=window.innerWidth-rect.width-4;
  const maxY=window.innerHeight-rect.height-4;
  m.style.left=Math.min(clientX,maxX)+'px';
  m.style.top=Math.min(clientY,maxY)+'px';
  // Attach one-shot click handler
  const onItemClick=e=>{
    const target=e.target.closest('[data-ctx-idx]');
    if(!target)return;
    const idx=parseInt(target.dataset.ctxIdx,10);
    const it=items[idx];
    if(it&&!it.disabled&&it.action)it.action();
    closeContextMenu();
  };
  m.addEventListener('click',onItemClick,{once:true});
  // Closing it later
  m._cleanup=()=>{m.removeEventListener('click',onItemClick);};
}
function closeContextMenu(){
  const m=document.getElementById('ctx-menu');
  if(!m.classList.contains('vis'))return;
  m.classList.remove('vis');
  if(m._cleanup){m._cleanup();m._cleanup=null;}
  m.innerHTML='';
}
// Dismiss on outside click / scroll / Escape
document.addEventListener('pointerdown',e=>{
  if(e.target.closest('#ctx-menu'))return;
  closeContextMenu();
},true);
window.addEventListener('blur',closeContextMenu);

// Build a menu for an item and show it
function openItemContextMenu(type,id,clientX,clientY){
  const item=type==='ap'?APS().find(a=>a.id===id)
          :type==='dz'?DZS().find(a=>a.id===id)
          :type==='sw'?SWS().find(a=>a.id===id):null;
  if(!item)return;
  // Select the item so Edit + Delete use the right target
  sel(id,type);
  const items=[];
  items.push({label:'Edit properties',key:'', action:()=>{sel(id,type);setMode('sel');}});
  if(type==='ap'){
    items.push({label:'Duplicate',key:'Ctrl+D',action:()=>duplicateSelected()});
  }
  items.push({label:item.locked?'Unlock':'Lock',key:'Ctrl+L',action:()=>toggleLock()});
  items.push('-');
  items.push({label:'Delete',key:'Del',danger:true,action:()=>{qDel(id,type);}});
  showContextMenu(clientX,clientY,items);
}
// Right-click on the empty map shouldn't show a browser context menu (we use it for panning).
// But right-click on an item *should* open ours. The item handlers call openItemContextMenu
// which stops propagation, so the viewport-level preventDefault still prevents the native menu.

// ═══ COUNTERS ═════════════════════════════════════
function updateCnt(){document.getElementById('ap-cnt').textContent=APS().length;}

// ═══ PRESENT MODE ═════════════════════════════════
function togglePresent(){
  pres=!pres;
  document.getElementById('btn-pres').classList.toggle('active',pres);
  document.getElementById('btn-pres').textContent=pres?'■ Exit':'▶ Present';
  ['hint-bar','left-sb','right-sb'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display=pres?'none':'';});
  // Hide the meta + tools rows, but keep the floor-row so users can still flip floors.
  document.querySelectorAll('.topbar-meta, .topbar-tools').forEach(el=>{el.style.display=pres?'none':'';});
  document.querySelector('.topbar.floor-row').classList.toggle('present-slim',pres);
  setTimeout(fitZoom,50);toast(pres?'Presentation mode — Esc to exit':'Editor mode');
}

// ═══ TOAST ════════════════════════════════════════
let tT;function toast(msg){const el=document.getElementById('toast');el.textContent=msg;el.classList.add('show');clearTimeout(tT);tT=setTimeout(()=>el.classList.remove('show'),2400);}

// ═══ EXPORT HTML ══════════════════════════════════
// Build the SVG overlay content (walls, switches, APs, dead zones)
// shared by HTML export and PDF export. Returns {cw, ch, innerSVG} where
// innerSVG is a string of <g> blocks ready to drop inside an <svg>.
function buildMapOverlaySVG(){
  const cw=mapImg.naturalWidth||1000,ch=mapImg.naturalHeight||700;
  const hasWalls=WALLS().length>0;
  const apSVG=APS().map(ap=>{
    if(!Number.isFinite(ap.fx)||!Number.isFinite(ap.fy)||!Number.isFinite(ap.r)||ap.r<=0){
      console.warn('Skipping AP with invalid coords:',ap);
      return '';
    }
    const cx=(ap.fx*cw).toFixed(1),cy=(ap.fy*ch).toFixed(1),r=ap.r,ri=(r*.54).toFixed(1);
    const ls=Math.max(8,Math.min(14,r*.17)).toFixed(1);
    const col=ap.color||'';
    const oc=col||({strong:'#000',medium:'rgba(0,0,0,.55)',weak:'rgba(0,0,0,.3)'}[ap.sig]);
    const of=col?hexToRgba(col,.08):({strong:'rgba(0,0,0,.04)',medium:'rgba(0,0,0,.035)',weak:'rgba(0,0,0,.025)'}[ap.sig]);
    const innerFill=col?hexToRgba(col,.12):'rgba(0,0,0,.05)';
    const dotFill=col||'#000';
    const lblFill=col||'#000';
    const sw={strong:'1.5',medium:'1.2',weak:'1'}[ap.sig];
    const da=ap.sig==='strong'?'':`stroke-dasharray="${ap.sig==='medium'?'6 3':'3 3'}"`;
    const realM=Math.round(r*(scaleM/100));
    const outerShape=hasWalls
      ? `<path d="${computeCoveragePath(ap)}" fill="${of}" stroke="${oc}" stroke-width="${sw}" ${da}/>`
      : `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${of}" stroke="${oc}" stroke-width="${sw}" ${da}/>`;
    const innerShape=hasWalls
      ? `<path d="${getInnerCoveragePath(ap)}" fill="${innerFill}" stroke="${oc}" stroke-width=".8" opacity=".6"/>`
      : `<circle cx="${cx}" cy="${cy}" r="${ri}" fill="${innerFill}" stroke="${oc}" stroke-width=".8" opacity=".6"/>`;
    return `<g>${outerShape}
${innerShape}
<circle cx="${cx}" cy="${cy}" r="7" fill="${dotFill}"/>
<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-family="Rajdhani,sans-serif" font-size="${ls}" font-weight="700" letter-spacing=".04em" fill="${lblFill}" paint-order="stroke" stroke="#efece5" stroke-width="3">${esc(ap.name)}</text>
</g>`;
  }).join('\n');
  const wallSVG=WALLS().map(w=>{
    const mat=WALL_MATERIALS[w.material]||WALL_MATERIALS.drywall;
    const dash=mat.dash?` stroke-dasharray="${mat.dash}"`:'';
    return `<line x1="${w.x1.toFixed(1)}" y1="${w.y1.toFixed(1)}" x2="${w.x2.toFixed(1)}" y2="${w.y2.toFixed(1)}" stroke="#000" stroke-width="${mat.strokeWidth}" stroke-linecap="round"${dash}/>`;
  }).join('\n');
  const dzSVG=DZS().map(dz=>{
    if(!Number.isFinite(dz.fx)||!Number.isFinite(dz.fy)||!Number.isFinite(dz.r)||dz.r<=0)return '';
    const cx=(dz.fx*cw).toFixed(1),cy=(dz.fy*ch).toFixed(1);
    return `<g><circle cx="${cx}" cy="${cy}" r="${dz.r}" fill="rgba(0,0,0,.06)" stroke="#000" stroke-width="1.5" stroke-dasharray="4 3"/><text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="18" fill="#000">⚠</text><text x="${cx}" y="${(parseFloat(cy)+dz.r+11).toFixed(1)}" text-anchor="middle" font-family="Rajdhani,sans-serif" font-size="10" font-weight="700" letter-spacing=".1em" fill="#000" paint-order="stroke" stroke="#efece5" stroke-width="3">${esc((dz.label||'').toUpperCase())}</text></g>`;
  }).join('\n');
  const swSVG=SWS().map(sw=>{
    if(!Number.isFinite(sw.fx)||!Number.isFinite(sw.fy))return '';
    const cx=(sw.fx*cw).toFixed(1),cy=(sw.fy*ch).toFixed(1),sz=sw.size||22;
    const iconFs=Math.max(8,sz*.65).toFixed(1);
    const lblFs=Math.max(7,sz*.42).toFixed(1);
    return `<g><rect x="${parseFloat(cx)-sz}" y="${parseFloat(cy)-sz*.6}" width="${sz*2}" height="${sz*1.2}" rx="2" fill="rgba(0,0,0,.04)" stroke="#000" stroke-width="1.2"/><text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="${iconFs}" fill="#000">⊞</text><text x="${cx}" y="${(parseFloat(cy)+sz*.9).toFixed(1)}" text-anchor="middle" font-family="Rajdhani,sans-serif" font-size="${lblFs}" font-weight="700" letter-spacing=".08em" fill="#000" paint-order="stroke" stroke="#efece5" stroke-width="2.5">${esc((sw.name||'').toUpperCase())}</text></g>`;
  }).join('\n');
  return {cw,ch,innerSVG:`${wallSVG}${swSVG}${apSVG}${dzSVG}`};
}

function doExport(){
  const f=F();const imgSrc=mapImg.src;
  const {cw,ch,innerSVG}=buildMapOverlaySVG();
  const name=f.imgName||'WiFi Map';
  const html=`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>${name} — WiFi Coverage | NOCTIS</title><link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@500;600;700&display=swap" rel="stylesheet"><style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:#efece5;min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:28px 18px 40px;font-family:'Rajdhani',sans-serif;color:#000}
.tb{width:100%;max-width:1200px;display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.br{font-size:10px;font-family:'Share Tech Mono',monospace;color:#000;letter-spacing:.2em;text-transform:uppercase;font-weight:700}
.st{font-size:10px;font-family:'Share Tech Mono',monospace;color:rgba(0,0,0,.55);display:flex;align-items:center;gap:6px;letter-spacing:.1em;text-transform:uppercase}
.sd{width:5px;height:5px;border-radius:50%;background:#000}
/* Header pill: standalone block above the map, with breathing space below.
   Hierarchy: NOCTIS Network Audit dominant (the brand) → project name secondary
   (variable, project-specific) → tagline tertiary on the right. */
.mh{
  width:100%;max-width:1200px;
  display:flex;align-items:center;justify-content:space-between;gap:24px;
  padding:18px 24px;
  background:#efece5;
  border:1px solid #000;border-radius:2px;
  margin-bottom:14px;
}
.mhl{display:flex;flex-direction:column;gap:4px;min-width:0}
.mht{
  font-size:18px;font-weight:700;color:#000;letter-spacing:.04em;
  font-family:'Rajdhani',sans-serif;line-height:1;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
.mhs{
  font-size:9px;font-family:'Share Tech Mono',monospace;
  color:rgba(0,0,0,.6);letter-spacing:.18em;text-transform:uppercase;font-weight:700;
  margin-top:2px;
}
.mhm{
  font-size:9px;font-family:'Share Tech Mono',monospace;
  color:rgba(0,0,0,.45);letter-spacing:.2em;text-transform:uppercase;
  flex-shrink:0;
}
#mw{position:relative;width:100%;max-width:1200px;overflow:hidden;border:1px solid #000;border-radius:2px;background:#efece5}
/* Map body — clip the SVG overlay so AP coverage rings near the edge can't
   bleed past the floor plan into surrounding space. */
.mb{position:relative;background:#e9e6df;overflow:hidden}
#mi{width:100%;display:block;filter:grayscale(.15) brightness(1.02);opacity:.92}
#ov{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none}
#sl{width:100%;height:100%}
.ml{display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:8px 16px;background:#efece5;border-top:1px solid rgba(0,0,0,.12);font-size:9px;font-family:'Share Tech Mono',monospace;color:rgba(0,0,0,.55);letter-spacing:.1em;text-transform:uppercase}
.li{display:flex;align-items:center;gap:5px}
.ld{width:7px;height:7px;border-radius:50%;background:#000}
.lr{width:12px;height:12px;border-radius:50%;border:1.5px solid #000;background:rgba(0,0,0,.04)}
.lb{margin-left:auto;font-family:'Share Tech Mono',monospace;font-size:8px;color:rgba(0,0,0,.3);letter-spacing:.2em;font-weight:700}
.at{width:100%;max-width:1200px;border-collapse:collapse;margin-top:16px}
.at th{font-size:8px;font-family:'Share Tech Mono',monospace;color:#000;letter-spacing:.15em;text-transform:uppercase;text-align:left;padding:9px 11px;border-bottom:1px solid #000;font-weight:700}
.at td{font-size:11px;font-family:'Rajdhani',sans-serif;color:rgba(0,0,0,.75);padding:7px 11px;border-bottom:1px solid rgba(0,0,0,.08)}
.ss{color:#000;font-weight:600}.sm{color:rgba(0,0,0,.55);font-weight:600}.sw{color:rgba(0,0,0,.35);font-weight:600}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes pulse{0%,100%{r:7;opacity:1}50%{r:10;opacity:.55}}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes dzs{from{transform:rotate(0deg)}to{transform:rotate(-360deg)}}
</style></head><body>
<div id="mw">
<div class="mb"><img id="mi" src="${imgSrc}" alt="Coverage Map"/><div id="ov"><svg id="sl" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cw} ${ch}" preserveAspectRatio="xMidYMid meet"><defs><filter id="gf"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>${innerSVG}</svg></div></div>
<div class="ml"><div class="li"><div class="ld"></div>AP</div><div class="li"><div class="lr"></div>Coverage</div><div class="li">⚠ Dead Zone</div><div class="li">⊞ Switch</div><span class="lb">${esc(SETTINGS.company||'NOCTIS')}</span></div></div>
${APS().length?`<table class="at"><thead><tr><th>#</th><th>Name</th><th>Model</th><th>Freq</th><th>Ch</th><th>TX</th><th>Signal</th><th>IP</th><th>MAC</th><th>Port</th><th>VLAN</th><th>Notes</th></tr></thead><tbody>${APS().map((ap,i)=>`<tr><td>${i+1}</td><td>${ap.name}</td><td>${ap.model||''}</td><td>${ap.freq}</td><td style="font-family:'Share Tech Mono',monospace;font-size:10px">${ap.channel||'auto'}</td><td style="font-family:'Share Tech Mono',monospace;font-size:10px">${ap.txPower||'auto'}</td><td class="${{strong:'ss',medium:'sm',weak:'sw'}[ap.sig]}">${{strong:'● Strong',medium:'● Medium',weak:'● Weak'}[ap.sig]}</td><td style="font-family:'Share Tech Mono',monospace;font-size:10px">${ap.ip||'—'}</td><td style="font-family:'Share Tech Mono',monospace;font-size:10px">${ap.mac||'—'}</td><td>${ap.port||'—'}</td><td>${ap.vlan||'—'}</td><td style="font-size:10px;color:rgba(0,0,0,.55)">${ap.notes||'—'}</td></tr>`).join('')}</tbody></table>`:''}
</body></html>`;
  const blob=new Blob([html],{type:'text/html'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(name||'wifi').replace(/\s+/g,'_')+'_coverage.html';a.click();toast('Exported!');
}

// ═══ PDF ══════════════════════════════════════════
function doPDF(){
  const w=window.open('','_blank');
  // Build the same AP/coverage/wall/dz SVG content used by HTML export.
  // The PDF previously dropped this and only embedded the raw floor plan,
  // which is why APs weren't appearing in the printed map.
  const overlay=mapImg.src?buildMapOverlaySVG():null;
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>NOCTIS — Network Audit Report</title><link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@400;500;600;700&display=swap" rel="stylesheet"><style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#efece5;font-family:'Rajdhani',sans-serif;color:#000;padding:44px 48px;min-height:100vh}
.cover{text-align:left;padding:8px 0 40px;border-bottom:1px solid #000;margin-bottom:40px;position:relative}
.cover-meta{font-size:10px;font-family:'Share Tech Mono',monospace;color:#000;letter-spacing:.2em;text-transform:uppercase;font-weight:700;margin-bottom:60px}
.logo{font-size:88px;font-weight:700;color:#000;letter-spacing:-.02em;line-height:.95;font-family:'Rajdhani',sans-serif}
.tagline{font-size:11px;font-family:'Share Tech Mono',monospace;color:#000;letter-spacing:.2em;text-transform:uppercase;font-weight:700;margin-top:28px;padding-top:14px;border-top:1px solid rgba(0,0,0,.15)}
.doc-title{font-size:22px;font-weight:600;color:#000;margin-top:32px;letter-spacing:.02em}
.doc-sub{font-size:11px;font-family:'Share Tech Mono',monospace;color:rgba(0,0,0,.55);margin-top:6px;letter-spacing:.1em;text-transform:uppercase}
h2{font-size:11px;color:#000;letter-spacing:.2em;text-transform:uppercase;margin:32px 0 14px;padding-bottom:8px;border-bottom:1px solid #000;font-weight:700;font-family:'Share Tech Mono',monospace}
/* Map wrapper — image with SVG overlay laid on top, clipped so coverage rings
   that extend past the floor plan edges don't bleed onto surrounding white space */
.map-wrap{position:relative;width:100%;border:1px solid #000;background:#e9e6df;overflow:hidden;margin-bottom:8px}
.map-wrap img{width:100%;display:block;filter:grayscale(.15) brightness(1.02)}
.map-wrap svg{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none}
table{width:100%;border-collapse:collapse;margin-bottom:24px;font-size:11px}
th{background:#efece5;color:#000;font-family:'Share Tech Mono',monospace;font-size:8px;letter-spacing:.15em;text-transform:uppercase;text-align:left;padding:9px 11px;border-bottom:1px solid #000;font-weight:700}
td{padding:8px 11px;border-bottom:1px solid rgba(0,0,0,.08);vertical-align:top;color:rgba(0,0,0,.8)}
tr:hover td{background:rgba(0,0,0,.02)}
.sig-s{color:#000;font-weight:700}.sig-m{color:rgba(0,0,0,.6);font-weight:600}.sig-w{color:rgba(0,0,0,.35);font-weight:500}
.mono{font-family:'Share Tech Mono',monospace;font-size:10px;letter-spacing:.02em}
.muted{font-size:10px;color:rgba(0,0,0,.5)}
.footer{margin-top:48px;padding-top:16px;border-top:1px solid #000;font-size:9px;color:#000;font-family:'Share Tech Mono',monospace;display:flex;justify-content:space-between;letter-spacing:.15em;text-transform:uppercase;font-weight:700}
.print-btn{margin-top:24px;padding:12px 28px;background:#000;color:#efece5;border:none;border-radius:2px;font-size:11px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-weight:700;letter-spacing:.2em;text-transform:uppercase}
.print-btn:hover{background:rgba(0,0,0,.8)}
@media print{body{padding:24px 28px;background:#fff}.print-btn{display:none}.cover{page-break-after:avoid}h2{page-break-after:avoid}table{page-break-inside:auto}tr{page-break-inside:avoid}}
</style></head><body>
<div class="cover">
  ${SETTINGS.metaLine?`<div class="cover-meta">${esc(SETTINGS.metaLine)}</div>`:''}
  <div class="logo">${esc(SETTINGS.company||'NOCTIS')}</div>
  ${SETTINGS.tagline?`<div class="tagline">${esc(SETTINGS.tagline)}</div>`:''}
  <div class="doc-title">${esc(F().imgName||'WiFi Coverage Map')}</div>
  <div class="doc-sub">${esc(SETTINGS.reportTitle||'Network Audit Report')} · ${new Date().toLocaleDateString(SETTINGS.locale||'en-GB')}${SETTINGS.contact?' · '+esc(SETTINGS.contact):''}</div>
</div>
${mapImg.src?`<h2>Coverage Map</h2><div class="map-wrap"><img src="${mapImg.src}" alt="Map"/><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${overlay.cw} ${overlay.ch}" preserveAspectRatio="xMidYMid meet">${overlay.innerSVG}</svg></div>`:''}
${APS().length?`<h2>Access Points (${APS().length})</h2><table><thead><tr><th>#</th><th>Name</th><th>Model</th><th>Frequency</th><th>Ch</th><th>TX</th><th>Signal</th><th>IP</th><th>MAC</th><th>Port</th><th>VLAN</th><th>Notes</th></tr></thead><tbody>${APS().map((ap,i)=>`<tr><td>${i+1}</td><td><strong>${esc(ap.name)}</strong></td><td>${esc(ap.model||'—')}</td><td>${esc(ap.freq)}</td><td class="mono">${esc(ap.channel||'auto')}</td><td class="mono">${esc(ap.txPower||'auto')}</td><td class="sig-${ap.sig[0]}">● ${{strong:'Strong',medium:'Medium',weak:'Weak'}[ap.sig]}</td><td class="mono">${esc(ap.ip||'—')}</td><td class="mono">${esc(ap.mac||'—')}</td><td>${esc(ap.port||'—')}</td><td>${esc(ap.vlan||'—')}</td><td class="muted">${esc(ap.notes||'—')}</td></tr>`).join('')}</tbody></table>`:''}
${SWS().length?`<h2>Switches &amp; Routers</h2><table><thead><tr><th>Name</th><th>Model</th><th>IP</th><th>Notes</th></tr></thead><tbody>${SWS().map(sw=>`<tr><td><strong>${esc(sw.name)}</strong></td><td>${esc(sw.model||'—')}</td><td class="mono">${esc(sw.ip||'—')}</td><td class="muted">${esc(sw.notes||'—')}</td></tr>`).join('')}</tbody></table>`:''}
${DZS().length?`<h2>Dead Zones</h2><table><thead><tr><th>Label</th></tr></thead><tbody>${DZS().map(dz=>`<tr><td>${esc(dz.label||'—')}</td></tr>`).join('')}</tbody></table>`:''}
<div class="footer"><span>${esc(SETTINGS.company||'NOCTIS')}${SETTINGS.contact?' · '+esc(SETTINGS.contact):''}</span><span>Generated ${new Date().toLocaleString(SETTINGS.locale||'en-GB')}</span></div>
<button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
</body></html>`);
  w.document.close();
  toast('PDF preview opened — use Print to save as PDF');
}

// ═══ INIT ═════════════════════════════════════════
window.addEventListener('resize',()=>{render();renderMM();updateScaleBar();});

// ── Autosave to localStorage ──────────────────────
// Silent save every 10s; full state is captured so a refresh doesn't lose work.
// Note: if the user has a very large embedded floor-plan image, the payload may
// exceed the 5MB localStorage quota — we catch that and skip silently.
const AUTOSAVE_KEY='noctis_wifi_autosave';
const AUTOSAVE_INTERVAL_MS=10000;
let lastAutosavePayload='';

let _autosaveQuotaWarned=false;
function autosave(){
  // Skip when the tab is not visible — the user isn't making changes, and
  // running the JSON.stringify on every tick in a backgrounded tab is wasteful.
  // Images live in IndexedDB now (referenced by imgId), so the autosave payload
  // is a few KB even with multi-floor projects.
  if(typeof document!=='undefined'&&document.hidden)return;
  try{
    const payload=JSON.stringify({version:PROJECT_VERSION,settings:SETTINGS,floors:FLOORS,scaleM,savedAt:new Date().toISOString()},_stripCacheReplacer);
    if(payload===lastAutosavePayload)return;  // nothing changed
    localStorage.setItem(AUTOSAVE_KEY,payload);
    lastAutosavePayload=payload;
    _autosaveQuotaWarned=false;
  }catch(err){
    // QuotaExceededError — floor-plan images can be large. Tell the user once
    // per session so they know to use Save instead of relying on autosave.
    const isQuota=err&&(err.name==='QuotaExceededError'||err.code===22||err.code===1014);
    if(isQuota&&!_autosaveQuotaWarned){
      _autosaveQuotaWarned=true;
      toast('Autosave full — use Save to keep your work');
    }
  }
}
function tryRestoreAutosave(){
  try{
    const raw=localStorage.getItem(AUTOSAVE_KEY);
    if(!raw)return false;
    const data=JSON.parse(raw);
    // Only offer to restore if there's actually content
    const hasContent=(data.floors||[]).some(f=>(f.APS&&f.APS.length)||(f.DZS&&f.DZS.length)||(f.SWS&&f.SWS.length)||f.img||f.imgId);
    if(!hasContent){localStorage.removeItem(AUTOSAVE_KEY);return false;}
    const when=data.savedAt?new Date(data.savedAt).toLocaleString():'previous session';
    showModalText('Restore Previous Session?',`A saved session from ${when} was found.\n\nRestore it, or start fresh?`,
      async ()=>{
        const [migrated]=migrateProject(data);
        FLOORS=migrated.floors;scaleM=migrated.scaleM||100;
        SETTINGS={...DEFAULT_SETTINGS,...(migrated.settings||{})};
        document.getElementById('scale-m').value=scaleM;
        curFloor=0;selId=null;selType=null;
        syncNidFromFloors();
        // Promote any inline images surviving from a pre-v5 autosave.
        await Promise.all(FLOORS.map(async f=>{
          if(f.img&&!f.imgId){
            const id=_newImgId();
            try{await idbPutImage(id,f.img);_imgCache.set(id,f.img);f.imgId=id;f.img='';}catch(_){}
          }
        }));
        applySettingsToBrand();
        loadFloorImage();renderFloorTabs();render();renderList();renderRP();calcCoverage();
        toast('Session restored');
      },
      ()=>{localStorage.removeItem(AUTOSAVE_KEY);}
    );
    return true;
  }catch(err){
    localStorage.removeItem(AUTOSAVE_KEY);
    return false;
  }
}
setInterval(autosave,AUTOSAVE_INTERVAL_MS);
// Save immediately when the user returns to the tab, or is about to close it —
// this catches changes that happened in the last interval-tick or while hidden.
document.addEventListener('visibilitychange',()=>{if(!document.hidden)autosave();});
window.addEventListener('beforeunload',autosave);

renderFloorTabs();renderList();renderRP();applySettingsToBrand();

// ═══ EVENT DELEGATION ═════════════════════════════
// Inline onclick/onchange were replaced with data-action attributes.
// One delegated listener dispatches to the right handler.
const CLICK_ACTIONS={
  'open-upload':   ()=>document.getElementById('file-up').click(),
  'open-load':     ()=>document.getElementById('load-up').click(),
  'save':          ()=>saveProject(),
  'new-project':   ()=>newProject(),
  'set-mode':      (arg)=>setMode(arg),
  'zoom-in':       ()=>smoothZoom(+.18),
  'zoom-out':      ()=>smoothZoom(-.18),
  'zoom-fit':      ()=>fitZoom(),
  'toggle-ol':     ()=>toggleOL(),
  'toggle-heat':   ()=>toggleHeat(),
  'toggle-grid':   ()=>toggleGrid(),
  'toggle-coverage':()=>toggleCoverage(),
  'undo':          ()=>undo(),
  'redo':          ()=>redo(),
  'toggle-present':()=>togglePresent(),
  'export':        ()=>doExport(),
  'pdf':           ()=>doPDF(),
  'add-floor':     ()=>addFloor(),
  'modal-close':   ()=>closeModal(),
  'modal-ok':      ()=>modalOK(),
  'show-help':     ()=>showHelp(),
  'show-settings': ()=>showSettings(),
  'toggle-theme':  ()=>toggleTheme(),
  // Item/panel actions (previously inline)
  'set-sig':       (arg)=>setSig(arg),
  'set-color':     (arg)=>setApColor(arg),
  'duplicate':     ()=>duplicateSelected(),
  'ask-del':       ()=>askDel(),
  'quick-del':     (_,e,t)=>{e.stopPropagation();qDel(t.dataset.id,t.dataset.type);},
  'sb-search-clear':()=>{clearSearch();},
};
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-action]');
  if(!t)return;
  const fn=CLICK_ACTIONS[t.dataset.action];
  if(fn)fn(t.dataset.arg,e,t);
});
document.addEventListener('change',e=>{
  const t=e.target.closest('[data-change-action]');
  if(!t)return;
  const a=t.dataset.changeAction;
  if(a==='upload-map')uploadMap(t);
  else if(a==='load-project')loadProject(t);
  else if(a==='toggle-lock')toggleLock();
  else if(a==='upd-wall')updWall();
});
// Blur on a panel input (or pointerup ending a slider drag) commits any
// pending debounced snapshot so the next edit starts a fresh undo step.
document.addEventListener('blur',e=>{
  const t=e.target;
  if(t&&t.dataset&&(t.dataset.inputAction||t.dataset.changeAction))snapshotFlush();
},true);
document.addEventListener('change',e=>{
  const t=e.target;
  if(t&&t.type==='range')snapshotFlush();
},true);

document.addEventListener('input',e=>{
  const t=e.target.closest('[data-input-action]');
  if(!t)return;
  const a=t.dataset.inputAction;
  if(a==='update-scale')updateScale();
  else if(a==='upd-ap')updAP();
  else if(a==='upd-ap-r')updR(t.value);
  else if(a==='upd-dz')updDZ();
  else if(a==='upd-dz-r')updDZR(t.value);
  else if(a==='upd-sw')updSW();
  else if(a==='upd-sw-size')updSWSize(t.value);
  else if(a==='sb-search'){
    searchQuery=t.value;
    // Reflect "has-text" state on the row so the clear (×) button shows up
    const row=t.closest('.sb-search-row');
    if(row)row.classList.toggle('has-text',!!t.value);
    // Debounce — typing fast shouldn't re-render the list per keystroke.
    clearTimeout(_searchT);
    _searchT=setTimeout(renderList,90);
  }
});

// ═══ KEYBOARD SHORTCUTS ═══════════════════════════
document.addEventListener('keydown',e=>{
  // Don't hijack typing into form fields
  const tag=e.target.tagName;
  // Search input gets a special Esc handler that clears + blurs. Other form
  // fields still get hijack-protection (typing should not trigger shortcuts).
  if(tag==='INPUT'&&e.target.id==='sb-search'&&e.key==='Escape'){
    e.preventDefault();clearSearch();return;
  }
  if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||e.target.isContentEditable)return;
  // Single-key mode/toggle shortcuts shouldn't fire when a button (e.g. just-clicked
  // toolbar) holds focus — the user is most likely about to press Space/Enter on it,
  // not switch tools. Modifier-keyed shortcuts (Ctrl+Z etc.) still pass through.
  const isPlainKey=!e.ctrlKey&&!e.metaKey&&!e.altKey;
  if(isPlainKey&&tag==='BUTTON'&&e.key!=='Escape'&&e.key!=='Delete'&&e.key!=='Backspace')return;
  // Undo/redo
  if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&e.key==='z'){e.preventDefault();undo();return;}
  if(((e.ctrlKey||e.metaKey)&&e.key==='y')||((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key==='Z')){e.preventDefault();redo();return;}
  if((e.ctrlKey||e.metaKey)&&e.key==='d'){e.preventDefault();duplicateSelected();return;}
  if((e.ctrlKey||e.metaKey)&&e.key==='l'){e.preventDefault();toggleLock();return;}
  // Escape = deselect / close modal
  if(e.key==='Escape'){
    if(document.getElementById('ctx-menu').classList.contains('vis')){closeContextMenu();return;}
    if(document.getElementById('mbg').classList.contains('vis')){closeModal();return;}
    if(pres){togglePresent();return;}
    if(rulerStart){clearRuler();return;}
    if(wallStart){wallStart=null;wallHover=null;renderWallPreview();return;}
    desel();return;
  }
  // Delete selected item
  if((e.key==='Delete'||e.key==='Backspace')&&selId){e.preventDefault();askDel();return;}
  // Mode switches (matches buttons)
  if(e.key==='a'||e.key==='A'){setMode('add');return;}
  if(e.key==='s'||e.key==='S'){setMode('sel');return;}
  if(e.key==='d'||e.key==='D'){setMode('dz');return;}
  if(e.key==='w'||e.key==='W'){setMode('sw');return;}
  if(e.key==='r'||e.key==='R'){setMode('ruler');return;}
  if(e.key==='l'||e.key==='L'){setMode('wall');return;}
  if(e.key==='p'||e.key==='P'){togglePresent();return;}
  // Toggles
  if(e.key==='o'||e.key==='O'){toggleOL();return;}
  if(e.key==='h'||e.key==='H'){toggleHeat();return;}
  if(e.key==='g'||e.key==='G'){toggleGrid();return;}
  if(e.key==='v'||e.key==='V'){toggleCoverage();return;}
  // Zoom
  if(e.key==='+'||e.key==='='){smoothZoom(+.18);return;}
  if(e.key==='-'||e.key==='_'){smoothZoom(-.18);return;}
  if(e.key==='0'){fitZoom();return;}
  // Help
  if(e.key==='?'||(e.shiftKey&&e.key==='/')){e.preventDefault();showHelp();return;}
});

// ═══ SETTINGS PANEL ═══════════════════════════════
// Per-project branding/locale shown in HTML & PDF exports. Built as DOM nodes
// (no innerHTML) so user-supplied strings are inert.
function showSettings(){
  const wrap=document.createElement('div');wrap.className='settings-form';
  const fields=[
    {key:'company',    label:'Company / Brand',    placeholder:'NOCTIS'},
    {key:'tagline',    label:'Tagline',            placeholder:'Network Planning'},
    {key:'contact',    label:'Contact',            placeholder:'hello@noctis.example'},
    {key:'metaLine',   label:'Cover meta line',    placeholder:'optional, shown above the logo on exports'},
    {key:'reportTitle',label:'Report title',       placeholder:'Network Audit Report'},
    {key:'locale',     label:'Date locale',        placeholder:'en-GB'},
  ];
  const inputs={};
  fields.forEach(f=>{
    const row=document.createElement('div');row.className='ep-row';
    const lbl=document.createElement('label');lbl.className='ep-lbl';lbl.textContent=f.label;
    const inp=document.createElement('input');inp.className='ep-in';inp.type='text';
    inp.value=SETTINGS[f.key]??'';inp.placeholder=f.placeholder||'';
    row.appendChild(lbl);row.appendChild(inp);wrap.appendChild(row);
    inputs[f.key]=inp;
  });
  const hint=document.createElement('div');
  hint.className='ep-hint';
  hint.textContent='Saved with the project. Used in HTML/PDF exports and the top-bar brand label.';
  wrap.appendChild(hint);

  const apply=()=>{
    let changed=false;
    for(const f of fields){
      const val=(inputs[f.key].value||'').trim();
      if((SETTINGS[f.key]||'')!==val){SETTINGS[f.key]=val;changed=true;}
    }
    if(changed){
      applySettingsToBrand();
      // Touch FLOORS so autosave picks up the new settings (settings live at
      // the top level of the saved payload, but autosave compares serialized
      // strings — anything that changes the payload qualifies).
      autosave();
    }
  };
  showModalNode('Project Settings',wrap,apply);
}

// ═══ HELP OVERLAY ═════════════════════════════════
// Built as DOM nodes (no innerHTML) so any future translation strings can't
// inadvertently inject markup.
function _helpRow(parent,parts){
  const row=document.createElement('div');row.className='help-row';
  // parts: array of either {kbd:'A'} | {text:'foo'} | {desc:'Add AP'}
  // We render kbd/text inline, then push desc into a <span>.
  parts.forEach(p=>{
    if(p.kbd){const k=document.createElement('kbd');k.textContent=p.kbd;row.appendChild(k);}
    else if(p.sep){row.appendChild(document.createTextNode(p.sep));}
    else if(p.text){row.appendChild(document.createTextNode(p.text));}
    else if(p.desc){const s=document.createElement('span');s.textContent=p.desc;row.appendChild(s);}
  });
  parent.appendChild(row);
}
function _helpSection(grid,title,rows){
  const sec=document.createElement('div');sec.className='help-sec';
  const h=document.createElement('div');h.className='help-h';h.textContent=title;sec.appendChild(h);
  rows.forEach(r=>_helpRow(sec,r));
  grid.appendChild(sec);
}
function showHelp(){
  const grid=document.createElement('div');grid.className='help-grid';
  _helpSection(grid,'Modes',[
    [{kbd:'A'},{desc:'Add AP'}],
    [{kbd:'S'},{desc:'Select'}],
    [{kbd:'D'},{desc:'Dead Zone'}],
    [{kbd:'W'},{desc:'Switch / Router'}],
    [{kbd:'L'},{desc:'Wall (draw)'}],
    [{kbd:'R'},{desc:'Ruler / Measure'}],
    [{kbd:'P'},{desc:'Present mode'}],
  ]);
  _helpSection(grid,'View',[
    [{kbd:'O'},{desc:'Toggle Overlaps'}],
    [{kbd:'H'},{desc:'Toggle Heatmap'}],
    [{kbd:'G'},{desc:'Toggle Grid'}],
    [{kbd:'V'},{desc:'Toggle Coverage'}],
    [{kbd:'+'},{sep:' / '},{kbd:'-'},{desc:'Zoom'}],
    [{kbd:'0'},{desc:'Fit to screen'}],
    [{kbd:'Space'},{text:' + drag'},{desc:'Pan'}],
    [{text:'Scroll'},{desc:'Zoom in/out'}],
  ]);
  _helpSection(grid,'Edit',[
    [{kbd:'Ctrl'},{text:'+'},{kbd:'Z'},{desc:'Undo'}],
    [{kbd:'Ctrl'},{text:'+'},{kbd:'Y'},{desc:'Redo'}],
    [{kbd:'Del'},{desc:'Delete selected'}],
    [{kbd:'Esc'},{desc:'Deselect / close modal'}],
    [{kbd:'Shift'},{text:'+click AP'},{desc:'Duplicate'}],
  ]);
  _helpSection(grid,'Floors',[
    [{text:'Click '},{kbd:'+'},{desc:'Add floor'}],
    [{text:'Double-click tab'},{desc:'Rename'}],
    [{text:'Click '},{kbd:'×'},{text:' on tab'},{desc:'Delete floor'}],
  ]);
  _helpSection(grid,'Help',[
    [{kbd:'?'},{desc:'Show this panel'}],
  ]);
  showModalNode('Keyboard Shortcuts',grid,null);
  // Widen the modal for the help grid
  const mdl=document.getElementById('mdl');
  if(mdl)mdl.classList.add('help-modal');
}

function initImage(){
  if(mapImg.naturalWidth>0){fitZoom();render();renderMM();updateScaleBar();calcCoverage();updateEmptyState();}
  else{updateEmptyState();setTimeout(initImage,50);}
}

// ═══ THEME ════════════════════════════════════════
// Dark / light mode. The cream-and-black "light" theme is the default; dark
// inverts the palette while keeping all role tokens intact. CSS handles most
// theming via custom properties; inline SVG attribute colors (the ones that
// can't reference CSS vars) read live values via tInk()/tBg() at render time.
const THEME_KEY='noctis_theme';
function applyTheme(t){
  document.body.classList.toggle('theme-dark',t==='dark');
  if(typeof _resetThemeCache==='function')_resetThemeCache();
  const btn=document.getElementById('btn-theme');
  if(btn)btn.textContent=t==='dark'?'☼':'☾';
  // Inline-SVG colors are baked at render time — re-render so they pick up the
  // new tokens. Defer to next frame so this is safe to call during early init.
  if(typeof render==='function'&&typeof requestAnimationFrame!=='undefined'){
    try{requestAnimationFrame(()=>{try{render();}catch(_){}});}catch(_){}
  }
}
function toggleTheme(){
  const next=document.body.classList.contains('theme-dark')?'light':'dark';
  applyTheme(next);
  try{localStorage.setItem(THEME_KEY,next);}catch(_){}
  toast(next==='dark'?'Dark mode':'Light mode');
}

// Clear the sidebar search filter and reset the input + clear-button visibility.
function clearSearch(){
  searchQuery='';
  const inp=document.getElementById('sb-search');
  if(inp){inp.value='';inp.blur();}
  const row=document.querySelector('.sb-search-row');
  if(row)row.classList.remove('has-text');
  renderList();
}
// Restore theme on load before first paint.
(function restoreTheme(){
  try{
    const t=localStorage.getItem(THEME_KEY);
    if(t==='dark')applyTheme('dark');
    else applyTheme('light');
  }catch(_){applyTheme('light');}
})();

// ═══ LEFT SIDEBAR RESIZE ══════════════════════════
// User drags the right edge of the left sidebar to resize. Width is stored as
// a CSS custom property on :root, so existing flex layout stays correct.
// Persisted to localStorage so the chosen width sticks across sessions.
const SB_W_KEY='noctis_sb_w';
const SB_MIN=180,SB_MAX=520;
function setSidebarWidth(px){
  const w=Math.max(SB_MIN,Math.min(SB_MAX,Math.round(px)));
  document.documentElement.style.setProperty('--left-sb-w',w+'px');
  try{localStorage.setItem(SB_W_KEY,String(w));}catch(_){}
}
// Restore previous width on page load
(function restoreSbWidth(){
  try{
    const stored=parseInt(localStorage.getItem(SB_W_KEY)||'',10);
    if(Number.isFinite(stored)&&stored>=SB_MIN&&stored<=SB_MAX){
      document.documentElement.style.setProperty('--left-sb-w',stored+'px');
    }
  }catch(_){}
})();
(function wireSbResize(){
  const handle=document.getElementById('sb-resize-handle');
  const sb=document.getElementById('left-sb');
  if(!handle||!sb)return;
  let dragging=false;
  handle.addEventListener('pointerdown',e=>{
    e.preventDefault();dragging=true;
    handle.classList.add('dragging');
    document.body.classList.add('sb-resizing');
    handle.setPointerCapture(e.pointerId);
  });
  handle.addEventListener('pointermove',e=>{
    if(!dragging)return;
    const r=sb.getBoundingClientRect();
    setSidebarWidth(e.clientX-r.left);
  });
  const stop=e=>{
    if(!dragging)return;
    dragging=false;
    handle.classList.remove('dragging');
    document.body.classList.remove('sb-resizing');
    try{handle.releasePointerCapture(e.pointerId);}catch(_){}
    // Map sometimes stays at old size after sidebar resize — re-fit.
    setTimeout(fitZoom,30);
  };
  handle.addEventListener('pointerup',stop);
  handle.addEventListener('pointercancel',stop);
  // Double-click to reset to default
  handle.addEventListener('dblclick',()=>{setSidebarWidth(220);setTimeout(fitZoom,30);});
})();

// Small delay to let browser lay out the image, then offer to restore
setTimeout(()=>{initImage();tryRestoreAutosave();},100);
