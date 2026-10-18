import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'node:child_process';

// shown at the bottom of the character menu, so a phone can tell which build it runs
const commit = (() => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'dev';
  }
})();
const builtAt = new Date().toISOString().slice(0, 16).replace('T', ' ');

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(`${commit}, built ${builtAt} UTC`) },
  plugins: [
    react(),
    VitePWA({
      // prompt: the app shows a reload toast (UpdateToast) instead of swapping mid-scene
      registerType: 'prompt',
      includeAssets: ['icons/sigil.svg'],
      workbox: {
        // precache the app shell and every data file so everything works offline
        globPatterns: ['**/*.{js,mjs,css,html,svg,png,woff2,json}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
      manifest: {
        name: 'Agathon',
        short_name: 'Agathon',
        description:
          'Offline companion for Mage: The Ascension 20th Anniversary: characters, a spell library and spell ideas.',
        theme_color: '#120b1c',
        background_color: '#120b1c',
        display: 'standalone',
        start_url: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
});
