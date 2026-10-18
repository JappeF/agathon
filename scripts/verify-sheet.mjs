// Character sheet end to end: import a Mr. Gone PDF through the UI, check the values,
// play-mode trackers, edit mode, persistence, PDF export (re-read with pdf-lib), and the
// re-import diff. Needs `npm run preview` on :4173 and a filled sample sheet:
//   SHEET=refs/<sheet>.pdf node scripts/verify-sheet.mjs
// (defaults to the Saito Weinberg sample in refs/, which is not in git).
import { chromium } from 'playwright-core';
import { mkdir, readFile } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import { PDFDocument, PDFName } from 'pdf-lib';

const BASE = process.env.BASE ?? 'http://localhost:4173';
// a filled Mr. Gone sheet in refs/ (M20_2-Page_Interactive_<name>.pdf); the blank one has no suffix
const SHEET = process.env.SHEET ?? readdirSync('refs').map((f) => `refs/${f}`).find((f) => /^refs\/M20_2-Page_Interactive_.+\.pdf$/i.test(f));
// a blank Mr. Gone sheet for characters made in the app (BLANK=<path>); the sample stands in when there is none
const BLANK = process.env.BLANK ?? (existsSync('refs/M20_2-Page_Interactive.pdf') ? 'refs/M20_2-Page_Interactive.pdf' : SHEET);
await mkdir('shots', { recursive: true });

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
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

await page.goto(`${BASE}/#/characters`, { waitUntil: 'networkidle' });
check('placeholder', (await page.getAttribute('.add-row .text-input', 'placeholder')) === 'De Tovenaar van Salsaborenco');

// import through the UI
await page.setInputFiles('.import-row input[type=file]', SHEET);
await page.waitForSelector('.modal');
const title = await text('.modal-title');
check('import preview', /Saito Weinberg/.test(title ?? ''), title);
await page.screenshot({ path: 'shots/10-import-preview.png' });
await page.click('.modal button:has-text("Import"), .modal button:has-text("Update")');
await page.waitForSelector('.sheet-name');
check('opens the sheet', (await text('.sheet-name')) === 'Saito Weinberg');
const id = decodeURIComponent(new URL(page.url()).hash.split('/')[2]);

// portrait: taken from the picture in the PDF
const portraitSrc = () => page.getAttribute('.sheet-hero .pp-face img', 'src').catch(() => null);
const fromPdf = await portraitSrc();
check('portrait from the PDF', /^data:image\/(webp|jpeg);base64,/.test(fromPdf ?? ''), `${(fromPdf ?? '').length} chars`);

// the sheet's picture in an exported PDF: the largest JPEG that is not the page background
const pdfPortrait = (doc) => {
  let best = null;
  for (const pg of doc.getPages()) {
    const xo = pg.node.Resources()?.lookup(PDFName.of('XObject'));
    for (const k of xo?.keys() ?? []) {
      const o = xo.lookup(k);
      const num = (n) => Number(o.dict.get(PDFName.of(n))?.toString());
      if (String(o.dict.get(PDFName.of('Filter'))) !== '/DCTDecode' || Math.min(num('Width'), num('Height')) < 200) continue;
      if (num('Width') > 1500 && Math.abs(num('Width') / num('Height') - 612 / 792) < 0.02) continue; // page background
      if (!best || num('Width') * num('Height') > best.w * best.h) best = { w: num('Width'), h: num('Height'), bytes: Buffer.from(o.contents).toString('base64') };
    }
  }
  return best;
};
const exportDoc = async () => {
  await page.click('.menu summary');
  const [d] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Export PDF sheet")')]);
  const out = `shots/export-${Date.now()}.pdf`;
  await d.saveAs(out);
  await page.click('.modal button:has-text("OK")');
  return PDFDocument.load(await readFile(out));
};
const sheetPicture = pdfPortrait(await PDFDocument.load(await readFile(SHEET)));
check('sample sheet has a picture', !!sheetPicture);
check('export: the PDF picture is left as it was', pdfPortrait(await exportDoc())?.bytes === sheetPicture?.bytes);

