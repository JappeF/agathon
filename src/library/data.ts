import { useEffect, useState } from 'react';
import type { Sphere } from '../types';

/** One entry of library/effects.json (see library/README.md for the full schema). */
export type Spheres = Partial<Record<Sphere, number>>;

export interface Combo {
  spheres: Spheres;
  note?: string;
  /** Spheres the book names without a rank; the rank is our best reading. */
  inferred?: Sphere[];
}

export interface Effect {
  id: string;
  name: string;
  kind: 'rank' | 'feat' | 'rote';
  summary: string;
  system?: string;
  combos: Combo[];
  optional?: { spheres: Spheres; purpose: string; inferred?: Sphere[] }[];
  coincidentalIf?: string;
  vulgarity?: 'coincidental' | 'vulgar' | 'depends';
  tags: string[];
  source: { book: 'M20' | 'HDYDT'; page: number; pdfPage: number; section?: string }[];
}

export const BOOK_NAMES = { M20: 'Mage 20', HDYDT: 'How Do You DO That?' } as const;

let cache: Promise<Effect[]> | null = null;

/** The library is ~550 KB of JSON: load it on first use (it is precached for offline). */
export function loadEffects(): Promise<Effect[]> {
  cache ??= import('../../library/effects.json').then((m) => m.default as unknown as Effect[]);
  return cache;
}

export function useEffects(): Effect[] | null {
  const [effects, setEffects] = useState<Effect[] | null>(null);
  useEffect(() => {
    let live = true;
    loadEffects().then((e) => live && setEffects(e));
    return () => {
      live = false;
    };
  }, []);
  return effects;
}

export const sourceLabel = (s: Effect['source'][number]) => `${s.book === 'M20' ? 'M20' : 'HDYDT'} p. ${s.page}`;
