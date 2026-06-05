// NOCTIS WiFi Planner — Electron main process.
// Wraps the same self-contained web build (dist/index.html, produced by
// `npm run package:web`) in a desktop window. The renderer is the unmodified
// app; this process only owns the window lifecycle and routes external links
// to the system browser.
//
// CommonJS (.cjs) so it runs regardless of the package's "type":"module".

const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('node:path');

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
    title: 'NOCTIS WiFi Planner',
    show: false,
    icon: process.platform === 'linux'
      ? path.join(__dirname, 'resources', 'icon.png')
      : undefined,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
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
