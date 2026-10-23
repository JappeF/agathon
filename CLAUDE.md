# CLAUDE.md

Guidance for Claude Code in this repository. Details live in the code comments; this file is the map and the traps.

## What this is

Agathon: an offline-first PWA (React 18 + TypeScript + Vite + vite-plugin-pwa, Dexie, Cloudflare Pages) for Mage: The Ascension 20th Anniversary. A helper and sounding board, not a rules engine: dice stay on the table. A spell library (own summaries, never book text), character sheets that round-trip Mr. Gone's fillable PDF, spell ideas with a Copy for AI prompt, sharing. App language English; the UI says "spells", code and data say "effects".

Decisions and status: `BRAINSTORM.md` (Dutch). Open work: GitHub issues with the existing emoji labels (kind: ✨ 🗺️ 💬 ⏳; topic: 🔮 📜 🪄 📚 🎲 🤝 📱); reuse them. Public overview: `README.md`. Live: https://agathon.pages.dev.

## Commands

```sh
npm run dev | build | preview          # Vite (5173) / tsc -b + build / serve dist on 4173
npm run deploy                         # build + wrangler pages deploy (also deploys functions/)
npx wrangler pages dev dist --port 8788   # build plus Pages Functions locally
npm run icons                          # sigil.svg -> PNG icons (node scripts/sigil.mjs makes the svg)

node scripts/verify.mjs                # shell, nav, persistence, pickers, 320px/344px layouts, idle CPU, SW, offline
node scripts/verify-sheet.mjs          # PDF import/export round trip, both sheet versions, blank sheet, copy
node scripts/verify-library.mjs        # search, operators, detail, focus, castable, sidebar that stays put
node scripts/verify-share.mjs          # link, QR, file, second device, hostile/oversized links, renamed files
node scripts/verify-spells.mjs         # spell ideas, Copy for AI, pasting answers (and garbage)
node scripts/verify-books.mjs          # own rulebooks (needs the PDFs in refs/)
BASE=https://agathon.pages.dev node scripts/<script>.mjs   # any of them against the live site
node scripts/screenshots.mjs           # docs/ screenshots, demo character only (never real sheets or photos)

node scripts/build-mrgone-map.mjs <sheet.pdf> [out.json]   # field map from a Mr. Gone sheet
node scripts/sheet-words.mjs <sheet.pdf>                    # printed words with positions
node scripts/render-pdf-page.mjs <pdf> <png> [page]         # eyeball an export (pdf.js in Edge)
```

No unit tests or linters: the verify scripts (playwright-core on system Edge) are the test suite; `npm run preview` must run first. Add a check with every fix. They need files in `refs/` (gitignored): a filled sheet `M20_2-Page_Interactive_<name>.pdf` (found by pattern, or `SHEET=`), the blank `M20_2-Page_Interactive.pdf` (`BLANK=`), the newer blank `mrgone-m20-v2-blank.pdf` (`BLANK2=`), the rulebooks (`M20=`, `HDYDT=`). CI runs verify, verify-share and verify-spells.

Library data: edit `library/src/*.json`, then `node library/scripts/build.mjs` and `check.mjs` (must end "OK: 0 issues"); `extract-text.mjs` once puts book text in `refs/text`. Schema and rules: `library/README.md`.

## Map

