// Checks library/effects.json against the local book text and prints a coverage
// report. Every count must be 0, or each remaining hit must sit in
// library/check-whitelist.json with a reason. Exit code 1 when anything is left.
//
//   node library/scripts/check.mjs            # report
//   node library/scripts/check.mjs --verbose  # also list inferred ranks and whitelisted hits
//
// Checks:
//   schema     required fields, known Spheres/kinds/tags, ranks 1-5, no empty combos
//   pages      every source has a printed page whose PDF page is page + book offset
//   spheres    every printed Sphere+rank of an entry appears on its page (or a
//              neighbouring page) in one of the book notations: "Forces 3", "Forces 2+",
//              "Life 2 (3)", "Forces or Matter 3", "Mind 3/ Forces 2", "Rank 3 Forces",
//              "three dots of Forces", dot glyphs under a Sphere's rank list, and the
//              Technocratic names (Data, Primal Utility, Dimensional Science)
//   ranks      the per-rank Sphere entries cover all 9 Spheres x 5 ranks
//   duplicates ids and names (case-insensitive)
//   text       shipped text uses plain keyboard characters only (no em/en dashes,
//              curly quotes or other non-ASCII)
//   copies     no run of 8+ words in our text matches the book text of the page window
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BOOKS, LIBRARY_DIR, pageText } from './books.mjs';

const verbose = process.argv.includes('--verbose');

export const SPHERES = ['Correspondence', 'Entropy', 'Forces', 'Life', 'Matter', 'Mind', 'Prime', 'Spirit', 'Time'];
const ALIASES = { Data: 'Correspondence', 'Primal Utility': 'Prime', 'Dimensional Science': 'Spirit' };
export const KINDS = ['rank', 'feat', 'rote'];
export const VULGARITY = ['coincidental', 'vulgar', 'depends'];
export const TAGS = JSON.parse(readFileSync(join(LIBRARY_DIR, 'tags.json'), 'utf8')).map((t) => t.tag);

const effects = JSON.parse(readFileSync(process.env.AGATHON_EFFECTS ?? join(LIBRARY_DIR, 'effects.json'), 'utf8'));
const wlFile = join(LIBRARY_DIR, 'check-whitelist.json');
const whitelist = existsSync(wlFile) ? JSON.parse(readFileSync(wlFile, 'utf8')) : [];

const issues = {}; // check -> [{id, detail}]
const whitelisted = [];
const usedWl = new Set();
function report(check, id, detail) {
  const i = whitelist.findIndex((w) => w.check === check && w.id === id && (w.detail === undefined || w.detail === detail));
  if (i >= 0) {
    usedWl.add(i);
    whitelisted.push({ check, id, detail, reason: whitelist[i].reason });
    return;
  }
  (issues[check] ??= []).push({ id, detail });
}

// ---------- book text helpers ----------

const norm = (s) =>
  s
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”″]/g, '"')
    .replace(/[–—−]/g, ' - ')
    .replace(/­/g, '')
    .replace(/-\s*\n\s*/g, '-')
    .replace(/\s+/g, ' ');

const windowCache = new Map();
function windowText(book, pdfPage) {
  const key = `${book}:${pdfPage}`;
  if (windowCache.has(key)) return windowCache.get(key);
  const parts = [];
  for (const p of [pdfPage - 1, pdfPage, pdfPage + 1]) {
    for (const layout of [false, true]) {
      const t = pageText(book, p, { layout });
      if (t) parts.push(norm(t));
    }
  }
  const text = parts.join(' \n ');
  windowCache.set(key, text);
  return text;
}

const NAME_RE = '(?:Correspondence|Entropy|Forces|Life|Matter|Mind|Prime|Spirit|Time|Data|Primal Utility|Dimensional Science)';
const WORDNUM = { one: 1, two: 2, three: 3, four: 4, five: 5 };
const canon = (n) => ALIASES[n] ?? n;

