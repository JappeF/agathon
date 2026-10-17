// Drive the built app in headless Edge: shell, navigation, IndexedDB persistence,
// service worker, and a full offline reload. Needs `npm run preview` on :4173.
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';

const BASE = 'http://localhost:4173';
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
check('nine Sphere glyphs in the ring', (await page.$$('.sphere-ring-glyph')).length === 9);
check(
  'logo font is Cinzel Decorative',
  await page.evaluate(() => document.fonts.check('700 40px "Cinzel Decorative"')),
);
await page.screenshot({ path: 'shots/01-mobile-library.png' });

// navigation via the bottom bar
await page.click('.nav-item:has-text("Characters")');
check('hash route', new URL(page.url()).hash === '#/characters', new URL(page.url()).hash);
check(
  'characters view',
  await page
    .waitForSelector('.view-title:has-text("Characters")', { timeout: 5000 })
    .then(() => true, () => false),
);

// add a character; it must survive a reload (IndexedDB)
const name = `Test Adept ${Date.now() % 10000}`;
await page.fill('.text-input', name);
await page.click('button:has-text("Add")');
await page.waitForSelector(`.char-name:has-text("${name}")`);
await page.reload({ waitUntil: 'networkidle' });
check('character persists after reload', (await page.$(`.char-name:has-text("${name}")`)) !== null);
await page.screenshot({ path: 'shots/02-mobile-characters.png' });

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
check('character still there offline', (await page.$(`.char-name:has-text("${name}")`)) !== null);
await ctx.setOffline(false);

// clean up the test character
page.on('dialog', (d) => d.accept());
await page.click(`.char-row:has-text("${name}") .btn-icon`);

// desktop layout
const desk = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await desk.goto(BASE, { waitUntil: 'networkidle' });
const navPos = await desk.$eval('.app-nav', (n) => getComputedStyle(n).position);
check('desktop nav is a sticky bar, not the bottom bar', navPos === 'sticky', navPos);
await desk.screenshot({ path: 'shots/03-desktop.png' });

check('no page errors', errors.length === 0, errors.join(' | '));
await browser.close();
console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
