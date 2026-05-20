// Pure geometry + RF helpers used by the renderer, the coverage sampler,
// and the heatmap/SNR/throughput layers. Kept in their own ES module so they
// can be unit-tested in isolation (no DOM, no globals). app.js imports them
// as the single source of truth.

/**
 * @typedef {Object} APLike
 * @property {number=} fx     Fractional X position in [0,1].
 * @property {number=} fy     Fractional Y position in [0,1].
 * @property {number=} r      Effective radius in pixels (geometric reach).
 * @property {string=} freq  Band label, e.g. '2.4 / 5 GHz', '5 GHz only', '6 GHz (WiFi 6E)'.
 * @property {string=} pattern  Antenna pattern key ('omni', 'sector-30', etc.).
 * @property {number=} heading  Heading in degrees, 0 = east.
 * @property {number=} antennaGainDbi  Antenna gain (dBi). 0 if absent.
 * @property {number=} cableLossDb     Coax/connector loss between AP radio and antenna.
 * @property {number=} txPowerDbm      Conducted Tx power at the AP. 20 if absent.
 *
 * @typedef {Object} WallLike
 * @property {string=} material  Key into WALL_MATERIALS.
 * @property {number=} fx1 @property {number=} fy1 @property {number=} fx2 @property {number=} fy2
 * @property {number=} x1  @property {number=} y1  @property {number=} x2  @property {number=} y2
 *
 * @typedef {Object} RfOpts
 * @property {number=} rays
 * @property {number=} bandFactor
 * @property {number=} arcDeg     Half-width of the radiated arc in degrees. 180 = omni.
 * @property {number=} headingDeg
 * @property {number=} eirpDbm    EIRP override. If absent, derived from txPower+gain-cable.
 * @property {number=} noiseFloorDbm  Noise floor for SNR/MCS. Default -95 dBm.
 * @property {string=} model      Propagation model key (see PROPAGATION_MODELS).
 */

// Wall-material attenuation table. `loss` is approximate signal attenuation
// in dB per traversal at 5 GHz (the baseline). Band-aware code multiplies
// this by a band factor (see BAND_LOSS).
export const WALL_MATERIALS={
  drywall:  {label:'Drywall',  loss:3,  strokeWidth:1.2},
  wood:     {label:'Wood',     loss:5,  strokeWidth:1.8},
  glass:    {label:'Glass',    loss:6,  strokeWidth:1,   dash:'2 2'},
  brick:    {label:'Brick',    loss:10, strokeWidth:2.4},
  concrete: {label:'Concrete', loss:15, strokeWidth:3.5},
};

// Band-loss multipliers applied to per-wall dB loss. 5 GHz is the baseline
// (1.0). 2.4 GHz penetrates better → less effective loss. 6 GHz (WiFi 6E)
// penetrates worse. Values are conservative real-world estimates.
export const BAND_LOSS={
  '2.4 GHz only':    0.6,
  '2.4 / 5 GHz':     0.6,
  '5 GHz only':      1.0,
  '6 GHz (WiFi 6E)': 1.3,
};
/**
 * @param {string=} freq
 * @returns {number}
 */
export function bandLossMultiplier(freq){
  return BAND_LOSS[freq]??1.0;
}

// Propagation-model path-loss "exponent" in dB across one AP radius. Bigger
// values = signal decays faster with distance. Mirrors `PROPAGATION_MODELS`
// in constants.js but is kept here too so geometry.js stays DOM-/UI-free.
const PROP_EXPONENT={
  'logd':       25,
  'itu-indoor': 30,
  'multi-wall': 32,
};
const DEFAULT_NOISE_FLOOR_DBM=-95;

