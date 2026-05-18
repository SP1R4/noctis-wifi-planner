// Tests live at ./tests/ (outside `files/`), so vitest needs the repo root
// rather than the `files/` root used by the production build.
import {defineConfig} from 'vitest/config';
export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
  },
});
