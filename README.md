# NOCTIS WiFi Planner

[![Release](https://img.shields.io/github/v/release/SP1R4/noctis-wifi-planner?color=black&label=release)](https://github.com/SP1R4/noctis-wifi-planner/releases/latest)
[![CI](https://github.com/SP1R4/noctis-wifi-planner/actions/workflows/ci.yml/badge.svg)](https://github.com/SP1R4/noctis-wifi-planner/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-black.svg)](LICENSE)
[![Vite](https://img.shields.io/badge/built%20with-vite-646cff.svg)](https://vitejs.dev/)
[![Vanilla JS](https://img.shields.io/badge/no%20framework-vanilla%20JS-f7df1e.svg)](#)

A single-page WiFi coverage planner that runs entirely in the browser.
Drop a floor-plan image, place access points, draw walls in different
materials, mark dead zones, and watch wall-aware coverage polygons fall
out of a ray-cast simulation in real time. Multi-floor, undo/redo,
band-aware (2.4 / 5 / 6 GHz), and exports a printable PDF report when
the survey is done.

No backend. No accounts. Projects save to a JSON file you can email.

---

> ## 🎉 v1.0.0 — first public release
>
> NOCTIS WiFi Planner is now open source under the MIT license.
> Pre-built bundle (40 KB zip — unzip and open `index.html`, no Node required):
> **[Download v1.0.0](https://github.com/SP1R4/noctis-wifi-planner/releases/download/v1.0.0/noctis-wifi-planner-v1.0.0.zip)**
> · [Release notes](https://github.com/SP1R4/noctis-wifi-planner/releases/tag/v1.0.0)
> · [Changelog](CHANGELOG.md)

---

## Features

- **Wall-aware coverage** — ray-cast simulation accumulates per-material
  dB attenuation (drywall, wood, glass, brick, concrete) for every wall
  the signal crosses. Each AP renders its actual reachable polygon, not
  a naive circle.
- **Band-aware** — 2.4 GHz, 5 GHz, and 6 GHz APs apply different wall-loss
  multipliers because real RF doesn't care that they all use the same
  drywall.
- **Channel overlap warnings** — APs sharing or interfering on a 2.4 GHz
  channel get a dashed orange link with a ⚡ Ch X pill so you can spot
  co-channel interference before it bites.
- **Multi-floor** — each floor carries its own image, scale (m/100 px),
  APs, switches, dead zones, walls.
- **Vendor catalogs built in** — Ubiquiti UniFi (WiFi 5/6/7) and MikroTik
  (ac/ax) APs and switches, with typical coverage ranges per model.
- **Coverage % sampler** — wall-aware floor-coverage percentage for the
  current floor plus a whole-building rollup.
- **Undo/redo** — 50-step history with snapshot debouncing, so a slider
  scrub collapses to one undoable step.
- **Autosave** — silent every 10 s to localStorage; floor images live in
  IndexedDB so the autosave payload stays tiny.
- **HTML + PDF export** — branded report with the coverage map, AP/SW
  tables, and per-AP technical details (IP/MAC/port/VLAN/channel/TX).
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
    geometry.js      Pure ray-cast / attenuation math (DOM-free)
    migrate.js       Project-file schema migrations
    constants.js     AP/SW model catalogs + colour palette
    imageStore.js    IndexedDB image storage
tests/
  geometry.test.js   Geometry + band-loss + fractional-wall tests
  migrate.test.js    Schema migration tests
vite.config.js       Build config (relative paths for file:// portability)
vitest.config.js     Test config (points at ./tests/)
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