// All Sphere+rank pairs a stretch of book text states, as a Map "Sphere:n" -> positions.
const pairCache = new Map();
function statedPairs(book, pdfPage) {
  const key = `${book}:${pdfPage}`;
  if (pairCache.has(key)) return pairCache.get(key);
  const text = windowText(book, pdfPage);
  const found = new Map();
  const add = (names, ranks, at) =>
    names.forEach((n) => ranks.forEach((r) => {
      if (r < 1 || r > 5) return;
      const k = `${canon(n)}:${r}`;
      if (!found.has(k)) found.set(k, []);
      found.get(k).push(at);
    }));

  // "Forces 3", "Forces 2+", "Forces 2 (3)", "Forces or Matter 3", "Life, Matter, or Forces 2",
  // "Mind 1-3", "Spirit 2 or 3", "Forces Rank 3", "Forces •••", "Forces Three"
  const chain = new RegExp(
    `(${NAME_RE})((?:\\s*(?:,\\s*(?:and/or\\b|or\\b|and\\b)?|/|&|\\band/or\\b|\\bor\\b|\\band\\b)\\s*(?:${NAME_RE}))*)\\s*\\(?\\s*(?:at\\s+)?(?:Rank|rank|level)?\\s*(\\d|•{1,5}|(?:One|Two|Three|Four|Five)\\b)((?:\\s*\\+?\\s*(?:\\(|or|/|-|to|and)\\s*\\d\\)?)*)`,
    'g',
  );
  for (const m of text.matchAll(chain)) {
    const names = [m[1], ...(m[2].match(new RegExp(NAME_RE, 'g')) ?? [])];
    const first = m[3].startsWith('•') ? m[3].length : WORDNUM[m[3].toLowerCase()] ?? Number(m[3]);
    const more = (m[4].match(/\d/g) ?? []).map(Number);
    add(names, [first], m.index);
    // extra ranks ("Life 2 (3)", "Spirit 2 or 3") belong to the last-named Sphere
    add([names.at(-1)], more, m.index);
    // ranges like "Mind 1-3" cover the ranks in between
    const range = m[4].match(/^\s*-\s*(\d)/);
    if (range) for (let r = first; r <= Number(range[1]); r++) add([names.at(-1)], [r], m.index);
  }
  // "Rank 3 Forces", "rank-3 Forces", "level 3 Forces"
  for (const m of text.matchAll(new RegExp(`\\b(?:Rank|rank|level|Level)[\\s-]*(\\d)\\s+(${NAME_RE})`, 'g'))) add([m[2]], [Number(m[1])], m.index);
  // "three dots of Forces", "two dots in Life", "3 dots of Mind"
  for (const m of text.matchAll(new RegExp(`\\b(one|two|three|four|five|\\d)[\\s-]+dots?\\s+(?:of|in)\\s+(?:the\\s+)?(${NAME_RE})`, 'gi')))
    add([m[2].replace(/^\w/, (c) => c.toUpperCase())], [WORDNUM[m[1].toLowerCase()] ?? Number(m[1])], m.index);
  pairCache.set(key, found);
  return found;
}

// The pairs of one combo must be stated close together, not just somewhere on the page.
const SPAN = 400;
function statedTogether(src, pairs) {
  return src.some((x) => {
    const found = statedPairs(x.book, x.pdfPage);
    if (!pairs.every((p) => found.has(p))) return false;
    return found.get(pairs[0]).some((at) => pairs.slice(1).every((p) => found.get(p).some((b) => Math.abs(b - at) <= SPAN)));
  });
}

// Rank lists: a header of n dot glyphs under the Sphere's entry.
function rankListed(book, pdfPage, sphere, rank) {
  const text = windowText(book, pdfPage);
  const dots = new RegExp(`(^|[^•])•{${rank}}(?!•)`);
  const names = [sphere, ...Object.keys(ALIASES).filter((a) => ALIASES[a] === sphere)];
  // the Sphere's name sits on the page or within the three pages before it
  let named = false;
  for (let p = pdfPage - 3; p <= pdfPage + 1 && !named; p++) {
    const t = pageText(book, p);
    if (t && names.some((n) => t.includes(n))) named = true;
  }
  return dots.test(text) && named;
}

