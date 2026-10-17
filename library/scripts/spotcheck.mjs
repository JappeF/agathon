// Picks random entries from one batch file and writes them next to the book passage
// they came from, for a human spot-check. The output contains book text, so it goes
// to library/.spotcheck/ (gitignored) and must never be committed or published.
//
//   node library/scripts/spotcheck.mjs m20-spheres            # 10 entries, seed 1
//   node library/scripts/spotcheck.mjs hdydt-time --n 12 --seed 7
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BOOKS, LIBRARY_DIR, pageText } from './books.mjs';

const args = process.argv.slice(2);
const batch = args[0]?.replace(/\.json$/, '');
const opt = (k, d) => (args.includes(k) ? Number(args[args.indexOf(k) + 1]) : d);
const n = opt('--n', 10);
let seed = opt('--seed', 1);
if (!batch) {
  console.log('usage: node library/scripts/spotcheck.mjs <batch> [--n 10] [--seed 1]');
  process.exit(1);
}

const entries = JSON.parse(readFileSync(join(LIBRARY_DIR, 'src', `${batch}.json`), 'utf8'));
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pool = [...entries];
const picked = [];
while (picked.length < n && pool.length) picked.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);

const flat = (s) => s.replace(/\s+/g, ' ').trim();
const fmt = (sp) => Object.entries(sp).map(([s, r]) => `${s} ${r}`).join(' + ');

// Centre the excerpt on the first place the entry's Spheres or name words show up.
function excerpt(e, s) {
  const pdf = s.page + BOOKS[s.book].offset;
  const text = [pdf, pdf + 1].map((p) => flat(pageText(s.book, p) ?? '')).join(' [next page] ');
  const probes = [
    ...(e.name.split(': ')[1] ?? e.name).split(' / ').map((t) => t.split(/\s+/).slice(0, 3).join(' ')),
    ...e.combos.flatMap((c) => Object.entries(c.spheres).map(([sp, r]) => `${sp} ${r}`)),
  ];
  let at = -1;
  for (const p of probes) {
    at = text.toLowerCase().indexOf(p.toLowerCase());
    if (at >= 0) break;
  }
  if (at < 0) at = 0;
  const from = Math.max(0, at - 500);
  return (from > 0 ? '... ' : '') + text.slice(from, at + 1300) + ' ...';
}

let out = `# Spot-check: ${batch}\n\nLocal only: contains book text. ${picked.length} of ${entries.length} entries, seed ${opt('--seed', 1)}.\n`;
picked.forEach((e, i) => {
  out += `\n---\n\n## ${i + 1}. ${e.name}  (\`${e.id}\`, ${e.kind})\n\n`;
  out += `**Ours**\n\n- Summary: ${e.summary}\n`;
  if (e.system) out += `- System: ${e.system}\n`;
  out += `- Combos: ${e.combos.map((c) => fmt(c.spheres) + (c.inferred?.length ? ` (inferred: ${c.inferred.join(', ')})` : '') + (c.note ? ` [${c.note}]` : '')).join('  OR  ')}\n`;
  if (e.optional) out += `- Optional: ${e.optional.map((o) => `${fmt(o.spheres)} (${o.purpose})`).join('; ')}\n`;
  if (e.coincidentalIf) out += `- Coincidental if: ${e.coincidentalIf}\n`;
  if (e.vulgarity) out += `- Vulgarity: ${e.vulgarity}\n`;
  out += `- Tags: ${e.tags.join(', ')}\n- Source: ${e.source.map((s) => `${s.book} p.${s.page}`).join(', ')}\n\n`;
  const s = e.source[0];
  out += `**Book (${s.book} p.${s.page})**\n\n> ${excerpt(e, s)}\n`;
});

const dir = join(LIBRARY_DIR, '.spotcheck');
mkdirSync(dir, { recursive: true });
const file = join(dir, `${batch}.md`);
writeFileSync(file, out);
console.log(`wrote ${file}`);
