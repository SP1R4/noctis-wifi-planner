// Vite config: relative asset paths so the production build can be opened
// directly from disk via file://, not just from a hosting server.
import {defineConfig} from 'vite';
export default defineConfig({
  root: 'files',
  base: './',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
});