// tapping the portrait (play mode) shows it large; scrolling away brings the mini bar
await page.click('.sheet-hero .portrait-btn');
await page.waitForSelector('.zoom-backdrop');
check('portrait zooms', ((await page.$eval('.zoom-backdrop .pp', (e) => e.getBoundingClientRect().width)) ?? 0) > 250);
await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/44-portrait-zoom.png' });
await page.keyboard.press('Escape');
await page.waitForSelector('.zoom-backdrop', { state: 'detached' });
check('pills beside the portrait', (await page.$('.sheet-title .vitals-bar')) !== null);

// experience sits by the name and takes digits only, in play mode too
await page.fill('.xp input', '');
await page.locator('.xp input').pressSequentially('2x7 ');
check('XP: digits only, editable while playing', (await page.inputValue('.xp input')) === '27', await page.inputValue('.xp input'));
check('XP left the Background tab', !(await page.isVisible('.field:has-text("Experience")')));
await page.mouse.wheel(0, 900);
await page.waitForSelector('.vitals-fixed');
check('mini bar while scrolled', (await page.$('.vitals-fixed .pp-face img')) !== null);
// small faces get their own small picture: a 640px one squeezed into 32px looked grainy on phones
const miniWidth = await page.waitForFunction(() => { const w = document.querySelector('.vitals-fixed .pp-face img')?.naturalWidth ?? 0; return w > 0 && w <= 128 && w; }, null, { timeout: 5000 }).then((h) => h.jsonValue()).catch(() => 0);
check('mini bar face is a small sharp copy', miniWidth > 0, `${miniWidth}px`);
await page.mouse.wheel(0, -2000);
await page.waitForSelector('.vitals-fixed', { state: 'detached' });

// regression: with the trackers open, scrolling used to bounce between the two bars
await page.click('.sheet-title .vitals-bar');
await page.waitForSelector('.vitals-panel');
await page.mouse.wheel(0, 700);
await page.waitForTimeout(500);
const y1 = await page.evaluate(() => scrollY);
await page.mouse.wheel(0, 500);
await page.waitForTimeout(500);
const y2 = await page.evaluate(() => scrollY);
check('scrolling works with trackers open', y1 > 300 && y2 > y1, `${y1} -> ${y2}`);
await page.click('.vitals-fixed .vitals-bar');
check('mini bar has its own drop-down', (await page.$('.vitals-fixed .vitals-panel')) !== null);
await page.mouse.wheel(0, -4000);
await page.waitForSelector('.vitals-fixed', { state: 'detached' });
await page.click('.sheet-title .vitals-bar');
await page.waitForSelector('.vitals-panel', { state: 'detached' });

await page.click('.lock');
// the Change / Add photo badge must not slip under the portal ring
check('portrait badge above the ring', await page.$eval('.portrait-hint', (h) => {
  const r = h.getBoundingClientRect();
  return h.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
}));
await page.setInputFiles('.view.sheet input[accept="image/*"]', 'public/icons/icon-512.png');
await page.waitForFunction((old) => document.querySelector('.sheet-hero .pp-face img')?.getAttribute('src') !== old, fromPdf);
check('portrait replaced in edit mode', (await portraitSrc()) !== fromPdf);
await page.click('.portrait-edit .link-btn');
check('portrait removed shows initials', (await page.textContent('.sheet-hero .pp-initials')) === 'SW');
await page.click('.lock');

// Magick tab
const sphere = async (s) => Number(await page.textContent(`.sphere-row:has-text("${s}") .trait-num`));
check('Correspondence 4', (await sphere('Correspondence')) === 4);
check('Mind 3 with specialty', (await sphere('Mind')) === 3 && /Extra dice/.test(await text('.sphere-row:has-text("Mind") .trait-spec')));
check('Prime is the affinity Sphere', (await page.$('.sphere-row:has-text("Prime") .affinity')) !== null);
check('Arete 5', (await text('.arete-row .trait-num')) === '5');
check('wheel 11 / 1', (await text('.wheel-q')) === '11' && (await text('.wheel-p')) === '1');
await page.screenshot({ path: 'shots/11-sheet-magick.png', fullPage: true });

