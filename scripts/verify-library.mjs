// Library: text search, the Sphere bar (exact combination by default), "allow other
// Spheres", operators and chips, tags, the effect detail (difficulty, checklist), deep
// links, and "what can I cast" with the one-dot-away section for an imported character.
// Needs `npm run preview` on :4173 (or BASE=...) and the sample sheet (SHEET=..., refs/).
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';

const BASE = process.env.BASE ?? 'http://localhost:4173';
const SHEET = process.env.SHEET ?? 'refs/M20_2-Page_Interactive_Saito Weinberg.pdf';
await mkdir('shots', { recursive: true });
// real scrollbars (Playwright hides them in headless mode), so layout shifts show up
const browser = await chromium.launch({ channel: 'msedge', headless: true, ignoreDefaultArgs: ['--hide-scrollbars'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));

let failed = 0;
const check = (label, ok, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail ? `: ${detail}` : ''}`);
  if (!ok) failed++;
};
const count = async () => (await page.textContent('.results-count'))?.trim() ?? '';
const num = async () => parseInt(await count(), 10);
const search = async (q) => {
  await page.fill('.search-input', q);
  await page.waitForTimeout(250);
};
/** Sphere names in the shown combos of every card */
const cardSpheres = () =>
  page.$$eval('.effect-card', (cards) =>
    cards.map((c) => [...c.querySelectorAll('.effect-combo')].map((x) => [...x.querySelectorAll('.sphere-chip')].map((s) => s.textContent.replace(/[^A-Za-z]/g, '')))),
  );

await page.goto(`${BASE}/#/library`, { waitUntil: 'networkidle' });
await page.waitForSelector('.effect-card');
check('all spells listed', /^\d+ of \d+ spells/.test(await count()), await count());
await page.screenshot({ path: 'shots/30-library.png' });

await search('portal');
check('text search', (await num()) > 0, await count());
check('search words are marked', (await page.$$eval('.effect-card mark', (ms) => ms.length && ms.every((m) => m.textContent.toLowerCase() === 'portal'))) === true);
await search('witnesses');
check('a line shows matches outside the summary', (await page.$$eval('.effect-match mark', (ms) => ms.length)) > 0);

// Sphere bar: Mind 3 + Forces 2 = exactly those two Spheres
await search('');
for (let i = 0; i < 3; i++) await page.click('.sphere-btn[title="Mind"]');
for (let i = 0; i < 2; i++) await page.click('.sphere-btn[title="Forces"]');
check('bar writes the query', (await page.inputValue('.search-input')).trim() === 'mind:3 forces:2', await page.inputValue('.search-input'));
const exact = await num();
const combos = (await cardSpheres()).flat();
check(
  'exact combination only',
  exact > 0 && combos.every((c) => c.length === 2 && c.includes('Mind') && c.includes('Forces')),
  `${exact} hits`,
);
await page.screenshot({ path: 'shots/31-library-mind-forces.png' });
await page.check('.lib-toggles .check:has-text("Allow other") input');
check('allow other Spheres widens it', (await num()) > exact, await count());
await page.uncheck('.lib-toggles .check:has-text("Allow other") input');

// operators
await search('uses:mind,forces');
check('uses: keeps both Spheres', (await cardSpheres()).flat().every((c) => c.includes('Mind') && c.includes('Forces')));
await search('data:2');
check('Technocratic alias chip', (await page.textContent('.op-chips')).includes('Correspondence up to 2'));
check('data:2 finds Correspondence-only effects', (await cardSpheres()).flat().every((c) => c.length === 1 && c[0] === 'Correspondence'));
await search('kind:rote');
check('kind:rote', (await page.$$eval('.effect-card', (cs) => cs.every((c) => c.classList.contains('kind-rote')))) && (await num()) > 0, await count());
await search('frobnicate:3');
check('unknown operator is just text', (await num()) === 0);

// tags
await search('');
check('tags hidden behind Filters on a phone', !(await page.isVisible('.tag-list')));
await page.click('.filters-toggle');
await page.click('.tag-row:has-text("healing")');
check('nothing runs off a phone screen', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
check('tag chip', (await page.textContent('.op-chips')).includes('tag healing'));
const healing = await num();
check('tag filters', healing > 0 && healing < 400, String(healing));
await page.click('.op-clear');
check('Clear all empties the search', (await page.inputValue('.search-input')) === '' && (await num()) > healing);
// operators still being typed filter nothing yet
const everything = await num();
for (const q of ['tag:', 'kind:', 'is:', '-name:', 'book:']) {
  await search(q);
  check(`"${q}" while typing keeps every spell`, (await num()) === everything, `${await num()} of ${everything}`);
}
await search('');
await page.click('.tag-row:has-text("healing")');

// detail, opened from the keyboard: focus goes in, Tab stays in, Escape brings it back
await page.focus('.effect-card >> nth=0');
await page.keyboard.press('Enter');
await page.waitForSelector('.detail');
const inDetail = () => page.evaluate(() => !!document.querySelector('.detail')?.contains(document.activeElement));
check('detail takes focus', await inDetail());
for (let i = 0; i < 25; i++) await page.keyboard.press('Tab');
check('Tab stays inside the detail', await inDetail());
await page.keyboard.press('Escape');
await page.waitForSelector('.detail', { state: 'detached' });
check('focus back on the card', await page.evaluate(() => document.activeElement === document.querySelector('.effect-card')));
await page.click('.effect-card >> nth=0');
await page.waitForSelector('.detail');
check('detail tags are plain chips, not a pill around them', await page.$eval('.detail-tags', (n) => getComputedStyle(n).borderStyle === 'none'));
check('detail route', /^#\/library\/[a-z0-9-]+$/.test(new URL(page.url()).hash), new URL(page.url()).hash);
check('difficulty shown', /Coincidental\s*\d/.test(await page.textContent('.difficulty')));
check('checklist shown', (await page.$$('.tips li')).length >= 5);
await page.waitForTimeout(400); // let the fade-in finish
await page.screenshot({ path: 'shots/32-effect-detail.png' });
await page.keyboard.press('Escape');
await page.waitForSelector('.detail', { state: 'detached' });
check('closing goes back to the list', new URL(page.url()).hash === '#/library', new URL(page.url()).hash);
check('search kept after closing', (await page.inputValue('.search-input')).includes('tag:healing'));

// deep link
await page.goto(`${BASE}/#/library/thunder-punch`, { waitUntil: 'networkidle' });
await page.waitForSelector('.detail');
check('deep link', (await page.textContent('.detail-name')) === 'The Thunder Punch');
check('book coincidental note', /stays coincidental if/.test(await page.textContent('.detail')));
await page.click('.detail .back');
check('closing a deep link stays in the app', new URL(page.url()).hash === '#/library', page.url());

// what can I cast: import Saito so he is the active character
await page.goto(`${BASE}/#/characters`, { waitUntil: 'networkidle' });
await page.setInputFiles('.import-row input[type=file]', SHEET);
await page.waitForSelector('.modal');
await page.click('.modal .btn-gold');
await page.waitForSelector('.sheet-name');
await page.click('.nav-item:has-text("Library")');
await search('');
await page.check('.lib-toggles .check:has-text("can cast") input');
await page.waitForTimeout(300);
const cc = await count();
check('castable counts', /\d+ Saito Weinberg can cast, \d+ one dot away/.test(cc), cc);
const firstReadyShort = await page.$eval('.effect-list .effect-card', (c) => c.querySelector('.effect-combo')?.querySelectorAll('.sphere-chip.short').length ?? 0);
check('first castable effect needs no missing dots', firstReadyShort === 0);
check('one-dot-away section shows right away', (await page.$('.near-title')) !== null);
await search('kind:feat life:3');
const nearShort = await page.$$eval('.effect-list', (ls) =>
  ls.length > 1 ? [...ls[1].querySelectorAll('.effect-card')].map((c) => c.querySelector('.effect-combo').querySelectorAll('.sphere-chip.short').length) : [],
);
check('near ones are short exactly one Sphere', nearShort.length > 0 && nearShort.every((n) => n === 1), nearShort.join(','));
await page.screenshot({ path: 'shots/33-library-castable.png', fullPage: false });

// a tip that depends on a Sphere Saito has (Correspondence 4)
await search('');
await page.click('.effect-card >> nth=0');
await page.waitForSelector('.detail');
check('Sphere tip marked ready', /Correspondence 4/.test(await page.textContent('.tips')));
await page.keyboard.press('Escape');

// desktop: another app-style sticky filter sidebar and a grid of cards
const desk = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await desk.goto(`${BASE}/#/library`, { waitUntil: 'networkidle' });
await desk.waitForSelector('.effect-card');
check('desktop sidebar is sticky', (await desk.$eval('.lib-side', (e) => getComputedStyle(e).position)) === 'sticky');
check('desktop tags visible without a toggle', await desk.isVisible('.tag-list'));
const cols = await desk.$eval('.effect-list', (e) => getComputedStyle(e).gridTemplateColumns.split(' ').length);
check('desktop shows cards in columns', cols >= 2, `${cols} columns`);
// the sticky sidebar sits still: same top at rest, while scrolling, at the end of the page
const sideTops = [];
for (const y of [0, 5, 400, 99999]) {
  await desk.evaluate((v) => scrollTo(0, v), y);
  await desk.waitForTimeout(150);
  sideTops.push(await desk.$eval('.lib-side', (n) => Math.round(n.getBoundingClientRect().top)));
}
await desk.evaluate(() => scrollTo(0, 0));
check('sidebar never shifts while scrolling', new Set(sideTops).size === 1, sideTops.join(', '));
// the page scrollbar comes and goes with the results; the bar and the page are placed
// against the whole window, so nothing moves when it does
const spots = () => desk.evaluate(() => ['.lib-side', '.search-input', '.nav-item', '.brand'].map((s) => Math.round(document.querySelector(s).getBoundingClientRect().x)).join(','));
const withBar = await spots();
const hadBar = await desk.evaluate(() => innerWidth > document.documentElement.clientWidth);
await desk.fill('.search-input', 'zzzz');
await desk.waitForTimeout(300);
const noBar = await desk.evaluate(() => innerWidth === document.documentElement.clientWidth);
check('nothing moves when the page scrollbar comes or goes', hadBar && noBar && (await spots()) === withBar, `${withBar} vs ${await spots()}`);
check('no page scrollbar with few results', await desk.evaluate(() => document.documentElement.scrollHeight <= innerHeight), await desk.evaluate(() => `${document.documentElement.scrollHeight} vs ${innerHeight}`));
await desk.fill('.search-input', '');
await desk.waitForTimeout(300);
check('nothing runs off a desktop screen', await desk.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
await desk.screenshot({ path: 'shots/34-library-desktop.png' });
await desk.close();

// favorites: star an effect in the library, find it on the sheet, take it off there
await search('portal');
const favName = (await page.textContent('.effect-card .effect-name >> nth=0')).trim();
check('no Kind filter any more', (await page.locator('.lib-side .side-title:has-text("Kind")').count()) === 0);
await page.click('.effect-card >> nth=0');
await page.click('.detail .detail-fav');
// the star follows the stored character, a moment after the click
check('detail star turns on', (await page.waitForSelector('.detail .detail-fav[aria-pressed="true"]', { timeout: 5000 }).catch(() => null)) !== null);
check('no Pin button, just the star', (await page.locator('.detail .pin-btn').count()) === 0);
await page.click('.detail .back');
check('favorite card shows a gold star', (await page.locator('.effect-item').first().locator('.card-pin.on').count()) === 1);
// the star on a card works without opening the detail, as in another app
await page.click('.effect-item >> nth=1 >> .card-pin');
await page.waitForSelector('.effect-item:nth-child(2) .card-pin.on', { timeout: 5000 }).catch(() => {});
check('favorite from the card', (await page.locator('.card-pin.on').count()) === 2 && !(await page.isVisible('.detail')));
await page.click('.effect-item >> nth=1 >> .card-pin');
await page.waitForFunction(() => document.querySelectorAll('.card-pin.on').length === 1);
await page.check('.lib-toggles .check:has-text("favorites") input');
check('is:fav keeps only favorites', (await num()) === 1 && (await page.inputValue('.search-input')).includes('is:fav'), await count());
await search('');
await page.click('.nav-char .nav-item');
await page.waitForSelector('.sheet-name:has-text("Saito Weinberg")');
check('Favorite spells on the Magick tab', (await page.textContent('.block:has(.block-title:text-is("Favorite spells"))')).includes(favName));
check('no Rotes block', (await page.locator('.block-title:text-is("Rotes")').count()) === 0);
await page.click('button.pin-row');
await page.waitForSelector('.detail');
check('favorite opens the detail on the sheet', new URL(page.url()).hash.startsWith('#/characters/'));
await page.click('.detail .detail-fav');
await page.keyboard.press('Escape');
check('removed from favorites on the sheet', (await page.locator('button.pin-row').count()) === 0);

// clean up Saito
await page.click('.menu summary');
await page.click('button:has-text("Delete character")');
await page.click('.modal .btn-danger');

check('no page errors', errors.length === 0, errors.join(' | '));
await browser.close();
console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
