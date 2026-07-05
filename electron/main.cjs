// Plexus — Network Site Planner — Electron main process.
// Wraps the same self-contained web build (dist/index.html, produced by
// `npm run package:web`) in a desktop window. The renderer is the unmodified
// app; this process only owns the window lifecycle and routes external links
// to the system browser.
//
// CommonJS (.cjs) so it runs regardless of the package's "type":"module".

const { app, BrowserWindow, shell, Menu, ipcMain } = require('electron');
const path = require('node:path');
const https = require('node:https');
const http = require('node:http');
const { execFile } = require('node:child_process');

// Self-update from GitHub Releases (electron-updater reads the publish config
// baked into app-update.yml). Guarded so a failure can never crash the app.
function setupAutoUpdate() {
  if (!app.isPackaged) return;            // dev runs have no update feed
  // macOS Squirrel requires a code-signed app to apply updates; ours is
  // unsigned, so skip there until signing is set up (Win/Linux work unsigned).
  if (process.platform === 'darwin') return;
  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.on('error', () => {});    // network/feed errors are non-fatal
    autoUpdater.checkForUpdatesAndNotify();
  } catch { /* updater unavailable — ignore */ }
}

// The built, inlined single-file app lives at <appRoot>/dist/index.html both in
// development (repo root) and when packaged (electron-builder keeps the dist/
// tree alongside electron/).
const INDEX = path.join(__dirname, '..', 'dist', 'index.html');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#0e0e0e',
    title: 'Plexus',
    show: false,
    // Explicit window icon on every platform. On Windows the taskbar/title-bar
    // icon comes from here (and from the AppUserModelID set below) — without it
    // the running window falls back to the generic Electron logo even though
    // the packaged .exe has the icon embedded.
    icon: path.join(
      __dirname, 'resources',
      process.platform === 'win32' ? 'icon.ico' : 'icon.png',
    ),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  // Avoid a white flash: reveal only once the first paint is ready.
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.loadFile(INDEX);

  // http(s) links (e.g. "Open management UI", external docs) go to the user's
  // real browser; anything else (about:blank popups used by the PDF/print
  // export) opens as a normal child window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Harden against navigating the app frame away from the bundled file://
  // app (e.g. a stray link or injected redirect). The app is a single page —
  // it should never navigate. External http(s) targets open in the browser.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== mainWindow.webContents.getURL()) {
      event.preventDefault();
      if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// A minimal app menu: keep the standard edit/view/window roles (copy-paste,
// zoom, reload, fullscreen, devtools) without app-specific clutter.
function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    { role: 'fileMenu' },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── UniFi controller bridge ────────────────────────────────────────────────
// All controller traffic runs here (not in the renderer) so self-signed
// certificates — the norm on UDM/Cloud Key controllers — can be accepted
// without weakening the app's web security. Credentials are passed per call
// and never persisted by the main process.

function unifiFetch(base, pathName, { method = 'GET', body, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    let u;
    try { u = new URL(pathName, base); } catch (e) { return reject(new Error('Bad controller URL')); }
    const mod = u.protocol === 'http:' ? http : https;
    const data = body ? JSON.stringify(body) : null;
    const req = mod.request(u, {
      method,
      rejectUnauthorized: false,       // controllers ship self-signed certs
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...headers,
      },
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        text: Buffer.concat(chunks).toString('utf8'),
      }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => req.destroy(new Error('Controller timed out')));
    if (data) req.write(data);
    req.end();
  });
}

// Login handles both flavours: UniFi OS consoles (UDM/UDR/CK Gen2 —
// /api/auth/login, APIs proxied under /proxy/network) and the legacy
// software controller (/api/login, APIs at the root).
async function unifiLogin(base, username, password) {
  const capture = (res) => ({
    cookie: (res.headers['set-cookie'] || []).map((c) => c.split(';')[0]).join('; '),
    csrf: res.headers['x-csrf-token'] || '',
  });
  let res = await unifiFetch(base, '/api/auth/login', { method: 'POST', body: { username, password } });
  if (res.status === 200) return { ...capture(res), unifiOs: true };
  res = await unifiFetch(base, '/api/login', { method: 'POST', body: { username, password } });
  if (res.status === 200) return { ...capture(res), unifiOs: false };
  throw new Error(res.status === 400 || res.status === 401
    ? 'UniFi login rejected — check username/password'
    : `UniFi login failed (HTTP ${res.status})`);
}
const unifiSitePath = (session, site, p) =>
  session.unifiOs ? `/proxy/network/api/s/${site}${p}` : `/api/s/${site}${p}`;