// wheel: Paradox cancels Quintessence once they meet
for (let i = 0; i < 8; i++) await page.click('[aria-label="Gain Paradox"]');
check('Paradox 9, Quintessence still 11', (await text('.wheel-p')) === '9' && (await text('.wheel-q')) === '11');
await page.click('[aria-label="Gain Paradox"]');
check('Paradox 10 cancels one Quintessence', (await text('.wheel-p')) === '10' && (await text('.wheel-q')) === '10');
await page.click('[aria-label="Gain Quintessence"]');
check('Quintessence stops at the Paradox', (await text('.wheel-q')) === '10');
for (let i = 0; i < 9; i++) await page.click('[aria-label="Lose Paradox"]');
check('back to 10 / 1', (await text('.wheel-p')) === '1');

// vitals: health cycles, willpower spends, both outside edit mode
await page.click('.vitals-bar');
await page.click('[aria-label^="Bruised"]');
await page.click('[aria-label^="Hurt"]');
await page.click('[aria-label^="Hurt"]');
check('health marks', (await page.getAttribute('[aria-label^="Hurt"]', 'aria-label')) === 'Hurt: lethal');
check('health status', (await text('.vitals-bar .chip')) === 'Hurt -1', await text('.vitals-bar .chip'));
check('health colour follows the wound level', (await page.getAttribute('.vitals-bar .chip', 'class')).includes('hp-2'), await page.getAttribute('.vitals-bar .chip', 'class'));
await page.click('[aria-label="Willpower point 2"]');
check('willpower spent', /WP 5\/7/.test(await text('.vitals-bar')), await text('.vitals-bar'));
check('dots locked while playing', (await page.$('.sphere-row .dot-btn')) === null);
await page.screenshot({ path: 'shots/12-vitals.png' });

// Traits tab: untrained Abilities hidden, then shown
await page.click('.tab:has-text("Traits")');
check('Intelligence 5', (await text('.trait-row:has-text("Intelligence") .trait-num')) === '5');
check('Esoterica (0) hidden', (await page.$('.trait-row:has-text("Esoterica")')) === null);
await page.check('.toggle-untrained input');
check('Esoterica shown on request', (await page.$('.trait-row:has-text("Esoterica")')) !== null);
check('other traits', /Finance/.test(await text('.rated-list')));
await page.screenshot({ path: 'shots/13-sheet-traits.png', fullPage: true });

// edit mode: raise Esoterica to 2
await page.click('.lock');
await page.click('[aria-label="Esoterica 2"]');
check('edit Esoterica', (await text('.trait-row:has-text("Esoterica") .trait-num')) === '2');
await page.click('.lock');

// Background tab
await page.click('.tab:has-text("Background")');
check('backgrounds', /Resources/.test(await text('.tab-body')) && /Node/.test(await text('.tab-body')));
check('flaws with cost', /curiousity/.test(await text('.tab-body')));
await page.screenshot({ path: 'shots/14-sheet-background.png', fullPage: true });

// persistence across a reload
await page.waitForTimeout(400);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('.sheet-name');
await page.click('.tab:has-text("Traits")');
check('"show Abilities at 0" remembered', await page.isChecked('.toggle-untrained input'));
check('edit survives reload', (await text('.trait-row:has-text("Esoterica") .trait-num')) === '2');

// the actions menu closes on a tap outside it and on Escape
await page.click('.menu summary');
await page.mouse.click(5, 400);
check('menu closes on an outside tap', !(await page.$eval('.menu', (m) => m.open)));
await page.click('.menu summary');
await page.keyboard.press('Escape');
check('menu closes on Escape', !(await page.$eval('.menu', (m) => m.open)));

