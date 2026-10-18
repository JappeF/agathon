import type { Character } from './character';
import { requestPersistence, saveSpell } from './db/db';
import type { Effect } from './library/data';
import { newSpell } from './spells';
import { go } from './useHashRoute';

/** Start a spell idea from a library effect (with the way to cast it the player picked). */
export async function startSpellFrom(c: Character, e: Effect, combo: number) {
  const s = newSpell(c.id, e.name, { effect: e.id, spheres: e.combos[combo]?.spheres });
  await saveSpell(s);
  requestPersistence();
  go('spells', s.id);
}
