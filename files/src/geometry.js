// Pure geometry helpers used by the renderer and the coverage sampler.
// Kept in their own ES module so they can be unit-tested in isolation
// (no DOM, no globals). app.js imports these as the single source of truth.

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
  '2.4 / 5 GHz':     0.6,   // dual-band coverage equals the 2.4 GHz reach
  '5 GHz only':      1.0,
  '6 GHz (WiFi 6E)': 1.3,
};
export function bandLossMultiplier(freq){
  return BAND_LOSS[freq]??1.0;
}

// Each 3 dB of loss roughly halves the usable range in that direction.
// Floored at 0.05 so a thick bunker wall still produces some coverage.
export function attenuationFactor(totalLossDb){
  return Math.max(0.05, Math.pow(0.5, totalLossDb/3));
}

// Segment-segment intersection. Returns the parametric t along the ray
// (from a → b) where it hits the wall, or null if no hit within 0..1.
export function rayWallIntersect(ax,ay, bx,by, wx1,wy1, wx2,wy2){
  const rdx=bx-ax, rdy=by-ay;
  const sdx=wx2-wx1, sdy=wy2-wy1;
  const denom=rdx*sdy - rdy*sdx;
  if(Math.abs(denom)<1e-9)return null;  // parallel
  const t=((wx1-ax)*sdy - (wy1-ay)*sdx)/denom;
  const u=((wx1-ax)*rdy - (wy1-ay)*rdx)/denom;
  if(t<0||t>1||u<0||u>1)return null;
  return t;
}

// Resolve a wall to absolute pixel coords given image dimensions.
// Accepts both fractional (fx1/fy1/fx2/fy2) and legacy pixel (x1/y1/x2/y2) walls.
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

// Compute the polygon of reachable points around an AP considering walls.
// Returns an SVG path "d" string.
// opts: {rays:72, bandFactor:1, arcDeg:180, headingDeg:0}
//   arcDeg=180 means "omnidirectional" — full 360° coverage.
//   arcDeg<180 carves a wedge with half-width arcDeg around headingDeg.
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
    // Directional: if this ray is outside the heading's arc, collapse it to
    // a near-zero reach so the polygon hugs the AP centre on that side.
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
// Returns null if the point is beyond the AP's effective range. Uses a
// log-distance path-loss approximation: -30 dBm at the source, -10 dBm per
// decade of distance (a rough free-space-ish slope), minus accumulated
// wall loss. Good enough for relative shading on a heatmap; not a survey.
//
// opts: {bandFactor:1, arcDeg:180, headingDeg:0}
//   arcDeg < 180 carves a directional cone (half-width) around headingDeg.
//   Back-compat: the 7th positional arg may still be a number (bandFactor).
export function dbmAt(ap,sx,sy,imgW,imgH,walls,opts){
  const bf=typeof opts==='number'?opts:((opts&&opts.bandFactor)??1);
  const arcDeg=(opts&&typeof opts==='object'&&typeof opts.arcDeg==='number')?opts.arcDeg:180;
  const headingDeg=(opts&&typeof opts==='object'&&typeof opts.headingDeg==='number')?opts.headingDeg:0;
  const ax=ap.fx*imgW, ay=ap.fy*imgH;
  const dist=Math.hypot(sx-ax,sy-ay);
  if(dist>ap.r)return null;
  // Directional gating: outside the cone, no signal contribution.
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
  // Reject the point if walls would push effective range below the actual distance.
  if(dist > ap.r*attenuationFactor(lossDb))return null;
  // Free-space-ish path loss: at distance ratio d/r, signal is -55 dBm at the
  // edge of the (unobstructed) range and -30 dBm right at the AP. Linear in
  // dBm against log-distance is close enough for the heatmap.
  const dRatio=Math.max(0.05,dist/ap.r);
  const fsLoss=25*Math.log10(1/dRatio); // 25 dB of headroom across the radius
  return -55 + fsLoss - lossDb;
}

// Returns whether a sample point is reachable by an AP considering wall
// attenuation. Used by the coverage % sampler.
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
// Wall-aware: respects per-wall dB attenuation along the line from AP to
// sample point. Each AP uses its own band multiplier based on `ap.freq`.
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
