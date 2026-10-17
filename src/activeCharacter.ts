import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/db';

// The character in play on this device: the nav, the library's "what can I cast" filter
// and new spell ideas use it. A per-device convenience, so localStorage is fine.
const KEY = 'agathon:active-character';
const EVENT = 'agathon:active-character';

export function getActiveCharacter(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setActiveCharacter(id: string) {
  if (getActiveCharacter() === id) return;
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // storage blocked (private mode): the app just won't remember the choice
  }
  window.dispatchEvent(new Event(EVENT));
}

/**
 * All characters (most recently changed first) and the active one. Falls back to the
 * most recent character when none was picked yet or the picked one was deleted.
 */
export function useActiveCharacter() {
  const [id, setId] = useState(getActiveCharacter);
  useEffect(() => {
    const sync = () => setId(getActiveCharacter());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  const characters = useLiveQuery(() => db.characters.orderBy('updatedAt').reverse().toArray(), []);
  const active = characters?.find((c) => c.id === id) ?? characters?.[0];
  return { characters, active };
}
