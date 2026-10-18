import { newCharacter, type Character } from './character';
import { db, newId, requestPersistence, saveCharacter } from './db/db';
import { MRGONE_SHEET_ID, readMrGone, sheetPart, diffSheet, writeMrGone, PORTRAIT_BOX, type SheetFields } from './sheets/mrgone';
import { imageToPortrait, portraitFromPdf, portraitJpeg, type SheetPortrait } from './portrait';
import { loadEffects } from './library/data';
import { addedNames, favoriteNames, splitFavorites } from './favorites';

export interface PendingImport {
  fields: SheetFields;
  bytes: ArrayBuffer;
  fileName: string;
  /** Existing character this sheet would update (same name, or the one re-imported into). */
  target?: Character;
  changes: string[];
  /** the picture found in the PDF, ready to use */
  portrait?: string;
  /** library effects named in the sheet's rotes, to add to the favorite spells */
  favorites: string[];
  /** the sheet's other rotes: the character's own favorite spells */
  ownFavorites: string[];
}

/** Read a sheet file and work out whether it is new or an update of `target` / a same-named character. */
export async function prepareImport(file: File, target?: Character): Promise<PendingImport> {
  const bytes = await file.arrayBuffer();
  const fields = await readMrGone(bytes);
  let match = target;
  if (!match && fields.name) {
    const all = await db.characters.toArray();
    match = all.find((c) => c.name.trim().toLowerCase() === fields.name.toLowerCase());
  }
  let portrait: string | undefined;
  try {
    const img = await portraitFromPdf(bytes);
    if (img) portrait = await imageToPortrait(img);
  } catch {
    // a sheet without a readable picture is fine
  }
  // the sheet's rotes are our favorite spells: names from the library become library
  // favorites, the rest stay the character's own. An import only adds favorites.
  const effects = await loadEffects();
  const { ids, own } = splitFavorites(fields.rotes, effects);
  fields.rotes = [...(match?.rotes ?? []), ...addedNames(match?.rotes ?? [], own)];
  const changes = match ? diffSheet(sheetPart(match), fields) : [];
  if (match) {
    const before = favoriteNames(match, effects);
    const after = favoriteNames({ pinned: [...new Set([...(match.pinned ?? []), ...ids])], rotes: fields.rotes }, effects);
    for (const n of addedNames(before, after)) changes.push(`Favorite spells: + ${n}`);
  }
  if (match && !match.portrait && portrait) changes.push('Portrait: taken from the PDF');
  return { fields, bytes, fileName: file.name, target: match, changes, portrait, favorites: ids, ownFavorites: own };
}

/** Save an import: update the target (keeping its id, notes and spells) or create a new character. */
export async function applyImport(p: PendingImport, asNew = false): Promise<Character> {
  const base = !asNew && p.target ? p.target : newCharacter(newId(), p.fields.name || 'Unnamed mage');
  const c: Character = {
    ...base,
    ...p.fields,
    id: base.id,
    createdAt: base.createdAt,
    notes: base.notes,
    name: p.fields.name || base.name,
    // the PDF's picture is used when there is none yet; a portrait set in the app stays
    portrait: base.portrait ?? p.portrait,
    pinned: [...new Set([...(base.pinned ?? []), ...p.favorites])],
    rotes: [...base.rotes, ...addedNames(base.rotes, p.ownFavorites)],
    sheet: { id: MRGONE_SHEET_ID, fileName: p.fileName, importedAt: Date.now() },
  };
  await db.transaction('rw', db.characters, db.sheetFiles, async () => {
    await saveCharacter(c);
    await db.sheetFiles.put({ characterId: c.id, sheetId: MRGONE_SHEET_ID, fileName: p.fileName, bytes: p.bytes });
  });
  requestPersistence();
  return c;
}

export function download(data: BlobPart, fileName: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

const safeName = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '').trim() || 'character';

/**
 * Fill the character into its sheet PDF and download it. Uses the PDF it was imported
 * from; for characters made in the app the player picks a blank Mr. Gone sheet.
 */
/**
 * The blank sheet a player picked once, kept under this id in `sheetFiles` and used for
 * every character made in the app. We can't ship it (it carries the publisher's logo and
 * Mr. Gone's work, with no terms for hosting it elsewhere) and his server doesn't allow
 * fetching it from the app, so the player downloads it once from MRGONE_BLANK_URL.
 */
const BLANK_ID = '__blank__';
export const MRGONE_BLANK_URL = 'https://mrgone.rocksolidshells.com/pdf/M20/M20_2-Page_Interactive.pdf';

/**
 * The app's portrait for the sheet, or nothing when the sheet already shows it. A sheet
 * without a picture gets one in PORTRAIT_BOX; a sheet whose picture differs from the
 * app's (changed in the app, or another PDF) gets it swapped, cropped to the old one's
 * shape. "The same" means the app portrait is exactly what import makes of the PDF's
 * picture; an encoder that changed since only costs a needless (lookalike) swap.
 */
async function sheetPortrait(c: Character, bytes: ArrayBuffer): Promise<SheetPortrait | undefined> {
  if (!c.portrait) return undefined;
  const inPdf = await portraitFromPdf(bytes).catch(() => null);
  if (!inPdf) return portraitJpeg(c.portrait, PORTRAIT_BOX);
  if ((await imageToPortrait(inPdf)) === c.portrait) return undefined;
  const bmp = await createImageBitmap(inPdf);
  const box = { width: bmp.width, height: bmp.height };
  bmp.close();
  return portraitJpeg(c.portrait, box);
}

/** No PDF to fill in: the character wasn't imported and no blank sheet was picked yet. */
export class NoSheetError extends Error {}

export async function exportPdf(c: Character, blankSheet?: File): Promise<string[]> {
  const stored = (await db.sheetFiles.get(c.id)) ?? (await db.sheetFiles.get(BLANK_ID));
  const bytes = blankSheet ? await blankSheet.arrayBuffer() : stored?.bytes;
  if (!bytes) throw new NoSheetError();
  if (blankSheet) await readMrGone(bytes); // throws a friendly error for the wrong file
  const { pdf, warnings } = await writeMrGone(
    bytes,
    // all favorite spells go into the sheet's rotes fields, library ones first
    { ...c, rotes: favoriteNames(c, await loadEffects()) },
    await sheetPortrait(c, bytes),
  );
  download(pdf as Uint8Array<ArrayBuffer>, `${safeName(c.name)}.pdf`, 'application/pdf');
  if (blankSheet) {
    // keep it for every character made in the app on this device, not just this one
    await db.sheetFiles.put({ characterId: BLANK_ID, sheetId: MRGONE_SHEET_ID, fileName: blankSheet.name, bytes });
  }
  return warnings;
}

export const hasSheetFile = async (id: string) => (await db.sheetFiles.get(id)) !== undefined;
