// Pulls the text layer out of both rulebooks with pdftotext and splits it into one
// file per PDF page, in reading order (refs/text/<book>/pNNN.txt) and in layout
// mode (refs/text/<book>-layout/pNNN.txt; the reference charts only read well that
// way). Everything lands under refs/, which is gitignored: book text never ships.
//
//   node library/scripts/extract-text.mjs
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BOOKS, refsDir, textDir } from './books.mjs';

const out = textDir();
mkdirSync(out, { recursive: true });

for (const [name, b] of Object.entries(BOOKS)) {
  const pdf = join(refsDir(), b.file);
  for (const layout of [false, true]) {
    const all = join(out, `${b.slug}${layout ? '-layout' : ''}.txt`);
    execFileSync('pdftotext', ['-enc', 'UTF-8', ...(layout ? ['-layout'] : []), pdf, all]);
    const pages = readFileSync(all, 'utf8').split('\f');
    if (pages.at(-1).trim() === '') pages.pop();
    const dir = join(out, `${b.slug}${layout ? '-layout' : ''}`);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir);
    pages.forEach((p, i) => writeFileSync(join(dir, `p${String(i + 1).padStart(3, '0')}.txt`), p));
    if (!layout) {
      // sanity check of the printed-page offset: footers end with the page number
      let ok = 0, bad = 0;
      pages.forEach((p, i) => {
        const m = p.trim().match(/(?:^|\n)[^\n]*?(\d{1,3})\s*$/);
        if (!m) return;
        if (i + 1 - Number(m[1]) === b.offset) ok++; else bad++;
      });
      console.log(`${name}: ${pages.length} pages, footer offset ${b.offset} confirmed on ${ok} pages (${bad} other)`);
    }
  }
}
