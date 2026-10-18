import { SPHERES, type Sphere } from '../types';
import type { Combo, Effect } from './data';

/**
 * Library search. Free text and quoted phrases (all must match, `-word` excludes),
 * plus operators:
 *   mind:3 forces:2   Sphere ranks: N = at most N, =N exactly, N+ at least, N-M a range
 *   uses:mind,forces  these Spheres plus any others (otherwise a Sphere query means
 *                     "exactly this combination of Spheres")
 *   tag:healing  book:hdydt  kind:rote  is:vulgar  name:portal
 * Technocratic names work too: data: = Correspondence, primal: = Prime, dimsci: = Spirit.
 * Every operator negates with a leading minus (-time:, -tag:combat).
 */

const SPHERE_ALIASES: Record<string, Sphere> = {
  data: 'Correspondence',
  primal: 'Prime',
  pu: 'Prime',
  'primal-utility': 'Prime',
  dimsci: 'Spirit',
  ds: 'Spirit',
  'dimensional-science': 'Spirit',
};

/** A Sphere from an operator name: full name, any prefix of 3+ letters, or a Technocratic alias. */
export function sphereFromName(raw: string): Sphere | null {
  const n = raw.toLowerCase();
  if (SPHERE_ALIASES[n]) return SPHERE_ALIASES[n];
  if (n.length < 3) return null;
  return SPHERES.find((s) => s.toLowerCase().startsWith(n)) ?? null;
}

export interface RankSpec {
  min: number;
  max: number;
}

/** "3" = up to 3, "=3" = exactly 3, "3+" = 3 or more, "2-4" = 2 to 4. */
export function parseRank(v: string): RankSpec | null {
  let m: RegExpExecArray | null;
  if ((m = /^=?([1-5])$/.exec(v))) return v.startsWith('=') ? { min: +m[1], max: +m[1] } : { min: 1, max: +m[1] };
  if ((m = /^([1-5])\+$/.exec(v))) return { min: +m[1], max: 5 };
  if ((m = /^([1-5])-([1-5])$/.exec(v))) return { min: Math.min(+m[1], +m[2]), max: Math.max(+m[1], +m[2]) };
  if (v === '' || v === '*' || v === 'any') return { min: 1, max: 5 };
  return null;
}

export interface SphereOp {
  sphere: Sphere;
  spec: RankSpec;
  neg: boolean;
  raw: string;
}

export interface Query {
  terms: string[];
  excludes: string[];
  nameTerms: string[];
  spheres: SphereOp[];
  /** `uses:` Spheres: these must be in the combo, others are allowed. */
  uses: Sphere[];
  tags: { value: string; neg: boolean }[];
  books: { value: 'M20' | 'HDYDT'; neg: boolean }[];
  kinds: { value: Effect['kind']; neg: boolean }[];
  is: { value: NonNullable<Effect['vulgarity']>; neg: boolean }[];
  /** is:fav (true) or -is:fav (false): the active character's favorite spells */
  pinned?: boolean;
  /** operator chips for the UI, in typing order */
  chips: { label: string; neg: boolean; ok: boolean }[];
}

const normalize = (s: string) => s.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"');

