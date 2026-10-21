// Spell dossiers: start one from a library effect and one by name, edit the plan
// (Spheres, difficulty, notes), try another way and switch back, link an effect, log a
// casting, persistence, the list and the sheet's block, deleting. Needs no PDF sheet.
// Needs `npm run preview` on :4173 (or BASE=...).
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';

const BASE = process.env.BASE ?? 'http://localhost:4173';
await mkdir('shots', { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
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
// the dark pill buttons (Copy for AI and Paste the answer too) are as tall as the sheet's (30px)
const pills = await page.$$eval('.dossier .btn', (bs) => bs.filter((b) => b.offsetParent).map((b) => [b.classList.contains('btn-gold'), Math.round(b.getBoundingClientRect().height), b.textContent.trim()]));
check('dossier: dark pills 30px, gold 44px', pills.length > 3 && pills.every(([gold, h]) => h === (gold ? 44 : 30)), JSON.stringify(pills));
check('Copy for AI and Paste the answer are small dark pills', pills.filter(([gold, h, t]) => !gold && h === 30 && /Copy for AI|Paste the answer/.test(t)).length === 2);
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
// Spheres are round: a disc with a ring whose lit arcs follow the rank; five and four on a
// phone, nine in a row from 600px
const spheresLook = async () =>
  page.$$eval('.version-spheres .sphere-btn', (bs) =>
    bs.map((b) => {
      const d = b.querySelector('.sphere-disc').getBoundingClientRect();
      return { round: Math.abs(d.width - d.height) < 1 && getComputedStyle(b.querySelector('.sphere-disc')).borderRadius === '50%', lit: b.querySelectorAll('.sphere-ring .lit').length, top: Math.round(d.top) };
    }),
  );
let look = await spheresLook();
const rows = (l) => [...new Set(l.map((x) => x.top))].length;
check('Sphere buttons are round discs', look.every((x) => x.round));
check('ring lights one arc per rank', look[4].lit === 1 && look[1].lit === 0, JSON.stringify(look.map((x) => x.lit)));
check('390px: Spheres in two rows', rows(look) === 2, String(rows(look)));
await page.setViewportSize({ width: 700, height: 900 });
look = await spheresLook();
check('700px: Spheres in one row', rows(look) === 1, String(rows(look)));
await page.setViewportSize({ width: 390, height: 844 });
// fields: one line is a pill, more lines get the softer corner (--r-area)
const fieldLook = await page.evaluate(() => {
  const one = document.querySelector('.text-input');
  const area = document.querySelector('.dossier .text-area');
  return { pill: parseFloat(getComputedStyle(one).borderTopLeftRadius) >= one.getBoundingClientRect().height / 2, area: getComputedStyle(area).borderTopLeftRadius };
});
check('single-line fields are pills, text areas softly rounded', fieldLook.pill && fieldLook.area === '16px', JSON.stringify(fieldLook));
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
await page.click('button:has-text("Link a spell")');
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

// Copy for AI: one prompt with the mage, the idea, the linked effects and the question
await page.click('button:has-text("Copy for AI")');
await page.fill('.modal textarea', 'Two Men in Black at the far end of the platform.');
await page.click('.pack-preview summary');
const pack = await page.textContent('.pack-preview pre');
check('pack has the mage', pack.includes(`# A spell for ${name}`) && /Forces 3/.test(pack));
check('pack has the plan and difficulty', pack.includes('Gas leak fireball') && /Base difficulty \d coincidental/.test(pack));
check('pack has the linked effects with pages', pack.includes(effectName) && /p\. \d+/.test(pack));
check('pack has the log and the question', pack.includes('botched, +3 Paradox') && pack.includes('Two Men in Black'));
check('pack asks for the JSON block', pack.includes('"agathon": "version"'));
check('private notes left out by default', !(await page.isChecked('.pack-options .check:has-text("private notes") input')));
await page.uncheck('.pack-options .check:has-text("Linked library") input');
check('library toggle drops the effects', !(await page.textContent('.pack-preview pre')).includes('Related spells from my library'));
await page.check('.pack-options .check:has-text("Linked library") input');
await page.click('.modal button:has-text("Copy the prompt")');
check('prompt copied', (await page.evaluate(() => navigator.clipboard.readText())).includes('Two Men in Black'));
check('size shown', /about \d+ words/.test(await page.textContent('.pack-preview summary')));
await page.click('.modal button:has-text("Close")');

// share the idea: the link (/i/...) carries it, other apps show its title and goal, and
// a second device adds a copy. vite preview has no Pages Functions, so locally the test
// opens the app link that the preview page forwards to.
const ideaTitle = await page.inputValue('.dossier-title');
await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
await page.click('.dossier .share-btn');
await page.waitForTimeout(300);
const ideaLink = await page.evaluate(() => navigator.clipboard.readText());
check('spell idea share link', ideaLink.startsWith(`${BASE}/i/1.`), ideaLink.slice(0, 60));
const live = !/localhost|127\.0\.0\.1/.test(BASE);
if (live) {
  const html = await (await fetch(ideaLink)).text();
  check('spell idea link preview', html.includes(`og:title" content="Spell idea: ${ideaTitle}`), (html.match(/og:title" content="([^"]*)"/) || [])[1]);
}
const other = await browser.newContext({ viewport: { width: 390, height: 844 } });
const op = await other.newPage();
await op.goto(live ? ideaLink : `${BASE}/#import-spell=${ideaLink.split('/i/')[1]}`);
await op.waitForSelector('.modal');
await op.fill('.modal input', 'Second Device');
await op.click('.modal button:has-text("Add spell idea")');
await op.waitForSelector('.dossier-title');
check('shared idea arrives on another device', (await op.inputValue('.dossier-title')) === ideaTitle, await op.inputValue('.dossier-title'));
await other.close();

// Paste the answer: the JSON block becomes a version, junk is filtered out
await page.click('button:has-text("Paste the answer")');
check('paste box has focus, ready for Ctrl+V', await page.evaluate(() => document.activeElement?.classList.contains('paste-area')));
await page.fill('.paste-area', 'Nice idea, but no plan block here.');
await page.click('.modal button:has-text("Add as a new version")');
check('no block: explains', /no plan block/.test(await page.textContent('.paste-error')));
// a giant paste of stray braces is read in a moment, not frozen on
const t0 = Date.now();
await page.fill('.paste-area', '{'.repeat(300000));
await page.click('.modal button:has-text("Add as a new version")');
await page.waitForSelector('.paste-error');
check('giant garbage paste answers quickly', Date.now() - t0 < 5000, `${Date.now() - t0} ms`);
const answer = [
  'Use Forces 4 for a bigger blast, keep Prime 2.',
  '```json',
  '{"agathon": "version", "title": "Old Pipes, New Fire", "goal": "A gas main gives way right under the van.", "spheres": {"forces": 4, "Prime": "2", "Fire": 3, "Matter": 9}, "how": "Hairspray, a lighter, a whispered word", "coincidental": "Blame the old gas pipes", "notes": "Witnesses make it vulgar", "evil": "<script>"}',
  '```',
].join('\n');
const titleBefore = await page.inputValue('.dossier-title');
const goalBefore = await page.inputValue('.dossier textarea[placeholder^="In your own words"]');
await page.fill('.paste-area', answer);
// the AI's name and goal come with a checkbox each; take the name, keep our own goal
await page.waitForSelector('.paste-suggest');
const suggest = await page.textContent('.paste-suggest');
check('AI suggests a name and a goal', /Old Pipes, New Fire/.test(suggest) && /gas main gives way/.test(suggest), suggest);
await page.uncheck('.paste-suggest .check:has-text("What should happen") input');
await page.click('.modal button:has-text("Add as a new version")');
await page.waitForSelector('.modal', { state: 'detached' });
check('answer becomes the plan, marked from AI', (await page.textContent('.dossier-main .version-head')).includes('from AI'));
check('the AI name is taken', (await page.inputValue('.dossier-title')) === 'Old Pipes, New Fire', await page.inputValue('.dossier-title'));
check('an unticked goal stays ours', (await page.inputValue('.dossier textarea[placeholder^="In your own words"]')) === goalBefore);
// back to our own name for the rest of the checks
await page.fill('.dossier-title', titleBefore);
const aiSpheres = await page.$$eval('.dossier-main > .version .version-spheres .sphere-btn.on', (bs) => bs.map((b) => b.getAttribute('aria-label')).join());
check('only known Spheres and ranks 1-5', aiSpheres === 'Forces 4,Prime 2', aiSpheres);
check('plan fields from the answer', (await page.inputValue('.dossier-main .version label:has-text("Keeping it coincidental") textarea')) === 'Blame the old gas pipes');
await page.click('.dossier-main .ai-reply summary');
check('whole answer kept', (await page.textContent('.dossier-main .ai-reply .prose')).includes('bigger blast'));

// Gemini's way: no fences, spread over lines, its own label in "agathon"
const gemini = `{
  "agathon": "Version 2 (Optimized Network Trace)",
  "spheres": {
    "Correspondence": 3,
    "Prime": 3
  },
  "how": "Saito runs a custom network diagnostics tool on a mainframe.",
  "coincidental": "Entirely coincidental. To any observer, Saito is merely a highly skilled data scientist.",
  "notes": "A botch might trigger a digital Paradox Flaw {or worse}."
}`;
await page.click('button:has-text("Paste the answer")');
await page.fill('.paste-area', gemini);
await page.click('.modal button:has-text("Add as a new version")');
await page.waitForSelector('.modal', { state: 'detached', timeout: 3000 }).catch(() => {});
const geminiSpheres = await page.$$eval('.dossier-main > .version .version-spheres .sphere-btn.on', (bs) => bs.map((b) => b.getAttribute('aria-label')).join());
check('Gemini-style block (no fences, own label) read', geminiSpheres === 'Correspondence 3,Prime 3', geminiSpheres);

// an AI that invents its own shape: Spheres nested under mechanics.spheres_required
const ownShape = `{
  "spell_name": "Traceroute Prime Leakage",
  "caster": "Saito Weinberg",
  "paradigm": "Everything is Data",
  "mechanics": {
    "intent": "Detect, isolate, and trace raw Quintessence anomalies in the local execution layer.",
    "spheres_required": { "Correspondence": 3, "Prime": 1 },
    "system_bottleneck": "None (Caster Correspondence 4 exceeds required Rank 3)",
    "base_difficulty": { "coincidental": 6, "vulgar_without_witnesses": 7, "vulgar_with_witnesses": 8 }
  },
  "execution_modifiers": { "instrument_bonus": { "instrument": "Mainframe terminal", "difficulty_modifier": -1 }, "minimum_difficulty_floor": 3 }
}`;
await page.click('button:has-text("Paste the answer")');
await page.fill('.paste-area', ownShape);
// its "spell_name" is offered as a name; keep ours this time
await page.waitForSelector('.paste-suggest');
check('a name under another key is offered too', /Traceroute Prime Leakage/.test(await page.textContent('.paste-suggest')));
await page.uncheck('.paste-suggest .check:has-text("Name") input');
await page.click('.modal button:has-text("Add as a new version")');
await page.waitForSelector('.modal', { state: 'detached', timeout: 3000 }).catch(() => {});
const nestedSpheres = await page.$$eval('.dossier-main > .version .version-spheres .sphere-btn.on', (bs) => bs.map((b) => b.getAttribute('aria-label')).join());
check('nested Spheres found (spheres_required)', nestedSpheres === 'Correspondence 3,Prime 1', nestedSpheres);
check('nearest text fields used', (await page.inputValue('.dossier-main > .version label:has-text("How it looks") textarea')).startsWith('Detect, isolate'));

// everything survives a reload
await page.waitForTimeout(500);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('.dossier');
check('title persists', (await page.inputValue('.dossier-title')) === 'Gas leak fireball');
check('goal persists', (await page.inputValue('.dossier label:has-text("What should happen") textarea')) === 'Blow the door, blame the gas.');
check('versions persist', (await page.locator('.old-version').count()) === 4);
check('log persists', (await page.locator('.log-entry').count()) === 1);

// the list and the sheet
await page.click('.back:has-text("Spell ideas")');
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
