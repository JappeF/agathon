// Rewrites the counts section of library/README.md from effects.json:
// entries per book and kind, and how many entries use each Sphere.
//
//   node library/scripts/stats.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { LIBRARY_DIR } from './books.mjs';

const SPHERES = ['Correspondence', 'Entropy', 'Forces', 'Life', 'Matter', 'Mind', 'Prime', 'Spirit', 'Time'];
const KINDS = ['rank', 'feat', 'rote'];
const effects = JSON.parse(readFileSync(join(LIBRARY_DIR, 'effects.json'), 'utf8'));

const books = (e) => [...new Set(e.source.map((s) => s.book))];
const bookList = ['M20', 'HDYDT'];

let md = `${effects.length} entries.\n\n`;
md += '| Book | ' + KINDS.join(' | ') + ' | total |\n| --- |' + ' ---: |'.repeat(KINDS.length + 1) + '\n';
for (const b of bookList) {
  const inBook = effects.filter((e) => books(e).includes(b));
  md += `| ${b} | ${KINDS.map((k) => inBook.filter((e) => e.kind === k).length).join(' | ')} | ${inBook.length} |\n`;
}
md += '\nEntries citing both books count in both rows.\n\n';

md += '| Sphere | rank | feat | rote | in any combo | needed in every combo |\n| --- | ---: | ---: | ---: | ---: | ---: |\n';
for (const s of SPHERES) {
  const any = effects.filter((e) => e.combos.some((c) => s in c.spheres));
  const all = effects.filter((e) => e.combos.every((c) => s in c.spheres));
  md += `| ${s} | ${KINDS.map((k) => any.filter((e) => e.kind === k).length).join(' | ')} | ${any.length} | ${all.length} |\n`;
}
const multi = effects.filter((e) => e.combos.length > 1).length;
const inferred = effects.filter((e) => [...e.combos, ...(e.optional ?? [])].some((c) => c.inferred?.length)).length;
md += `\n${multi} entries have more than one alternative combo; ${inferred} have at least one inferred rank.\n`;

const readme = join(LIBRARY_DIR, 'README.md');
const text = readFileSync(readme, 'utf8');
const out = text.replace(/(<!-- stats:start -->\n)[\s\S]*?(<!-- stats:end -->)/, `$1${md}$2`);
writeFileSync(readme, out);
console.log(md);
