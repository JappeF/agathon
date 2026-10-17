// Sharing characters: link, QR, file (notes stay private by default), importing on a
// second "device" (a fresh browser context), name clashes, a damaged link and the
// back-up-all file. Needs `npm run preview` on :4173 (or BASE=...).
import { chromium } from 'playwright-core';
import { mkdir, readFile } from 'node:fs/promises';

const BASE = process.env.BASE ?? 'http://localhost:4173';
await mkdir('shots', { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });

let failed = 0;
const check = (label, ok, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail ? `: ${detail}` : ''}`);
  if (!ok) failed++;
};
const errors = [];
const device = async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));
  return { ctx, page };
};

// --- device A: make a character with a secret note ---
const { page: a } = await device();
const name = `Share Test ${Date.now() % 10000}`;
await a.goto(`${BASE}/#/characters`, { waitUntil: 'networkidle' });
await a.fill('.add-row .text-input', name);
await a.click('button:has-text("Add")');
await a.waitForSelector('.sheet-name');
await a.click('.lock');
await a.click('[aria-label="Forces 3"]');
await a.setInputFiles('.view.sheet input[accept="image/*"]', 'public/icons/icon-512.png');
await a.waitForSelector('.sheet-hero .pp-face img');
await a.click('.lock');
await a.click('.tab:has-text("Notes")');
await a.fill('.text-area', 'The secret of the Tower');
await a.waitForTimeout(400);

await a.click('.menu summary');
await a.click('button:has-text("Share character")');
await a.waitForSelector('.modal');
check('notes unticked by default', !(await a.isChecked('.modal .check input')));
await a.click('.modal button:has-text("Copy link")');
const url = await a.evaluate(() => navigator.clipboard.readText());
check('share link', url.startsWith(`${BASE}/#import=1.`), `${url.length} chars`);
await a.click('.modal button:has-text("Show QR code")');
check('QR code drawn', (await a.$('.qr svg')) !== null);
await a.waitForTimeout(400); // let the fade-in finish
await a.screenshot({ path: 'shots/20-share-dialog.png' });
const [dl] = await Promise.all([a.waitForEvent('download'), a.click('.modal button:has-text("Download file")')]);
const filePath = `shots/${dl.suggestedFilename()}`;
await dl.saveAs(filePath);
const file = JSON.parse(await readFile(filePath, 'utf8'));
check('file name', dl.suggestedFilename() === `${name}.agathon.json`, dl.suggestedFilename());
check('file: Forces 3, no notes, no id', file.characters[0].spheres.Forces === 3 && file.characters[0].notes === '' && !('id' in file.characters[0]));
check('file carries the portrait', /^data:image\//.test(file.characters[0].portrait ?? ''));
check('link carries a small portrait', url.length < 20000, `${url.length} chars`);
await a.click('.modal button:has-text("Done")');

// --- device B: open the link ---
const { page: b } = await device();
await b.goto(url, { waitUntil: 'networkidle' });
await b.waitForSelector('.modal');
check('link preview', (await b.textContent('.modal-title')) === `Add ${name}?`);
check('link cleaned from the URL', !b.url().includes('import='), b.url());
await b.click('.modal button:has-text("Add character")');
await b.waitForSelector('.sheet-name');
check('arrives on device B', (await b.textContent('.sheet-name')) === name);
check('Forces 3 on device B', (await b.textContent('.sphere-row:has-text("Forces") .trait-num')) === '3');
await b.click('.tab:has-text("Notes")');
check('note stayed private', (await b.inputValue('.text-area')) === '');
check('small portrait through the link', (await b.$('.sheet-hero .pp-face img')) !== null);

// opening the same link again adds a copy instead of overwriting
await b.goto(url, { waitUntil: 'networkidle' });
await b.waitForSelector('.modal');
await b.click('.modal button:has-text("Add character")');
await b.waitForSelector('.sheet-name');
check('name clash gets a suffix', (await b.textContent('.sheet-name')) === `${name} (2)`);

// the downloaded file imports through the Import button
await b.goto(`${BASE}/#/characters`, { waitUntil: 'networkidle' });
await b.setInputFiles('.import-row input[type=file]', filePath);
await b.waitForSelector('.modal');
await b.click('.modal button:has-text("Add character")');
await b.waitForSelector('.sheet-name');
check('file import', (await b.textContent('.sheet-name')) === `${name} (3)`);
check('portrait through the file', (await b.$('.sheet-hero .pp-face img')) !== null);

// a damaged link explains itself
await b.goto(`${BASE}/#import=1.bm90IGEgcmVhbCBsaW5r`, { waitUntil: 'networkidle' });
await b.waitForSelector('.modal');
check('damaged link message', /invalid or damaged/.test(await b.textContent('.modal')));
await b.click('.modal button:has-text("OK")');

// back up all on device B: three characters in one file
await b.goto(`${BASE}/#/characters`, { waitUntil: 'networkidle' });
await b.click('button:has-text("Back up all")');
const [bk] = await Promise.all([b.waitForEvent('download'), b.click('.modal button:has-text("Download file")')]);
await bk.saveAs(`shots/${bk.suggestedFilename()}`);
const backup = JSON.parse(await readFile(`shots/${bk.suggestedFilename()}`, 'utf8'));
check('backup has all three', backup.characters.length === 3, String(backup.characters.length));

// clean up device A (device B's context is thrown away)
await a.click('.menu summary');
await a.click('button:has-text("Delete character")');
await a.click('.modal .btn-danger');

check('no page errors', errors.length === 0, errors.join(' | '));
await browser.close();
console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
