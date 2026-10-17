// Merges the hand-written batch files in library/src/*.json into library/effects.json.
// Fills in each source's pdfPage from the printed page and the book's offset,
// sorts the entries (rank lists first, then by book and page) and fixes the key order
// so diffs stay readable.
//
//   node library/scripts/build.mjs && node library/scripts/check.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BOOKS, LIBRARY_DIR } from './books.mjs';

const SPHERES = ['Correspondence', 'Entropy', 'Forces', 'Life', 'Matter', 'Mind', 'Prime', 'Spirit', 'Time'];
const KEY_ORDER = ['id', 'name', 'kind', 'summary', 'system', 'combos', 'optional', 'coincidentalIf', 'vulgarity', 'tags', 'source'];
const BOOK_ORDER = Object.keys(BOOKS);

const srcDir = join(LIBRARY_DIR, 'src');
const all = [];
for (const f of readdirSync(srcDir).filter((f) => f.endsWith('.json')).sort()) {
  const batch = JSON.parse(readFileSync(join(srcDir, f), 'utf8'));
  for (const e of batch) all.push({ ...e, _file: f });
}

const sortSpheres = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => SPHERES.indexOf(a) - SPHERES.indexOf(b)));
const tidy = (e) => {
  const out = {};
  for (const k of KEY_ORDER) if (e[k] !== undefined) out[k] = e[k];
  for (const k of Object.keys(e)) if (!(k in out) && k !== '_file') out[k] = e[k];
  out.combos = (out.combos ?? []).map((c) => ({ ...c, spheres: sortSpheres(c.spheres ?? {}) }));
  if (out.optional) out.optional = out.optional.map((o) => ({ ...o, spheres: sortSpheres(o.spheres ?? {}) }));
  out.source = (out.source ?? []).map((s) => {
    const { book, page, section } = s;
    const pdfPage = BOOKS[book] && Number.isInteger(page) ? page + BOOKS[book].offset : s.pdfPage;
    return section ? { book, page, pdfPage, section } : { book, page, pdfPage };
  });
  return out;
};

const first = (e) => e.source?.[0] ?? {};
const effects = all.map(tidy).sort((a, b) => {
  const kr = (a.kind === 'rank' ? 0 : 1) - (b.kind === 'rank' ? 0 : 1);
  if (kr) return kr;
  const bk = BOOK_ORDER.indexOf(first(a).book) - BOOK_ORDER.indexOf(first(b).book);
  if (bk) return bk;
  return (first(a).page ?? 0) - (first(b).page ?? 0);
});

writeFileSync(join(LIBRARY_DIR, 'effects.json'), JSON.stringify(effects, null, 2) + '\n');
console.log(`library/effects.json: ${effects.length} entries from ${new Set(all.map((e) => e._file)).size} batch files`);
