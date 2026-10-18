import Dexie, { type EntityTable } from 'dexie';
import { newCharacter, type Character } from '../character';
import type { Spell } from '../spells';

/**
 * Everything the player owns lives in IndexedDB on this device: characters,
 * spell dossiers, the PDF sheet a character was imported from (so it can be
 * filled back in on export), and the page text of their own rulebooks. Nothing
 * leaves the device unless they export or share it.
 */

/** The original sheet PDF of a character, kept for export. Never part of a share. */
export interface SheetFileRecord {
  characterId: string;
  sheetId: string;
  fileName: string;
  bytes: ArrayBuffer;
}

/** Page text extracted from the player's own rulebook PDF (never shipped, never shared). */
export interface BookRecord {
  id: string; // 'M20' | 'HDYDT'
  title: string;
  importedAt: number;
  pages: string[]; // index = PDF page index
  /** pdf page = printed page + offset (1 for the DriveThruRPG PDFs) */
  offset?: number;
}

class AgathonDB extends Dexie {
  characters!: EntityTable<Character, 'id'>;
  spells!: EntityTable<Spell, 'id'>;
  sheetFiles!: EntityTable<SheetFileRecord, 'characterId'>;
  books!: EntityTable<BookRecord, 'id'>;

  constructor() {
    super('agathon');
    this.version(1).stores({
      characters: 'id, name, updatedAt',
      spells: 'id, characterId, updatedAt',
      books: 'id',
    });
    // v2: characters hold the full M20 sheet; v1 rows only had a name
    this.version(2)
      .stores({ sheetFiles: 'characterId' })
      .upgrade((tx) =>
        tx
          .table('characters')
          .toCollection()
          .modify((c) => {
            const full = newCharacter(c.id, c.name);
            for (const [k, v] of Object.entries(full)) if (!(k in c)) c[k] = v;
          }),
      );
  }
}

export const db = new AgathonDB();

export const newId = () => crypto.randomUUID();

export async function saveCharacter(c: Character) {
  await db.characters.put({ ...c, updatedAt: Date.now() });
}

export async function saveSpell(s: Spell) {
  await db.spells.put({ ...s, updatedAt: Date.now() });
}

export async function deleteCharacter(id: string) {
  await db.transaction('rw', db.characters, db.sheetFiles, db.spells, async () => {
    await db.characters.delete(id);
    await db.sheetFiles.delete(id);
    await db.spells.where('characterId').equals(id).delete();
  });
}

/**
 * A full copy of a character under a free name ("Saito (copy)", "Saito (copy 2)"):
 * the sheet, its stored PDF and its spell ideas, so a build can be tried out without
 * touching the original.
 */
export async function copyCharacter(c: Character): Promise<Character> {
  const taken = new Set((await db.characters.toArray()).map((x) => x.name.toLowerCase()));
  // a copy of a copy counts on from the original name
  const base = c.name.replace(/ \(copy( \d+)?\)$/, '');
  let name = `${base} (copy)`;
  for (let n = 2; taken.has(name.toLowerCase()); n++) name = `${base} (copy ${n})`;
  const now = Date.now();
  const copy: Character = { ...structuredClone(c), id: newId(), name, createdAt: now, updatedAt: now };
  await db.transaction('rw', db.characters, db.sheetFiles, db.spells, async () => {
    await db.characters.put(copy);
    const sheet = await db.sheetFiles.get(c.id);
    if (sheet) await db.sheetFiles.put({ ...sheet, characterId: copy.id });
    const spells = await db.spells.where('characterId').equals(c.id).toArray();
    await db.spells.bulkPut(spells.map((s) => ({ ...s, id: newId(), characterId: copy.id })));
  });
  return copy;
}

/**
 * Ask the browser not to evict our data under storage pressure (Safari and
 * mobile Chrome do clear "best effort" storage). Called on the first real write;
 * the answer only matters for durability, so failures are ignored.
 */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
