// Build the form-field mapping for Mr. Gone's interactive M20 2-page sheet.
// Most dot checkboxes have meaningless names (dot1..dot566, xdot, xdotm, sdot), so each
// one is assigned to a trait by where it sits: the printed labels and the fixed M20
// layout. The result (field names only, nothing from the PDF itself) is committed as
// src/sheets/mrgone-m20-2page.json.
// Usage: node scripts/build-mrgone-map.mjs <filled or blank sheet.pdf>
import { readFile, writeFile } from 'node:fs/promises';
import { PDFDocument, PDFCheckBox } from 'pdf-lib';

const doc = await PDFDocument.load(await readFile(process.argv[2]));
const form = doc.getForm();
const pages = doc.getPages();
const pageOf = new Map();
pages.forEach((p, i) => {
  for (const ref of p.node.Annots()?.asArray() ?? []) pageOf.set(ref.toString(), i + 1);
});

// every widget with its page and centre in top-down coordinates
const widgets = [];
for (const f of form.getFields()) {
  for (const w of f.acroField.getWidgets()) {
    const r = w.getRectangle();
    const ref = doc.context.getObjectRef(w.dict)?.toString();
    const page = pageOf.get(ref) ?? 1;
    const h = pages[page - 1].getHeight();
    widgets.push({
      name: f.getName(),
      check: f instanceof PDFCheckBox,
      page,
      x: r.x + r.width / 2,
      y: h - (r.y + r.height / 2),
    });
  }
}

const COL = (x) => (x < 220 ? 0 : x < 390 ? 1 : 2);

/** Group checkboxes in a band into rows (by y), each row split into the three columns. */
function dotRows(page, yMin, yMax, xMin = 0, xMax = 9999) {
  const ws = widgets
    .filter((w) => w.check && w.page === page && w.y >= yMin && w.y <= yMax && w.x >= xMin && w.x <= xMax)
    .sort((a, b) => a.y - b.y);
  const rows = [];
  for (const w of ws) {
    const row = rows.find((r) => Math.abs(r.y - w.y) < 4);
    if (row) row.items.push(w);
    else rows.push({ y: w.y, items: [w] });
  }
  return rows.map((r) => {
    const cols = [[], [], []];
    for (const w of r.items.sort((a, b) => a.x - b.x)) cols[COL(w.x)].push(w.name);
    return { y: r.y, cols };
  });
}

/** Text fields in a band, as rows split into columns (sorted by y, then x). */
function textRows(page, yMin, yMax) {
  const ws = widgets
    .filter((w) => !w.check && w.page === page && w.y >= yMin && w.y <= yMax)
    .sort((a, b) => a.y - b.y);
  const rows = [];
  for (const w of ws) {
    const row = rows.find((r) => Math.abs(r.y - w.y) < 5);
    if (row) row.items.push(w);
    else rows.push({ y: w.y, items: [w] });
  }
  return rows.map((r) => {
    const cols = [[], [], []];
    for (const w of r.items) cols[COL(w.x)].push(w.name);
    return cols;
  });
}

const ATTRIBUTES = [
  ['Strength', 'Charisma', 'Perception'],
  ['Dexterity', 'Manipulation', 'Intelligence'],
  ['Stamina', 'Appearance', 'Wits'],
];
const ABILITIES = [
  ['Alertness', 'Crafts', 'Academics'],
  ['Art', 'Drive', 'Computer'],
  ['Athletics', 'Etiquette', 'Cosmology'],
  ['Awareness', 'Firearms', 'Enigmas'],
  ['Brawl', 'Martial Arts', 'Esoterica'],
  ['Empathy', 'Meditation', 'Investigation'],
  ['Expression', 'Melee', 'Law'],
  ['Intimidation', 'Research', 'Medicine'],
  ['Leadership', 'Stealth', 'Occult'],
  ['Streetwise', 'Survival', 'Politics'],
  ['Subterfuge', 'Technology', 'Science'],
];
const SPHERES = [
  ['Correspondence', 'Life', 'Prime'],
  ['Entropy', 'Matter', 'Spirit'],
  ['Forces', 'Mind', 'Time'],
];