// 802.11ac/ax MCS minimum-SNR thresholds (dB) for a single spatial stream.
// Approximate; used to map SNR → MCS index → expected Mbps.
const MCS_SNR_TABLE=[
  {mcs:0, snr:5,  mbps:7.2},
  {mcs:1, snr:8,  mbps:14.4},
  {mcs:2, snr:11, mbps:21.7},
  {mcs:3, snr:14, mbps:28.9},
  {mcs:4, snr:18, mbps:43.3},
  {mcs:5, snr:22, mbps:57.8},
  {mcs:6, snr:25, mbps:65.0},
  {mcs:7, snr:28, mbps:72.2},
  {mcs:8, snr:31, mbps:86.7},
  {mcs:9, snr:34, mbps:96.3},
  {mcs:10,snr:37, mbps:108.3},
  {mcs:11,snr:41, mbps:120.4},
];
// Approximate spatial-stream multipliers per band. 5 GHz APs commonly have
// 2-4 streams; we average to 2.5x. 6 GHz adds 160 MHz BW + WiFi 7 → ~4x.
const BAND_STREAM_MULT={
  '2.4 GHz only':    1.2,
  '2.4 / 5 GHz':     2.5,
  '5 GHz only':      2.5,
  '6 GHz (WiFi 6E)': 4.0,
};

// Each 3 dB of loss roughly halves the usable range in that direction.
// Floored at 0.05 so a thick bunker wall still produces some coverage.
/**
 * @param {number} totalLossDb
 * @returns {number}
 */
export function attenuationFactor(totalLossDb){
  return Math.max(0.05, Math.pow(0.5, totalLossDb/3));
}

// Segment-segment intersection. Returns the parametric t along the ray
// (from a → b) where it hits the wall, or null if no hit within 0..1.
/**
 * @returns {number|null}
 */
export function rayWallIntersect(ax,ay, bx,by, wx1,wy1, wx2,wy2){
  const rdx=bx-ax, rdy=by-ay;
  const sdx=wx2-wx1, sdy=wy2-wy1;
  const denom=rdx*sdy - rdy*sdx;
  if(Math.abs(denom)<1e-9)return null;
  const t=((wx1-ax)*sdy - (wy1-ay)*sdx)/denom;
  const u=((wx1-ax)*rdy - (wy1-ay)*rdx)/denom;
  if(t<0||t>1||u<0||u>1)return null;
  return t;
}

// Resolve a wall to absolute pixel coords given image dimensions.
// Accepts both fractional (fx1/fy1/fx2/fy2) and legacy pixel (x1/y1/x2/y2) walls.
/**
 * @param {WallLike} w
 * @param {number} imgW
 * @param {number} imgH
 * @returns {{x1:number,y1:number,x2:number,y2:number}}
 */
export function wallToPx(w,imgW,imgH){
  if(Number.isFinite(w.fx1)&&Number.isFinite(w.fy1)&&Number.isFinite(w.fx2)&&Number.isFinite(w.fy2)){
    return {x1:w.fx1*imgW,y1:w.fy1*imgH,x2:w.fx2*imgW,y2:w.fy2*imgH};
  }
  return {x1:w.x1||0,y1:w.y1||0,x2:w.x2||0,y2:w.y2||0};
}

// Normalize an angle to [-180, 180].
function _angleDelta(a,b){
  let d=a-b;
  while(d>180)d-=360;
  while(d<-180)d+=360;
  return d;
}

// EIRP for an AP: conducted Tx power (dBm) + antenna gain (dBi) − cable/connector loss (dB).
// Defaults: txPower=20 dBm (a common conducted limit), gain=0, cableLoss=0.
/**
 * @param {APLike} ap
 * @returns {number}
 */
export function effectiveEirp(ap){
  const tx=Number.isFinite(ap.txPowerDbm)?ap.txPowerDbm:20;
  const gain=Number.isFinite(ap.antennaGainDbi)?ap.antennaGainDbi:0;
  const cable=Number.isFinite(ap.cableLossDb)?ap.cableLossDb:0;
  return tx+gain-cable;
}

// Compute the polygon of reachable points around an AP considering walls.
// Returns an SVG path "d" string. Opts as documented at the top of the file.
/**
 * @param {APLike} ap
 * @param {number} imgW
 * @param {number} imgH
 * @param {WallLike[]} walls
 * @param {RfOpts|number=} opts
 * @returns {string}
 */
