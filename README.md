# Agathon: a grimoire for the Awakened

An installable, offline-first companion for **Mage: The Ascension 20th Anniversary**:
a searchable library of **563 magick effects** from the books, full **character
sheets** you can import from (and export back to) your PDF sheet, and sharing with
your table. Rolls stay on the table; Agathon is the helper and sounding board.

**Live: [agathon.pages.dev](https://agathon.pages.dev)**

![Agathon: the library on a desktop, showing what the active character can cast](docs/screenshot.png)

![Agathon: an effect with its ways to cast it, the difficulty and a checklist for keeping it coincidental](docs/screenshot-detail.png)

<details>
<summary>On a phone</summary>

<p>
  <img src="docs/screenshot-mobile-sheet.png" alt="A character sheet with portrait, status and Spheres on a phone" width="260">
  <img src="docs/screenshot-mobile-library.png" alt="Searching the library for Mind 3 and Forces 2 on a phone" width="260">
  <img src="docs/screenshot-mobile-characters.png" alt="The character switcher on a phone" width="260">
</p>

</details>

## Features

### Library

- **Every effect from both books**: the Sphere rank lists, the worked feats and the
  named rotes of *Mage 20* and *How Do You DO That?*, each with its Sphere
  combinations, alternatives, add-ons and book/page references. The summaries are
  our own words; no book text ships with the app.
- **Search by Sphere combination**: tap Spheres in the bar (or type `mind:3
  forces:2`) to find effects that use exactly that combination. "Allow other
  Spheres" or `uses:mind,forces` widens it.
- **What can my character cast**: one switch splits the list into what the active
  character can cast right now and what is **one dot away**, with the missing
  Sphere marked.
- **Search words are marked** in the cards and the detail; when they only occur
  further down an effect, a line from there shows why it matched.
- **Operators** for keyboard search: `tag:healing`, `book:hdydt`, `kind:rote`,
  `is:vulgar`, `name:portal`, rank forms `=3`, `3+`, `2-4`, the Technocratic names
  (`data:`, `primal:`, `dimsci:`), and `-` to exclude anything.
- **Effect detail**: every way to cast it, the base difficulty (highest Sphere +3
  coincidental, +4 vulgar, +5 with witnesses, M20 p. 501), what the book says about
  keeping it coincidental, and a checklist of mitigation tricks that light up when
  your character has the Spheres for them.

### Characters

- **The full M20 sheet**: Attributes, Abilities, Spheres with specialties and the
  affinity Sphere, Arete, Backgrounds, Merits and Flaws, Focus, rotes, Wonders,
  history, description, gear and weapons.
- **Play mode and edit mode**: while playing only health, Willpower and the
  **Quintessence/Paradox wheel** change (Paradox cancels Quintessence, never the
  other way round, as in M20), plus the experience beside the name; a lock switches
  to editing.
- **PDF import and export**: drop in Mr. Gone's fillable M20 2-page sheet and every
  field comes across, including the portrait pasted into it. Re-importing shows the
  changes first and keeps your notes. "Export PDF sheet" fills your own PDF back in.
- **Portraits** in a small sparking portal, enlarged with a tap, replaceable in edit
  mode.
- **One character in play**: the nav carries the active character, one tap opens
  the sheet. The character switcher (the caret beside it on a wide screen, or
  "Characters" on the sheet) lists the others and adds or imports new ones.

### Sharing

- One character as a **file, link or QR code**, or a backup of all of them. Notes
  stay private unless you tick them; links carry a small portrait, files the full
  one. Imports only ever add: a name that already exists gets a number.

### App

- **Fully offline** once loaded, installable on phone and desktop, with a "new
  version ready" prompt after each deploy.
- Everything you enter stays in your browser (IndexedDB) until you share it.

## Commands

```sh
npm install
npm run dev      # local dev server (localhost:5173)
npm run build    # production build -> dist/
npm run preview  # serve the production build (localhost:4173)
npm run deploy   # build + deploy to Cloudflare Pages (project "agathon")
npm run icons    # PNG app icons from public/icons/sigil.svg
node scripts/sigil.mjs   # regenerate the portal icon itself
```

Effect library (the generated `library/effects.json` is committed; the build does
not run these; see [library/README.md](library/README.md)):

```sh
node library/scripts/extract-text.mjs   # once: book text from your own PDFs into refs/text (gitignored)
node library/scripts/build.mjs          # library/src/*.json -> library/effects.json
node library/scripts/check.mjs          # checks every entry against the book text; must end in "OK: 0 issues"
```

Checks and screenshots (headless system Edge via playwright-core; start
`npm run preview` first, or set `BASE=https://agathon.pages.dev`):

```sh
node scripts/verify.mjs           # shell, navigation, IndexedDB, service worker, offline reload
node scripts/verify-sheet.mjs     # PDF import via the UI, portrait, trackers, edit mode, export round trip
node scripts/verify-share.mjs     # link, QR and file, a second device, name clashes, damaged links
node scripts/verify-library.mjs   # Sphere search, operators, tags, detail, castable, phone and desktop layout
node scripts/screenshots.mjs      # regenerate the screenshots in docs/ with a demo character
```

`verify-sheet.mjs` and `verify-library.mjs` need a filled Mr. Gone sheet (`SHEET=<path>`,
default `refs/`), which is not in the repository.

## Data and credit

- **Effects** were read section by section from *Mage: The Ascension 20th
  Anniversary Edition* and *How Do You DO That? A Practical Guide to Sphere Magick*
  and written up as short summaries in our own words with Sphere combinations and
  page references. A check script compares every Sphere rank with the book text of
  its page and flags any run of eight or more words copied from the book.
- **Character sheets**: the importer reads Mr. Gone's interactive M20 2-page sheet;
  its field map is generated from the field positions (`scripts/build-mrgone-map.mjs`).
  The sheet itself is not included.

Unofficial fan tool. Mage: The Ascension is (c) Paradox Interactive AB; the rules
and setting belong to their authors. Use your own copies of the books.

## Deploying

Cloudflare Pages, project `agathon`: `npm run deploy` (needs `npx wrangler login`).
`public/_headers` keeps `index.html`, `sw.js`, workbox and the manifest uncached so
installed apps pick up new versions quickly. The project is a classic Pages project
(created with `wrangler pages project create --force`); see `CLAUDE.md` before
touching the wrangler setup.

## License

[MIT](LICENSE) for the code. The effect summaries are our own text; the books they
refer to are not covered by this license.
