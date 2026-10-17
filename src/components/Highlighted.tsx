import type { ReactNode } from 'react';

/** All [start, end) ranges in `text` matching any (lower-case) term, overlaps merged. */
export function findRanges(text: string, terms: string[]): [number, number][] {
  const lower = text.toLowerCase();
  const ranges: [number, number][] = [];
  for (const t of terms) {
    if (!t) continue;
    for (let i = lower.indexOf(t); i !== -1; i = lower.indexOf(t, i + t.length)) ranges.push([i, i + t.length]);
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([r[0], r[1]]);
  }
  return merged;
}

export const hasMatch = (text: string | undefined, terms: string[]) => !!text && terms.some((t) => t && text.toLowerCase().includes(t));

/**
 * A piece of `text` around its first match, so a hit deep in a long text is still in
 * view on a card. Short texts and texts that match early come back whole.
 */
export function snippet(text: string, terms: string[], before = 50, len = 170): string {
  const first = Math.min(...findRanges(text, terms).map((r) => r[0]), Infinity);
  if (first === Infinity || first <= before + 10) return text;
  let start = text.lastIndexOf(' ', first - before) + 1;
  if (start <= 0) start = first - before;
  const end = start + len < text.length ? text.lastIndexOf(' ', start + len) : text.length;
  return `...${text.slice(start, end > start ? end : start + len)}${end < text.length ? '...' : ''}`;
}

/** `text` with the search terms marked. */
export function Highlighted({ text, terms }: { text: string; terms: string[] }) {
  const ranges = terms.length ? findRanges(text, terms) : [];
  if (!ranges.length) return <>{text}</>;
  const out: ReactNode[] = [];
  let pos = 0;
  ranges.forEach(([s, e], i) => {
    if (s > pos) out.push(text.slice(pos, s));
    out.push(<mark key={i}>{text.slice(s, e)}</mark>);
    pos = e;
  });
  if (pos < text.length) out.push(text.slice(pos));
  return <>{out}</>;
}
