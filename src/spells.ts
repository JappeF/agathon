import type { Combo } from './library/data';
import { SPHERES, type Sphere } from './types';

/**
 * A spell idea ("dossier") of one character: what the player wants to happen, the
 * library effects it builds on, its versions (how the mage would do it) and how it
 * went at the table. A sounding board, not a rules engine: rolls happen outside.
 */
export interface Spell {
  id: string;
  characterId: string;
  createdAt: number;
  updatedAt: number;
  title: string;
  /** what should happen, in the player's own words */
  goal: string;
  /** linked library effects (ids) */
  effects: string[];
  /** oldest first; the last one is the current plan */
  versions: SpellVersion[];
  log: CastLog[];
}

export interface SpellVersion {
  id: string;
  createdAt: number;
  spheres: Partial<Record<Sphere, number>>;
  /** focus, instruments, words and gestures: what it looks like */
  how: string;
  /** how to keep it coincidental (or why it is vulgar anyway) */
  coincidental: string;
  notes: string;
  /** where it came from: written here or pasted back from an AI */
  source: 'me' | 'ai';
  /** the AI's whole answer, kept with a version that came from one */
  reply?: string;
}

export type Outcome = 'worked' | 'partly' | 'failed' | 'botched';

export const OUTCOMES: { id: Outcome; label: string }[] = [
  { id: 'worked', label: 'Worked' },
  { id: 'partly', label: 'Partly' },
  { id: 'failed', label: 'Failed' },
  { id: 'botched', label: 'Botched' },
];

export interface CastLog {
  id: string;
  at: number;
  /** the version that was cast (its id) */
  version: string;
  outcome: Outcome;
  paradox: number;
  notes: string;
}

export const newVersion = (from?: Partial<SpellVersion>): SpellVersion => ({
  id: crypto.randomUUID(),
  createdAt: Date.now(),
  spheres: {},
  how: '',
  coincidental: '',
  notes: '',
  ...from,
  source: from?.source ?? 'me',
});

export function newSpell(characterId: string, title: string, from?: { effect?: string; spheres?: SpellVersion['spheres'] }): Spell {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    characterId,
    createdAt: now,
    updatedAt: now,
    title,
    goal: '',
    effects: from?.effect ? [from.effect] : [],
    versions: [newVersion({ spheres: { ...from?.spheres } })],
    log: [],
  };
}

/** Rows written by an older version of the app only had a title: fill in the rest. */
export function normalizeSpell(raw: Partial<Spell> & { id: string; characterId: string }): Spell {
  const s = { ...newSpell(raw.characterId, raw.title ?? ''), ...raw };
  if (!s.versions?.length) s.versions = [newVersion()];
  s.effects ??= [];
  s.log ??= [];
  return s;
}

/** A version's Spheres as a library-style combo, for chips and difficulty. */
export const versionCombo = (v: SpellVersion): Combo => ({
  spheres: Object.fromEntries(SPHERES.filter((s) => (v.spheres[s] ?? 0) > 0).map((s) => [s, v.spheres[s]!])),
});

/** Versions are numbered by when they were made, so "make this the plan" keeps the names. */
export const versionLabel = (s: Spell, v: SpellVersion) =>
  `Version ${[...s.versions].sort((a, b) => a.createdAt - b.createdAt).findIndex((x) => x.id === v.id) + 1}`;