// Rank entries are named "<Sphere> <n>: <book heading> / ...": the first heading must follow
// a header of exactly n dots on the page.
function rankTitled(book, pdfPage, rank, name) {
  const title = (name.split(': ')[1] ?? '').split(' / ')[0];
  const words = title.replace(/&/g, ' and ').split(/[^A-Za-z0-9']+/).filter(Boolean);
  if (!words.length) return false;
  const text = windowText(book, pdfPage).replace(/&/g, ' and ');
  return new RegExp(`(^|[^•])•{${rank}}(?!•)\\W*${words.join("[^A-Za-z0-9']+")}`, 'i').test(text);
}

// ---------- checks ----------

const textFields = (e) => [
  ['name', e.name],
  ['summary', e.summary],
  ['system', e.system],
  ['coincidentalIf', e.coincidentalIf],
  ...(e.combos ?? []).map((c, i) => [`combos[${i}].note`, c.note]),
  ...(e.optional ?? []).map((o, i) => [`optional[${i}].purpose`, o.purpose]),
  ...(e.source ?? []).map((s, i) => [`source[${i}].section`, s.section]),
  ...(e.tags ?? []).map((t, i) => [`tags[${i}]`, t]),
];

const ids = new Map();
const names = new Map();
const inferred = [];
const rankGrid = new Set();
const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

for (const e of effects) {
  const id = e.id ?? `(no id: ${e.name})`;

  // schema
  if (!e.id || !ID_RE.test(e.id)) report('schema', id, 'id must be a lowercase slug');
  if (!e.name?.trim()) report('schema', id, 'empty name');
  if (!KINDS.includes(e.kind)) report('schema', id, `kind "${e.kind}"`);
  if (!e.summary?.trim()) report('schema', id, 'empty summary');
  if (e.vulgarity !== undefined && !VULGARITY.includes(e.vulgarity)) report('schema', id, `vulgarity "${e.vulgarity}"`);
  if (!Array.isArray(e.tags) || e.tags.length === 0) report('schema', id, 'no tags');
  for (const t of e.tags ?? []) if (!TAGS.includes(t)) report('schema', id, `unknown tag "${t}"`);
  if (!Array.isArray(e.combos) || e.combos.length === 0) report('schema', id, 'no combos');
  const allSphereSets = [...(e.combos ?? []).map((c) => [c, 'combo']), ...(e.optional ?? []).map((o) => [o, 'optional'])];
  for (const [c, what] of allSphereSets) {
    const entries = Object.entries(c.spheres ?? {});
    if (entries.length === 0 && what === 'combo') report('schema', id, 'empty combo');
    for (const [s, r] of entries) {
      if (!SPHERES.includes(s)) report('schema', id, `unknown Sphere "${s}"`);
      if (!Number.isInteger(r) || r < 1 || r > 5) report('schema', id, `${s} rank ${r}`);
    }
    for (const s of c.inferred ?? []) if (!(s in (c.spheres ?? {}))) report('schema', id, `inferred "${s}" not in combo`);
  }
  if (Array.isArray(e.optional) && e.optional.some((o) => !o.purpose?.trim())) report('schema', id, 'optional without purpose');

  // pages
  if (!Array.isArray(e.source) || e.source.length === 0) report('pages', id, 'no source');
  for (const s of e.source ?? []) {
    const b = BOOKS[s.book];
    if (!b) { report('pages', id, `unknown book "${s.book}"`); continue; }
    if (!Number.isInteger(s.page) || !Number.isInteger(s.pdfPage)) { report('pages', id, 'page/pdfPage missing'); continue; }
    if (s.pdfPage !== s.page + b.offset) report('pages', id, `${s.book} p.${s.page} should be pdf ${s.page + b.offset}, not ${s.pdfPage}`);
    if (pageText(s.book, s.pdfPage) == null) report('pages', id, `${s.book} pdf page ${s.pdfPage} not in the extracted text`);
  }

  // Sphere ranks against the page text
  const src = (e.source ?? []).filter((s) => BOOKS[s.book] && Number.isInteger(s.pdfPage));
  const where = src.map((x) => `${x.book} p.${x.page}`).join(', ') || 'any page';
  const seen = new Set();
  const flag = (msg) => { if (!seen.has(msg)) { seen.add(msg); report('spheres', id, msg); } };
  for (const [c, what] of allSphereSets) {
    const stated = [];
    for (const [s, r] of Object.entries(c.spheres ?? {})) {
      if ((c.inferred ?? []).includes(s)) { inferred.push(`${id}: ${s} ${r} (${what})`); continue; }
      if (e.kind === 'rank' && what === 'combo') {
        // the rank itself: its heading under the right number of dots
        if (!src.some((x) => rankTitled(x.book, x.pdfPage, r, e.name))) flag(`no "${'•'.repeat(r)} ${(e.name.split(': ')[1] ?? '').split(' / ')[0]}" heading on ${where}`);
        continue;
      }
      // feats lifted from a rank list ("Spheres: X" sections) take the rank of Sphere X from the dot header
      const listOf = (x) => canon((x.section ?? '').match(/^Spheres: (.+)$/)?.[1] ?? '');
      if (src.some((x) => listOf(x) === s && rankListed(x.book, x.pdfPage, s, r))) continue;
      if (src.some((x) => statedPairs(x.book, x.pdfPage).has(`${s}:${r}`))) { stated.push(`${s}:${r}`); continue; }
      flag(`${s} ${r} not found on ${where}`);
    }
    if (stated.length > 1 && !statedTogether(src, stated)) flag(`${stated.join(' + ').replace(/:/g, ' ')} not stated together (within ${SPAN} chars) on ${where}`);
  }
  if (e.kind === 'rank') for (const c of e.combos ?? []) for (const [s, r] of Object.entries(c.spheres ?? {})) rankGrid.add(`${s}:${r}`);

  // duplicates
  if (e.id) { if (ids.has(e.id)) report('duplicates', id, 'duplicate id'); ids.set(e.id, e); }
  const nk = (e.name ?? '').trim().toLowerCase();
  if (nk) { if (names.has(nk)) report('duplicates', id, `same name as ${names.get(nk)}`); else names.set(nk, id); }

  // plain keyboard characters only
  for (const [field, v] of textFields(e)) {
    if (typeof v !== 'string') continue;
    const bad = [...v].filter((ch) => ch < ' ' || ch > '~');
    if (bad.length) report('text', id, `${field}: ${[...new Set(bad)].map((c) => `U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`).join(' ')}`);
  }

  // copied book text: 8-word runs
  const ours = [e.summary, e.system, e.coincidentalIf, ...(e.optional ?? []).map((o) => o.purpose)].filter(Boolean).join(' . ');
  const words = (s) => s.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean);
  const ow = words(ours);
  const book = src.map((x) => ' ' + words(windowText(x.book, x.pdfPage)).join(' ') + ' ').join(' | ');
  const hits = new Set();
  for (let i = 0; i + 8 <= ow.length; i++) {
    const g = ow.slice(i, i + 8).join(' ');
    if (book.includes(` ${g} `)) hits.add(g);
  }
  if (hits.size) report('copies', id, [...hits][0] + (hits.size > 1 ? ` (+${hits.size - 1} more)` : ''));
}

for (const s of SPHERES) for (let r = 1; r <= 5; r++) if (!rankGrid.has(`${s}:${r}`)) report('ranks', `${s} ${r}`, 'no rank entry');

const stale = whitelist.filter((_, i) => !usedWl.has(i));
for (const w of stale) (issues.whitelist ??= []).push({ id: w.id, detail: `unused whitelist entry (${w.check}${w.detail ? ': ' + w.detail : ''})` });

// ---------- report ----------

const CHECKS = ['schema', 'pages', 'spheres', 'ranks', 'duplicates', 'text', 'copies', 'whitelist'];
console.log(`Agathon effect library check: ${effects.length} entries`);
let total = 0;
for (const c of CHECKS) {
  const list = issues[c] ?? [];
  total += list.length;
  const wl = whitelisted.filter((w) => w.check === c).length;
  console.log(`  ${c.padEnd(11)} ${String(list.length).padStart(4)}${wl ? `   (${wl} whitelisted)` : ''}`);
}
for (const c of CHECKS) for (const { id, detail } of issues[c] ?? []) console.log(`  [${c}] ${id}: ${detail}`);
console.log(`  inferred ranks (not printed, see README): ${inferred.length}`);
if (verbose) {
  for (const i of inferred) console.log(`    ~ ${i}`);
  for (const w of whitelisted) console.log(`    = [${w.check}] ${w.id}: ${w.detail} -- ${w.reason}`);
}
console.log(total === 0 ? 'OK: 0 issues' : `FAIL: ${total} issues`);
process.exit(total === 0 ? 0 : 1);
