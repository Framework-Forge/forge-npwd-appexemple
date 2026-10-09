import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import topLevelAwait from 'vite-plugin-top-level-await';
import { RESOURCE_NAME } from './src/contracts';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    federation({
      name: RESOURCE_NAME,
      filename: 'remoteEntry.js',
      exposes: { './config': './forge-npwd.config.ts' },
      shared: ['react', 'react-dom', 'react-router-dom'],
    }),
    topLevelAwait(),
  ],
  build: {
    outDir: 'web/dist', emptyOutDir: true,
    modulePreload: false, assetsDir: '', assetsInlineLimit: 1000000,
  },
});
