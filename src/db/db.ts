import Dexie, { type EntityTable } from 'dexie';

/**
 * Everything the player owns lives in IndexedDB on this device: characters,
 * spell dossiers, and the page text of their own rulebooks. Nothing leaves the
 * device unless they export or share it.
 */

export interface CharacterRecord {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface SpellRecord {
  id: string;
  characterId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

/** Page text extracted from the player's own rulebook PDF (never shipped, never shared). */
export interface BookRecord {
  id: string; // 'M20' | 'HDYDT'
  title: string;
  importedAt: number;
  pages: string[]; // index = PDF page index
}

class AgathonDB extends Dexie {
  characters!: EntityTable<CharacterRecord, 'id'>;
  spells!: EntityTable<SpellRecord, 'id'>;
  books!: EntityTable<BookRecord, 'id'>;

  constructor() {
    super('agathon');
    this.version(1).stores({
      characters: 'id, name, updatedAt',
      spells: 'id, characterId, updatedAt',
      books: 'id',
    });
  }
}

export const db = new AgathonDB();

export const newId = () => crypto.randomUUID();

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
