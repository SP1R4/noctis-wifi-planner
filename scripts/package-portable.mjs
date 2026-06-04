// Stages the built app into a self-contained, no-install portable folder and
// zips it for distribution to technicians. Run after `vite build`:
//
//   npm run package:portable
//
// Output: build/noctis-wifi-planner-portable-v<version>.zip — unzip anywhere and
// double-click index.html. Works fully offline (file://), cross-platform.

import {cp, mkdir, rm, writeFile, readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {spawnSync} from 'node:child_process';

const __dirname=dirname(fileURLToPath(import.meta.url));
const ROOT=join(__dirname,'..');
const DIST=join(ROOT,'dist');
const BUILD=join(ROOT,'build');

const run=async()=>{
  if(!existsSync(DIST))throw new Error('dist/ not found — run `npm run build` first.');
  const pkg=JSON.parse(await readFile(join(ROOT,'package.json'),'utf8'));
  const name=`noctis-wifi-planner-portable-v${pkg.version}`;
  const stage=join(BUILD,name);
  await rm(stage,{recursive:true,force:true});
  await mkdir(stage,{recursive:true});
  await cp(DIST,stage,{recursive:true});
  await writeFile(join(stage,'READ-ME-FIRST.txt'),README(pkg.version));

  // Zip it (the `zip` CLI ships on macOS/Linux; technicians only need to unzip).
  const zipPath=join(BUILD,`${name}.zip`);
  await rm(zipPath,{force:true});
  const z=spawnSync('zip',['-rq',`${name}.zip`,name],{cwd:BUILD,stdio:'inherit'});
  if(z.error||z.status!==0){
    console.log(`\nStaged folder ready: ${stage}`);
    console.log('(`zip` CLI not available — zip the folder above manually.)');
    return;
  }
  console.log(`\nPortable package: ${zipPath}`);
  console.log('Unzip anywhere and double-click index.html. Offline, no install.');
};

const README=(v)=>`NOCTIS WiFi Planner — Portable (v${v})
==================================================

HOW TO RUN
  1. Unzip this folder anywhere (Desktop, a USB stick, etc.).
  2. Open the folder and double-click  index.html  — it opens in your browser.
  That's it. No installation. No internet connection required.

  Works in Chrome, Edge, or Firefox. If the browser asks, allow it to open the
  local file.

KEEP THE FOLDER TOGETHER
  index.html needs the  devices/  folder that sits next to it (the product
  photos). Move or copy the WHOLE folder, never index.html on its own.

SAVING WORK / MOVING A SURVEY BETWEEN LAPTOPS
  - The app autosaves in your browser as you work on this machine.
  - To hand a survey to another laptop or a colleague:
       click  Save  to download a  .json  project file,
       then on the other laptop click  Load  and pick that file.
  - Floor-plan images and any device photos you add are stored INSIDE the .json,
    so the project looks identical on every machine.

OFFLINE
  Everything — product photos, fonts, and code — is bundled in this folder, so
  it runs with no internet. Models from brands without a public image source
  show a generic AP/camera/switch icon; you can add your own photo per device
  (Upload button, drag-and-drop, or paste) from the side panel.
`;

run();