export function computeCoveragePath(ap,imgW,imgH,walls,opts){
  // Back-compat: callers used to pass `rays` as a number for the 5th arg.
  const rays=typeof opts==='number'?opts:(opts&&opts.rays)||72;
  const bandFactor=(opts&&typeof opts==='object'&&opts.bandFactor)??1;
  const arcDeg=(opts&&typeof opts==='object'&&typeof opts.arcDeg==='number')?opts.arcDeg:180;
  const headingDeg=(opts&&typeof opts==='object'&&typeof opts.headingDeg==='number')?opts.headingDeg:0;
  const directional=arcDeg<180;
  if(!imgW||!imgH)return 'M0,0Z';
  if(!Number.isFinite(ap.fx)||!Number.isFinite(ap.fy)||!Number.isFinite(ap.r)||ap.r<=0)return 'M0,0Z';
  const cx=ap.fx*imgW, cy=ap.fy*imgH;
  const r=ap.r;
  const pxWalls=walls.map(w=>({...wallToPx(w,imgW,imgH),material:w.material}));
  const pts=[];
  for(let i=0;i<rays;i++){
    const angleDeg=(i/rays)*360;
    if(directional && Math.abs(_angleDelta(angleDeg,headingDeg))>arcDeg){
      const a=angleDeg*Math.PI/180;
      pts.push({x:cx+Math.cos(a)*r*0.02, y:cy+Math.sin(a)*r*0.02});
      continue;
    }
    const angle=angleDeg*Math.PI/180;
    const dx=Math.cos(angle), dy=Math.sin(angle);
    const ex=cx+dx*r, ey=cy+dy*r;
    const hits=[];
    for(const wall of pxWalls){
      const t=rayWallIntersect(cx,cy,ex,ey,wall.x1,wall.y1,wall.x2,wall.y2);
      if(t!==null){
        const mat=WALL_MATERIALS[wall.material]||WALL_MATERIALS.drywall;
        hits.push({t,loss:mat.loss*bandFactor});
      }
    }
    hits.sort((a,b)=>a.t-b.t);
    let reachT=1, cumLoss=0;
    for(const hit of hits){
      cumLoss+=hit.loss;
      const atten=attenuationFactor(cumLoss);
      const newReach=hit.t + (1-hit.t)*atten;
      if(newReach<reachT)reachT=newReach;
      if(reachT<=hit.t)break;
    }
    pts.push({x:cx+dx*r*reachT, y:cy+dy*r*reachT});
  }
  return 'M'+pts.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('L')+'Z';
}

// Estimate the signal strength in dBm at a sample point from a single AP.
// Returns null if the point is beyond the AP's effective range.
//
// Uses a configurable distance-only term: -PE * log10(r/d) where PE is the
// per-radius path-loss exponent (25 dB for log-distance, 30 for ITU indoor,
// 32 for multi-wall COST-231-like). EIRP-derived adjustments are added on top.
//
// Back-compat: the 7th positional arg may be a number (bandFactor).
/**
 * @param {APLike} ap
 * @param {number} sx
 * @param {number} sy
 * @param {number} imgW
 * @param {number} imgH
 * @param {WallLike[]} walls
 * @param {RfOpts|number=} opts
 * @returns {number|null}
 */
