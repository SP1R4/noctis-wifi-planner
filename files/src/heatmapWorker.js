// Web Worker shell around the shared heatmap grid computation. Bundled inline
// (?worker&inline in app.js) so the portable single-file build keeps working
// from file:// with no external fetch. Stale-job dropping happens on the main
// thread by jobId; the worker just computes whatever it's asked.

import { computeHeatGrid } from './heatmap.js';

// Typed as `any` so the DOM lib's window-flavoured postMessage signature
// doesn't fight the worker-scope one under checkJs.
const ctx = /** @type {any} */ (self);

ctx.onmessage = (e) => {
  const job = e.data;
  try {
    const { grid, cols, rows } = computeHeatGrid(job);
    ctx.postMessage({ jobId: job.jobId, cols, rows, step: job.step, buf: grid.buffer }, [grid.buffer]);
  } catch (err) {
    ctx.postMessage({ jobId: job.jobId, error: String((err && err.message) || err) });
  }
};
