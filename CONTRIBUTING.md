# Contributing

Thanks for taking the time. NOCTIS WiFi Planner is a small, one-file-ish
app and almost any change is welcome — bug fixes, new AP catalogs, RF
math refinements, UI polish.

## Quick start

```bash
git clone https://github.com/SP1R4/noctis-wifi-planner
cd noctis-wifi-planner
npm install
npm run dev        # http://localhost:5173
npm test           # runs the full test suite (~250ms)
```

## What's where

```
files/index.html       UI shell (toolbar, sidebar, canvas)
files/app.js           App orchestrator — state, DOM, event handlers
files/styles.css       Theming + component styles
files/src/geometry.js  Pure RF / wall math. DOM-free, unit-tested.
files/src/migrate.js   Project-file schema migrations.
files/src/constants.js AP / switch model catalogs, colour palette.
files/src/imageStore.js IndexedDB image storage for floor plans.
tests/                 Vitest test suite (geometry + migrations).
```

If your change touches anything in `files/src/`, add a test next to the
existing ones. Those modules are deliberately DOM-free so they can be
unit-tested without spinning up a browser.

## Adding a new AP model

1. Add the name under the right vendor group in `AP_MODEL_GROUPS`
   (`files/src/constants.js`).
2. Add its typical indoor range in metres to `AP_RANGE_M` in the same
   file.
3. Done. The dropdown picks it up automatically.

## Adding a new wall material

1. Add an entry to `WALL_MATERIALS` in `files/src/geometry.js` with
   `label`, `loss` (dB at 5 GHz), and `strokeWidth`. Optionally `dash`
   if you want the on-map line dashed.
2. Update `tests/geometry.test.js` if the new material changes the
   monotonic ordering check.

## Schema changes

If you're adding a field to APs / DZs / SWs / walls or changing how
existing fields are stored:

1. Bump `PROJECT_VERSION` in `files/src/migrate.js`.
2. Add a migration step that fills sensible defaults for projects loaded
   from older versions.
3. Add a test in `tests/migrate.test.js` that loads a project with the
   old shape and asserts the new field is present afterwards.

## Code style

- 2-space indent, no semicolons-after-statements style (the existing code
  uses 2 spaces; just match the surrounding code).
- Vanilla JS, no framework, no TypeScript. Keep it that way.
- No new dependencies unless they pull real weight. The app is currently
  zero-runtime-deps and we'd like to keep it that way.

## Commit messages

The current convention is "imperative present-tense" plus a short body
explaining the *why*. Example:

```
Add 6 GHz band loss factor to coverage math

Previously every band shared the 5 GHz attenuation table, which
overstated 2.4 GHz reach and understated 6 GHz. Each AP now applies
its own band multiplier (0.6 / 1.0 / 1.3 for 2.4 / 5 / 6 GHz).
```

## Submitting a pull request

1. Fork the repo, branch off `main` (`git checkout -b my-thing`).
2. Make your change, add tests, run `npm test` until it's green.
3. Open the PR. CI will run the same tests on push.
4. The PR template asks a few short questions; answer them honestly —
   they're there to make review faster, not to gate you.

## Reporting bugs and proposing features

Use the GitHub Issues tracker. There are templates for bug reports and
feature requests; fill in what you can and leave the rest blank if it
doesn't apply.

## Code of conduct

We follow the [Contributor Covenant](CODE_OF_CONDUCT.md). Be decent.
