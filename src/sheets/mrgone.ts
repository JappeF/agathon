import type { PDFDocument, PDFForm } from 'pdf-lib';
import map from './mrgone-m20-2page.json';
import { clampWheel, HEALTH_LEVELS, newCharacter, WHEEL_SIZE, type Character, type HealthMark, type Rated } from '../character';
import { SPHERES, type Sphere } from '../types';

/**
 * Mr. Gone's interactive M20 2-page sheet <-> Character. The field mapping is
 * generated once by scripts/build-mrgone-map.mjs from the field positions.
 * pdf-lib is loaded lazily so it only costs bytes when someone imports or exports.
 */

export const MRGONE_SHEET_ID = map.id;

/** Fields from the parts of a Character that the sheet holds (app-only fields stay). */
export type SheetFields = Omit<Character, 'id' | 'createdAt' | 'updatedAt' | 'notes' | 'sheet' | 'portrait'>;

const loadPdf = async (bytes: ArrayBuffer) => {
  const { PDFDocument } = await import('pdf-lib');
  return PDFDocument.load(bytes, { ignoreEncryption: true });
};

function isMrGone(form: PDFForm) {
  const names = new Set(form.getFields().map((f) => f.getName()));
  return ['bpdot1', 'qpcheck20', 'sdot45', 'willdot10', 'check10b', 'othertraits16', 'combat36'].every((n) => names.has(n));
}

export class SheetFormatError extends Error {}

/** Read a sheet PDF. Throws SheetFormatError when it is not a (fillable) Mr. Gone M20 sheet. */
export async function readMrGone(bytes: ArrayBuffer): Promise<SheetFields> {
  let doc: PDFDocument;
  try {
    doc = await loadPdf(bytes);
  } catch {
    throw new SheetFormatError("This file can't be read as a PDF.");
  }
  const form = doc.getForm();
  if (!isMrGone(form)) {
    throw new SheetFormatError(
      "This isn't a fillable Mr. Gone M20 2-page sheet. Other sheets aren't supported yet.",
    );
  }

  const text = (n: string) => {
    try {
      return (form.getTextField(n).getText() ?? '').trim();
    } catch {
      return '';
    }
  };
  const on = (n: string) => {
    try {
      return form.getCheckBox(n).isChecked();
    } catch {
      return false;
    }
  };
  const count = (names: string[]) => names.filter(on).length;
  const lines = (names: string[]) => names.map(text).filter(Boolean).join('\n');
  const rated = (rows: { name: string; dots: string[] }[]): Rated[] =>
    rows.map((r) => ({ name: text(r.name), rating: count(r.dots) })).filter((r) => r.name || r.rating);
  const costed = (rows: { name: string; cost: string }[]): Rated[] =>
    rows.map((r) => ({ name: text(r.name), rating: parseInt(text(r.cost), 10) || 0 })).filter((r) => r.name);

  // start from a blank character's sheet part only, never its id or timestamps
  const c = newCharacter('', '');
  const out: SheetFields = sheetPart(c);
  for (const [k, field] of Object.entries(map.text)) (out as unknown as Record<string, string>)[k] = text(field);
  // the app keeps experience as a plain number ("4 exp" on a sheet becomes "4")
  out.experience = out.experience.match(/\d+/)?.[0] ?? '';

  out.traits = {};
  out.specialties = {};
  out.spheres = { ...c.spheres };
  out.affinitySphere = undefined;
  for (const [trait, m] of Object.entries(map.traits) as [string, { dots: string[]; specialty?: string }][]) {
    const rating = count(m.dots);
    const spec = m.specialty ? text(m.specialty) : '';
    if ((SPHERES as readonly string[]).includes(trait)) {
      out.spheres[trait as Sphere] = rating;
      // a lone "x" after a Sphere marks the affinity Sphere on these sheets
      if (/^x$/i.test(spec)) out.affinitySphere = trait as Sphere;
      else if (spec) out.specialties[trait] = spec;
    } else {
      out.traits[trait] = rating;
      if (spec) out.specialties[trait] = spec;
    }
  }

  out.arete = count(map.arete);
  out.willpower = count(map.willpower);
  out.willpowerSpent = count(map.willpowerSpent);
  // Quintessence runs clockwise from qpcheck1, Paradox counterclockwise from qpcheck20
  let q = 0;
  while (q < WHEEL_SIZE && on(map.wheel[q])) q++;
  let p = 0;
  while (p < WHEEL_SIZE - q && on(map.wheel[WHEEL_SIZE - 1 - p])) p++;
  Object.assign(out, clampWheel(q, p));
  out.health = map.health.map((n) => {
    try {
      const v = (form.getDropdown(n).getSelected()[0] ?? '').trim();
      return (['/', 'X', '*'].includes(v) ? v : '') as HealthMark;
    } catch {
      return '';
    }
  });

  out.backgrounds = rated(map.backgrounds);
  out.otherTraits = rated(map.otherTraits);
  out.merits = costed(map.merits);
  out.flaws = costed(map.flaws);
  out.rotes = map.rotes.map(text).filter(Boolean);
  out.focus = map.focus.map(text).filter(Boolean);
  out.wonders = map.wonders
    .map((w) => ({ name: text(w.name), description: lines(w.description) }))
    .filter((w) => w.name || w.description);
  out.history = lines(map.history);
  out.goals = lines(map.goals);
  const d = map.description;
  out.description = {
    text: lines(d.lines),
    age: text(d.age),
    apparentAge: text(d.apparentAge),
    sex: text(d.sex),
    ethnicity: text(d.ethnicity),
    hair: text(d.hair),
    eyes: text(d.eyes),
    height: text(d.height),
    weight: text(d.weight),
  };
  out.gear = map.gear.map(text).filter(Boolean);
  out.combat = map.combat
    .map((r) => ({
      weapon: text(r.weapon),
      difficulty: text(r.difficulty),
      damage: text(r.damage),
      range: text(r.range),
      rate: text(r.rate),
      clip: text(r.clip),
    }))
    .filter((r) => Object.values(r).some(Boolean));
  return out;
}

