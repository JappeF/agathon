// Character sheet end to end: import a Mr. Gone PDF through the UI, check the values,
// play-mode trackers, edit mode, persistence, PDF export (re-read with pdf-lib), and the
// re-import diff. Needs `npm run preview` on :4173 and a filled sample sheet:
//   SHEET=refs/<sheet>.pdf node scripts/verify-sheet.mjs
// (defaults to the Saito Weinberg sample in refs/, which is not in git).
import { chromium } from 'playwright-core';
import { mkdir, readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';

const BASE = process.env.BASE ?? 'http://localhost:4173';
const SHEET = process.env.SHEET ?? 'refs/M20_2-Page_Interactive_Saito Weinberg.pdf';
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
check('health status', (await text('.vitals .chip')) === 'Hurt -1', await text('.vitals .chip'));
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
await page.check('.toggle-untrained input');
check('edit survives reload', (await text('.trait-row:has-text("Esoterica") .trait-num')) === '2');

// export back into the PDF and read it back
await page.click('.menu summary');
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Export PDF sheet")')]);
const path = `shots/export-${Date.now()}.pdf`;
await dl.saveAs(path);
const form = (await PDFDocument.load(await readFile(path))).getForm();
const map = JSON.parse(await readFile('src/sheets/mrgone-m20-2page.json', 'utf8'));
const count = (names) => names.filter((n) => form.getCheckBox(n).isChecked()).length;
check('export: Esoterica 2', count(map.traits.Esoterica.dots) === 2);
check('export: Correspondence 4', count(map.traits.Correspondence.dots) === 4);
check('export: Hurt is lethal', form.getDropdown('health2').getSelected()[0] === 'X');
check('export: Willpower spent 2', count(map.willpowerSpent) === 2);
check('export: name', form.getTextField('name').getText() === 'Saito Weinberg');
await page.click('.modal button:has-text("OK")');

// re-import the original: the diff lists what the app changed since
await page.click('.menu summary');
await page.setInputFiles('.menu input[type=file]', SHEET);
await page.waitForSelector('.change-list');
const changes = await page.$$eval('.change-list li', (ls) => ls.map((l) => l.textContent));
check('re-import diff', changes.some((c) => /Esoterica: 2 -> 0/.test(c)), changes.join(' | '));
await page.screenshot({ path: 'shots/15-reimport-diff.png' });
await page.click('.modal button:has-text("Cancel")');

// clean up (the file was set without clicking the menu item, so the menu is still open)
await page.evaluate(() => document.querySelector('.menu')?.removeAttribute('open'));
await page.click('.menu summary');
await page.click('button:has-text("Delete character")');
await page.click('.modal .btn-danger');
await page.waitForSelector('.char-list', { state: 'attached' });
check('deleted', !(await page.evaluate((i) => document.body.innerHTML.includes(i), id)));

check('no page errors', errors.length === 0, errors.join(' | '));
await browser.close();
console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
