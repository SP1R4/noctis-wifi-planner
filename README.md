# NOCTIS WiFi Planner

[![Release](https://img.shields.io/github/v/release/SP1R4/noctis-wifi-planner?color=black&label=release)](https://github.com/SP1R4/noctis-wifi-planner/releases/latest)
[![CI](https://github.com/SP1R4/noctis-wifi-planner/actions/workflows/ci.yml/badge.svg)](https://github.com/SP1R4/noctis-wifi-planner/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-black.svg)](LICENSE)
[![Vite](https://img.shields.io/badge/built%20with-vite-646cff.svg)](https://vitejs.dev/)
[![Vanilla JS](https://img.shields.io/badge/no%20framework-vanilla%20JS-f7df1e.svg)](#)

A single-page network planner that runs entirely in the browser. Drop a
floor-plan image, place access points and IP cameras, draw walls in
different materials, link devices to PoE switches, and watch wall-aware
coverage polygons + a real signal-strength heatmap fall out of a ray-cast
simulation in real time. Multi-floor, multi-select, undo/redo,
band-aware (2.4 / 5 / 6 GHz), directional antennas, PoE budget +
cable-run visualization, and exports a per-floor PDF report when the
survey is done.

No backend. No accounts. Projects save to a JSON file you can email.

---

> ## 🚀 v2.0.0 — Cameras, heatmap, directional antennas, PoE
>
> A meaty release that pushes NOCTIS from "WiFi coverage planner" into
> "network/security planner". Highlights: real signal-strength heatmap,
> IP cameras with vendor catalogs, AP antenna patterns, PoE budget,
> wall vertex editing, multi-select, SVG wall import, shareable URLs,
> per-floor PDF reports.
> Pre-built bundle (unzip and open `index.html`, no Node required):
> **[Download v2.0.0](https://github.com/SP1R4/noctis-wifi-planner/releases/download/v2.0.0/noctis-wifi-planner-v2.0.0.zip)**
> · [Release notes](https://github.com/SP1R4/noctis-wifi-planner/releases/tag/v2.0.0)
> · [Changelog](CHANGELOG.md)

---

## Features

### Coverage modelling
- **Wall-aware coverage** — ray-cast simulation accumulates per-material
  dB attenuation (drywall, wood, glass, brick, concrete) for every wall
  the signal crosses. Each AP renders its actual reachable polygon, not
  a naive circle.
- **Band-aware** — 2.4 / 5 / 6 GHz APs apply different wall-loss
  multipliers because real RF doesn't care that they all use the same
  drywall.
- **Directional antennas** — omni, ceiling-down, wall-mount, sector
  90 / 60 / 30°. Coverage polygon is masked by the pattern + heading.
- **Real signal-strength heatmap** — canvas-based per-pixel dBm
  rendering with banded colours (excellent → unusable). Respects walls,
  bands, and directional antennas.
- **Channel overlap warnings** — APs sharing or interfering on a 2.4 GHz
  channel get a dashed orange link with a ⚡ Ch X pill.
- **Auto-AP placement** — greedy "drop N APs to reach 92% coverage"
  optimizer that respects existing APs and walls.

### Devices on the map
- **Access points** — Ubiquiti UniFi (WiFi 5 / 6 / 7) and MikroTik
  (ac / ax) catalogs with per-model PoE draw and typical ranges.
- **IP cameras** — UniFi Protect (G3 / G4 / G5 / AI), Hikvision, Dahua,
  Reolink, and Axis catalogs. Configurable FoV / heading / range; the
  field-of-view cone renders on the map. Press `C` to place.
- **Switches & routers** — per-switch PoE budget. Link any AP or camera
  to a switch and view the cable run on the map.
- **Dead zones & walls** — drag-to-draw walls (Shift snaps to 45°),
  multi-material, drag vertex handles to reshape after placement.
- **SVG wall import** — drop an SVG floor plan and line / polyline /
  polygon / path elements become walls automatically.

### Network planning
- **PoE budget** — sum draw per switch from every AP / camera assigned
  to it; flag over-budget switches in the ⚡ PoE summary modal.
- **Cable runs** — toggle the **Cables** view to draw lines from
  devices to their switches with length labels (red when > 100 m).

### Workflow
- **Multi-floor** — each floor carries its own image, scale (m / 100 px),
  APs, cameras, switches, dead zones, walls.
- **Multi-select** — Shift-click or marquee-drag in select mode;
  Delete clears the whole selection.
- **Undo / redo** — 50-step history with snapshot debouncing, so a slider
  scrub collapses to one undoable step.
- **Autosave** — silent every 10 s to localStorage; floor images live in
  IndexedDB so the payload stays tiny.
- **Shareable URL** — 🔗 Share copies a gzip + base64-encoded link that
  re-opens the project in any browser.
- **HTML + per-floor PDF export** — branded report with cover page,
  per-floor maps + tables, and per-AP / per-camera technical details.
- **Dark mode**, **presentation mode**, **keyboard shortcuts** for every
  tool, **ruler** for arbitrary distance measurements.
- **Runs from `file://`** after `npm run build` — no server required for
  end users.

## Quick start

Requires Node 18+ (LTS recommended).

```bash
git clone https://github.com/SP1R4/noctis-wifi-planner
cd noctis-wifi-planner
npm install
npm run dev          # http://localhost:5173
```

Then in the app:
1. Click **↑ Upload Map** and drop in a floor plan (PNG/JPG).
2. Set **SCALE** in the toolbar — metres per 100 px of the image.
3. Press <kbd>A</kbd> and click the map to place access points.
4. Press <kbd>L</kbd> to draw walls (Shift snaps to 45°).
5. Press <kbd>?</kbd> for the full keyboard cheatsheet.

## Build

```bash
npm run build        # → dist/ (open dist/index.html directly, no server needed)
```

The production build uses relative paths (`base: './'` in `vite.config.js`)
so the output works equally well over `http://`, a CDN, or `file://`.

## Tests

```bash
npm test             # one-shot
npm run test:watch   # vitest watch mode
```

57 tests across pure geometry and project-file migration. Adding a feature
that touches walls, coverage, or schema versions? Drop a test next to the
existing ones in `tests/`.

## Project layout

```
files/
  index.html         UI shell
  app.js             App orchestrator (state, DOM, event handlers)
  styles.css         Theming + component styles
  fonts.css          Self-hosted font faces
  src/
    geometry.js      Pure ray-cast / attenuation / dBm math (DOM-free)
    migrate.js       Project-file schema migrations (v1 → v7)
    constants.js     AP / camera / switch catalogs + antenna patterns
                     + PoE draw tables + heatmap colour stops
    imageStore.js    IndexedDB image storage
tests/
  geometry.test.js   Geometry + band-loss + directional + dBm tests
  migrate.test.js    Schema migration tests (every prior version)
vite.config.js       Build config (relative paths for file:// portability)
vitest.config.js     Test config (points at ./tests/)
scripts/             OS-specific one-line installers (macOS / Ubuntu / Windows)
```

## How the coverage math works

For each access point we cast **72 rays** (one every 5°) outward. Each
ray walks through every wall it intersects, sums the per-material dB
loss multiplied by the AP's **band factor** (0.6 for 2.4 GHz, 1.0 for
5 GHz, 1.3 for 6 GHz), and shrinks the ray's reach by `0.5^(loss/3)` —
a rough approximation that each 3 dB of attenuation halves the usable
range. The 72 endpoints form a polygon, cached on the AP, that's the
visible coverage shape.

The floor-coverage percentage is a coarse grid sampler that asks the
same question — "can *any* AP reach this point through the walls?" —
at ~60 points across the shorter axis of the image.

See `files/src/geometry.js` for the actual implementation; it's pure,
DOM-free, and unit-tested.

## Project file format

Projects save as a single JSON file that includes the floor-plan images
inline (base64). Schema is versioned; the migrator can read every prior
version. Current schema is v6 — see `files/src/migrate.js` for the
version history.

## Roadmap

- Per-AP custom range table override (today coverage radius is per-model)
- Wall vertex editing (drag endpoints after placing)
- True isotropic 5 GHz channel-conflict modelling (today only 2.4 GHz
  channels 1–14 are flagged for adjacency)
- Multi-language UI (currently English only)

## Contributing

Bug reports, feature requests, and PRs are welcome. See
[CONTRIBUTING.md](CONTRIBUTING.md) for the workflow.

For anything that touches geometry, walls, or schema versions, add a
test in `tests/`.

## Security

Found something that shouldn't be public-facing? See
[SECURITY.md](SECURITY.md) for how to report it.

## License

[MIT](LICENSE) — do whatever you want, just don't blame me when your
boss asks why the coverage map said the conference room had signal.
