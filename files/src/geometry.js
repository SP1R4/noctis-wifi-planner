// Pure geometry helpers used by the renderer and the coverage sampler.
// Kept in their own ES module so they can be unit-tested in isolation
// (no DOM, no globals). The app.js shim re-imports + re-exports onto the
// classic-script global namespace for backward compatibility.

// Wall-material attenuation table. `loss` is approximate signal attenuation
// in dB per traversal (typical 5 GHz indoor wall). Mirrors the table in
// app.js so geometry can run without depending on app.js.
export const WALL_MATERIALS={
  drywall:  {label:'Drywall',  loss:3,  strokeWidth:1.2},
  wood:     {label:'Wood',     loss:5,  strokeWidth:1.8},
  glass:    {label:'Glass',    loss:6,  strokeWidth:1,   dash:'2 2'},
  brick:    {label:'Brick',    loss:10, strokeWidth:2.4},
  concrete: {label:'Concrete', loss:15, strokeWidth:3.5},
};

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

// Compute the polygon of reachable points around an AP considering walls.
// Returns an SVG path "d" string. If no walls, returns a circle approximation.
// Inputs:
//   ap: {fx, fy, r}
//   imgW, imgH: image dimensions in pixels
//   walls: array of {x1,y1,x2,y2,material}
//   rays: number of rays to cast (default 72 = every 5°)
export function computeCoveragePath(ap,imgW,imgH,walls,rays=72){
  if(!imgW||!imgH)return 'M0,0Z';
  if(!Number.isFinite(ap.fx)||!Number.isFinite(ap.fy)||!Number.isFinite(ap.r)||ap.r<=0)return 'M0,0Z';
  const cx=ap.fx*imgW, cy=ap.fy*imgH;
  const r=ap.r;
  const pts=[];
  for(let i=0;i<rays;i++){
    const angle=(i/rays)*Math.PI*2;
    const dx=Math.cos(angle), dy=Math.sin(angle);
    const ex=cx+dx*r, ey=cy+dy*r;
    const hits=[];
    for(const wall of walls){
      const t=rayWallIntersect(cx,cy,ex,ey,wall.x1,wall.y1,wall.x2,wall.y2);
      if(t!==null){
        const mat=WALL_MATERIALS[wall.material]||WALL_MATERIALS.drywall;
        hits.push({t,loss:mat.loss});
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

// Returns whether a sample point is reachable by an AP considering wall
// attenuation. Used by the coverage % sampler.
export function coveredThroughWalls(ap,sx,sy,imgW,imgH,walls){
  const ax=ap.fx*imgW, ay=ap.fy*imgH;
  const dist=Math.hypot(sx-ax,sy-ay);
  if(dist>ap.r)return false;
  if(!walls.length)return true;
  let lossDb=0;
  for(const wl of walls){
    const t=rayWallIntersect(ax,ay,sx,sy, wl.x1,wl.y1, wl.x2,wl.y2);
    if(t!==null){
      const mat=WALL_MATERIALS[wl.material]||WALL_MATERIALS.drywall;
      lossDb+=mat.loss;
    }
  }
  return dist <= ap.r * attenuationFactor(lossDb);
}

// Sample a floor for coverage at a coarse grid; return {covered, total}.
// Wall-aware: respects per-wall dB attenuation along the line from AP to
// sample point.
export function sampleFloorCoverage(floor,imgW,imgH){
  const aps=floor.APS||[];
  if(!aps.length)return {covered:0,total:0};
  const walls=floor.WALLS||[];
  const w=imgW||1,h=imgH||1;
  const step=Math.max(4,Math.round(Math.min(w,h)/60));
  let total=0,covered=0;
  for(let x=0;x<w;x+=step)for(let y=0;y<h;y+=step){
    total++;
    if(aps.some(ap=>coveredThroughWalls(ap,x,y,w,h,walls)))covered++;
  }
  return {covered,total};
}
