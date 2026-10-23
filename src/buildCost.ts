import { ABILITY_GROUPS, ATTRIBUTE_GROUPS, type Character } from './character';
import { SPHERES } from './types';

/**
 * What a character would cost in experience, as a rough measure for sizing characters up
 * (NPCs above all); nothing the app enforces. Two numbers:
 *
 * - from scratch: every dot above a starting mage's base (Attributes 1, Arete 1, Willpower
 *   5, the rest 0) at M20's experience prices (pp. 253 and 336): Attribute current x4,
 *   Ability new 3 then current x2, Sphere new 10 then current x8 (x7 for the affinity
 *   Sphere), Arete current x8, Willpower current x1, Background current x3 (M20 has no price
 *   for a new Background, so its first dot counts as 3);
 * - beyond a new mage: what is left after character creation (M20 p. 253) pays for the
 *   cheapest steps: Attributes 7/5/3 and Abilities 13/9/5 (at most 3) to the groups that
 *   need them most, Backgrounds 7, Spheres 6, then 15 freebie points (plus Flaws up to 7,
 *   minus Merits; Attribute 5, Ability 2, Background 1, Sphere 7, Arete 4 up to 3,
 *   Willpower 1) where they save the most experience.
 */
export interface BuildCost {
  rows: { label: string; xp: number }[];
  total: number;
  beyondNew: number;
  merits: number;
  flaws: number;
}

type Kind = 'attribute' | 'ability' | 'sphere' | 'arete' | 'willpower' | 'background';
interface Step {
  kind: Kind;
  /** creation group: an Attribute or Ability category, or '' */
  group: string;
  /** the rating this step starts from */
  from: number;
  xp: number;
  freebies: number;
}

const ROW_LABEL: Record<Kind, string> = {
  attribute: 'Attributes',
  ability: 'Abilities and other traits',
  sphere: 'Spheres',
  arete: 'Arete',
  willpower: 'Willpower',
  background: 'Backgrounds',
};

export function buildCost(c: Pick<Character, 'traits' | 'otherTraits' | 'spheres' | 'affinitySphere' | 'arete' | 'willpower' | 'backgrounds' | 'merits' | 'flaws'>): BuildCost {
  const steps: Step[] = [];
  const climb = (kind: Kind, group: string, base: number, to: number, xp: (r: number) => number, freebies: number) => {
    for (let r = Math.max(0, base); r < to; r++) steps.push({ kind, group, from: r, xp: xp(r), freebies });
  };
  for (const g of ATTRIBUTE_GROUPS) for (const t of g.traits) climb('attribute', g.title, 1, c.traits[t] ?? 1, (r) => r * 4, 5);
  const ability = (r: number) => (r === 0 ? 3 : r * 2);
  for (const g of ABILITY_GROUPS) for (const t of g.traits) climb('ability', g.title, 0, c.traits[t] ?? 0, ability, 2);
  for (const t of c.otherTraits) climb('ability', '', 0, t.rating, ability, 2);
  for (const s of SPHERES) climb('sphere', '', 0, c.spheres[s] ?? 0, (r) => (r === 0 ? 10 : r * (c.affinitySphere === s ? 7 : 8)), 7);
  climb('arete', '', 1, c.arete, (r) => r * 8, 4);
  climb('willpower', '', 5, c.willpower, (r) => r, 1);
  for (const b of c.backgrounds) climb('background', '', 0, b.rating, (r) => (r === 0 ? 3 : r * 3), 1);

  const rows = (Object.keys(ROW_LABEL) as Kind[]).map((k) => ({ label: ROW_LABEL[k], xp: steps.filter((s) => s.kind === k).reduce((n, s) => n + s.xp, 0) }));
  const total = rows.reduce((n, r) => n + r.xp, 0);

  // character creation pays for steps first (the lowest dots, so the cheapest), then freebies
  const open = new Set(steps);
  const cover = (pool: Step[], dots: number) => {
    for (const s of [...pool].sort((a, b) => a.from - b.from || a.xp - b.xp)) {
      if (dots <= 0) break;
      if (open.delete(s)) dots--;
    }
    return dots;
  };
  // 7/5/3 and 13/9/5 go to the categories that need the most; Ability dots stop at 3
  const byNeed = (kind: Kind, groups: string[], allowance: number[], limit = Infinity) => {
    const need = groups.map((g) => steps.filter((s) => s.kind === kind && s.group === g && s.from < limit));
    const order = groups.map((_, i) => i).sort((a, b) => need[b].length - need[a].length);
    let left = 0;
    order.forEach((gi, i) => (left += cover(need[gi], allowance[i])));
    return left;
  };
  byNeed('attribute', ATTRIBUTE_GROUPS.map((g) => g.title), [7, 5, 3]);
  const spare = byNeed('ability', ABILITY_GROUPS.map((g) => g.title), [13, 9, 5], 3);
  cover(steps.filter((s) => s.kind === 'ability' && s.group === '' && s.from < 3), spare); // other traits share what is left
  cover(steps.filter((s) => s.kind === 'background'), 7);
  cover(steps.filter((s) => s.kind === 'sphere'), 6);
  const merits = c.merits.reduce((n, m) => n + m.rating, 0);
  const flaws = c.flaws.reduce((n, f) => n + f.rating, 0);
  let freebies = Math.max(0, 15 + Math.min(flaws, 7) - merits);
  const buyable = [...open].filter((s) => s.kind !== 'arete' || s.from < 3).sort((a, b) => b.xp / b.freebies - a.xp / a.freebies);
  for (const s of buyable) {
    if (s.freebies > freebies) continue;
    freebies -= s.freebies;
    open.delete(s);
  }
  const beyondNew = [...open].reduce((n, s) => n + s.xp, 0);
  return { rows, total, beyondNew, merits, flaws };
}