/**
 * Fill the character back into the sheet PDF it came from. Returns the new PDF and
 * a list of things that did not fit (more backgrounds than rows, long text...).
 */
export async function writeMrGone(bytes: ArrayBuffer, c: Character): Promise<{ pdf: Uint8Array; warnings: string[] }> {
  const doc = await loadPdf(bytes);
  const form = doc.getForm();
  const warnings: string[] = [];

  const setText = (n: string, v: string) => {
    try {
      form.getTextField(n).setText(v);
    } catch {
      warnings.push(`Couldn't write "${v.slice(0, 40)}" (unsupported characters?)`);
    }
  };
  const setDots = (names: string[], n: number) =>
    names.forEach((f, i) => (i < n ? form.getCheckBox(f).check() : form.getCheckBox(f).uncheck()));
  /** Spread multi-line text over the sheet's lines; whatever doesn't fit goes on the last line. */
  const setLines = (names: string[], v: string, what: string) => {
    const ls = v.split('\n').map((s) => s.trim()).filter(Boolean);
    if (ls.length > names.length) {
      ls.splice(names.length - 1, Infinity, ls.slice(names.length - 1).join(' '));
      warnings.push(`${what} has more lines than the sheet; the rest is joined on the last line.`);
    }
    names.forEach((n, i) => setText(n, ls[i] ?? ''));
  };
  const fill = <T,>(rows: T[], items: unknown[], what: string, put: (row: T, item: any) => void, clear: (row: T) => void) => {
    if (items.length > rows.length) warnings.push(`Only ${rows.length} of ${items.length} ${what} fit on the sheet.`);
    rows.forEach((r, i) => (i < items.length ? put(r, items[i]) : clear(r)));
  };

  for (const [k, field] of Object.entries(map.text)) setText(field, String((c as unknown as Record<string, string>)[k] ?? ''));
  for (const [trait, m] of Object.entries(map.traits) as [string, { dots: string[]; specialty?: string }][]) {
    const isSphere = (SPHERES as readonly string[]).includes(trait);
    setDots(m.dots, isSphere ? c.spheres[trait as Sphere] : (c.traits[trait] ?? 0));
    if (m.specialty) setText(m.specialty, isSphere && c.affinitySphere === trait ? 'x' : (c.specialties[trait] ?? ''));
  }
  setDots(map.arete, c.arete);
  setDots(map.willpower, c.willpower);
  setDots(map.willpowerSpent, c.willpowerSpent);
  map.wheel.forEach((f, i) =>
    i < c.quintessence || i >= WHEEL_SIZE - c.paradox ? form.getCheckBox(f).check() : form.getCheckBox(f).uncheck(),
  );
  map.health.forEach((f, i) => form.getDropdown(f).select(c.health[i] || ' '));

  const ratedRows = (rows: { name: string; dots: string[] }[], items: Rated[], what: string) =>
    fill(rows, items, what, (r, it: Rated) => (setText(r.name, it.name), setDots(r.dots, it.rating)), (r) => (setText(r.name, ''), setDots(r.dots, 0)));
  ratedRows(map.backgrounds, c.backgrounds, 'backgrounds');
  ratedRows(map.otherTraits, c.otherTraits, 'other traits');
  const costRows = (rows: { name: string; cost: string }[], items: Rated[], what: string) =>
    fill(rows, items, what, (r, it: Rated) => (setText(r.name, it.name), setText(r.cost, it.rating ? String(it.rating) : '')), (r) => (setText(r.name, ''), setText(r.cost, '')));
  costRows(map.merits, c.merits, 'merits');
  costRows(map.flaws, c.flaws, 'flaws');
  const lineRows = (rows: string[], items: string[], what: string) => fill(rows, items, what, (r, it: string) => setText(r, it), (r) => setText(r, ''));
  lineRows(map.rotes, c.rotes, 'rotes');
  lineRows(map.focus, c.focus, 'focus lines');
  lineRows(map.gear, c.gear, 'gear lines');
  fill(
    map.wonders,
    c.wonders,
    'wonders',
    (r, w: Character['wonders'][number]) => (setText(r.name, w.name), setLines(r.description, w.description, `Wonder "${w.name}"`)),
    (r) => (setText(r.name, ''), r.description.forEach((n) => setText(n, ''))),
  );
  setLines(map.history, c.history, 'History');
  setLines(map.goals, c.goals, 'Goals');
  const d = map.description;
  setLines(d.lines, c.description.text, 'Description');
  for (const k of ['age', 'apparentAge', 'sex', 'ethnicity', 'hair', 'eyes', 'height', 'weight'] as const) setText(d[k], c.description[k]);
  fill(
    map.combat,
    c.combat,
    'weapons',
    (r, w: Character['combat'][number]) => (Object.keys(r) as (keyof typeof r)[]).forEach((k) => setText(r[k], w[k])),
    (r) => Object.values(r).forEach((n) => setText(n, '')),
  );

  // Mr. Gone's dot and wheel boxes only carry an "on" look (/Yes); off shows the circle
  // printed on the page. pdf-lib takes the missing "off" look for a fault and would
  // redraw every box in its own square style, so only text fields and drop-downs get
  // fresh appearances and the check boxes are left exactly as the sheet made them.
  //
  // The sheet's text font (Goudy Old Style Bold, auto size) can't be reused, so text is
  // drawn in Times Bold, a close serif, and auto size is capped at 12pt the way Acrobat
  // does it (pdf-lib would fill the whole box: a huge "27" in Experience). Long text
  // shrinks to fit. The field keeps its own DA, so editing it later in a PDF app works
  // as before.
  const { PDFCheckBox, PDFTextField, StandardFonts } = await import('pdf-lib');
  const font = await doc.embedFont(StandardFonts.TimesRomanBold);
  for (const f of form.getFields()) {
    if (f instanceof PDFCheckBox || !f.needsAppearancesUpdate()) continue;
    try {
      if (f instanceof PDFTextField && /\s0 Tf/.test(f.acroField.getDefaultAppearance() ?? '')) {
        const da = f.acroField.getDefaultAppearance()!;
        const text = f.getText() ?? '';
        const box = f.acroField.getWidgets()[0].getRectangle();
        const width = text ? font.widthOfTextAtSize(text, 1) : 0;
        const size = Math.max(4, Math.min(12, box.height * 0.75, width ? (box.width - 4) / width : 12));
        f.setFontSize(Math.round(size * 10) / 10);
        f.defaultUpdateAppearances(font);
        f.acroField.setDefaultAppearance(da);
      } else f.defaultUpdateAppearances(font);
    } catch {
      warnings.push(`Couldn't draw "${f.getName()}" (characters the PDF font lacks?)`);
    }
  }
  return { pdf: await doc.save({ updateFieldAppearances: false }), warnings };
}

