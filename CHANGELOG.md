# Changelog

All notable changes to this project are documented here.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versioning follows [SemVer](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/SP1R4/noctis-wifi-planner/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/SP1R4/noctis-wifi-planner/releases/tag/v1.0.0
