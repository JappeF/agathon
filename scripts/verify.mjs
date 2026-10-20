// Drive the built app in headless Edge: shell, navigation, IndexedDB persistence,
// service worker, and a full offline reload. Needs `npm run preview` on :4173,
// or BASE=https://agathon.pages.dev to check the live site.
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';

const BASE = process.env.BASE ?? 'http://localhost:4173';
await mkdir('shots', { recursive: true });
// real scrollbars (Playwright hides them in headless mode), so layout shifts show up
const browser = await chromium.launch({ channel: 'msedge', headless: true, ignoreDefaultArgs: ['--hide-scrollbars'] });
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
check('portal behind the logo', (await page.$$('.portal .spark')).length > 20);
check(
  'logo font is Cinzel Decorative',
  await page.evaluate(() => document.fonts.check('700 40px "Cinzel Decorative"')),
);
await page.screenshot({ path: 'shots/01-mobile-library.png' });

// a stray % in a link (hand-typed, or cut off) must not blank the app
await page.goto(`${BASE}/#/library/100%`);
await page.waitForSelector('.logo', { timeout: 5000 }).catch(() => {});
check('a broken link still shows the app', (await page.textContent('.logo').catch(() => null))?.trim() === 'Agathon');
await page.goto(BASE, { waitUntil: 'networkidle' });

// the animations run on the compositor: an idle page leaves the main thread nearly free
// (it was 8-13% of a core when sparks, the logo light and the portrait glow repainted)
{
  await page.waitForTimeout(1500);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  const busy = async () => (await cdp.send('Performance.getMetrics')).metrics.find((m) => m.name === 'TaskDuration').value;
  const t0 = await busy();
  await page.waitForTimeout(5000);
  const pct = ((await busy()) - t0) * 20;
  check('idle animations stay off the main thread', pct < 4, `${pct.toFixed(1)}% of a core`);
  await cdp.detach();
}

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

// Backgrounds, Merits and Flaws: pick from the M20 lists, or type your own
await page.click('.tab:has-text("Background")');
await page.click('.lock');
await page.click('button:has-text("Add background")');
await page.fill('.picker-search', 'sanc');
check('picker filters', (await page.locator('.trait-pick:not(.own)').count()) === 1);
await page.click('.trait-pick:has-text("Sanctum")');
await page.click('button:has-text("Add merit")');
await page.fill('.picker-search', 'lang');
await page.click('.trait-pick:has-text("Language")');
await page.click('button:has-text("Add flaw")');
await page.fill('.picker-search', 'Nightmares');
await page.click('.trait-pick.own');
const ratedRows = await page.$$eval('.rated-list .row-input', (is) => is.map((i) => i.value).join());
check('picked and own rows', ratedRows === 'Sanctum,Language,Nightmares', ratedRows);
check('a Merit starts at its cost', (await page.inputValue('.rated-list .cost-input >> nth=0')) === '1');
// Sect from M20's list: picking one with no Affiliation yet fills that in too
await page.click('button[aria-label="Choose Sect"]');
await page.fill('.picker-search', 'virtual');
await page.click('.trait-pick:has-text("Virtual Adepts")');
check('Sect picked', (await page.inputValue('.field:has-text("Sect") input')) === 'Virtual Adepts');
check('Affiliation follows the Sect', (await page.inputValue('.field:has-text("Affiliation") input')) === 'Traditions');
await page.fill('.field:has-text("Affiliation") input', 'Technocracy');
await page.click('button[aria-label="Choose Sect"]');
check('Sect list follows the Affiliation', (await page.locator('.trait-pick:not(.own)').count()) === 5);
await page.keyboard.press('Escape');
// Concept, Essence, Nature and Demeanor from M20's lists (search covers examples and other names)
await page.click('button[aria-label="Choose Nature"]');
await page.fill('.picker-search', 'mad');
await page.click('.trait-pick:has-text("Mad Scientist")');
check('Nature picked', (await page.inputValue('.field:has-text("Nature") input')) === 'Mad Scientist');
await page.click('button[aria-label="Choose Concept"]');
await page.fill('.picker-search', 'geek');
check('Concept found by its examples', (await page.textContent('.trait-pick:not(.own) .trait-pick-name')).trim() === 'Technician');
await page.keyboard.press('Escape');
await page.click('button[aria-label="Choose Essence"]');
await page.fill('.picker-search', 'static');
await page.click('.trait-pick:has-text("Pattern")');
check('Essence found by its other name', (await page.inputValue('.field:has-text("Essence") input')) === 'Pattern');
// specialties suggest M20's examples plus ours
await page.click('.tab:has-text("Traits")');
check('specialty suggestions', (await page.getAttribute('.trait-row:has-text("Esoterica") .spec-input', 'list')) === 'spec-Esoterica' && (await page.locator('#spec-Esoterica option[value="Kabbalah"]').count()) === 1);
await page.click('.tab:has-text("Background")');