export function parseQuery(raw: string, knownTags: string[]): Query {
  const q: Query = { terms: [], excludes: [], nameTerms: [], spheres: [], uses: [], tags: [], books: [], kinds: [], is: [], chips: [] };
  const chip = (label: string, neg: boolean, ok: boolean) => q.chips.push({ label: `${neg ? 'not ' : ''}${label}`, neg, ok });
  const text = (neg: boolean, t: string) => {
    t = t.replace(/\s+/g, ' ').trim();
    if (t && t !== '-') (neg ? q.excludes : q.terms).push(t);
  };
  const op = (neg: boolean, field: string, value: string): boolean => {
    const sphere = sphereFromName(field);
    if (sphere) {
      const spec = parseRank(value);
      if (!spec) return false;
      q.spheres.push({ sphere, spec, neg, raw: value });
      const r = spec.min === spec.max ? `${spec.min}` : spec.min === 1 ? `up to ${spec.max}` : spec.max === 5 ? `${spec.min}+` : `${spec.min}-${spec.max}`;
      chip(`${sphere} ${value === '' ? 'any' : r}`, neg, true);
      return true;
    }
    switch (field) {
      case 'uses':
      case 'with': {
        const ss = value.split(',').map(sphereFromName);
        if (ss.some((s) => !s)) return false;
        for (const s of ss as Sphere[]) {
          if (neg) q.spheres.push({ sphere: s, spec: { min: 1, max: 5 }, neg: true, raw: '' });
          else q.uses.push(s);
        }
        chip(`uses ${(ss as Sphere[]).join(' + ')}`, neg, true);
        return true;
      }
      case 'tag': {
        const hit = knownTags.find((t) => t === value) ?? knownTags.find((t) => t.startsWith(value));
        if (hit) q.tags.push({ value: hit, neg });
        chip(`tag ${hit ?? value}`, neg, !!hit);
        return true;
      }
      case 'book':
      case 'source': {
        const b = value.startsWith('h') ? 'HDYDT' : value.startsWith('m') ? 'M20' : null;
        if (b) q.books.push({ value: b, neg });
        chip(`book ${b ?? value}`, neg, !!b);
        return true;
      }
      case 'kind':
      case 'type': {
        const k = (['rank', 'feat', 'rote'] as const).find((x) => x.startsWith(value) || (value.startsWith('effect') && x === 'feat'));
        if (k) q.kinds.push({ value: k, neg });
        chip(`kind ${k ?? value}`, neg, !!k);
        return true;
      }
      case 'is': {
        // is:fav (is:favorites, or the older is:pinned): the active character's favorite spells
        if (value && ['favorites', 'pinned'].some((w) => w.startsWith(value))) {
          q.pinned = !neg;
          chip('favorites', neg, true);
          return true;
        }
        const v = (['coincidental', 'vulgar', 'depends'] as const).find((x) => x.startsWith(value));
        if (v) q.is.push({ value: v, neg });
        chip(v ?? value, neg, !!v);
        return true;
      }
      case 'name':
        (neg ? q.excludes : q.nameTerms).push(value);
        return true;
      default:
        return false;
    }
  };
  const re = /(-?)([a-z-]+):"([^"]*)"|(-?)"([^"]*)"|(-?)(\S+)/g;
  let m: RegExpExecArray | null;
  const s = normalize(raw.trim());
  while ((m = re.exec(s))) {
    if (m[2] !== undefined) {
      if (!op(m[1] === '-', m[2], m[3])) text(m[1] === '-', m[3]);
    } else if (m[5] !== undefined) text(m[4] === '-', m[5]);
    else {
      const fm = /^([a-z-]+):(.*)$/.exec(m[7]);
      if (!(fm && op(m[6] === '-', fm[1], fm[2]))) text(m[6] === '-', m[7]);
    }
  }
  return q;
}

/** Character dots for the "what can I cast" filter. */
export type Dots = Record<Sphere, number>;

/** Dots missing for a combo, summed over its Spheres (0 = castable now). */
export function deficit(c: Combo, dots: Dots) {
  let d = 0;
  for (const [s, r] of Object.entries(c.spheres) as [Sphere, number][]) d += Math.max(0, r - (dots[s] ?? 0));
  return d;
}

export const highestRank = (c: Combo) => Math.max(0, ...Object.values(c.spheres).map((r) => r ?? 0));

/** Base difficulty from M20 p. 501: highest Sphere +3 / +4 / +5, never below 3. */
export function difficulties(c: Combo) {
  const h = highestRank(c);
  return { coincidental: Math.max(3, h + 3), vulgar: Math.max(3, h + 4), witnessed: Math.max(3, h + 5), highest: h };
}

function comboMatches(c: Combo, q: Query): boolean {
  const used = Object.keys(c.spheres) as Sphere[];
  for (const op of q.spheres) {
    const r = c.spheres[op.sphere];
    const hit = r !== undefined && r >= op.spec.min && r <= op.spec.max;
    if (op.neg ? hit : !hit) return false;
  }
  for (const s of q.uses) if (c.spheres[s] === undefined) return false;
  // a Sphere query without uses: means exactly these Spheres, nothing else
  const asked = q.spheres.filter((o) => !o.neg).map((o) => o.sphere);
  if (asked.length && !q.uses.length && used.some((s) => !asked.includes(s))) return false;
  return true;
}

export interface Hit {
  effect: Effect;
  /** indexes of the combos that satisfy the Sphere part of the query */
  combos: number[];
  score: number;
  /** with a character: dots missing for the closest combo (0 = castable) */
  missing?: number;
}

const haystacks = new WeakMap<Effect, string>();
const hay = (e: Effect) => {
  let h = haystacks.get(e);
  if (!h) {
    h = [
      e.summary,
      e.system,
      e.coincidentalIf,
      ...e.combos.map((c) => c.note),
      ...(e.optional ?? []).map((o) => o.purpose),
      ...e.tags,
      ...e.source.map((s) => s.section),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    haystacks.set(e, h);
  }
  return h;
};

function textScore(e: Effect, q: Query): number {
  const name = e.name.toLowerCase();
  const body = hay(e);
  for (const x of q.excludes) if (name.includes(x) || body.includes(x)) return 0;
  for (const t of q.nameTerms) if (!name.includes(t)) return 0;
  if (!q.terms.length) return 1;
  let score = 1;
  const plain = q.terms.join(' ');
  if (name === plain) score += 120;
  else if (name.startsWith(plain)) score += 90;
  else if (name.includes(plain)) score += 70;
  for (const t of q.terms) {
    if (name.includes(t)) score += 18;
    else if (body.includes(t)) score += 6;
    else return 0;
  }
  return score;
}

export interface SearchOptions {
  /** the active character's Sphere dots, when "what can I cast" is on */
  castable?: Dots;
  /** ids pinned to the active character, for is:pinned */
  pinned?: Set<string>;
}

/**
 * Filter and rank. With `castable`, returns hits the character can cast now (missing 0)
 * and, separately marked, those one dot out of reach (missing 1).
 */
export function search(effects: Effect[], q: Query, opts: SearchOptions = {}): Hit[] {
  const hits: Hit[] = [];
  const sphereQuery = q.spheres.length > 0 || q.uses.length > 0;
  for (const e of effects) {
    const posKinds = q.kinds.filter((k) => !k.neg);
    if (posKinds.length && !posKinds.some((k) => k.value === e.kind)) continue;
    if (q.kinds.some((k) => k.neg && k.value === e.kind)) continue;
    if (q.tags.some((t) => (t.neg ? e.tags.includes(t.value) : !e.tags.includes(t.value)))) continue;
    const books = e.source.map((s) => s.book);
    const posBooks = q.books.filter((b) => !b.neg);
    if (posBooks.length && !posBooks.some((b) => books.includes(b.value))) continue;
    if (q.books.some((b) => b.neg && books.every((x) => x === b.value))) continue;
    const posIs = q.is.filter((i) => !i.neg);
    if (posIs.length && !posIs.some((i) => i.value === e.vulgarity)) continue;
    if (q.is.some((i) => i.neg && i.value === e.vulgarity)) continue;
    if (q.pinned !== undefined && q.pinned !== !!opts.pinned?.has(e.id)) continue;

    const score = textScore(e, q);
    if (!score) continue;

    let combos = e.combos.map((_, i) => i);
    if (sphereQuery) combos = combos.filter((i) => comboMatches(e.combos[i], q));
    if (!combos.length) continue;

    let missing: number | undefined;
    if (opts.castable) {
      missing = Math.min(...combos.map((i) => deficit(e.combos[i], opts.castable!)));
      if (missing > 1) continue;
      // show the castable combos first, then the near ones
      combos.sort((a, b) => deficit(e.combos[a], opts.castable!) - deficit(e.combos[b], opts.castable!));
    }

    // with a Sphere query, effects that use the asked ranks fully rank above weaker ones
    let fit = 0;
    if (q.spheres.length) {
      const best = Math.max(
        ...combos.map((i) => q.spheres.filter((o) => !o.neg).reduce((n, o) => n + (e.combos[i].spheres[o.sphere] ?? 0), 0)),
      );
      fit = best * 10;
    }
    hits.push({ effect: e, combos, score: score + fit, missing });
  }
  const kindOrder = { rote: 0, feat: 1, rank: 2 };
  hits.sort(
    (a, b) =>
      (a.missing ?? 0) - (b.missing ?? 0) ||
      b.score - a.score ||
      (q.terms.length || q.spheres.length ? 0 : kindOrder[a.effect.kind] - kindOrder[b.effect.kind]) ||
      a.effect.name.localeCompare(b.effect.name),
  );
  return hits;
}

/** Rewrite the rank of one Sphere in the query text (the Sphere bar), or drop it at 0. */
export function setSphereInQuery(raw: string, sphere: Sphere, rank: number): string {
  const parts = raw.split(/\s+/).filter(Boolean);
  const kept = parts.filter((p) => {
    const m = /^([a-z-]+):/i.exec(p);
    return !(m && !p.startsWith('-') && sphereFromName(m[1]) === sphere);
  });
  if (rank > 0) kept.push(`${sphere.toLowerCase()}:${rank}`);
  return kept.join(' ') + (kept.length ? ' ' : '');
}

/** The rank the query asks for a Sphere (its upper bound), 0 if it doesn't. */
export function sphereRankInQuery(q: Query, sphere: Sphere): number {
  const op = q.spheres.find((o) => o.sphere === sphere && !o.neg);
  return op ? op.spec.max : 0;
}