export function dbmAt(ap,sx,sy,imgW,imgH,walls,opts){
  const bf=typeof opts==='number'?opts:((opts&&opts.bandFactor)??1);
  const arcDeg=(opts&&typeof opts==='object'&&typeof opts.arcDeg==='number')?opts.arcDeg:180;
  const headingDeg=(opts&&typeof opts==='object'&&typeof opts.headingDeg==='number')?opts.headingDeg:0;
  const modelKey=(opts&&typeof opts==='object'&&typeof opts.model==='string')?opts.model:'logd';
  const pe=PROP_EXPONENT[modelKey]??PROP_EXPONENT.logd;
  const eirp=(opts&&typeof opts==='object'&&Number.isFinite(opts.eirpDbm))?opts.eirpDbm:effectiveEirp(ap);
  // EIRP delta vs. the model baseline (logd assumes 20 dBm EIRP → -55 dBm at the
  // edge). Higher-PE models drop the edge value so larger PE = faster real-world
  // decay across the radius, not just a steeper near-field gradient.
  const eirpBoost=eirp-20;
  const edgeDbm=-55-(pe-25);
  const ax=ap.fx*imgW, ay=ap.fy*imgH;
  const dist=Math.hypot(sx-ax,sy-ay);
  if(dist>ap.r)return null;
  if(arcDeg<180){
    const angle=Math.atan2(sy-ay,sx-ax)*180/Math.PI;
    if(Math.abs(_angleDelta(angle,headingDeg))>arcDeg)return null;
  }
  let lossDb=0;
  for(const wl of walls){
    const px=wallToPx(wl,imgW,imgH);
    const t=rayWallIntersect(ax,ay,sx,sy,px.x1,px.y1,px.x2,px.y2);
    if(t!==null){
      const mat=WALL_MATERIALS[wl.material]||WALL_MATERIALS.drywall;
      lossDb+=mat.loss*bf;
    }
  }
  if(dist > ap.r*attenuationFactor(lossDb))return null;
  const dRatio=Math.max(0.05,dist/ap.r);
  const fsLoss=pe*Math.log10(1/dRatio);
  return edgeDbm + fsLoss - lossDb + eirpBoost;
}

// SNR (dB) for a single AP at a sample point. Returns null when out of reach.
/**
 * @param {APLike} ap
 * @param {number} sx @param {number} sy
 * @param {number} imgW @param {number} imgH
 * @param {WallLike[]} walls
 * @param {RfOpts=} opts
 * @returns {number|null}
 */
export function snrAt(ap,sx,sy,imgW,imgH,walls,opts){
  const dbm=dbmAt(ap,sx,sy,imgW,imgH,walls,opts);
  if(dbm===null)return null;
  const nf=(opts&&Number.isFinite(opts.noiseFloorDbm))?opts.noiseFloorDbm:DEFAULT_NOISE_FLOOR_DBM;
  return dbm-nf;
}

// SNR → MCS index. Returns -1 if below MCS 0 (i.e. link not usable).
/**
 * @param {number} snrDb
 * @returns {number}
 */
export function mcsFromSnr(snrDb){
  if(!Number.isFinite(snrDb))return -1;
  let best=-1;
  for(const e of MCS_SNR_TABLE){
    if(snrDb>=e.snr)best=e.mcs;
  }
  return best;
}

// Approximate single-link throughput in Mbps. Uses the MCS row for the SNR,
// multiplied by a stream factor derived from the AP's band (2.4 ≈ 1.2x, 5 ≈ 2.5x,
// 6/WiFi 7 ≈ 4x). Returns 0 if no link.
/**
 * @param {APLike} ap
 * @param {number} sx @param {number} sy
 * @param {number} imgW @param {number} imgH
 * @param {WallLike[]} walls
 * @param {RfOpts=} opts
 * @returns {number}
 */
export function mbpsAt(ap,sx,sy,imgW,imgH,walls,opts){
  const snr=snrAt(ap,sx,sy,imgW,imgH,walls,opts);
  if(snr===null)return 0;
  let row=null;
  for(const e of MCS_SNR_TABLE){if(snr>=e.snr)row=e;}
  if(!row)return 0;
  const mult=BAND_STREAM_MULT[ap.freq]??2.0;
  return row.mbps*mult;
}

// Returns whether a sample point is reachable by an AP considering wall
// attenuation. Used by the coverage % sampler.
/**
 * @param {APLike} ap
 * @param {number} sx @param {number} sy
 * @param {number} imgW @param {number} imgH
 * @param {WallLike[]} walls
 * @param {number=} bandFactor
 * @returns {boolean}
 */
export function coveredThroughWalls(ap,sx,sy,imgW,imgH,walls,bandFactor){
  const bf=bandFactor??1;
  const ax=ap.fx*imgW, ay=ap.fy*imgH;
  const dist=Math.hypot(sx-ax,sy-ay);
  if(dist>ap.r)return false;
  if(!walls.length)return true;
  let lossDb=0;
  for(const wl of walls){
    const px=wallToPx(wl,imgW,imgH);
    const t=rayWallIntersect(ax,ay,sx,sy, px.x1,px.y1, px.x2,px.y2);
    if(t!==null){
      const mat=WALL_MATERIALS[wl.material]||WALL_MATERIALS.drywall;
      lossDb+=mat.loss*bf;
    }
  }
  return dist <= ap.r * attenuationFactor(lossDb);
}

