import type { Character } from './character';
import type { Effect } from './library/data';

/**
 * Favorite spells: what M20 sheets call rotes. A character's favorites are library
 * effects (`pinned`, by id) plus their own spells that aren't in the library (`rotes`,
 * by name). The sheet's rotes fields carry both: names in, names out.
 */

/** Loose name match: case, spaces and punctuation don't count. */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Split sheet rote lines into library effects (ids) and own spells (names). */
export function splitFavorites(names: string[], effects: Effect[]): { ids: string[]; own: string[] } {
  const byName = new Map<string, Effect>();
  // a rote wins over a feat of the same name
  for (const e of effects) if (!byName.has(norm(e.name)) || e.kind === 'rote') byName.set(norm(e.name), e);
  const ids: string[] = [];
  const own: string[] = [];
  for (const n of names.map((x) => x.trim()).filter(Boolean)) {
    const e = byName.get(norm(n));
    if (e) {
      if (!ids.includes(e.id)) ids.push(e.id);
    } else if (!own.some((o) => norm(o) === norm(n))) own.push(n);
  }
  return { ids, own };
}

/** All favorite spell names of a character: the library ones first, then their own. */
export function favoriteNames(c: Pick<Character, 'pinned' | 'rotes'>, effects: Effect[]): string[] {
  const lib = (c.pinned ?? []).map((id) => effects.find((e) => e.id === id)?.name).filter((n): n is string => !!n);
  return [...lib, ...c.rotes.filter((r) => r.trim() && !lib.some((l) => norm(l) === norm(r)))];
}

/** Names in `b` that `a` doesn't have yet (loosely compared). */
export const addedNames = (a: string[], b: string[]) => b.filter((n) => !a.some((x) => norm(x) === norm(n)));
