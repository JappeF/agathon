# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Agathon: an offline-first PWA (React 18 + TypeScript + Vite + vite-plugin-pwa) for Mage: The Ascension 20th Anniversary (M20). All decisions and the build order are in `BRAINSTORM.md` (Dutch); read it before adding features.

The app is a helper and sounding board, not a rules engine: dice are rolled outside the app. The core is a searchable library of magick effects (own summaries, never book text), character sheets imported from Mr. Gone PDFs, and spell dossiers that produce a copyable "context pack" prompt for any AI. App language is English.

## Commands

```sh
npm run dev      # Vite dev server (localhost:5173)
npm run build    # tsc -b && vite build -> dist/ (also regenerates the service worker precache)
npm run preview  # serve dist/ on localhost:4173
npm run deploy   # build + wrangler pages deploy dist --project-name agathon
npm run icons    # public/icons/sigil.svg -> PNG app icons via sharp

node scripts/verify.mjs   # headless-Edge checks: shell, nav, IndexedDB persistence, SW, offline reload, desktop nav
```

No unit tests or linters; verify scripts (playwright-core driving system Edge via `channel: 'msedge'`) are the verification story. The preview server must be running on :4173 first.

## Architecture

- **Storage:** everything the player owns lives in IndexedDB via Dexie (`src/db/db.ts`): `characters`, `spells`, `books` (page text of the player's own rulebook PDFs, never shipped or shared). `requestPersistence()` asks for persistent storage on the first real write. Use `useLiveQuery` (dexie-react-hooks) in components.
- **Routing:** top-level view from the URL hash (`#/library`, `#/spells`, `#/characters`) in `useHashRoute.ts`.
- **PWA:** `registerType: 'prompt'`; `UpdateToast.tsx` (mounted in main.tsx outside App) re-checks hourly and on focus and shows a Reload toast. Its reload falls back to `location.reload()` when the page was never controlled by the service worker (first visit), because `updateServiceWorker(true)` only reloads on a controller change. `public/_headers` keeps index.html/sw.js/workbox/manifest uncached on Cloudflare.
- **Rulebooks and samples** live in `refs/` (gitignored, never commit them or text extracted from them). Only our own summaries are committed.

## Design system

Violet depths and gilded type in `src/styles.css`: gold `--gold` on violet-black `--bg`, `--paradox` magenta for Paradox. Fonts self-hosted via fontsource: Cinzel Decorative (logo only), Cinzel (headings), Manrope (UI text), EB Garamond italic (flavor text and quotes only). Animations are CSS-only and switched off under `prefers-reduced-motion`: rising gold Quintessence sparks (`.sparks`), the gilded logo sheen, and `SphereRing.tsx` (nine Sphere glyphs turning once every 4 minutes behind the header). `SphereGlyph.tsx` holds our own line glyphs per Sphere (not the book symbols); reuse it for Sphere chips. Mobile first: bottom nav below 768px, sticky pill nav above; tap targets at least 44px.

## Gotchas

- `all: unset` on buttons resets `box-sizing`; re-set it after (as in `.btn-icon`).
- Shipped text uses plain keyboard characters only: no em/en dashes, no curly quotes (house style, same as another app).
- Commit messages end with a line containing only `⚡`, no other trailers.
- Hosting is a classic Cloudflare Pages project (`agathon`, live at https://agathon.pages.dev), created with the hidden `wrangler pages project create --force` flag. Without it, wrangler 4.151 silently "delegates" new Pages projects to Workers: it rewrote package.json scripts (`wrangler dev`/`wrangler deploy`), added `@cloudflare/vite-plugin` to vite.config.ts and a `wrangler.jsonc`, and deployed a Worker on workers.dev. Now that the project exists, `npm run deploy` (`wrangler pages deploy`) goes straight to Pages; never run `wrangler deploy` here or accept that conversion, and do not pass `--force` again.
- The GitHub repo `OWNER/agathon` is private for now.