const traits = {};
function assign(labels, dots, texts, what) {
  if (dots.length !== labels.length) throw new Error(`${what}: ${dots.length} dot rows, expected ${labels.length}`);
  labels.forEach((row, i) =>
    row.forEach((label, c) => {
      const d = dots[i].cols[c];
      if (d.length !== 5) throw new Error(`${what} ${label}: ${d.length} dots`);
      const spec = texts[i]?.[c];
      traits[label] = { dots: d, specialty: spec?.length === 1 ? spec[0] : undefined };
    }),
  );
}
// bands (top-down y, page 1) taken from the printed label positions
assign(ATTRIBUTES, dotRows(1, 185, 235), textRows(1, 185, 225), 'attributes');
assign(ABILITIES, dotRows(1, 270, 420), textRows(1, 270, 412), 'abilities');
assign(SPHERES, dotRows(1, 440, 490), textRows(1, 440, 480), 'spheres');

const named = (prefix, n, from = 1) => Array.from({ length: n }, (_, i) => `${prefix}${i + from}`);
const has = (n) => widgets.some((w) => w.name === n);

/** "name field + five dots" rows (backgrounds, other traits): the dots on the name's line. */
function namedRows(names, page) {
  return names.map((n) => {
    const t = widgets.find((w) => w.name === n);
    const dots = widgets
      .filter((w) => w.check && w.page === page && Math.abs(w.y - t.y) < 5 && w.x > t.x)
      .sort((a, b) => a.x - b.x)
      .slice(0, 5)
      .map((w) => w.name);
    if (dots.length !== 5) throw new Error(`${n}: ${dots.length} dots`);
    return { name: n, dots };
  });
}

const map = {
  id: 'mrgone-m20-2page',
  title: "Mr. Gone's M20 2-page interactive sheet",
  fieldCount: form.getFields().length,
  text: Object.fromEntries(
    ['name', 'player', 'chronicle', 'nature', 'demeanor', 'essence', 'affiliation', 'sect', 'concept', 'experience'].map(
      (n) => [n, n],
    ),
  ),
  traits,
  arete: named('bpdot', 10),
  willpower: named('willdot', 10),
  willpowerSpent: Array.from({ length: 10 }, (_, i) => `check${i + 1}b`),
  // Quintessence fills qpcheck1, 2, ... clockwise from the dot; Paradox fills qpcheck20, 19, ...
  wheel: named('qpcheck', 20),
  health: named('health', 7),
  backgrounds: namedRows(named('backgrounds', 6), 1),
  otherTraits: [...namedRows(named('othertraits', 7), 1), ...namedRows(named('othertraits', 9, 8), 2)],
  merits: named('Merit', 7).map((n, i) => ({ name: n, cost: `cost${i + 1}` })),
  flaws: named('flaw', 7).map((n, i) => ({ name: n, cost: `cost${i + 8}` })),
  rotes: named('rotes', 8),
  focus: named('focus', 8),
  wonders: [0, 5, 10].map((o) => ({
    name: `wonders${o + 1}`,
    description: [`wonders${o + 2}`, `wonders${o + 3}`, `wonders${o + 4}`, `wonders${o + 5}`],
  })),
  history: ['history1', 'history2', 'history3', 'history4', 'history5', 'history9'],
  goals: ['history6', 'history7', 'history8'],
  description: {
    lines: named('description', 4),
    age: 'description5',
    apparentAge: 'description6',
    sex: 'description7',
    ethnicity: 'description8',
    hair: 'description9',
    eyes: 'description10',
    height: 'description11',
    weight: 'description12',
  },
  gear: named('gear', 4),
  combat: Array.from({ length: 6 }, (_, i) => ({
    weapon: `combat${i + 1}`,
    difficulty: `combat${i + 7}`,
    damage: `combat${i + 13}`,
    range: `combat${i + 19}`,
    rate: `combat${i + 25}`,
    clip: `combat${i + 31}`,
  })),
};

// every field the map names must exist, and no field may be claimed twice
const used = [];
JSON.stringify(map, (_k, v) => {
  if (typeof v === 'string' && has(v)) used.push(v);
  return v;
});
const dup = used.filter((n, i) => used.indexOf(n) !== i);
if (dup.length) throw new Error(`fields mapped twice: ${[...new Set(dup)].join(', ')}`);
const unused = form.getFields().map((f) => f.getName()).filter((n) => !used.includes(n));
console.log(`mapped ${used.length} of ${map.fieldCount} fields`);
if (unused.length) console.log(`unmapped: ${unused.join(' ')}`);

await writeFile('src/sheets/mrgone-m20-2page.json', JSON.stringify(map, null, 1) + '\n');
console.log('wrote src/sheets/mrgone-m20-2page.json');