// favorite spells (the sheet's rotes): one from the library, one of their own
const sheetUrl = page.url();
await page.click('.nav-item:has-text("Library")');
await page.fill('.search-input', 'name:hot-shotting');
await page.waitForTimeout(300);
await page.click('.effect-item >> nth=0 >> .card-pin');
await page.waitForSelector('.card-pin.on');
await page.goto(sheetUrl, { waitUntil: 'networkidle' });
await page.waitForSelector('.sheet-name');
await page.click('.tab:has-text("Magick")');
await page.click('.lock');
const favBlock = '.block:has(.block-title:text-is("Favorite spells"))';
await page.click(`${favBlock} button:has-text("Add your own spell")`);
await page.fill(`${favBlock} .line-edit .text-input >> nth=-1`, 'Ward of the Seven Seals');
await page.click('.lock');
await page.waitForTimeout(400);
const favRows = await page.$$eval('.block:has(.block-title:text-is("Favorite spells")) .pin-name', (ns) => ns.map((n) => n.textContent.trim()));
check('favorite spells: library and own in one list', favRows.join() === 'Hot-Shotting,Ward of the Seven Seals', favRows.join());

// export back into the PDF and read it back
await page.click('.menu summary');
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Export PDF sheet")')]);
const path = process.env.EXPORT_TO ?? `shots/export-${Date.now()}.pdf`;
await dl.saveAs(path);
const form = (await PDFDocument.load(await readFile(path))).getForm();
const map = JSON.parse(await readFile('src/sheets/mrgone-m20-2page.json', 'utf8'));
const count = (names) => names.filter((n) => form.getCheckBox(n).isChecked()).length;
check('export: Esoterica 2', count(map.traits.Esoterica.dots) === 2);
// empty boxes keep the sheet's own look (only an "on" appearance); pdf-lib used to
// redraw them all as squares with check marks
const looks = (n) => form.getCheckBox(n).acroField.getWidgets()[0].getAppearances().normal.keys().map(String).join();
check('export: empty dots keep the sheet look', looks(map.traits.Esoterica.dots[4]) === '/Yes', looks(map.traits.Esoterica.dots[4]));
check('export: wheel boxes keep the sheet look', map.wheel.every((n) => looks(n) === '/Yes'));
check('export: Correspondence 4', count(map.traits.Correspondence.dots) === 4);
check('export: Hurt is lethal', form.getDropdown('health2').getSelected()[0] === 'X');
check('export: Willpower spent 2', count(map.willpowerSpent) === 2);
check('export: name', form.getTextField('name').getText() === 'Saito Weinberg');
check('export: experience', form.getTextField('experience').getText() === '27', form.getTextField('experience').getText());
const rotes = map.rotes.slice(0, 3).map((n) => form.getTextField(n).getText() ?? '');
check('export: favorite spells fill the rotes fields', rotes.join() === 'Hot-Shotting,Ward of the Seven Seals,', rotes.join());
check('export: portrait removed in the app leaves the PDF picture', pdfPortrait(await PDFDocument.load(await readFile(path)))?.bytes === sheetPicture?.bytes);
await page.click('.modal button:has-text("OK")');

// a portrait changed in the app replaces the PDF's picture, in the same place and shape
await page.click('.lock');
await page.setInputFiles('.view.sheet input[accept="image/*"]', 'public/icons/icon-512.png');
await page.waitForSelector('.sheet-hero .pp-face img');
await page.click('.lock');
const swapped = await exportDoc();
const newPicture = pdfPortrait(swapped);
check('export: changed portrait replaces the PDF picture', !!newPicture && newPicture.bytes !== sheetPicture.bytes);
check('export: in the same shape', newPicture && Math.abs(newPicture.w / newPicture.h - sheetPicture.w / sheetPicture.h) < 0.01, `${newPicture?.w}x${newPicture?.h} vs ${sheetPicture.w}x${sheetPicture.h}`);
check('export: no second picture', swapped.getPages()[1].node.Resources().lookup(PDFName.of('XObject')).keys().length === (await PDFDocument.load(await readFile(SHEET))).getPages()[1].node.Resources().lookup(PDFName.of('XObject')).keys().length);
await page.click('.lock');
await page.click('.portrait-edit .link-btn');
await page.click('.lock');

