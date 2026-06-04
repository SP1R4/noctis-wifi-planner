// Downloads product photos for the device catalog and bundles them locally so
// the side-panel previews work offline (no runtime CDN dependency).
//
//   node scripts/fetch-device-images.mjs
//
// Sources, in order of leverage:
//   1. Ubiquiti's public device database (static.ui.com/fingerprint/ui/public.json)
//      — covers every UniFi AP / switch / gateway / Protect camera automatically,
//      matched against this catalog's model names. Image URL pattern:
//        static.ui.com/fingerprint/ui/images/<device.id>/default/<images.default>.png
//      (served through the images.svc.ui.com resize proxy at w=1080).
//   2. MANUAL entries below — MikroTik (cdn.mikrotik.com) and Axis (axis.com),
//      whose sites have no bulk DB but do expose stable per-product image URLs,
//      plus a few UniFi fallbacks the DB names don't match cleanly.
//
// Downloads land in files/public/devices/ (Vite copies publicDir into dist/, so
// they ship with the build and resolve under file://). Regenerates
// files/src/deviceImages.js with a { model: 'devices/<slug>.<ext>' } map and
// prints a coverage report. Brands served only via JavaScript apps (Hikvision,
// Dahua, TP-Link, Cisco/Meraki, Reolink, Aruba, Netgear, …) have no fetchable
// URL and fall through to the in-app category placeholder.

