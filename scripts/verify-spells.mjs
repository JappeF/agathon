// Spell dossiers: start one from a library effect and one by name, edit the plan
// (Spheres, difficulty, notes), try another way and switch back, link an effect, log a
// casting, persistence, the list and the sheet's block, deleting. Needs no PDF sheet.
// Needs `npm run preview` on :4173 (or BASE=...).
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';

const BASE = process.env.BASE ?? 'http://localhost:4173';
await mkdir('shots', { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));

let failed = 0;
const check = (label, ok, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail ? `: ${detail}` : ''}`);
  if (!ok) failed++;
};
const text = async (sel) => (await page.textContent(sel))?.trim();

// no character yet: the Spells tab points to the characters
await page.goto(`${BASE}/#/spells`, { waitUntil: 'networkidle' });
check('spells need a character', /belong to a character/.test(await text('.view')));

const name = `Spell Test ${Date.now() % 10000}`;
await page.goto(`${BASE}/#/characters`, { waitUntil: 'networkidle' });
await page.fill('.add-row .text-input', name);
await page.click('button:has-text("Add")');
await page.waitForSelector('.sheet-name');
// Forces 3, Prime 2 so the character can cast a fireball
await page.click('.lock');
await page.click('[aria-label="Forces 3"]');
await page.click('[aria-label="Prime 2"]');
await page.click('.lock');
await page.waitForTimeout(400);

// from a library effect: title, link and the picked way to cast it come along
await page.click('.nav-item:has-text("Library")');
await page.fill('.search-input', 'fireball');
await page.waitForTimeout(300);
const effectName = (await text('.effect-card .effect-name >> nth=0')).trim();
await page.click('.effect-card >> nth=0');
await page.click('.start-spell');
await page.waitForSelector('.dossier');
check('opens the new dossier', new URL(page.url()).hash.startsWith('#/spells/'), page.url());
check('title from the effect', (await page.inputValue('.dossier-title')) === effectName);
check('effect linked', (await text('.dossier-side .pin-list')).includes(effectName));
check('Spheres from the effect', (await page.$$eval('.version-spheres .sphere-btn.on', (bs) => bs.map((b) => b.title).join())) === 'Forces,Prime');
check('difficulty shown', /Coincidental\s*6/.test(await text('.version .difficulty')), await text('.version .difficulty'));
check('castable for the character', (await text('.version .castable')).includes('has the dots'));

// edit the plan
await page.fill('.dossier-title', 'Gas leak fireball');
await page.fill('.dossier label:has-text("What should happen") textarea', 'Blow the door, blame the gas.');
await page.fill('.version label:has-text("How it looks") textarea', 'A lighter and hairspray');
await page.click('.version-spheres .sphere-btn[title="Matter"]');
check('Sphere tap adds a rank', (await page.getAttribute('.version-spheres .sphere-btn[title="Matter"]', 'aria-label')) === 'Matter 1');
// Prime 2 -> 3 -> 4 -> 5 -> 0: past 5 it is gone
for (let i = 0; i < 4; i++) await page.click('.version-spheres .sphere-btn[title="Prime"]');
check('past 5 a Sphere drops out', (await page.getAttribute('.version-spheres .sphere-btn[title="Prime"]', 'aria-label')) === 'Prime');
check('dots short shown (no Matter yet)', /1 dot short/.test(await text('.version .castable')), await text('.version .castable'));

// another way, then back
await page.click('button:has-text("Try another way")');
check('new version is the plan', (await text('.dossier-main .version-head')).startsWith('Version 2'));
check('earlier version kept', (await page.locator('.old-version').count()) === 1);
await page.click('.version-spheres .sphere-btn[title="Correspondence"]');
await page.click('.old-version summary');
await page.click('.old-version button:has-text("Make this the plan")');
check('switching back keeps the names', (await text('.dossier-main .version-head')).startsWith('Version 1'));

// link another effect through the picker
await page.click('button:has-text("Link an effect")');
await page.fill('.effect-picker .text-input', 'teleport');
await page.waitForTimeout(300);
await page.click('.picker-row >> nth=0');
check('second effect linked', (await page.locator('.linked-effect').count()) === 2);

// log a casting
await page.click('.outcome-btn:has-text("Botched")');
await page.fill('.log-paradox input', '3');
await page.fill('.log-form textarea', 'The door held, the hairspray did not.');
await page.click('button:has-text("Add to the log")');
check('log entry', /Botched/.test(await text('.log-list')) && /\+3 Paradox/.test(await text('.log-list')), await text('.log-list'));
await page.screenshot({ path: 'shots/50-dossier.png', fullPage: true });

// everything survives a reload
await page.waitForTimeout(500);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('.dossier');
check('title persists', (await page.inputValue('.dossier-title')) === 'Gas leak fireball');
check('goal persists', (await page.inputValue('.dossier label:has-text("What should happen") textarea')) === 'Blow the door, blame the gas.');
check('versions persist', (await page.locator('.old-version').count()) === 1);
check('log persists', (await page.locator('.log-entry').count()) === 1);

// the list and the sheet
await page.click('.back:has-text("Spells")');
await page.waitForSelector('.spell-card');
check('list shows the idea', /Gas leak fireball/.test(await text('.spell-list')) && /last botched/.test(await text('.spell-list')));
await page.fill('.spells .add-row .text-input', 'Kill every streetlight');
await page.click('.spells button:has-text("Start")');
await page.waitForSelector('.dossier');
check('start by name', (await page.inputValue('.dossier-title')) === 'Kill every streetlight');
await page.click('.nav-char .nav-item');
await page.waitForSelector('.sheet-name');
check('ideas on the Magick tab', (await page.locator('.pin-row[href^="#/spells/"]').count()) === 2);

// delete one idea, then the character takes the other with it
await page.click('.pin-row:has-text("Kill every streetlight")');
await page.click('button:has-text("Delete idea")');
await page.click('.modal .btn-danger');
await page.waitForSelector('.spell-card');
check('idea deleted', (await page.locator('.spell-card').count()) === 1);
await page.click('.nav-char .nav-item');
await page.click('.menu summary');
await page.click('button:has-text("Delete character")');
await page.click('.modal .btn-danger');
await page.waitForSelector('.welcome');
check('deleting the character removes its ideas', (await page.evaluate(() => new Promise((res) => {
  const r = indexedDB.open('agathon');
  r.onsuccess = () => {
    const q = r.result.transaction('spells').objectStore('spells').count();
    q.onsuccess = () => res(q.result);
  };
}))) === 0);

check('no page errors', errors.length === 0, errors.join(' | '));
await browser.close();
console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