/** Human-readable differences between two versions of the sheet part of a character. */
export function diffSheet(a: SheetFields, b: SheetFields): string[] {
  const out: string[] = [];
  const num = (label: string, x: number, y: number) => x !== y && out.push(`${label}: ${x} -> ${y}`);
  const str = (label: string, x: string, y: string) => x !== y && out.push(y ? `${label}: ${x || '(empty)'} -> ${y}` : `${label} cleared`);
  for (const k of ['name', 'player', 'chronicle', 'nature', 'demeanor', 'essence', 'affiliation', 'sect', 'concept', 'experience'] as const)
    str(k[0].toUpperCase() + k.slice(1), a[k], b[k]);
  for (const t of new Set([...Object.keys(a.traits), ...Object.keys(b.traits)])) num(t, a.traits[t] ?? 0, b.traits[t] ?? 0);
  for (const s of SPHERES) num(s, a.spheres[s], b.spheres[s]);
  if (a.affinitySphere !== b.affinitySphere) out.push(`Affinity Sphere: ${a.affinitySphere ?? '(none)'} -> ${b.affinitySphere ?? '(none)'}`);
  num('Arete', a.arete, b.arete);
  num('Willpower', a.willpower, b.willpower);
  num('Willpower spent', a.willpowerSpent, b.willpowerSpent);
  num('Quintessence', a.quintessence, b.quintessence);
  num('Paradox', a.paradox, b.paradox);
  a.health.forEach((m, i) => m !== b.health[i] && out.push(`${HEALTH_LEVELS[i].name}: ${m || 'unmarked'} -> ${b.health[i] || 'unmarked'}`));
  const list = (label: string, x: Rated[], y: Rated[]) => {
    const fmt = (r: Rated[]) => r.map((i) => `${i.name} ${i.rating}`).join(', ');
    if (fmt(x) !== fmt(y)) out.push(`${label}: ${fmt(y) || '(none)'}`);
  };
  list('Backgrounds', a.backgrounds, b.backgrounds);
  list('Other traits', a.otherTraits, b.otherTraits);
  list('Merits', a.merits, b.merits);
  list('Flaws', a.flaws, b.flaws);
  const same = (x: unknown, y: unknown) => JSON.stringify(x) === JSON.stringify(y);
  if (!same(a.specialties, b.specialties)) out.push('Specialties changed');
  if (!same(a.rotes, b.rotes)) out.push('Rotes changed');
  if (!same(a.focus, b.focus)) out.push('Focus changed');
  if (!same(a.wonders, b.wonders)) out.push('Wonders changed');
  if (a.history !== b.history || a.goals !== b.goals) out.push('History or goals changed');
  if (!same(a.description, b.description)) out.push('Description changed');
  if (!same(a.gear, b.gear) || !same(a.combat, b.combat)) out.push('Gear or weapons changed');
  return out;
}

/** The sheet part of a character, for diffing against a fresh import. */
export function sheetPart(c: Character): SheetFields {
  const { id: _id, createdAt: _c, updatedAt: _u, notes: _n, sheet: _s, portrait: _p, ...rest } = c;
  return rest;
}
