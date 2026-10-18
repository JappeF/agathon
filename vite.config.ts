import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';


/**
 * spell-index.json: id -> [name, summary] for the link previews of /s/<id>
 * (functions/s/[id].js). Built from library/effects.json; not precached (the app has
 * the full library already).
 */
const spellIndex = () => ({
  name: 'spell-index',
  generateBundle(this: { emitFile: (f: { type: 'asset'; fileName: string; source: string }) => void }) {
    const effects: { id: string; name: string; summary: string }[] = JSON.parse(readFileSync('library/effects.json', 'utf8'));
    const index = Object.fromEntries(effects.map((e) => [e.id, [e.name, e.summary]]));
    this.emitFile({ type: 'asset', fileName: 'spell-index.json', source: JSON.stringify(index) });
  },
});

export default defineConfig({
  plugins: [
    react(),
    spellIndex(),
    VitePWA({
      // prompt: the app shows a reload toast (UpdateToast) instead of swapping mid-scene
      registerType: 'prompt',
      includeAssets: ['icons/sigil.svg'],
      workbox: {
        // precache the app shell and every data file so everything works offline
        globPatterns: ['**/*.{js,mjs,css,html,svg,png,woff2,json}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        globIgnores: ['spell-index.json'],
        // the service worker answers page loads with the app shell; the link-preview pages
        // (/s/<id>, /i/<data>) have to come from the server, or an
        // installed app opens the library instead of the shared spell
        navigateFallbackDenylist: [/^\/s\//, /^\/i\//],
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