// a Technocrat gets the Union's names
await page.fill('.field:has-text("Affiliation") input', 'Iteration X');
await page.click('button:has-text("Add background")');
await page.fill('.picker-search', 'sanc');
check('Technocratic names', (await page.textContent('.trait-pick-name')).startsWith('Laboratory'));
await page.keyboard.press('Escape');
// Focus: M20's paradigms, practices and instruments fill tidy lines, free text stays possible
await page.click('.tab:has-text("Magick")');
const focusBlock = '.block:has(.block-title:text-is("Focus"))';
const pickIn = async (part, name) => {
  await page.click(`${focusBlock} button:has-text("${part}")`);
  await page.click(`.trait-pick:has(.trait-pick-name:text-is("${name}"))`);
};
await pickIn('Paradigm', 'Everything is Data');
await pickIn('Practice', 'Reality Hacking');
await pickIn('Paradigm', 'Tech Holds All Answers');
await page.click(`${focusBlock} button:has-text("Instruments")`);
for (const n of ['Computers and IT Gear', 'Thought Forms', 'Computers and IT Gear']) await page.click(`.trait-pick:has(.trait-pick-name:text-is("${n}"))`);
await page.fill('.picker-search', 'Lucky socks');
await page.click('.trait-pick.own');
await page.keyboard.press('Escape');
const focusLines = await page.$$eval(`${focusBlock} input`, (is) => is.map((i) => i.value));
check(
  'Focus picks fill and update lines',
  focusLines.join(' | ') === 'Paradigm: Tech Holds All Answers | Practice: Reality Hacking | Instruments: Thought Forms; Lucky socks',
  focusLines.join(' | '),
);
// a narrow phone (320px) in edit mode: nothing may push the page wider than the screen
await page.setViewportSize({ width: 320, height: 760 });
for (const tab of ['Magick', 'Traits', 'Background', 'Notes']) {
  await page.click(`.tab:has-text("${tab}")`);
  await page.waitForTimeout(150);
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`320px edit mode fits: ${tab}`, wide <= 0, `${wide}px too wide`);
}
// a Sphere's specialty and affinity sit on their own line under the dots, not squeezed beside them
await page.click('.tab:has-text("Magick")');
check('320px: Sphere edit line under the dots', await page.$eval('.sphere-row', (r) => r.querySelector('.sphere-edit').getBoundingClientRect().top >= r.querySelector('.dots').getBoundingClientRect().bottom - 2));
// the affinity Sphere: one at most, and it can be taken away again
const affinityBox = (s) => `.sphere-row:has-text("${s}") .sphere-edit input[type=checkbox]`;
const affinities = () => page.$$eval('.sphere-row .sphere-edit input[type=checkbox]', (is) => is.filter((i) => i.checked).length);
await page.check(affinityBox('Forces'));
await page.check(affinityBox('Prime'));
check('one affinity Sphere at most', (await affinities()) === 1 && (await page.isChecked(affinityBox('Prime'))));
await page.uncheck(affinityBox('Prime'));
check('affinity can be cleared', (await affinities()) === 0);
// an empty Notes notebook fills the window exactly: a page a few px taller than the window
// gave a scrollbar with nothing to scroll that wobbled (desktop app, 1795x960)
await page.click('.lock');
await page.setViewportSize({ width: 1300, height: 960 });
await page.click('.tab:has-text("Notes")');
await page.waitForTimeout(200);
const notesOver = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
check('Notes notebook fits the window, no stray scrollbar', notesOver === 0, `${notesOver}px over`);
await page.click('.tab:has-text("Magick")');
await page.click('.lock');
await page.setViewportSize({ width: 390, height: 844 });
await page.click('.lock');

