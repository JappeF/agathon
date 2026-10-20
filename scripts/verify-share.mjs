// Sharing characters: link, QR, file (notes stay private by default), importing on a
// second "device" (a fresh browser context), name clashes, a damaged link and the
// back-up-all file. Needs `npm run preview` on :4173 (or BASE=...).
import { chromium } from 'playwright-core';
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { deflateRawSync, inflateRawSync } from 'node:zlib';

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

// a shared file that arrived renamed (".txt") still imports: Import tells a character
// file from a PDF by its content, not its name
const renamed = 'shots/shared-character.txt';
await copyFile(filePath, renamed);
await b.click('.switch-btn');
await b.setInputFiles('.switch-menu .import-row input[type=file]', renamed);
await b.waitForSelector('.modal');
const renamedPreview = await b.textContent('.modal');
check('renamed character file: an add preview', /Add character/.test(renamedPreview), renamedPreview.slice(0, 80));
await b.click('.modal button:has-text("Add character")');
await b.waitForSelector(`.sheet-name:text-is("${name} (4)")`, { timeout: 8000 }).catch(() => {});
check('renamed file imports', (await b.textContent('.sheet-name')) === `${name} (4)`);
await b.evaluate(() => document.querySelector('.menu')?.removeAttribute('open'));
await b.click('.menu summary');
await b.click('button:has-text("Delete character")');
await b.click('.modal .btn-danger');
await b.waitForSelector(`.sheet-name:not(:text-is("${name} (4)"))`);

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
  // spell ideas for a character that isn't there, junk, and impossible ranks and outcomes
  spells: [
    { character: 7, title: 'Orphan idea' },
    'junk',
    { character: 0, title: 'Hostile idea', versions: [{ id: '../x', spheres: { Forces: 42, Bogus: 2 } }], log: [{ outcome: 'exploded', paradox: 999 }] },
  ],
};
await b.goto(`${BASE}/#import=0.${Buffer.from(JSON.stringify(hostile)).toString('base64url')}`, { waitUntil: 'networkidle' });
await b.waitForSelector('.modal');
check('hostile share: only the spell idea with a character', /and one spell idea are added/.test(await b.textContent('.modal')), await b.textContent('.modal'));
await b.click('.modal button:has-text("Add character")');
await b.waitForSelector('.sheet-name:text-is("Hostile Mage")');
await b.goto(`${BASE}/#/spells`, { waitUntil: 'networkidle' });
await b.click('text=Hostile idea');
await b.waitForSelector('.dossier');
check('hostile share: idea ranks clamped', (await b.getAttribute('.version-spheres .sphere-btn[title="Forces"]', 'aria-label')) === 'Forces 5');
check('hostile share: no orphan idea', (await b.locator('text=Orphan idea').count()) === 0);
await b.goto(`${BASE}/#/characters`, { waitUntil: 'networkidle' });
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

// the Import picker has no file filter (a shared file often arrives renamed, ".json.txt")
check('Import picker shows every file', await b.$eval('.switch-menu .file-pick input, .welcome .file-pick input', (i) => !i.hasAttribute('accept')).catch(() => false));
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

// a spell idea with a log entry on device B, for the last character in the list (so a mix-up
// with the first one shows)
await b.click('.switch-btn');
await b.click('.switch-menu .switch-row >> nth=-1');
await b.goto(`${BASE}/#/spells`, { waitUntil: 'networkidle' });
const ideaOwner = (await b.textContent('.nav-char-name')).trim();
await b.fill('input[aria-label="New spell idea"]', 'Backup test idea');
await b.keyboard.press('Enter');
await b.waitForSelector('.dossier');
await b.fill('.dossier label:has-text("What should happen") textarea', 'Survive the backup.');
await b.click('.outcome-btn:has-text("Worked")');
await b.click('button:has-text("Add to the log")');
await b.waitForTimeout(800);

// back up all on device B (from the character menu): three characters in one file
await b.goto(`${BASE}/#/characters`, { waitUntil: 'networkidle' });
await b.waitForSelector('.sheet-name');
await b.click('.switch-btn');
await b.click('.switch-menu button:has-text("Back up all")');
const [bk] = await Promise.all([b.waitForEvent('download'), b.click('.modal button:has-text("Download file")')]);
await bk.saveAs(`shots/${bk.suggestedFilename()}`);
const backup = JSON.parse(await readFile(`shots/${bk.suggestedFilename()}`, 'utf8'));
check('backup has all three', backup.characters.length === 3, String(backup.characters.length));
check('the backup dialog counts the spell idea', /and one spell idea/.test(await b.textContent('.modal')));
const backedUp = backup.spells?.[0];
check(
  'backup carries the spell idea, its log and its character',
  backup.spells?.length === 1 && backedUp.title === 'Backup test idea' && backedUp.log.length === 1 && backup.characters[backedUp.character].name === ideaOwner,
  JSON.stringify(backup.spells?.map((x) => [x.title, x.character, x.log.length])),
);