// re-import the original: the diff lists what the app changed since
await page.click('.menu summary');
await page.setInputFiles('.menu input[type=file]', SHEET);
await page.waitForSelector('.change-list');
const changes = await page.$$eval('.change-list li', (ls) => ls.map((l) => l.textContent));
check('re-import diff', changes.some((c) => /Esoterica: 2 -> 0/.test(c)), changes.join(' | '));
await page.screenshot({ path: 'shots/15-reimport-diff.png' });
await page.click('.modal button:has-text("Cancel")');

// the exported sheet's rotes come back as favorites: drop both, then update from that PDF
await page.evaluate(() => document.querySelector('.menu')?.removeAttribute('open'));
await page.click('.lock');
await page.click(`${favBlock} .fav-edit .btn-icon`);
await page.click(`${favBlock} .line-edit .btn-icon`);
await page.click('.lock');
await page.waitForTimeout(400);
check('favorites removed', (await page.locator('.block:has(.block-title:text-is("Favorite spells")) .pin-name').count()) === 0);
await page.click('.menu summary');
await page.setInputFiles('.menu input[type=file]', path);
await page.waitForSelector('.change-list');
const favChanges = await page.$$eval('.change-list li', (ls) => ls.map((l) => l.textContent));
check('re-import lists the favorites', favChanges.includes('Favorite spells: + Hot-Shotting') && favChanges.includes('Favorite spells: + Ward of the Seven Seals'), favChanges.join(' | '));
await page.click('.modal button:has-text("Update")');
await page.waitForSelector('.modal', { state: 'detached' });
await page.waitForTimeout(400);
check('library rote back as a library favorite', (await page.locator('button.pin-row:has-text("Hot-Shotting")').count()) === 1);
check('own spell back as their own', (await page.locator('.own-spell:has-text("Ward of the Seven Seals")').count()) === 1);

// importing through the character menu while this very sheet is open: the sheet takes the
// new data over, and the next tap must not write the old copy back
await page.fill('.xp input', '99');
await page.waitForTimeout(400);
await page.click('.switch-btn');
await page.setInputFiles('.switch-menu input[type=file]', SHEET);
await page.waitForSelector('.change-list');
await page.click('.modal button:has-text("Update")');
await page.waitForSelector('.modal', { state: 'detached' });
// the sample PDF says "4 exp"
await page.waitForFunction(() => document.querySelector('.xp input')?.value === '4', null, { timeout: 5000 }).catch(() => {});
check('open sheet takes over an import from the menu', (await page.inputValue('.xp input')) === '4', await page.inputValue('.xp input'));
await page.click('.sheet-title .vitals-bar');
for (let i = 0; i < 4; i++) await page.click('.vitals-panel [aria-label^="Bruised"]');
await page.click('.sheet-title .vitals-bar');
await page.waitForTimeout(600);
await page.reload();
await page.waitForSelector('.sheet-name');
check('a tap after that keeps the imported data', (await page.inputValue('.xp input')) === '4', await page.inputValue('.xp input'));

// copy the character: same sheet under a free name, with its stored PDF, then delete the copy
await page.evaluate(() => document.querySelector('.menu')?.removeAttribute('open'));
await page.click('.menu summary');
await page.click('button:has-text("Copy character")');
await page.waitForSelector('.sheet-name:text-is("Saito Weinberg (copy)")');
const copyId = decodeURIComponent(new URL(page.url()).hash.split('/')[2]);
check('copy: new character opened', copyId !== id, copyId);
check('copy: favorites carried over', (await page.locator('button.pin-row:has-text("Hot-Shotting")').count()) === 1);
check('copy: Spheres carried over', (await sphere('Forces')) > 0);
await page.click('.menu summary');
const [dlCopy] = await Promise.all([page.waitForEvent('download', { timeout: 10000 }).catch(() => null), page.click('button:has-text("Export PDF sheet")')]);
check('copy: exports from the copied PDF', dlCopy?.suggestedFilename() === 'Saito Weinberg (copy).pdf', dlCopy?.suggestedFilename());
await page.click('.modal button:has-text("OK")');
await page.click('.menu summary');
await page.click('button:has-text("Copy character")');
await page.waitForSelector('.sheet-name:text-is("Saito Weinberg (copy 2)")');
check('copy: second copy gets a free name', true);
for (let i = 0; i < 2; i++) {
  await page.click('.menu summary');
  await page.click('button:has-text("Delete character")');
  await page.click('.modal .btn-danger');
  await page.waitForTimeout(300);
}
await page.waitForSelector('.sheet-name:text-is("Saito Weinberg")');
check('copy: original untouched', decodeURIComponent(new URL(page.url()).hash.split('/')[2]) === id);

