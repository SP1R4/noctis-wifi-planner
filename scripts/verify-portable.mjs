// Regression guard for the portable (file://) build. Opens the built+inlined
// dist/index.html under the file:// origin with ALL http(s) blocked, then proves
// the app actually boots (its JS ran) and a map upload works. Catches the class
// of bug where Chrome/Edge silently refuse external <script type="module"> and
// <link> stylesheets on file://.
//
//   npm run verify:portable        (runs vite build + inline first)
//
// Exits non-zero on any failure so it can gate CI / releases.

import {chromium} from '@playwright/test';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {existsSync} from 'node:fs';

const INDEX=resolve('dist/index.html');
if(!existsSync(INDEX)){console.error('dist/index.html missing — build + inline first.');process.exit(1);}

const fail=(msg)=>{console.error('✗ '+msg);process.exitCode=1;};
const ok=(msg)=>console.log('✓ '+msg);

const b=await chromium.launch();
const p=await b.newPage();
const errs=[]; const ext=[];
p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
p.on('pageerror',e=>errs.push('PAGEERROR: '+e.message));
// Force offline: abort anything over the network; file:// and data: pass.
await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http')){ext.push(u);return r.abort();}return r.continue();});

await p.goto(pathToFileURL(INDEX).href,{waitUntil:'load',timeout:20000});
await p.waitForTimeout(800);

// No external asset reference should remain in the document.
const externalAssets=await p.evaluate(()=>{
  const sel=[...document.querySelectorAll('script[src],link[rel="stylesheet"][href]')];
  return sel.map(e=>e.getAttribute('src')||e.getAttribute('href')).filter(u=>/assets\//.test(u||''));
});
externalAssets.length ? fail('external asset refs remain: '+externalAssets.join(', ')) : ok('index.html is self-contained (no external assets)');

// Drive an actual map upload — only works if the app's JS executed.
let uploaded=false;
try{
  await p.setInputFiles('#file-up',{name:'plan.png',mimeType:'image/png',
    buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64')});
  await p.waitForFunction(()=>{const m=document.getElementById('mi');return m&&m.src&&m.src.length>40;},{timeout:5000});
  uploaded=true;
}catch(e){/* handled below */}
uploaded ? ok('app booted and map upload works from file://') : fail('app did not boot / map upload failed from file://');

ext.length ? fail('made '+ext.length+' network request(s) — not fully offline: '+ext[0]) : ok('zero network requests (fully offline)');
errs.length ? fail('console/page errors: '+JSON.stringify(errs.slice(0,3))) : ok('no console or page errors');

await b.close();
console.log(process.exitCode ? '\nPORTABLE VERIFY: FAILED' : '\nPORTABLE VERIFY: PASSED');
