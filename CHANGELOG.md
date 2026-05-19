# Changelog

All notable changes to this project are documented here.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versioning follows [SemVer](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.0] — 2026-05-19

A meaty release that pushes NOCTIS from "WiFi coverage planner" into
"network/security planner". Highlights: real signal-strength heatmap, IP
cameras as a first-class item type, directional AP antennas, PoE budget +
cable runs, wall vertex editing, multi-select, SVG wall import, shareable
URLs, and a per-floor PDF report.

### Added
- **IP cameras as a first-class item type.** Place cameras alongside APs
  and switches; render their field-of-view cone (configurable FoV /
  heading / range). Catalog covers UniFi Protect (G3 / G4 / G5 / AI),
  Hikvision, Dahua, Reolink, and Axis with sensible defaults per model.
  New `C` shortcut and toolbar button.
- **Real signal-strength heatmap.** Canvas-based per-pixel dBm rendering
  with banded colours (excellent → unusable). Respects walls, bands,
  and directional antennas.
- **AP antenna patterns.** Omni, ceiling-down, wall-mount, sector 90 /
  60 / 30°. Coverage polygon is masked by the selected pattern around
  the AP's heading. New heading slider in the AP panel.
- **Wall vertex editing.** Drag the endpoints of a selected wall to
  reshape it after placement.
- **Multi-select.** Shift+click to add to selection or marquee-drag in
  select mode. Multi-delete via the Delete key.
- **SVG wall import.** Drop an SVG floor plan and the line / polyline /
  polygon / path elements become walls automatically.
- **Shareable URL.** A 🔗 Share button copies a gzip+base64-encoded link
  that re-opens the project on any browser. Floor-plan images are
  stripped (they'd blow past URL length limits).
- **Auto-AP placement.** ✦ Auto-place button greedily drops APs until
  ~92% coverage or 12 APs, whichever comes first. Uses the last-used
  model and respects existing APs / walls / patterns.
- **PoE budget + cable runs.** Each AP / camera can be linked to a
  switch. Toggle the **Cables** view to draw the runs with length
  labels (red when >100 m). The ⚡ PoE button opens a per-switch budget
  summary that flags over-budget switches.
- **Per-floor PDF report.** Cover page with whole-building stats, then
  one section per floor with its own map, coverage %, and AP / camera
  / switch / dead-zone tables.

### Changed
- Project schema bumped to **v7**. Migrator fills `pattern: 'omni'`,
  `heading: 0`, `swId: ''` for existing APs, adds an empty `CAMS` array
  per floor, and sets `poeBudget: 0` per switch. Old projects open
  cleanly.
- `index.html` script tag is now a module; production build still runs
  from `file://` thanks to `vite.config.js` (`base: './'`).
- Bundle size: 121 KB / 36 KB gzipped (was 84 / 26 KB) — +20 KB for
  everything above. Still zero runtime dependencies.

[Unreleased]: https://github.com/SP1R4/noctis-wifi-planner/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/SP1R4/noctis-wifi-planner/releases/tag/v2.0.0

## [1.0.0] — 2026-05-18

First public release.

### Added
- **Band-aware coverage** — wall-loss is multiplied by a per-band factor:
  0.6 for 2.4 GHz, 1.0 for 5 GHz, 1.3 for 6 GHz (WiFi 6E). Coverage
  polygons now reflect that 2.4 GHz penetrates walls noticeably better
  than 5 GHz.
- **Channel overlap indicator** — APs sharing a channel (or sitting on
  adjacent 2.4 GHz channels within 4 of each other) and whose coverage
  areas intersect get a dashed orange link with a ⚡ Ch X pill.
- **Per-floor scale** — each floor stores its own metres-per-100-px,
  letting multi-floor projects mix plans rendered at different
  resolutions.
- **Fractional wall coordinates** — walls store `fx1/fy1/fx2/fy2` in
  `[0,1]` so they survive map-image swaps. Legacy pixel walls still
  load via a transparent fallback.
- **Coverage opacity slider** — Settings → Coverage opacity (20–100%)
  fades the coverage fill for dense maps where the floor plan
  underneath was getting obscured.
- **Last-used AP model memory** — placing a new AP defaults to whichever
  model you last picked instead of always U6 Pro.
- **CI** — GitHub Actions workflow runs the full test suite on every push
  and pull request.
- **Install scripts** — one-line bootstrap for macOS, Ubuntu/Debian, and
  Windows.

### Changed
- `app.js` slimmed from 2707 → ~2400 lines. AP/SW catalogs moved to
  `files/src/constants.js`; IndexedDB image store moved to
  `files/src/imageStore.js`.
- Geometry and migration helpers are now the single source of truth in
  `files/src/`; `app.js` imports them instead of carrying a parallel copy.
- Project schema bumped to **v6**. Migrator upgrades anything v1–v5
  automatically; the legacy project-level `scaleM` is propagated into
  every floor and then dropped from the root.

### Fixed
- Walls placed before a floor-plan swap no longer end up off-canvas after
  the swap — they're now anchored to the image, not the pixel grid.

[1.0.0]: https://github.com/SP1R4/noctis-wifi-planner/releases/tag/v1.0.0
