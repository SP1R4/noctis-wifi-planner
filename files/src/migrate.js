// Pure project-file migration logic. Lives in its own module so it can be
// unit-tested without booting the DOM/app shell.

import {WALL_MATERIALS} from './geometry.js';

export const PROJECT_VERSION=5;

export const DEFAULT_SETTINGS={
  company:    'NOCTIS',
  tagline:    'Network Planning',
  contact:    '',
  locale:     'en-GB',
  metaLine:   '',
  reportTitle:'Network Audit Report',
};

// Upgrade a loaded project's data to the current schema in place.
// Returns [migratedData, warnings[]]. Throws on irrecoverable shape errors.
//
// Version history:
//   v1 → v2: ensure every AP has a model, every item has a locked flag.
//   v2 → v3: APs get channel + txPower defaults.
//   v3 → v4: each floor gets a WALLS array.
//   v4 → v5: floor images move to IndexedDB; settings live at the top level.
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

// Walk every item in every floor and find the highest numeric suffix on its
// id. Returns the next free suffix (max+1). Used after loading a project so
// the global `nid` counter doesn't collide with existing IDs.
export function syncNidFromFloors(floors){
  let maxNum=0;
  for(const f of floors){
    for(const list of [f.APS,f.DZS,f.SWS,f.WALLS]){
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