// a character made in the app: the first export asks for a blank sheet (with a download
// link to Mr. Gone's), and every later one reuses it
const exportFrom = async () => {
  await page.click('.menu summary');
  await page.click('button:has-text("Export PDF sheet")');
};
for (const n of ['Blank Test A', 'Blank Test B']) {
  await page.click('.switch-btn');
  await page.fill('.switch-menu .add-row .text-input', n);
  await page.click('.switch-menu button:has-text("Add")');
  await page.waitForSelector(`.sheet-name:text-is("${n}")`);
  if (n === 'Blank Test A') {
    // a portrait set in the app goes onto the blank sheet, which has none
    await page.click('.lock');
    await page.setInputFiles('.view.sheet input[accept="image/*"]', 'public/icons/icon-512.png');
    await page.waitForSelector('.sheet-hero .pp-face img');
    await page.click('.lock');
  }
  await exportFrom();
  if (n === 'Blank Test A') {
    await page.waitForSelector('.modal-title:has-text("Pick a blank sheet")');
    check('blank sheet: download link to Mr. Gone', /mrgone\.rocksolidshells\.com\/pdf\/M20\/M20_2-Page_Interactive\.pdf/.test(await page.getAttribute('.modal a:has-text("Download the blank sheet")', 'href')));
    const [d1] = await Promise.all([page.waitForEvent('download'), page.setInputFiles('.modal .file-pick input', BLANK)]);
    check('blank sheet: first export', d1.suggestedFilename() === `${n}.pdf`, d1.suggestedFilename());
    const blankOut = `shots/export-blank-${Date.now()}.pdf`;
    await d1.saveAs(blankOut);
    const out = await PDFDocument.load(await readFile(blankOut));
    const blankIn = await PDFDocument.load(await readFile(BLANK));
    const images = (d) => d.getPages()[1].node.Resources().lookup(PDFName.of('XObject')).keys().length;
    // Reader-extended sheets lose their form in Acrobat Reader once rewritten, unless /Perms goes
    check('blank sheet: Reader extensions removed', !out.catalog.has(PDFName.of('Perms')), `blank had them: ${blankIn.catalog.has(PDFName.of('Perms'))}`);
    check('blank sheet: app portrait drawn on page 2', images(out) === images(blankIn) + 1, `${images(blankIn)} -> ${images(out)}`);
  } else {
    const d2 = await page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
    check('blank sheet remembered for the next character', d2?.suggestedFilename() === `${n}.pdf` && (await page.locator('.modal-title:has-text("Pick a blank sheet")').count()) === 0);
  }
  await page.click('.modal button:has-text("OK")');
}
for (const n of ['Blank Test B', 'Blank Test A']) {
  await page.waitForSelector(`.sheet-name:text-is("${n}")`);
  await page.click('.menu summary');
  await page.click('button:has-text("Delete character")');
  await page.click('.modal .btn-danger');
}
await page.waitForSelector('.sheet-name:text-is("Saito Weinberg")');

// clean up (the file was set without clicking the menu item, so the menu is still open)
await page.evaluate(() => document.querySelector('.menu')?.removeAttribute('open'));
await page.click('.menu summary');
await page.click('button:has-text("Delete character")');
await page.click('.modal .btn-danger');
await page.waitForSelector('.welcome');
check('deleted', !(await page.evaluate((i) => document.body.innerHTML.includes(i), id)));

check('no page errors', errors.length === 0, errors.join(' | '));
await browser.close();
console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
