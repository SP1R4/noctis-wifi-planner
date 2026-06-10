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

// Playwright's screencast records at CSS-pixel resolution no matter the
// deviceScaleFactor, which made the old demo.gif soft. Instead, step the drag
// manually and grab a real 2× screenshot per GIF frame — timing is synthetic
// (12 fps on encode), so capture speed doesn't matter.
async function captureDragFrames(browser) {
  const ctx = await browser.newContext({
    viewport: {width: 1280, height: 720},
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await loadSample(page);

  const dir = fs.mkdtempSync(path.join(OUT, 'frames-'));
  let n = 0;
  const fname = i => path.join(dir, `f${String(i).padStart(3, '0')}.png`);
  const frame = async (holds = 1) => {
    await page.screenshot({path: fname(n), animations: 'disabled'});
    for (let i = 1; i < holds; i++) fs.copyFileSync(fname(n), fname(n + i));
    n += holds;
  };

  // Drag AP-02 (open office) around — coverage re-clips against the walls
  // live, which is the money shot.
  const dot = page.locator('.ap-grp[data-id="ap15"] circle').last();
  const box = await dot.boundingBox();
  const sx = box.x + box.width / 2, sy = box.y + box.height / 2;
  await page.mouse.move(sx, sy);
  await frame(6);                          // hold the start state ~0.5 s
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
  let prev = {x: sx, y: sy};
  for (const wp of waypoints) {
    const steps = 12;
    for (let i = 1; i <= steps; i++) {
      await page.mouse.move(prev.x + (wp.x - prev.x) * i / steps,
                            prev.y + (wp.y - prev.y) * i / steps);
      await frame();
    }
    await frame(2);                        // brief dwell at each waypoint
    prev = wp;
  }
  await page.mouse.up();
  await frame(8);                          // settle on the final state
  await ctx.close();
  return dir;
}

function framesToGif(dir) {
  const gif = path.join(OUT, 'demo.gif');
  const palette = path.join(OUT, '_palette.png');
  const input = ['-framerate', '12', '-i', path.join(dir, 'f%03d.png')];
  // Two-pass palette for a clean GIF. Frames are 2× (2560 px), so 1280 is a
  // true downscale — crisp text — and the fine bayer dither avoids visible
  // crosshatch on the flat UI.
  execFileSync('ffmpeg', ['-y', ...input,
    '-vf', 'scale=1280:-1:flags=lanczos,palettegen', palette]);
  execFileSync('ffmpeg', ['-y', ...input, '-i', palette,
    '-lavfi', 'scale=1280:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5',
    gif]);
  fs.rmSync(palette);
  fs.rmSync(dir, {recursive: true});
  return gif;
}

const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'],
  {stdio: 'ignore', detached: false});
try {
  await waitForServer(BASE);
  const browser = await chromium.launch();
  console.log('capturing screenshots…');
  await captureScreenshots(browser);
  console.log('capturing drag frames…');
  const frames = await captureDragFrames(browser);
  await browser.close();
  console.log('encoding gif…');
  const gif = framesToGif(frames);
  for (const f of fs.readdirSync(OUT)) {
    const kb = Math.round(fs.statSync(path.join(OUT, f)).size / 1024);
    console.log(`  docs/media/${f} — ${kb} KB`);
  }
  console.log('done:', gif);
} finally {
  server.kill();
}
