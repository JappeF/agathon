// Finds which page a phrase sits on, to fill in source pages while extracting.
//
//   node library/scripts/find.mjs HDYDT "Weather-Witching"
//   node library/scripts/find.mjs M20 "Pierce Space" --context 300
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BOOKS, textDir } from './books.mjs';

const [book, phrase, ...rest] = process.argv.slice(2);
const ctxAt = rest.indexOf('--context');
const ctx = ctxAt >= 0 ? Number(rest[ctxAt + 1]) : 120;
if (!BOOKS[book] || !phrase) {
  console.log('usage: node library/scripts/find.mjs <M20|HDYDT> "<phrase>" [--context N]');
  process.exit(1);
}
const dir = join(textDir(), BOOKS[book].slug);
const flat = (s) => s.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/\s+/g, ' ');
const needle = flat(phrase).toLowerCase();
for (const f of readdirSync(dir).sort()) {
  const text = flat(readFileSync(join(dir, f), 'utf8'));
  let i = text.toLowerCase().indexOf(needle);
  while (i >= 0) {
    const pdf = Number(f.slice(1, 4));
    console.log(`${book} p.${pdf - BOOKS[book].offset} (pdf ${pdf}): ...${text.slice(Math.max(0, i - ctx / 2), i + needle.length + ctx / 2)}...`);
    i = text.toLowerCase().indexOf(needle, i + 1);
  }
}