import {writeFile, mkdir, readdir, unlink, stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {MODELS, SW_MODELS, CAM_MODELS} from '../files/src/constants.js';

const __dirname=dirname(fileURLToPath(import.meta.url));
const ROOT=join(__dirname,'..');
const OUT_DIR=join(ROOT,'files','public','devices');
const MANUAL_DIR=join(OUT_DIR,'manual');
const MAP_FILE=join(ROOT,'files','src','deviceImages.js');
const UI_DB='https://static.ui.com/fingerprint/ui/public.json';
const uiImg=(id,hash)=>`https://images.svc.ui.com/?u=https%3A%2F%2Fstatic.ui.com%2Ffingerprint%2Fui%2Fimages%2F${id}%2Fdefault%2F${hash}.png&w=1080&q=75`;
const mt=(id)=>`https://cdn.mikrotik.com/web-assets/rb_images/${id}_lg.webp`;

// MikroTik + Axis + UniFi-name fallbacks the DB doesn't match cleanly. DB
// matches (UniFi) take precedence; these only fill gaps.
const MANUAL=[
  // MikroTik — routers
  {model:'hEX (RB750Gr4)', url:mt(1405)},
  {model:'hEX refresh',    url:mt(1405)},
  {model:'hEX S (RB760iGS)',url:mt(1539)},
  {model:'hAP ac²',        url:mt(1468)},
  {model:'hAP ac³',        url:mt(1975)},
  {model:'hAP ax²',        url:mt(2203)},
  {model:'hAP ax³',        url:mt(2211)},
  {model:'hAP ax lite',    url:mt(2225)},
  {model:'RB4011iGS+RM',   url:mt(1633)},
  {model:'RB5009UG+S+IN',  url:mt(2065)},
  {model:'RB5009UPr+S+IN', url:mt(2190)},
  {model:'L009UiGS-RM',    url:mt(2267)},
  {model:'CCR2004-1G-12S+2XS',url:mt(1935)},
  // MikroTik — switches
  {model:'CSS610-8G-2S+IN',url:mt(1980)},
  {model:'CRS305-1G-4S+IN',url:mt(1659)},
  {model:'CRS309-1G-8S+IN',url:mt(1730)},
  {model:'CRS317-1G-16S+RM',url:mt(1324)},
  {model:'CRS328-24P-4S+RM',url:mt(1493)},
  {model:'CRS504-4XQ-IN',  url:mt(2156)},
  // Axis — cameras (M3045-V and M3046-V share the M30-series photo)
  {model:'M3045-V',        url:'https://www.axis.com/sites/axis/files/styles/square_500x500_/public/2020-01/m30_44v_44wv_45v_45wv_ceiling_front_1512_hi_0.png.webp?itok=0gV-1Wgk'},
  {model:'M3046-V',        url:'https://www.axis.com/sites/axis/files/styles/square_500x500_/public/2020-01/m30_44v_44wv_45v_45wv_ceiling_front_1512_hi_0.png.webp?itok=0gV-1Wgk'},
  {model:'M3057-PLVE',     url:'https://www.axis.com/sites/axis/files/styles/square_500x500_/public/2020-01/1600_m3057plve_ceiling_1711_hi.png.webp?itok=ml0Md8vq'},
  {model:'P3245-LV',       url:'https://www.axis.com/sites/axis/files/styles/square_1000x1000_/public/2021-03/1600_p3245-lv-wall-front-2010.png.webp?itok=AyYiRhbT'},
  {model:'Q6125-LE (PTZ)', url:'https://www.axis.com/sites/axis/files/styles/square_1000x1000_/public/2019-12/1600_q6125le-angle-left-w-t91l61-1802.png.webp?itok=yYioCC69'},
  // UniFi fallbacks (DB name mismatch) — verified Ubiquiti store/techspecs URLs.
  {model:'U6 Plus',        url:'https://images.svc.ui.com/?u=https%3A%2F%2Fcdn.ecomm.ui.com%2Fproducts%2F6d5c6141-e2e9-416a-b789-53e59416bb1a%2Ffe055e16-62dc-408f-844e-a76053e63f0d.png&q=75&w=1080'},
  {model:'U6 Long-Range',  url:'https://images.svc.ui.com/?u=https%3A%2F%2Fcdn.ecomm.ui.com%2Fproducts%2Fd8fee47d-b53e-4a86-a5cb-cf2f6ab1c5ef%2F1a7279b8-ac84-41ad-8c9d-f35652099422.png&q=75&w=1080'},
  {model:'UAP-AC-Mesh',    url:'https://images.svc.ui.com/?u=https%3A%2F%2Fcdn.ecomm.ui.com%2Fproducts%2F256e298c-7a20-4d6a-983f-7445e6cb98df%2F9ddd479a-4890-43d0-96fe-fc0da33a6e18.png&q=75&w=1080'},
];

const CATALOG=[...MODELS,...SW_MODELS,...CAM_MODELS]
  .filter(m=>m&&m!=='Custom/Other'&&!/^Generic/.test(m));
const norm=s=>String(s).toUpperCase().replace(/[^A-Z0-9]/g,'');

// Build a normalized-name → UniFi image URL index from the public device DB.
async function buildUniFiIndex(){
  const res=await fetch(UI_DB);
  if(!res.ok)throw new Error('UniFi DB HTTP '+res.status);
  const db=await res.json();
  const idx=new Map();
  for(const d of db.devices||[]){
    const hash=d.images&&d.images.default;
    if(!hash||!d.id)continue;
    const url=uiImg(d.id,hash);
    const names=[d.product&&d.product.name,d.sku,...(d.shortnames||[]),d.product&&d.product.abbrev].filter(Boolean);
    for(const n of names){
      const k=norm(n);
      if(k&&!idx.has(k))idx.set(k,url);
      // Protect cameras are listed as UVC-*; AP catalog often drops the UAP- prefix.
      for(const pre of ['UVC','UAP']){
        if(k.startsWith(pre)){const k2=k.slice(pre.length);if(k2&&!idx.has(k2))idx.set(k2,url);}
      }
    }
  }
  return idx;
}
function lookupUniFi(idx,model){
  const k=norm(model);
  return idx.get(k)||idx.get(k.replace(/^UVC/,''))||idx.get('UVC'+k)||idx.get('UAP'+k)||null;
}

// MikroTik has no bulk DB, but its product-group listing pages pair each
// /product/<slug> with its rb_images/<id> thumbnail. Scrape those to map every
// MikroTik model to a full-res image, then match catalog names by slug.
const MT_GROUPS=['ethernet-routers','switches','wireless-systems','indoor-wireless','lte-5g-products','60-ghz-products','routerboard'];
async function buildMikroTikIndex(){
  const idx=new Map();
  for(const g of MT_GROUPS){
    let html;
    try{
      const r=await fetch(`https://mikrotik.com/products/group/${g}`,{headers:{'user-agent':'Mozilla/5.0'}});
      if(!r.ok)continue; html=await r.text();
    }catch{continue;}
    const re=/\/product\/([a-z0-9_]+)|rb_images\/(\d+)_/gi;
    let m,slug=null;
    while((m=re.exec(html))){
      if(m[1])slug=m[1];
      else if(m[2]&&slug){
        const k=norm(slug);
        if(k&&!idx.has(k))idx.set(k,`https://cdn.mikrotik.com/web-assets/rb_images/${m[2]}_lg.webp`);
        slug=null;
      }
    }
  }
  return idx;
}
function lookupMikroTik(idx,model){
  const base=model.replace(/²/g,'2').replace(/³/g,'3');
  return idx.get(norm(base))||idx.get(norm(base.replace(/\(.*?\)/g,'')))||null;
}

// TP-Link / Omada: the product pages are JS-rendered but their image gallery
// lives on static.tp-link.com. Resolve each catalog TP-Link model to its
// product page via the Omada sitemap, then pull the hero photo from the page.
const TP_RE=/^(EAP\d|TL-SG|TL-SX|OmadaSX|SX\d)/i;
async function buildTpLinkIndex(models){
  const idx=new Map();
  let urls=[];
  try{
    const si=await (await fetch('https://omadanetworks.com/us/sitemap-us.xml')).text();
    urls=[...si.matchAll(/https:\/\/[a-z0-9.]*omadanetworks\.com\/us\/business-networking\/[a-z0-9/_-]+/gi)]
      .map(m=>m[0]).filter(u=>!/\/v\d+\/?$/.test(u)); // drop /v1 /v3 hardware-revision URLs
  }catch{return idx;}
  // page URL by normalized trailing slug, e.g. .../sg3428mp/ → SG3428MP
  const bySlug=new Map();
  for(const u of urls){const seg=u.replace(/\/$/,'').split('/').pop();const k=norm(seg);if(k&&!bySlug.has(k))bySlug.set(k,u);}
  for(const model of models){
    if(!TP_RE.test(model))continue;
    const k=norm(model);
    const page=bySlug.get(k)||bySlug.get(k.replace(/^TL/,''))||bySlug.get('TL'+k);
    if(!page)continue;
    try{
      const html=await (await fetch(page,{headers:{'user-agent':'Mozilla/5.0'}})).text();
      const m=/https:\/\/static\.(?:tp-link|omadanetworks)\.com\/(?:upload\/)?image-line\/[^"')\s]+_large_[^"')\s]+\.(?:jpg|png)/i.exec(html);
      if(m)idx.set(k,m[0]);
    }catch{/* skip */}
  }
  return idx;
}
function lookupTpLink(idx,model){return idx.get(norm(model))||null;}

// Icecat open catalog — a free product database that carries images for the
// "open" brands (TP-Link, EnGenius, and others). Queried per model by brand +
// part number. Brands on a paid Icecat tier (Cisco, Hikvision, Netgear, Aruba)
// return nothing and fall through to the placeholder.
function icecatBrand(model){
  const m=model;
  if(/^(EAP\d|TL-|OmadaSX|SX\d)/i.test(m))return 'TP-Link';
  if(/^(ECW|EWS)/i.test(m))return 'EnGenius';
  if(/^(DS-|iDS-)/i.test(m))return 'Hikvision';
  if(/^(IPC-|SD\d|DH-)/i.test(m))return 'Dahua';
  if(/^(GS\d|M4\d|XSM)/i.test(m))return 'NETGEAR';
  if(/^(R[0-9]50|R7[0-9]0|T[0-9]50)/i.test(m))return 'Ruckus';
  if(/^(RLC|Argus|Trackmix)/i.test(m))return 'Reolink';
  if(/^(IB\d|FD\d|SD\d)/i.test(m))return 'VIVOTEK';
  if(/^(FLEXIDOME|DINION|AUTODOME)/i.test(m))return 'Bosch';
  if(/^(cnPilot|ePMP|cnMatrix|XV2|XV3)/i.test(m))return 'Cambium Networks';
  if(/^(C9|C1[03]00)/i.test(m))return 'Cisco';
  if(/^(MR\d|MS\d|CW\d|MX\d)/i.test(m))return 'Cisco';
  if(/^(AP\d|XE\d)/i.test(m))return 'Extreme Networks';
  return null;
}
async function icecatLookup(model){
  const brand=icecatBrand(model);
  if(!brand)return null;
  const code=model.replace(/\(.*?\)/g,'').trim();
  try{
    const url=`https://live.icecat.biz/api?username=openIcecat-live&lang=en&Brand=${encodeURIComponent(brand)}&ProductCode=${encodeURIComponent(code)}&content=Image`;
    const r=await fetch(url);
    if(!r.ok)return null;
    const j=await r.json();
    const i=(j.data&&j.data.Image)||{};
    return i.HighPic||i.Pic500x500||i.LowPic||null;
  }catch{return null;}
}

function slugify(model){
  return model.replace(/²/g,'2').replace(/³/g,'3').toLowerCase()
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}
const EXT_BY_TYPE={'image/png':'png','image/webp':'webp','image/jpeg':'jpg','image/gif':'gif','image/svg+xml':'svg'};
// Some CDNs (e.g. Reolink) omit content-type; fall back to the URL extension.
function extFor(type,url){
  if(EXT_BY_TYPE[type])return EXT_BY_TYPE[type];
  const m=/\.(png|webp|jpe?g|gif|svg)(?:[?#].*)?$/i.exec(url);
  if(m)return m[1].toLowerCase().replace('jpeg','jpg');
  return null;
}

async function download(model,url,map,cache){
  if(cache.has(url)){map[model]=cache.get(url);return 'dup';}
  const res=await fetch(url);
  if(!res.ok)throw new Error('HTTP '+res.status);
  const type=(res.headers.get('content-type')||'').split(';')[0].trim();
  const ext=extFor(type,url);
  if(!ext)throw new Error('not an image ('+type+')');
  const buf=Buffer.from(await res.arrayBuffer());
  if(buf.length<512)throw new Error('too small ('+buf.length+'b)');
  const file=`${slugify(model)}.${ext}`;
  await writeFile(join(OUT_DIR,file),buf);
  const rel=`devices/${file}`;
  map[model]=rel;cache.set(url,rel);
  return (buf.length/1024).toFixed(0)+' KB';
}

async function run(){
  await mkdir(OUT_DIR,{recursive:true});
  // Clear previously auto-downloaded files (top-level only) so stale slugs don't
  // linger; the manual/ subdir is preserved.
  for(const f of await readdir(OUT_DIR)){
    const p=join(OUT_DIR,f);
    if((await stat(p)).isFile())await unlink(p);
  }
  console.log('Fetching UniFi device DB…');
  const uiIdx=await buildUniFiIndex();
  console.log('Scraping MikroTik product listings…');
  const mtIdx=await buildMikroTikIndex();
  console.log('Resolving TP-Link / Omada product pages…');
  const tpIdx=await buildTpLinkIndex(CATALOG);
  // Resolve each catalog model: UniFi → MikroTik → TP-Link → MANUAL → Icecat.
  const manual=new Map(MANUAL.map(e=>[e.model,e.url]));
  const tasks=[];
  let icecatMisses=0;
  for(const model of CATALOG){
    let url=lookupUniFi(uiIdx,model)||lookupMikroTik(mtIdx,model)||lookupTpLink(tpIdx,model)||manual.get(model)||null;
    if(!url){url=await icecatLookup(model);if(url)icecatMisses++;}
    if(url)tasks.push({model,url});
  }
  if(icecatMisses)console.log(`Icecat open catalog resolved ${icecatMisses} more model(s).`);
  console.log(`Catalog: ${CATALOG.length} models · sourced: ${tasks.length} · downloading…\n`);
  const map={};const cache=new Map();let ok=0,fail=0;
  for(const {model,url} of tasks){
    try{const info=await download(model,url,map,cache);ok++;console.log(`  ✓ ${model.padEnd(26)} ${info}`);}
    catch(err){fail++;console.warn(`  ✗ ${model.padEnd(26)} ${err.message}`);}
  }
  // Manual drop-in overrides: any file in files/public/devices/manual/ named
  // <model-slug>.<ext> is matched to a catalog model and wins over auto sources.
  // Lets you add a photo for ANY model (especially the JS-only brands) by
  // dropping a file and re-running — no URL needed.
  let manualCount=0;
  try{
    const slugToModel=new Map(CATALOG.map(m=>[slugify(m),m]));
    for(const f of await readdir(MANUAL_DIR)){
      const dot=f.lastIndexOf('.'); if(dot<1)continue;
      const slug=f.slice(0,dot), model=slugToModel.get(slug);
      if(model){map[model]=`devices/manual/${f}`;manualCount++;}
    }
  }catch{/* manual dir is optional */}
  if(manualCount)console.log(`  + ${manualCount} manual override(s) from devices/manual/`);
  const total=Object.keys(map).length;
  const header=`// AUTO-GENERATED by scripts/fetch-device-images.mjs — do not edit by hand.\n`
    +`// model → bundled image path (under files/public/, copied to dist/ by Vite).\n`
    +`// ${total} images, generated ${new Date().toISOString().slice(0,10)}. Re-run to refresh.\n`;
  await writeFile(MAP_FILE,header+`export const MODEL_IMAGES=${JSON.stringify(map,null,2)};\n`);
  const uncovered=CATALOG.filter(m=>!map[m]);
  console.log(`\nDone: ${ok} downloaded, ${fail} failed, ${uncovered.length} uncovered (placeholder).`);
  console.log(`Coverage: ${ok}/${CATALOG.length} catalog models (${(100*ok/CATALOG.length).toFixed(0)}%).`);
}
run();