- `src/db/db.ts`: Dexie tables `characters`, `spells`, `sheetFiles` (imported PDFs, plus the device's blank sheet as `__blank__`), `books`; `copyCharacter`, `deleteCharacter`, `freeName`.
- `src/character.ts`: the M20 model, `clampWheel` (M20 p. 331), wound helpers, `healthMarkLines` (the / X * marks as lines, shared by the screen and the PDF export), `characterLine`.
- `src/useDraft.ts`: the debounced local copy behind the sheet and the spell dossier.
- `src/useHashRoute.ts`: hash routes `#/library[/<effect>]`, `#/spells[/<id>]`, `#/characters/<id>/<tab>`; `activeCharacter.ts` is the character in play.
- `src/components/CharacterSheet.tsx`: the sheet (play/edit, mini bar, tabs); `CharacterMenu.tsx`: the switcher with Import and backup.
- `src/sheets/mrgone.ts` + `mrgone-m20-2page*.json`: PDF read/write; `src/sheetActions.ts`: import diff, export, blank sheet, portrait in the PDF; `functions/blank-sheet.js`: the Pages Function that passes Mr. Gone's blank sheet on.
- `src/library/`: `data.ts` (lazy effects.json), `search.ts` (query parser, `deficit`, `difficulties`); `LibraryView.tsx`, `EffectDetail.tsx`.
- `src/spells.ts`, `SpellsView.tsx`, `spellActions.ts`: spell ideas; `src/contextPack.ts`: Copy for AI and `parseReply`; `src/books.ts`, `BooksPanel.tsx`: own rulebooks as page text.
- `src/share.ts` (wire format for characters and spell ideas; a backup file carries the ideas by character index; `sanitizeCharacter`, `parseSpellPayload`), `SharedImport.tsx`, `SharedSpellImport.tsx`, `ImportFlow.tsx` (PDF vs character file by content), `ShareButton.tsx` (share sheet on phones, copy link elsewhere).
- Link previews: `functions/s/[id].js` (`/s/<spell id>`, name and summary from `spell-index.json`, which vite.config.ts emits at build) and `functions/i/[data].js` (`/i/<data>`, a spell idea carried in the link; reads only title and goal, stores nothing), both through `server/preview.js`, then on into the app (`#/library/<id>`, `#import-spell=`).
- `src/sheetLists.ts` (M20 pick lists with own hints), `TraitPicker.tsx`, `Fields.tsx`, `src/focus.ts` (Focus lines), `src/favorites.ts` (favorite spells = rotes).
- `src/portrait.ts`, `PortalPortrait.tsx`, `useThumbnail.ts`; `Portal.tsx` (header portal, `Sparks`); `SphereButton.tsx` (round Sphere with a rank ring, library and dossier); `Trackers.tsx` (Health, Willpower, the wheel).
- `Modal.tsx` + `useDialog.ts`, `ErrorBoundary.tsx`, `UpdateToast.tsx` (outside App), `FilePick.tsx`, `src/styles.css` (one stylesheet, tokens on `:root`).
- The guide: `src/help/guide.md` (our own words; `## Title {#id}` gives `#/help/<id>`), `markdown.ts` (just enough Markdown, escaped first), `HelpView.tsx`.

## Traps (each cost real time)

**Data**
- Everything from outside (links, files, pasted AI answers, PDFs) is sanitized before it touches the database (`sanitizeCharacter`, `parseReply`); imports only ever add. Keep it that way.
- `portrait` and `pinned` are app-owned: left out of `SheetFields`, so PDF import and `diffSheet` never overwrite them.
- `useDraft`: writes are flushed on unmount and when the page hides; a newer stored row is adopted only when nothing is pending, and local edits bump `updatedAt`. Don't write a whole character from a stale snapshot elsewhere (stars use `toggleFavorite`, against the stored row).
- `refs/` (rulebooks, sample sheets, extracted text) is never committed. Only our own summaries are.
- Escapes typed into an edit (a backslash-u code, a backslash before a slash) can reach the file as the character itself: the preview page's "escape" of `<` was a no-op that way. Build such characters with `String.fromCharCode` and test the output (verify-share does for the preview page).

**PDF (Mr. Gone's sheet)**
- Two versions exist, each with a generated map; `mapFor` picks by the `skillsex1` field. v2 has editable drop-downs where v1 has text fields, own-Ability rows (imported as Other Traits), shifted Spheres. A box a version lacks is skipped, never fatal.
- Save with `updateFieldAppearances: false`: his boxes only have an "on" look and pdf-lib would redraw every box as a check mark. Text and drop-downs are redrawn by hand in Times Bold, auto size capped at 12pt.
- Drop `/Perms` (Reader extensions): a rewritten Reader-extended file makes Acrobat Reader switch the form off.
- Pages Functions don't run under `vite preview`: the checks use the app links the preview pages forward to locally, and test the functions themselves only against the live site (or run `wrangler pages dev`).
- We don't ship the blank sheet (his work, publisher's logo, no terms) and his server has no CORS: `/blank-sheet` fetches his current file (one fixed URL, no open proxy); offline the export asks for it with a download link.

**Layout**
- No `scrollbar-gutter` (Edge leaves the strip empty). The page is anchored to `100vw` instead (`.app-main` margin from `--main-max`, the bar's padding subtracts `100vw - 100%`), and `body` uses `overflow-x: clip` so sticky bars keep working.
- Heights that land near the window bottom wobble a scrollbar: the Notes notebook is measured to fit exactly.
- The library sidebar sticks exactly where it sits (`top: var(--bar-h)`, `-3rem` bottom margin); off by a few px it jumps.
- Grid columns with inputs need `minmax(0, 1fr)`; verify checks every tab at 320px.
- The phone nav is fixed inside `.app-header` (`isolation: isolate`), so the header needs `z-index: 45`.
- The mini bar has its own drop-down: moving the trackers panel changed the page height and flipped the observer.
- `all: unset` on buttons drops `box-sizing` and the focus ring; put both back.
- Playwright hides scrollbars: layout checks launch with `ignoreDefaultArgs: ['--hide-scrollbars']` and compare positions.

**Animations (compositor only; verify checks idle CPU under 4%)**
- Only `transform` and `opacity` of whole HTML elements: SVG shapes repaint every frame, keyframes with `var()` don't composite, animated gradients and box-shadows repaint.
- Every iteration start wakes the main thread: sparks pack eight flights per iteration.
- `usePauseOffscreen` pauses what is off screen; portraits under 64px don't animate and get a stepped-down copy (`useThumbnail`). Everything stops under `prefers-reduced-motion`.

**Inputs and dialogs**
- `FilePick`: a label around a hidden input (never a script-clicked `display:none` input). Pickers that take JSON have no `accept` (Android greys out .json, shared files arrive renamed); image and PDF pickers keep theirs.
- `useDialog` runs on mount only with `onClose` in a ref; re-running it pulled focus out of fields while typing.

**Hosting**
- Classic Cloudflare Pages project `agathon`. Never run `wrangler deploy` or accept a conversion to Workers (wrangler once rewrote package.json and vite.config for that); `npm run deploy` is right. Don't pass `--force` to `pages project create` again.
- `public/_headers` keeps index.html, sw.js, workbox and the manifest uncached; the update toast falls back to `location.reload()` on a first visit.
- Right after a deploy the live offline check in `verify.mjs` can fail once (the edge still hands out old files while the new worker precaches); run it again before digging.

## House style

- Shipped text and everything colleagues read: plain keyboard characters only (no em/en dashes, no curly quotes). Labels in sentence case, no tracked all-caps.
- Commit messages end with a line containing only `⚡`, no other trailers.
- A feature players notice gets its line in `src/help/guide.md`; rules stay information there, never enforced in the app.
- No personal references in the repo (names, handles, local paths, other projects); describe things on their own terms.
- Look: violet depths and gold (`--gold` on `--bg`, `--paradox` magenta), soft violet-white text, one colour per Sphere (`.sph-<Sphere>` sets `--sp`), our own Sphere glyphs (`SphereGlyph.tsx`). Round, after the Spheres: circles for Spheres, health and the wheel, gold dots for checkboxes, pills for one-line fields and dark buttons (30px, a 44px tap strip), text areas `--r-area`; gold buttons are the main action and keep 44px. Fonts: Cinzel Decorative (logo), Cinzel (headings), Manrope (UI), EB Garamond italic (flavor only). Health runs green to red over the wound levels, clear of the Paradox pink.
- Mobile first: below 900px a fixed bottom nav and a hero portal; from 900px a 72px sticky bar (`--bar-h`). Wide sheet tabs follow the paper sheet's columns.
