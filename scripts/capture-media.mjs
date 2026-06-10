// Capture README media from the live app: gallery screenshots + the demo GIF
// (an AP being dragged with coverage re-clipping in real time). Drives the
// sample project, so it needs no external assets.
//
// Usage: node scripts/capture-media.mjs   (starts its own vite dev server)
// Output: docs/media/*.png, docs/media/demo.gif (needs ffmpeg on PATH)

import {chromium} from '@playwright/test';
import {spawn, execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PORT = 5198;
const BASE = `http://localhost:${PORT}`;
const OUT = path.resolve('docs/media');
fs.mkdirSync(OUT, {recursive: true});

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitForServer(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url); if (r.ok) return; } catch {}
    await sleep(500);
  }
  throw new Error('dev server never came up at ' + url);
}

async function loadSample(page) {
  await page.goto(BASE);
  await page.locator('[data-action="load-sample"]').click();
  await page.locator('#empty-state.hidden').waitFor({state: 'attached'});
  await page.evaluate(() => document.activeElement?.blur?.());
  await sleep(900);                       // fonts + first full render
}

const shoot = (page, name) =>
  page.screenshot({path: path.join(OUT, name), animations: 'disabled'});

async function captureScreenshots(browser) {
  const ctx = await browser.newContext({
    viewport: {width: 1440, height: 900},
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await loadSample(page);

  // 1. Coverage view (the default) — wall-clipped polygons + cameras.
  await shoot(page, 'coverage.png');

  // 2. Signal heatmap.
  await page.keyboard.press('h');
  await sleep(700);
  await shoot(page, 'heatmap-rssi.png');

  // 3. Throughput heatmap (cycle RSSI → SNR → MCS → Mbps).
  for (let i = 0; i < 3; i++) await page.locator('#heat-mode-pill').click();
  await sleep(700);
  await shoot(page, 'heatmap-throughput.png');
  await page.evaluate(() => document.activeElement?.blur?.());
  await page.keyboard.press('h');         // heat off again

  // 4. Cable runs to the switch.
  await page.locator('#btn-cables').click();
  await sleep(400);
  await shoot(page, 'cables.png');
  await page.locator('#btn-cables').click();

  // 5. Dark mode with the heatmap on.
  await page.locator('#btn-theme').click();
  await page.evaluate(() => document.activeElement?.blur?.());
  await page.keyboard.press('h');
  await sleep(700);
  await shoot(page, 'dark-heatmap.png');

  await ctx.close();
}

async function captureDragVideo(browser) {
  const ctx = await browser.newContext({
    viewport: {width: 1280, height: 720},
    recordVideo: {dir: OUT, size: {width: 1280, height: 720}},
  });
  const page = await ctx.newPage();
  await loadSample(page);

  // Drag AP-02 (open office) around — coverage re-clips against the walls
  // live, which is the money shot.
  const dot = page.locator('.ap-grp[data-id="ap15"] circle').last();
  const box = await dot.boundingBox();
  const sx = box.x + box.width / 2, sy = box.y + box.height / 2;
  await page.mouse.move(sx, sy);
  await sleep(600);
  await page.mouse.down();

  // Smooth path: into the meeting room (through the glass wall), down past
  // the kitchen, back into the office.
  const waypoints = [
    {x: sx - 280, y: sy + 40},
    {x: sx - 420, y: sy + 130},
    {x: sx - 300, y: sy + 260},
    {x: sx + 60,  y: sy + 220},
    {x: sx + 180, y: sy + 60},
    {x: sx,       y: sy},
  ];
  for (const wp of waypoints) {
    await page.mouse.move(wp.x, wp.y, {steps: 28});
    await sleep(250);
  }
  await page.mouse.up();
  await sleep(800);

  await page.close();
  const video = await page.video().path();
  await ctx.close();
  return video;
}

function webmToGif(webm) {
  const gif = path.join(OUT, 'demo.gif');
  const palette = path.join(OUT, '_palette.png');
  // Two-pass palette for a clean GIF at a reasonable size.
  execFileSync('ffmpeg', ['-y', '-i', webm,
    '-vf', 'fps=12,scale=960:-1:flags=lanczos,palettegen', palette]);
  execFileSync('ffmpeg', ['-y', '-i', webm, '-i', palette,
    '-lavfi', 'fps=12,scale=960:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=4',
    gif]);
  fs.rmSync(palette);
  fs.rmSync(webm);
  return gif;
}

const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'],
  {stdio: 'ignore', detached: false});
try {
  await waitForServer(BASE);
  const browser = await chromium.launch();
  console.log('capturing screenshots…');
  await captureScreenshots(browser);
  console.log('recording drag video…');
  const webm = await captureDragVideo(browser);
  await browser.close();
  console.log('encoding gif…');
  const gif = webmToGif(webm);
  for (const f of fs.readdirSync(OUT)) {
    const kb = Math.round(fs.statSync(path.join(OUT, f)).size / 1024);
    console.log(`  docs/media/${f} — ${kb} KB`);
  }
  console.log('done:', gif);
} finally {
  server.kill();
}
