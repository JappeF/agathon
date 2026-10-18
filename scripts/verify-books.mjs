// The player's own rulebooks: reading both PDFs into page text (recognised by content,
// footer offset), refusing other PDFs, Copy for AI taking the real pages along (ticked
// by default up to 15, untickable), saving the index as a file and loading it back.
// Needs the rulebook PDFs in refs/ (gitignored; override with M20=<path> HDYDT=<path>
// SHEET=<path>) and `npm run preview` on :4173 (or BASE=...). Not run in CI.
import { chromium } from 'playwright-core';
import { readdirSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';

const BASE = process.env.BASE ?? 'http://localhost:4173';
const M20 = process.env.M20 ?? 'refs/Mage_20th_Anniversary_Edition_(Final_Download).pdf';
const HDYDT = process.env.HDYDT ?? 'refs/M20_How_Do_You_DO_That_(Final_Download).pdf';
// a filled Mr. Gone sheet in refs/ (M20_2-Page_Interactive_<name>.pdf); the blank one has no suffix
const SHEET = process.env.SHEET ?? readdirSync('refs').map((f) => `refs/${f}`).find((f) => /^refs\/M20_2-Page_Interactive_.+\.pdf$/i.test(f));
await mkdir('shots', { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));

let failed = 0;
const check = (label, ok, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail ? `: ${detail}` : ''}`);
  if (!ok) failed++;
};
const text = async (sel) => (await page.textContent(sel))?.trim();
const bookRecords = () =>
  page.evaluate(
    () =>
      new Promise((res) => {
        const r = indexedDB.open('agathon');
        r.onsuccess = () => {
          const q = r.result.transaction('books').objectStore('books').getAll();
          q.onsuccess = () => res(q.result.map((b) => ({ id: b.id, pages: b.pages.length, offset: b.offset, p501: b.pages[501] ?? '' })));
        };
      }),
  );
const addPdf = async (path) => {
  await page.setInputFiles('.books-panel input[accept*="pdf"]', path);
  await page.waitForSelector('.book-message', { timeout: 300000 });
  return text('.book-message');
};

const name = `Book Test ${Date.now() % 10000}`;
await page.goto(`${BASE}/#/characters`, { waitUntil: 'networkidle' });
await page.fill('.add-row .text-input', name);
await page.click('button:has-text("Add")');
await page.waitForSelector('.sheet-name');
await page.click('.nav-item:has-text("Spell ideas")');
await page.waitForSelector('.books-panel');

// a PDF that isn't a rulebook is refused
if (SHEET && !SHEET.endsWith('undefined')) check('other PDFs refused', /isn't the M20 core book/.test(await addPdf(SHEET)), await text('.book-message'));

let t = Date.now();
check('How Do You DO That? read', /How Do You DO That\? added: 143 pages/.test(await addPdf(HDYDT)), `${await text('.book-message')} in ${Math.round((Date.now() - t) / 1000)}s`);
t = Date.now();
check('M20 read', /Anniversary Edition added: 698 pages/.test(await addPdf(M20)), `${await text('.book-message')} in ${Math.round((Date.now() - t) / 1000)}s`);
const recs = await bookRecords();
check('both books stored, footer offset 1', recs.length === 2 && recs.every((b) => b.offset === 1), JSON.stringify(recs.map(({ id, pages, offset }) => ({ id, pages, offset }))));
check('printed page 501 is the casting summary', /Casting Magickal Effects/.test(recs.find((b) => b.id === 'M20')?.p501 ?? ''));
check('rows show the books', (await page.locator('.book-row.on').count()) === 2);
await page.screenshot({ path: 'shots/60-books.png', fullPage: true });

// Copy for AI takes the real pages along
await page.click('.nav-item:has-text("Library")');
await page.fill('.search-input', 'fireball');
await page.waitForTimeout(300);
await page.click('.effect-card >> nth=0');
await page.click('.start-spell');
await page.waitForSelector('.dossier');
await page.click('button:has-text("Copy for AI")');
await page.click('.pack-pages summary');
const listed = await page.$$eval('.pack-pages li', (ls) => ls.map((l) => l.textContent.trim()));
check('pages offered: the effect first, the rules last', /^M20 p\. 528/.test(listed[0]) && listed.some((l) => /M20 p\. 501, Casting/.test(l)), listed.join(' | '));
const ticked = await page.$$eval('.pack-pages input', (is) => is.filter((i) => i.checked).length);
check('at most 15 ticked by default', ticked > 0 && ticked <= 15, `${ticked} of ${listed.length}`);
await page.click('.pack-preview summary');
let pack = await page.textContent('.pack-preview pre');
check('pack quotes the effect page', /### M20 p\. 528 \(Conjure a Fireball/.test(pack));
check('pack quotes the casting rules', /### M20 p\. 501[\s\S]{0,200}Casting Magickal Effects/.test(pack));
await page.uncheck('.pack-pages li:has-text("p. 528") input');
pack = await page.textContent('.pack-preview pre');
check('unticking drops the page', !/### M20 p\. 528/.test(pack));
await page.click('.modal button:has-text("Close")');

// save the index as a file, remove both books, load the file back
await page.click('.back:has-text("Spell ideas")');
await page.waitForSelector('.books-panel');
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('.books-panel button:has-text("Save as a file")')]);
const path = `shots/${dl.suggestedFilename()}`;
await dl.saveAs(path);
check('index file', dl.suggestedFilename() === 'agathon-books.json');
for (const n of [1, 0]) {
  await page.click('.book-row.on button:has-text("Remove") >> nth=0');
  await page.waitForFunction((k) => document.querySelectorAll('.book-row.on').length === k, n);
}
check('books removed', (await page.locator('.book-row.on').count()) === 0);
await page.setInputFiles('.books-panel input[accept*="json"]', path);
await page.waitForSelector('.book-row.on');
check('index file loads back', /Loaded/.test(await text('.book-message')) && (await page.locator('.book-row.on').count()) === 2, await text('.book-message'));

// clean up: the character (and its idea), then the books
await page.click('.nav-char .nav-item');
await page.click('.menu summary');
await page.click('button:has-text("Delete character")');
await page.click('.modal .btn-danger');
await page.click('.nav-item:has-text("Spell ideas")');
await page.goto(`${BASE}/#/spells`, { waitUntil: 'networkidle' });
await page.evaluate(() => new Promise((res) => (indexedDB.open('agathon').onsuccess = (e) => (e.target.result.transaction('books', 'readwrite').objectStore('books').clear().onsuccess = res))));

check('no page errors', errors.length === 0, errors.join(' | '));
await browser.close();
console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