// a Galaxy Z Flip (344px): the scrolled-away mini bar keeps its pills and chevron on one line,
// even with the longest health status
await page.setViewportSize({ width: 344, height: 760 });
await page.click('.sheet-title .vitals-bar');
const levels = ['Bruised', 'Hurt', 'Injured', 'Wounded', 'Mauled', 'Crippled', 'Incapacitated'];
for (const l of levels) await page.click(`.vitals-panel [aria-label^="${l}"]`);
await page.click('.sheet-title .vitals-bar');
await page.mouse.wheel(0, 1200);
await page.waitForSelector('.vitals-fixed');
await page.waitForTimeout(300);
const mini = await page.$eval('.vitals-fixed .vitals-bar', (bar) => {
  const mid = (el) => { const r = el.getBoundingClientRect(); return (r.top + r.bottom) / 2; };
  return { spread: Math.abs(mid(bar.querySelector('.vitals-toggle')) - mid(bar.querySelector('.chip'))), right: bar.getBoundingClientRect().right };
});
check('344px: mini bar on one line', mini.spread < 4 && mini.right <= 344, JSON.stringify(mini));
await page.evaluate(() => scrollTo(0, 0));
await page.click('.sheet-title .vitals-bar');
for (const l of levels) for (let i = 0; i < 3; i++) await page.click(`.vitals-panel [aria-label^="${l}"]`);
// Health and Willpower: the counts end where the boxes end, each Willpower dot sits over its
// box, and side by side both rows of boxes share a bottom line; in play and in edit mode
for (const [w, edit] of [[1300, false], [430, false], [320, false], [320, true], [1300, true]]) {
  if (edit !== !!(await page.$('.vitals-panel .wp-dots .dot-btn'))) await page.click('.lock');
  await page.setViewportSize({ width: w, height: 900 });
  await page.waitForTimeout(150);
  const t = await page.evaluate(() => {
    const panel = document.querySelector('.vitals-panel');
    const all = (sel) => [...panel.querySelectorAll(sel)].map((e) => e.getBoundingClientRect());
    const [hp, wp] = panel.querySelectorAll('.track');
    const end = (track, sel) => Math.round(track.querySelector('.track-status').getBoundingClientRect().right - [...track.querySelectorAll(sel)].at(-1).getBoundingClientRect().right);
    const dots = all('.wp-dots .dot').map((r) => r.left + r.width / 2);
    const boxes = all('.wp-boxes .wp-box').map((r) => r.left + r.width / 2);
    return {
      hpEnd: end(hp, '.health-box'),
      wpEnd: end(wp, '.wp-box'),
      dotsOff: Math.round(Math.max(...dots.map((d, i) => Math.abs(d - boxes[i])))),
      boxes: boxes.length,
      bottoms: Math.round(Math.abs(all('.health-box').at(-1).bottom - all('.wp-box').at(-1).bottom)),
      sideBySide: hp.getBoundingClientRect().top === wp.getBoundingClientRect().top,
      statusEnds: Math.round(hp.querySelector('.track-status').getBoundingClientRect().right - wp.querySelector('.track-status').getBoundingClientRect().right),
      wide: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  check(
    `${w}px${edit ? ', edit mode' : ''}: Health and Willpower line up`,
    t.hpEnd === 0 && t.wpEnd === 0 && t.dotsOff <= 1 && t.boxes === 10 && (t.sideBySide ? t.bottoms <= 1 : t.statusEnds === 0) && t.wide <= 0,
    JSON.stringify(t),
  );
}
await page.click('.lock');
await page.click('.sheet-title .vitals-bar');
await page.setViewportSize({ width: 390, height: 844 });

// phones: a caret beside the portrait in the bottom nav opens the switcher
const navCaret = await page.evaluate(() => {
  const pp = document.querySelector('.nav-char .pp').getBoundingClientRect();
  const c = document.querySelector('.nav-char .nav-caret').getBoundingClientRect();
  return { mid: Math.round(Math.abs(pp.top + pp.height / 2 - (c.top + c.height / 2))), gap: Math.round(c.left - pp.right) };
});
check('390px: caret beside the nav portrait', navCaret.mid <= 1 && navCaret.gap >= -1 && navCaret.gap <= 4, JSON.stringify(navCaret));
await page.click('.nav-char .nav-caret');
check('nav caret opens the switcher', await page.isVisible('.switch-menu'));
await page.keyboard.press('Escape');
await page.waitForSelector('.switch-menu', { state: 'hidden' });
// the sheet's Characters button is a pill like the menu button beside the actions
const btnLook = (sel) => page.$eval(sel, (e) => { const st = getComputedStyle(e); return [st.borderStyle, st.borderRadius, st.height].join(); });
check('Characters button is a pill like the menu button', (await btnLook('.switch-btn')) === (await btnLook('.sheet-actions .menu summary')), await btnLook('.switch-btn'));
// edit mode opens Health and Willpower; Done folds them away again
const vitalsShown = () => page.isVisible('.sheet-hero + .vitals-panel');
const shownBefore = await vitalsShown();
await page.click('.lock');
check('edit mode opens Health and Willpower', await vitalsShown());
await page.click('.lock');
check('Done puts the panel back as it was', (await vitalsShown()) === shownBefore);

// on the live site, /blank-sheet (a Pages Function) hands over Mr. Gone's blank sheet
if (!/localhost|127\.0\.0\.1/.test(BASE)) {
  const r = await page.evaluate(async () => {
    const res = await fetch('/blank-sheet');
    const buf = new Uint8Array(await res.arrayBuffer());
    return { status: res.status, type: res.headers.get('content-type'), size: buf.length, head: String.fromCharCode(...buf.slice(0, 5)) };
  });
  check('blank sheet function serves the PDF', r.status === 200 && /pdf/.test(r.type) && r.head === '%PDF-' && r.size > 1_000_000, JSON.stringify(r));
}

// on the live site, /s/<spell id> is a link with a preview card for other apps
if (!/localhost|127\.0\.0\.1/.test(BASE)) {
  const html = await page.evaluate(async () => (await fetch('/s/forces-3')).text());
  check('spell link preview card', /og:title" content="Forces 3:/.test(html) && /url=\/#\/library\/forces-3/.test(html));
}

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

// with the service worker in control, a shared spell link still reaches the server's
// preview page and opens that spell (the worker used to answer it with the app shell)
if (!/localhost|127\.0\.0\.1/.test(BASE)) {
  await page.goto(`${BASE}/s/forces-3`);
  await page.waitForSelector('.detail-name', { timeout: 10000 }).catch(() => {});
  check('spell link opens the spell in the installed app', /^Forces 3/.test((await page.textContent('.detail-name').catch(() => '')) ?? ''), page.url());
  await page.goto(`${BASE}/#/characters`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.sheet-name');
}

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
check('the menu button says it is open', (await page.getAttribute('.switch-btn', 'aria-expanded')) === 'true');
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

// Android: a tap on Import opens the system picker (a label around a real input, not a
// script click on a hidden one), with no type filter that would grey out .json files
const droid = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-F731B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
});
const ap = await droid.newPage();
await ap.goto(`${BASE}/#/characters`, { waitUntil: 'networkidle' });
const [chooser] = await Promise.all([ap.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null), ap.tap('.welcome .file-pick:has-text("Import")')]);
check('Android: a tap on Import opens the file picker', chooser !== null);
check('Android: no type filter on the picker', (await ap.getAttribute('.welcome .file-pick input', 'accept')) === null);
// but photos keep image/*: without it Android offers camera and files instead of the gallery
await ap.fill('.welcome .add-row .text-input', 'Droid test');
await ap.click('.welcome button:has-text("Add")');
await ap.waitForSelector('.sheet-name');
await ap.click('.lock');
check('Android: the portrait picker opens the gallery (image/*)', (await ap.getAttribute('.portrait-btn input', 'accept')) === 'image/*');
await ap.click('.lock');
await ap.click('.nav-item:has-text("Spell ideas")');
check('Android: the rulebook picker keeps its PDF filter', /pdf/.test((await ap.getAttribute('.books-panel .file-pick:has-text("Add a PDF") input', 'accept')) ?? ''));
await droid.close();

// desktop layout
const desk = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await desk.goto(BASE, { waitUntil: 'networkidle' });
const barPos = await desk.$eval('.app-header', (n) => getComputedStyle(n).position);
const navInBar = await desk.$eval('.app-nav', (n) => n.closest('.app-header') !== null && getComputedStyle(n).position === 'static');
check('desktop: compact sticky bar with the nav inside it', barPos === 'sticky' && navInBar, barPos);
await desk.evaluate(() => scrollTo(0, 600));
check('desktop bar stays on top while scrolling', (await desk.$eval('.app-header', (n) => Math.round(n.getBoundingClientRect().top))) === 0);
await desk.evaluate(() => scrollTo(0, 0));
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
