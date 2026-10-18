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

// Paste the answer: the JSON block becomes a version, junk is filtered out
await page.click('button:has-text("Paste the answer")');
await page.fill('.paste-area', 'Nice idea, but no plan block here.');
await page.click('.modal button:has-text("Add as a new version")');
check('no block: explains', /no plan block/.test(await page.textContent('.paste-error')));
const answer = [
  'Use Forces 4 for a bigger blast, keep Prime 2.',
  '```json',
  '{"agathon": "version", "spheres": {"forces": 4, "Prime": "2", "Fire": 3, "Matter": 9}, "how": "Hairspray, a lighter, a whispered word", "coincidental": "Blame the old gas pipes", "notes": "Witnesses make it vulgar", "evil": "<script>"}',
  '```',
].join('\n');
await page.fill('.paste-area', answer);
await page.click('.modal button:has-text("Add as a new version")');
await page.waitForSelector('.modal', { state: 'detached' });
check('answer becomes the plan, marked from AI', (await page.textContent('.dossier-main .version-head')).includes('from AI'));
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
