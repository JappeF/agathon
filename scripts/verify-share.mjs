// Sharing characters: link, QR, file (notes stay private by default), importing on a
// second "device" (a fresh browser context), name clashes, a damaged link and the
// back-up-all file. Needs `npm run preview` on :4173 (or BASE=...).
import { chromium } from 'playwright-core';
import { mkdir, readFile } from 'node:fs/promises';
import { deflateRawSync } from 'node:zlib';

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

// a favorite spell travels with the character
await a.click('.nav-item:has-text("Library")');
await a.click('.effect-card >> nth=0');
await a.click('.detail .detail-fav');
await a.click('.detail .back');
await a.click('.nav-char .nav-item');
await a.waitForSelector('.pin-row');

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
await b.click('.tab:has-text("Magick")');
check('favorites through the link', (await b.waitForSelector('.pin-row', { timeout: 5000 }).catch(() => null)) !== null);

// opening the same link again adds a copy instead of overwriting
await b.goto(url, { waitUntil: 'networkidle' });
await b.waitForSelector('.modal');
await b.click('.modal button:has-text("Add character")');
// the sheet in play shows first; wait for the new one
await b.waitForSelector(`.sheet-name:text-is("${name} (2)")`, { timeout: 8000 }).catch(() => {});
check('name clash gets a suffix', (await b.textContent('.sheet-name')) === `${name} (2)`);

// the downloaded file imports through the Import button in the character menu
await b.click('.switch-btn');
await b.setInputFiles('.switch-menu .import-row input[type=file]', filePath);
await b.waitForSelector('.modal');
await b.click('.modal button:has-text("Add character")');
await b.waitForSelector(`.sheet-name:text-is("${name} (3)")`, { timeout: 8000 }).catch(() => {});
check('file import', (await b.textContent('.sheet-name')) === `${name} (3)`);
check('portrait through the file', (await b.$('.sheet-hero .pp-face img')) !== null);

// a hostile share: out-of-range numbers, unknown Spheres and keys, an SVG portrait. It
// may come in, but only as a clean character
const hostile = {
  app: 'agathon',
  kind: 'characters',
  version: 1,
  characters: [
    {
      name: 'Hostile Mage',
      arete: 99,
      willpower: 1e9,
      spheres: { Forces: 42, Bogus: 3 },
      traits: { Strength: -5 },
      portrait: 'data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9ImFsZXJ0KDEpIi8+',
      constructor: { prototype: { polluted: true } },
      extra: 'x'.repeat(1000),
    },
  ],
};
await b.goto(`${BASE}/#import=0.${Buffer.from(JSON.stringify(hostile)).toString('base64url')}`, { waitUntil: 'networkidle' });
await b.waitForSelector('.modal');
await b.click('.modal button:has-text("Add character")');
await b.waitForSelector('.sheet-name:text-is("Hostile Mage")');
check('hostile share: Arete clamped', /Arete\s*10$/.test((await b.textContent('.arete-row')).trim()), await b.textContent('.arete-row'));
check('hostile share: Spheres clamped', Number(await b.textContent('.sphere-row:has-text("Forces") .trait-num')) === 5);
check('hostile share: no unknown Sphere', (await b.locator('.sphere-row:has-text("Bogus")').count()) === 0);
check('hostile share: SVG portrait dropped', (await b.$('.sheet-hero .pp-face img')) === null);
check('hostile share: nothing polluted', await b.evaluate(() => ({}).polluted === undefined));
await b.click('.menu summary');
await b.click('button:has-text("Delete character")');
await b.click('.modal .btn-danger');
await b.waitForSelector('.sheet-name:not(:text-is("Hostile Mage"))');

// a file from a newer app version says so
const newer = { ...hostile, version: 2 };
await b.goto(`${BASE}/#import=0.${Buffer.from(JSON.stringify(newer)).toString('base64url')}`, { waitUntil: 'networkidle' });
await b.waitForSelector('.modal');
check('newer version explains itself', /newer version/.test(await b.textContent('.modal')));
await b.click('.modal button:has-text("OK")');

// a damaged link explains itself
await b.goto(`${BASE}/#import=1.bm90IGEgcmVhbCBsaW5r`, { waitUntil: 'networkidle' });
await b.waitForSelector('.modal');
check('damaged link message', /invalid or damaged/.test(await b.textContent('.modal')));
await b.click('.modal button:has-text("OK")');

// a decompression bomb (64 MB of zeros, a few dozen KB as a link) is refused, not unpacked
const bomb = deflateRawSync(Buffer.alloc(64 * 1024 * 1024), { level: 9 }).toString('base64url');
await b.goto(`${BASE}/#import=1.${bomb}`, { waitUntil: 'networkidle' });
await b.waitForSelector('.modal');
check('oversized link refused', /too large/.test(await b.textContent('.modal')), `${bomb.length} chars`);
await b.click('.modal button:has-text("OK")');

// back up all on device B (from the character menu): three characters in one file
await b.goto(`${BASE}/#/characters`, { waitUntil: 'networkidle' });
await b.waitForSelector('.sheet-name');
await b.click('.switch-btn');
await b.click('.switch-menu button:has-text("Back up all")');
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
