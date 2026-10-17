// Drive the built app in headless Edge: shell, navigation, IndexedDB persistence,
// service worker, and a full offline reload. Needs `npm run preview` on :4173,
// or BASE=https://agathon.pages.dev to check the live site.
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';

const BASE = process.env.BASE ?? 'http://localhost:4173';
await mkdir('shots', { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));

let failed = 0;
const check = (label, ok, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail ? `: ${detail}` : ''}`);
  if (!ok) failed++;
};

await page.goto(BASE, { waitUntil: 'networkidle' });
check('logo', (await page.textContent('.logo'))?.trim() === 'Agathon');
check('portal behind the logo', (await page.$$('.portal .portal-spark')).length > 20);
check(
  'logo font is Cinzel Decorative',
  await page.evaluate(() => document.fonts.check('700 40px "Cinzel Decorative"')),
);
await page.screenshot({ path: 'shots/01-mobile-library.png' });

// navigation via the bottom bar
await page.click('.nav-item:has-text("Characters")');
check('hash route', new URL(page.url()).hash === '#/characters', new URL(page.url()).hash);
check(
  'characters view (no characters yet: the welcome)',
  await page
    .waitForSelector('.welcome .view-title:has-text("Characters")', { timeout: 5000 })
    .then(() => true, () => false),
);

// add a character: it opens its sheet and must survive a reload (IndexedDB)
const name = `Test Adept ${Date.now() % 10000}`;
await page.fill('.add-row .text-input', name);
await page.click('button:has-text("Add")');
await page.waitForSelector(`.sheet-name:has-text("${name}")`);
await page.reload({ waitUntil: 'networkidle' });
check('character persists after reload', (await page.$(`.sheet-name:has-text("${name}")`)) !== null);
await page.screenshot({ path: 'shots/02-mobile-sheet.png' });

// service worker + manifest
const swReady = await page.evaluate(async () => {
  const reg = await navigator.serviceWorker?.ready;
  return !!reg?.active;
});
check('service worker active', swReady);
const manifest = await page.evaluate(() => fetch('/manifest.webmanifest').then((r) => r.status));
check('manifest served', manifest === 200);

// offline: the controlled page must reload without any network
if (!(await page.evaluate(() => !!navigator.serviceWorker.controller))) {
  await page.reload({ waitUntil: 'networkidle' });
}
await ctx.setOffline(true);
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('.logo', { timeout: 10000 }).catch(() => {});
check('loads offline', (await page.textContent('.logo').catch(() => null))?.trim() === 'Agathon');
check('character still there offline', (await page.$(`.sheet-name:has-text("${name}")`)) !== null);
await ctx.setOffline(false);

// the nav shows the character in play; a second one is one switch away
check('nav shows the character in play', (await page.textContent('.nav-char-name')) === name);
const second = `${name} B`;
await page.click('.switch-btn');
await page.waitForSelector('.switch-menu:not([hidden])');
await page.fill('.switch-menu .add-row .text-input', second);
await page.click('.switch-menu button:has-text("Add")');
await page.waitForSelector(`.sheet-name:has-text("${second}")`);
check('adding from the menu switches to it', (await page.textContent('.nav-char-name')) === second);
await page.click('.switch-btn');
const rows = await page.$$eval('.switch-row .char-name', (ns) => ns.map((n) => n.textContent));
check('menu lists the one in play first', rows.length === 2 && rows[0] === second, rows.join(' | '));
await page.click(`.switch-row:has(.char-name:text-is("${name}"))`);
await page.waitForSelector(`.sheet-name:text-is("${name}")`);
check('switching opens that sheet and closes the menu', (await page.$('.switch-menu[hidden]')) !== null);
check('nav follows the switch', (await page.textContent('.nav-char-name')) === name);
await page.click('.nav-item:has-text("Library")');
await page.click('.nav-char .nav-item');
check('nav goes straight to the sheet in play', (await page.textContent('.sheet-name')) === name);

// clean up both test characters: deleting one hands over to the other, then the welcome
for (const n of [name, second]) {
  await page.waitForSelector(`.sheet-name:text-is("${n}")`);
  await page.click('.menu summary');
  await page.click('button:has-text("Delete character")');
  await page.click('.modal .btn-danger');
}
await page.waitForSelector('.welcome');
check('deleting the last one shows the welcome', (await page.$('.nav-char .pp')) === null);

// desktop layout
const desk = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await desk.goto(BASE, { waitUntil: 'networkidle' });
const barPos = await desk.$eval('.app-header', (n) => getComputedStyle(n).position);
const navInBar = await desk.$eval('.app-nav', (n) => n.closest('.app-header') !== null && getComputedStyle(n).position === 'static');
check('desktop: compact sticky bar with the nav inside it', barPos === 'sticky' && navInBar, barPos);
check('desktop bar is compact', (await desk.$eval('.app-header', (n) => n.getBoundingClientRect().height)) <= 80);
await desk.screenshot({ path: 'shots/03-desktop.png' });

// the nav must not jump between a short page (no scrollbar) and a long one
const libraryX = async () => (await desk.locator('.nav-item:has-text("Library")').boundingBox())?.x;
await desk.goto(`${BASE}/#/characters`, { waitUntil: 'networkidle' });
const shortX = await libraryX();
await desk.goto(`${BASE}/#/library`, { waitUntil: 'networkidle' });
await desk.waitForSelector('.effect-card');
const longX = await libraryX();
check('nav stays put with or without a scrollbar', shortX === longX, `${shortX} vs ${longX}`);

check('no page errors', errors.length === 0, errors.join(' | '));
await browser.close();
console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
