// Regenerate the README screenshots in docs/ from the preview build (:4173).
// The demo character arrives the way a player would get one: through a share link.
// Nothing personal ends up in the pictures (no imported sheets, no real photos).
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import { deflateRawSync } from 'node:zlib';

const BASE = process.env.BASE ?? 'http://localhost:4173';
await mkdir('docs', { recursive: true });

const traits = {
  Strength: 2, Dexterity: 2, Stamina: 2, Charisma: 3, Manipulation: 2, Appearance: 2, Perception: 3, Intelligence: 4, Wits: 3,
  Alertness: 2, Awareness: 3, Expression: 2, Subterfuge: 1, Crafts: 2, Meditation: 3, Research: 3, Stealth: 1,
  Academics: 3, Cosmology: 2, Enigmas: 3, Esoterica: 4, Occult: 4, Science: 1,
};
const demo = {
  app: 'agathon',
  kind: 'characters',
  version: 1,
  exportedAt: '2026-10-17',
  characters: [
    {
      name: 'De Tovenaar van Salsaborenco',
      concept: 'Hedge-wizard of the old quarter',
      affiliation: 'Order of Hermes',
      essence: 'Questing',
      nature: 'Visionary',
      demeanor: 'Pedagogue',
      traits,
      specialties: { Esoterica: 'Hermetic sigils', Forces: 'Fire and lightning' },
      spheres: { Correspondence: 2, Entropy: 1, Forces: 3, Life: 1, Matter: 1, Mind: 3, Prime: 2, Spirit: 0, Time: 1 },
      affinitySphere: 'Forces',
      arete: 4,
      willpower: 7,
      willpowerSpent: 2,
      quintessence: 6,
      paradox: 2,
      health: ['/', '', '', '', '', '', ''],
      backgrounds: [
        { name: 'Avatar', rating: 3 },
        { name: 'Library', rating: 4 },
        { name: 'Mentor', rating: 2 },
      ],
      merits: [{ name: 'Lucky', rating: 3 }],
      flaws: [{ name: 'Curiosity', rating: 2 }],
      rotes: ['Ward of the Seven Seals', 'Lightning from a clear sky'],
      focus: ['Paradigm: a mechanistic cosmos of Hermetic correspondences', 'Practice: High Ritual Magick', 'Instruments: wands, sigils, Enochian chant'],
    },
  ],
};
const link = `${BASE}/#import=1.${deflateRawSync(Buffer.from(JSON.stringify(demo))).toString('base64url')}`;

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
// keep the "ready to work offline" / update toast out of frame
await ctx.addInitScript(() =>
  document.addEventListener('DOMContentLoaded', () => {
    const st = document.createElement('style');
    st.textContent = '.update-toast { display: none !important; }';
    document.head.append(st);
  }),
);
const settle = async (p, ms = 900) => {
  await p.mouse.move(0, 0);
  await p.waitForTimeout(ms);
};

// seed the demo character (it becomes the active character once its sheet opens)
const d = await ctx.newPage();
await d.goto(link, { waitUntil: 'networkidle' });
await d.waitForSelector('.modal');
await d.click('.modal .btn-gold');
await d.waitForSelector('.sheet-name');

// 1. desktop library: what the Tovenaar can cast, with the one-dot-away section below
await d.click('.nav-item:has-text("Library")');
await d.waitForSelector('.effect-card');
await d.fill('.search-input', 'tag:elemental');
const cast = d.locator('.lib-toggles .check:has-text("can cast") input');
if (!(await cast.isChecked())) await cast.check();
await settle(d);
await d.screenshot({ path: 'docs/screenshot.png' });

// 2. desktop effect detail with the difficulty and the coincidental checklist
await d.goto(`${BASE}/#/library/thunder-punch`, { waitUntil: 'networkidle' });
await d.waitForSelector('.detail');
await settle(d);
await d.screenshot({ path: 'docs/screenshot-detail.png' });
await d.close();

// 3. phone: the sheet, the Sphere search and the character list
const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await m.addInitScript(() =>
  document.addEventListener('DOMContentLoaded', () => {
    const st = document.createElement('style');
    st.textContent = '.update-toast { display: none !important; }';
    document.head.append(st);
  }),
);
const p = await m.newPage();
await p.goto(link, { waitUntil: 'networkidle' });
await p.waitForSelector('.modal');
await p.click('.modal .btn-gold');
await p.waitForSelector('.sheet-name');
await p.evaluate(() => scrollTo(0, 200));
await settle(p);
await p.screenshot({ path: 'docs/screenshot-mobile-sheet.png' });

await p.goto(`${BASE}/#/library`, { waitUntil: 'networkidle' });
await p.waitForSelector('.effect-card');
const castM = p.locator('.lib-toggles .check:has-text("can cast") input');
if (await castM.isChecked()) await castM.uncheck();
for (let i = 0; i < 3; i++) await p.click('.sphere-btn[title="Mind"]');
for (let i = 0; i < 2; i++) await p.click('.sphere-btn[title="Forces"]');
await p.check('.lib-toggles .check:has-text("Allow other") input');
await p.evaluate(() => scrollTo(0, 200));
await settle(p);
await p.screenshot({ path: 'docs/screenshot-mobile-library.png' });

// the character switcher: the one in play first, the tools underneath
await p.goto(`${BASE}/#/characters`, { waitUntil: 'networkidle' });
await p.waitForSelector('.sheet-name');
await p.click('.switch-btn');
await settle(p);
await p.screenshot({ path: 'docs/screenshot-mobile-characters.png' });

await browser.close();
console.log('docs/ screenshots written');