// restoring it on a fresh device C: the idea comes back with its own character
const { page: c } = await device();
await c.goto(`${BASE}/#/characters`, { waitUntil: 'networkidle' });
await c.setInputFiles('.welcome .file-pick input[type=file], .switch-menu .import-row input[type=file]', `shots/${bk.suggestedFilename()}`);
await c.waitForSelector('.modal');
check('import names the spell idea', /Characters and one spell idea/.test(await c.textContent('.modal')));
await c.click('.modal button:has-text("Add 3 characters")');
await c.waitForSelector('.sheet-name');
// switch the character in play, then look at its spell ideas
const ideasOf = async (who) => {
  await c.click('.nav-char .nav-caret');
  await c.click(`.switch-menu :text-is("${who}")`);
  await c.waitForSelector(`.nav-char-name:text-is("${who}")`);
  await c.goto(`${BASE}/#/spells`, { waitUntil: 'networkidle' });
  await c.waitForTimeout(300);
  return c.locator('text=Backup test idea').count();
};
const others = backup.characters.map((x) => x.name).filter((n) => n !== ideaOwner);
check('other characters get no spell idea', (await ideasOf(others[0])) === 0);
check('the idea is with its own character', (await ideasOf(ideaOwner)) === 1);
await c.click('text=Backup test idea');
await c.waitForSelector('.dossier');
check(
  'restored idea is back with its goal and log',
  (await c.inputValue('.dossier label:has-text("What should happen") textarea')) === 'Survive the backup.' && (await c.locator('.log-entry').count()) === 1,
);

// sharing one character with its spell ideas (device B, the idea's owner is in play): the
// link takes the idea without its log, the file takes it whole
await b.click('.modal button:has-text("Done")');
await b.goto(`${BASE}/#/characters`, { waitUntil: 'networkidle' });
await b.waitForSelector(`.sheet-name:text-is("${ideaOwner}")`);
await b.click('.menu summary');
await b.click('button:has-text("Share character")');
await b.waitForSelector('.modal');
const ideasBox = '.modal .check:has-text("Include spell ideas") input';
await b.waitForSelector(ideasBox, { timeout: 3000 }).catch(() => {});
check('spell ideas offered, unticked', (await b.locator(ideasBox).count()) === 1 && !(await b.isChecked(ideasBox)));
const linkOf = async () => {
  await b.click('.modal button:has-text("Copy link")');
  const link = await b.evaluate(() => navigator.clipboard.readText());
  return JSON.parse(inflateRawSync(Buffer.from(link.split('#import=1.')[1], 'base64url')).toString());
};
check('link without ideas by default', !(await linkOf()).spells);
await b.check(ideasBox);
await b.waitForTimeout(500);
const linked = await linkOf();
check('link carries the idea, not its log', linked.spells?.length === 1 && linked.spells[0].title === 'Backup test idea' && !linked.spells[0].log, JSON.stringify(linked.spells));
const [one] = await Promise.all([b.waitForEvent('download'), b.click('.modal button:has-text("Download file")')]);
await one.saveAs('shots/one-with-ideas.agathon.json');
const oneFile = JSON.parse(await readFile('shots/one-with-ideas.agathon.json', 'utf8'));
check('file carries the idea with its log', oneFile.spells?.length === 1 && oneFile.spells[0].log.length === 1);
await b.click('.modal button:has-text("Done")');
// and the link brings it in elsewhere, with the character
await c.goto(`${BASE}/#import=1.${deflateRawSync(Buffer.from(JSON.stringify(linked))).toString('base64url')}`, { waitUntil: 'networkidle' });
await c.waitForSelector('.modal');
check('link import names the spell idea', /The character and one spell idea are added/.test(await c.textContent('.modal')), await c.textContent('.modal'));

// clean up device A (device B's context is thrown away)
await a.click('.menu summary');
await a.click('button:has-text("Delete character")');
await a.click('.modal .btn-danger');

check('no page errors', errors.length === 0, errors.join(' | '));
await browser.close();
console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
