import Dexie, { type EntityTable } from 'dexie';
import { newCharacter, type Character } from '../character';

/**
 * Everything the player owns lives in IndexedDB on this device: characters,
 * spell dossiers, the PDF sheet a character was imported from (so it can be
 * filled back in on export), and the page text of their own rulebooks. Nothing
 * leaves the device unless they export or share it.
 */

export interface SpellRecord {
  id: string;
  characterId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

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
}

class AgathonDB extends Dexie {
  characters!: EntityTable<Character, 'id'>;
  spells!: EntityTable<SpellRecord, 'id'>;
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

export async function deleteCharacter(id: string) {
  await db.transaction('rw', db.characters, db.sheetFiles, db.spells, async () => {
    await db.characters.delete(id);
    await db.sheetFiles.delete(id);
    await db.spells.where('characterId').equals(id).delete();
  });
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