async function unifiListDevices(base, session, site) {
  const res = await unifiFetch(base, unifiSitePath(session, site, '/stat/device'), {
    headers: { Cookie: session.cookie },
  });
  if (res.status !== 200) throw new Error(`Device list failed (HTTP ${res.status})`);
  const parsed = JSON.parse(res.text);
  return Array.isArray(parsed.data) ? parsed.data : [];
}

ipcMain.handle('unifi:pull', async (_e, cfg) => {
  try {
    const { url, site = 'default', user, pass } = cfg || {};
    if (!url || !user) throw new Error('Controller URL and username are required');
    const session = await unifiLogin(url, user, pass || '');
    const raw = await unifiListDevices(url, session, site);
    // Ship only the fields the renderer needs — not the whole device blob.
    const devices = raw.map((d) => ({
      name: d.name || d.hostname || '',
      model: d.model || '',
      mac: d.mac || '',
      ip: d.ip || '',
      version: d.version || '',
      serial: d.serial || '',
      type: d.type || '',            // 'uap' | 'usw' | 'ugw' | …
      state: d.state,                // 1 = connected
    }));
    return { ok: true, devices };
  } catch (err) {
    return { ok: false, error: String((err && err.message) || err) };
  }
});

// Push a channel/width/tx plan to matching APs. Matching is by MAC first,
// then case-insensitive name. Only radio_table fields we own are touched.
ipcMain.handle('unifi:push', async (_e, cfg) => {
  try {
    const { url, site = 'default', user, pass, changes } = cfg || {};
    if (!url || !user) throw new Error('Controller URL and username are required');
    if (!Array.isArray(changes) || !changes.length) throw new Error('No channel plan to push');
    const session = await unifiLogin(url, user, pass || '');
    const devices = await unifiListDevices(url, session, site);
    const norm = (m) => String(m || '').toLowerCase().replace(/[^0-9a-f]/g, '');
    const bandRadio = { '2.4': 'ng', 5: 'na', '5': 'na', '6': '6e' };
    const results = [];
    for (const ch of changes) {
      const dev = devices.find((d) => norm(d.mac) === norm(ch.mac) && norm(ch.mac))
        || devices.find((d) => (d.name || '').toLowerCase() === (ch.name || '').toLowerCase() && ch.name);
      if (!dev) { results.push({ name: ch.name, ok: false, error: 'no matching device on controller' }); continue; }
      if (!Array.isArray(dev.radio_table)) { results.push({ name: ch.name, ok: false, error: 'device has no radios' }); continue; }
      const radioName = bandRadio[ch.band] || 'na';
      const radio_table = dev.radio_table.map((r) => {
        if (r.radio !== radioName) return r;
        const upd = { ...r, channel: ch.channel };
        if (ch.width) upd.ht = String(ch.width);
        if (Number.isFinite(ch.txPowerDbm)) { upd.tx_power_mode = 'custom'; upd.tx_power = String(ch.txPowerDbm); }
        return upd;
      });
      const res = await unifiFetch(url, unifiSitePath(session, site, `/rest/device/${dev._id || dev.device_id || ''}`), {
        method: 'PUT',
        body: { radio_table },
        headers: { Cookie: session.cookie, ...(session.csrf ? { 'x-csrf-token': session.csrf } : {}) },
      });
      results.push({ name: ch.name, ok: res.status === 200, error: res.status === 200 ? '' : `HTTP ${res.status}` });
    }
    return { ok: true, results };
  } catch (err) {
    return { ok: false, error: String((err && err.message) || err) };
  }
});

// ── Live WiFi sampling (click-to-survey) ───────────────────────────────────
const run = (cmd, args, opts = {}) => new Promise((resolve, reject) => {
  execFile(cmd, args, { maxBuffer: 8 * 1024 * 1024, timeout: 15000, ...opts }, (err, stdout) => {
    if (err) reject(err); else resolve(String(stdout));
  });
});