// Sample a floor for coverage at a coarse grid; return {covered, total}.
/**
 * @param {{APS?:APLike[],WALLS?:WallLike[]}} floor
 * @param {number} imgW @param {number} imgH
 * @returns {{covered:number,total:number}}
 */
export function sampleFloorCoverage(floor,imgW,imgH){
  const aps=floor.APS||[];
  if(!aps.length)return {covered:0,total:0};
  const walls=floor.WALLS||[];
  const w=imgW||1,h=imgH||1;
  const step=Math.max(4,Math.round(Math.min(w,h)/60));
  let total=0,covered=0;
  for(let x=0;x<w;x+=step)for(let y=0;y<h;y+=step){
    total++;
    if(aps.some(ap=>coveredThroughWalls(ap,x,y,w,h,walls,bandLossMultiplier(ap.freq))))covered++;
  }
  return {covered,total};
}

// Sample a floor for roaming overlap: % of sample points where ≥2 APs deliver
// ≥ thresholdDbm. Returns {covered, total}.
/**
 * @param {{APS?:APLike[],WALLS?:WallLike[]}} floor
 * @param {number} imgW @param {number} imgH
 * @param {number=} thresholdDbm
 * @returns {{covered:number,total:number}}
 */
export function sampleRoamingOverlap(floor,imgW,imgH,thresholdDbm=-67){
  const aps=floor.APS||[];
  if(aps.length<2)return {covered:0,total:0};
  const walls=floor.WALLS||[];
  const w=imgW||1,h=imgH||1;
  const step=Math.max(4,Math.round(Math.min(w,h)/60));
  let total=0,covered=0;
  for(let x=0;x<w;x+=step)for(let y=0;y<h;y+=step){
    total++;
    let n=0;
    for(const ap of aps){
      const d=dbmAt(ap,x,y,w,h,walls,{bandFactor:bandLossMultiplier(ap.freq)});
      if(d!==null && d>=thresholdDbm){n++;if(n>=2)break;}
    }
    if(n>=2)covered++;
  }
  return {covered,total};
}

// Approximate floor-to-floor RF leakage: returns the EIRP-equivalent dBm
// contribution from an AP on a neighbouring floor at sample (sx,sy). Treats
// the slab as a single uniform attenuator; walls on the source floor are
// ignored (we don't have their position relative to this floor's sample).
/**
 * @param {APLike} ap
 * @param {number} sx @param {number} sy
 * @param {number} imgW @param {number} imgH
 * @param {number} slabDb  Slab attenuation in dB per slab traversed.
 * @param {number=} bandFactor
 * @param {string=} modelKey  Propagation model key.
 * @returns {number|null}
 */
export function dbmAtThroughSlab(ap,sx,sy,imgW,imgH,slabDb,bandFactor,modelKey){
  const bf=bandFactor??1;
  const pe=PROP_EXPONENT[modelKey||'logd']??PROP_EXPONENT.logd;
  const eirp=effectiveEirp(ap);
  const eirpBoost=eirp-20;
  const edgeDbm=-55-(pe-25);
  const ax=ap.fx*imgW, ay=ap.fy*imgH;
  const dist=Math.hypot(sx-ax,sy-ay);
  if(dist>ap.r)return null;
  const dRatio=Math.max(0.05,dist/ap.r);
  // Apply the slab loss as an extra attenuator multiplied by the band factor —
  // 2.4 GHz penetrates slabs better than 5 GHz, just like walls.
  const effSlab=slabDb*bf;
  if(dist > ap.r*attenuationFactor(effSlab))return null;
  const fsLoss=pe*Math.log10(1/dRatio);
  return edgeDbm + fsLoss - effSlab + eirpBoost;
}
