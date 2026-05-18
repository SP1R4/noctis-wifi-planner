# Installation

NOCTIS WiFi Planner is a static single-page app. You can run it from
source (with hot reload) or build a portable bundle that opens straight
from disk — no web server required for end users.

## One-line install (recommended)

Scripts that check for/install Node and build the app live in `scripts/`.
Run them from the repo root after cloning.

```bash
git clone https://github.com/SP1R4/noctis-wifi-planner
cd noctis-wifi-planner
```

| OS                | Command                                                            |
| ----------------- | ------------------------------------------------------------------ |
| macOS             | `bash scripts/install-macos.sh`                                    |
| Ubuntu / Debian   | `bash scripts/install-ubuntu.sh`                                   |
| Windows (PowerShell) | `powershell -ExecutionPolicy Bypass -File scripts\install-windows.ps1` |

Each script: verifies the OS, installs Node 18+ via the OS-native package
manager if it's missing (Homebrew / apt-NodeSource / winget), runs the
tests, and builds the production bundle.

Everything below is the manual path — read on if you'd rather not run a
script blind, or you're on a distro the scripts don't cover.

## Prerequisites

- **Node.js 18 or newer** (LTS recommended). Check with `node --version`.
- **npm** (ships with Node) or any compatible package manager
  (pnpm, yarn, bun all work).
- A modern browser. Chrome 90+, Firefox 88+, Safari 14+, or Edge 90+.

Installing Node:

- **macOS** (Homebrew): `brew install node`
- **Linux** (nvm — recommended): see <https://github.com/nvm-sh/nvm>
- **Windows**: download from <https://nodejs.org/>

If you use [nvm](https://github.com/nvm-sh/nvm), the repo includes an
`.nvmrc`, so `nvm use` picks the right Node version automatically.

## Option 1 — Run from source (development)

Hot-reloads on every save. Best for hacking on the planner itself.

```bash
git clone https://github.com/SP1R4/noctis-wifi-planner
cd noctis-wifi-planner
npm install
npm run dev
```

Open <http://localhost:5173> in your browser. Edits to `files/**` reload
automatically.

To pick a different port:

```bash
npm run dev -- --port 4000
```

## Option 2 — Build a portable bundle

Builds a single self-contained folder that anyone can open without
Node installed.

```bash
npm install
npm run build
```

Output lands in `dist/`. The build uses relative paths (`base: './'`),
so you can:

- **Open `dist/index.html` directly** with a double-click — works
  from `file://`. No server required.
- **Host it anywhere** — copy `dist/` to S3, GitHub Pages, Netlify,
  or any static host. No build-time environment variables; nothing
  to configure.

## Option 3 — Pre-built release

If you don't want to build it yourself, download the latest packaged
release from the GitHub Releases page:
<https://github.com/SP1R4/noctis-wifi-planner/releases>

Unzip, open `index.html`, you're in.

## Running the tests

```bash
npm test             # one-shot
npm run test:watch   # vitest watch mode
```

There's no setup, no test database, no fixtures to download. Tests are
pure geometry + project-file migration — they run in well under a second.

## Verifying your install

After `npm run dev`, the app should:

1. Open at <http://localhost:5173> and show the empty-state pill
   ("Upload a floor plan to begin").
2. Accept a PNG/JPG upload via the **↑ Upload Map** button.
3. Place an AP when you click on the map (mode `A`).

If the dev server starts but the page is blank, your browser likely has
ES module support disabled or you're on a very old browser. Try Chrome
or Firefox.

## Common issues

- **`npm install` fails with EACCES** — you're running as root or your
  npm cache is owned by a different user. Try `sudo chown -R $(whoami) ~/.npm`.
- **Port 5173 already in use** — another Vite dev server is running.
  Either stop it (`pkill -f vite`) or pick another port (see above).
- **Coverage rings missing after uploading a map** — wait for the image
  to finish loading. The first render needs the natural dimensions of
  the floor plan; very large images can take a moment.
- **Autosave toast says "Autosave full — use Save to keep your work"** —
  your project + inline images exceed the 5 MB localStorage quota.
  Use **💾 Save** to write a real JSON file, which has no size limit.

## Uninstall

`rm -rf noctis-wifi-planner` does it. No system files written, no daemons
installed. localStorage and IndexedDB data lives in your browser profile
under whichever origin you served the app from; clearing site data for
that origin wipes it.