async function wifiSampleMac() {
  // `airport` is gone on modern macOS; system_profiler still reports the
  // current connection (slow — a couple of seconds — but survey clicks are
  // occasional and the renderer shows a "sampling…" toast meanwhile).
  const out = await run('system_profiler', ['SPAirPortDataType', '-json']);
  const json = JSON.parse(out);
  const ifaces = (((json.SPAirPortDataType || [])[0] || {}).spairport_airport_interfaces) || [];
  for (const inf of ifaces) {
    const cur = inf.spairport_current_network_information;
    if (!cur) continue;
    const sn = String(cur.spairport_signal_noise || '');
    const m = /(-?\d+)\s*dBm\s*\/\s*(-?\d+)\s*dBm/.exec(sn);
    if (!m) continue;
    const chM = /(\d+)/.exec(String(cur.spairport_network_channel || ''));
    return {
      ok: true,
      rssi: parseInt(m[1], 10),
      noise: parseInt(m[2], 10),
      ssid: cur._name || '',
      bssid: '',                    // macOS redacts BSSID without location permission
      channel: chM ? parseInt(chM[1], 10) : null,
    };
  }
  throw new Error('Not connected to WiFi');
}

async function wifiSampleWin() {
  const out = await run('netsh', ['wlan', 'show', 'interfaces']);
  const pick = (re) => { const m = re.exec(out); return m ? m[1].trim() : ''; };
  const pct = parseInt(pick(/Signal\s*:\s*(\d+)%/i), 10);
  if (!Number.isFinite(pct)) throw new Error('Not connected to WiFi');
  return {
    ok: true,
    rssi: Math.round(pct / 2 - 100),  // netsh reports quality %, ≈ (rssi+100)*2
    noise: null,
    ssid: pick(/^\s*SSID\s*:\s*(.+)$/im),
    bssid: pick(/BSSID\s*:\s*([0-9a-f:]+)/i),
    channel: parseInt(pick(/Channel\s*:\s*(\d+)/i), 10) || null,
  };
}

async function wifiSampleLinux() {
  const dev = (await run('sh', ['-c', "iw dev | awk '/Interface/{print $2; exit}'"])).trim();
  if (!dev) throw new Error('No wireless interface found');
  const out = await run('iw', ['dev', dev, 'link']);
  const m = /signal:\s*(-?\d+)\s*dBm/.exec(out);
  if (!m) throw new Error('Not connected to WiFi');
  const ssid = (/SSID:\s*(.+)/.exec(out) || [])[1] || '';
  const bssid = (/Connected to\s+([0-9a-f:]+)/i.exec(out) || [])[1] || '';
  const freq = parseInt((/freq:\s*(\d+)/.exec(out) || [])[1], 10);
  // Frequency → channel (2.4/5/6 GHz).
  let channel = null;
  if (Number.isFinite(freq)) {
    if (freq >= 2412 && freq <= 2484) channel = freq === 2484 ? 14 : Math.round((freq - 2407) / 5);
    else if (freq >= 5955) channel = Math.round((freq - 5950) / 5);
    else if (freq >= 5000) channel = Math.round((freq - 5000) / 5);
  }
  return { ok: true, rssi: parseInt(m[1], 10), noise: null, ssid: ssid.trim(), bssid, channel };
}

ipcMain.handle('survey:sample', async () => {
  try {
    if (process.platform === 'darwin') return await wifiSampleMac();
    if (process.platform === 'win32') return await wifiSampleWin();
    return await wifiSampleLinux();
  } catch (err) {
    return { ok: false, error: String((err && err.message) || err) };
  }
});

// Windows groups taskbar buttons and resolves the running app's icon by its
// AppUserModelID. It must match the appId electron-builder bakes into the
// installed shortcut (com.plexus.networkplanner); otherwise Windows can't tie
// the live window to the shortcut and shows the generic Electron icon instead
// of (and breaks pinning for) the Plexus logo.
if (process.platform === 'win32') {
  app.setAppUserModelId('com.plexus.networkplanner');
}

app.whenReady().then(() => {
  buildMenu();
  createWindow();
  setupAutoUpdate();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
