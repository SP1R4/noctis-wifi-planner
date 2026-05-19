// Pure project-file migration logic. Lives in its own module so it can be
// unit-tested without booting the DOM/app shell.

import {WALL_MATERIALS} from './geometry.js';

export const PROJECT_VERSION=7;

export const DEFAULT_SETTINGS={
  company:    'NOCTIS',
  tagline:    'Network Planning',
  contact:    '',
  locale:     'en-GB',
  metaLine:   '',
  reportTitle:'Network Audit Report',
  coverageOpacity: 100,   // 20–100 — scales the coverage fill opacity
  lastModel:       'U6 Pro',  // remembers last placed/selected AP model
};

const DEFAULT_FLOOR_SCALE_M=100;

// Upgrade a loaded project's data to the current schema in place.
// Returns [migratedData, warnings[]]. Throws on irrecoverable shape errors.
//
// Version history:
//   v1 → v2: ensure every AP has a model, every item has a locked flag.
//   v2 → v3: APs get channel + txPower defaults.
//   v3 → v4: each floor gets a WALLS array.
//   v4 → v5: floor images move to IndexedDB; settings live at the top level.
//   v5 → v6: walls store fractional coords (fx1/fy1/fx2/fy2);
//            scaleM moves from project-level to per-floor.
//   v6 → v7: per-floor CAMS array. APs gain pattern+heading for directional
//            antennas. Each AP/camera carries `swPort` for PoE/cable runs.
//
// This function is sync and pure — actual IndexedDB promotion of inline
// images happens in app.js after migrateProject() returns.
export function migrateProject(data){
  const warnings=[];
  if(!data||typeof data!=='object'){throw new Error('Not a NOCTIS project file');}
  if(!Array.isArray(data.floors)){throw new Error('Missing floors');}
  const v=typeof data.version==='number'?data.version:1;
  if(v>PROJECT_VERSION){
    warnings.push(`Project was saved with a newer version (v${v}) — some fields may be ignored.`);
  }
  if(data.settings&&typeof data.settings==='object'){
    const s={};
    for(const k of Object.keys(DEFAULT_SETTINGS)){
      if(k==='coverageOpacity'){
        if(typeof data.settings[k]==='number')s[k]=data.settings[k];
      }else if(typeof data.settings[k]==='string'){
        s[k]=data.settings[k];
      }
    }
    data.settings={...DEFAULT_SETTINGS,...s};
  }else{
    data.settings={...DEFAULT_SETTINGS};
  }
  // Project-level scaleM is the legacy default (pre-v6). New projects use
  // per-floor scaleM; old projects propagate the project-level value down.
  const projectScaleM=typeof data.scaleM==='number'&&data.scaleM>0?data.scaleM:DEFAULT_FLOOR_SCALE_M;
  data.floors.forEach(f=>{
    if(!f.imgId)f.imgId='';
    // Per-floor scaleM. Honour any existing per-floor value; otherwise inherit.
    if(typeof f.scaleM!=='number'||f.scaleM<=0)f.scaleM=projectScaleM;
    (f.APS||[]).forEach(ap=>{
      if(!ap.model)ap.model='U6 Pro';
      if(typeof ap.locked!=='boolean')ap.locked=false;
      if(!ap.sig)ap.sig='strong';
      if(typeof ap.r!=='number'||ap.r<=0)ap.r=80;
      if(!ap.channel)ap.channel='auto';
      if(!ap.txPower)ap.txPower='auto';
      if(typeof ap.color!=='string')ap.color='';
      // v6→v7: directional antenna defaults to omnidirectional (legacy behaviour).
      if(!ap.pattern)ap.pattern='omni';
      if(typeof ap.heading!=='number')ap.heading=0;
      // Switch port for PoE/cable visualization; empty until the user assigns one.
      if(typeof ap.swId!=='string')ap.swId='';
    });
    (f.DZS||[]).forEach(dz=>{if(typeof dz.locked!=='boolean')dz.locked=false;if(typeof dz.r!=='number')dz.r=40;});
    (f.SWS||[]).forEach(sw=>{
      if(typeof sw.locked!=='boolean')sw.locked=false;
      if(typeof sw.size!=='number'||sw.size<=0)sw.size=22;
      // PoE budget in watts. 0 = "non-PoE" or unknown; user can override per switch.
      if(typeof sw.poeBudget!=='number')sw.poeBudget=0;
    });
    // v6→v7: cameras are a new top-level array per floor.
    if(!Array.isArray(f.CAMS))f.CAMS=[];
    f.CAMS.forEach(cam=>{
      if(!cam.model)cam.model='G4 Pro';
      if(typeof cam.locked!=='boolean')cam.locked=false;
      if(typeof cam.fov!=='number'||cam.fov<=0)cam.fov=80;
      if(typeof cam.range!=='number'||cam.range<=0)cam.range=120;
      if(typeof cam.heading!=='number')cam.heading=0;
      if(typeof cam.color!=='string')cam.color='';
      if(typeof cam.swId!=='string')cam.swId='';
      if(!cam.resolution)cam.resolution='4K';
    });
    if(!Array.isArray(f.WALLS))f.WALLS=[];
    f.WALLS.forEach(w=>{
      if(!w.material||!WALL_MATERIALS[w.material])w.material='drywall';
      // v5→v6: convert absolute pixel walls to fractional. The image dimensions
      // aren't known here (this module is DOM-free), but the floor knows its
      // own historical image size if we recorded it. As a safe fallback we
      // convert against `f.imgW/imgH` if present; otherwise we leave the
      // legacy x1/y1/x2/y2 in place and let `wallToPx` in geometry.js handle
      // it for rendering. New walls always go through the fractional path.
      if(!Number.isFinite(w.fx1)||!Number.isFinite(w.fy1)||!Number.isFinite(w.fx2)||!Number.isFinite(w.fy2)){
        if(Number.isFinite(w.x1)&&Number.isFinite(w.y1)&&Number.isFinite(w.x2)&&Number.isFinite(w.y2)
          &&Number.isFinite(f.imgW)&&Number.isFinite(f.imgH)&&f.imgW>0&&f.imgH>0){
          w.fx1=w.x1/f.imgW;w.fy1=w.y1/f.imgH;
          w.fx2=w.x2/f.imgW;w.fy2=w.y2/f.imgH;
          delete w.x1;delete w.y1;delete w.x2;delete w.y2;
        }
      }
    });
  });
  // Drop the legacy project-level scaleM now that each floor carries its own.
  delete data.scaleM;
  data.version=PROJECT_VERSION;
  return [data,warnings];
}

// Walk every item in every floor and find the highest numeric suffix on its
// id. Returns the next free suffix (max+1). Used after loading a project so
// the global `nid` counter doesn't collide with existing IDs.
export function syncNidFromFloors(floors){
  let maxNum=0;
  for(const f of floors){
    for(const list of [f.APS,f.DZS,f.SWS,f.WALLS,f.CAMS]){
      if(!Array.isArray(list))continue;
      for(const item of list){
        if(!item.id)continue;
        const m=String(item.id).match(/(\d+)$/);
        if(m){
          const n=parseInt(m[1],10);
          if(n>maxNum)maxNum=n;
        }
      }
    }
  }
  return maxNum+1;
}

// Pick the next available numeric suffix for an AP/DZ/SW name.
export function nextNameSuffix(items,prefixRegex){
  let max=0;
  for(const it of items){
    const m=String(it.name||'').match(prefixRegex);
    if(m){const n=parseInt(m[1],10);if(n>max)max=n;}
  }
  return max+1;
}
