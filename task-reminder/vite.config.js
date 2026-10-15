import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: { outDir: 'dist', chunkSizeWarningLimit: 900, target: 'es2020' },
  server: { host: true },
});
