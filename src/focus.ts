/**
 * The Focus block is free lines (eight on Mr. Gone's sheet, which has no separate fields
 * for paradigm, practice or instruments). The pickers keep three kinds of line tidy:
 * "Paradigm: ...", "Practice: ..." and "Instruments: a; b; c" (semicolons, because
 * M20's instrument names have commas in them). Any other line is left as typed.
 */
export type FocusPart = 'Paradigm' | 'Practice' | 'Instruments';
const PARTS: FocusPart[] = ['Paradigm', 'Practice', 'Instruments'];

const label = (part: FocusPart) => new RegExp(`^\s*${part === 'Instruments' ? 'instruments?' : part.toLowerCase()}\s*[:=]\s*`, 'i');

const lineOf = (lines: string[], part: FocusPart) => lines.findIndex((l) => label(part).test(l));

/** What a "Paradigm: ..." (or Practice, Instruments) line says, or ''. */
export function focusPart(lines: string[], part: FocusPart): string {
  const i = lineOf(lines, part);
  return i < 0 ? '' : lines[i].replace(label(part), '').trim();
}

/** Set a part: its line is rewritten, or a new one goes in after the parts before it. Empty removes it. */
export function setFocusPart(lines: string[], part: FocusPart, value: string): string[] {
  const out = [...lines];
  const i = lineOf(out, part);
  const line = `${part}: ${value.trim()}`;
  if (i >= 0) {
    if (value.trim()) out[i] = line;
    else out.splice(i, 1);
    return out;
  }
  if (!value.trim()) return out;
  // Paradigm, then Practice, then Instruments, above anything else
  const before = PARTS.slice(0, PARTS.indexOf(part)).map((p) => lineOf(out, p));
  out.splice(Math.max(-1, ...before) + 1, 0, line);
  return out;
}

/** The instruments on the Instruments line ("a; b", or commas when typed that way without semicolons). */
export function instrumentsOf(lines: string[]): string[] {
  const v = focusPart(lines, 'Instruments');
  return v ? v.split(v.includes(';') ? /\s*;\s*/ : /\s*,\s*/).filter(Boolean) : [];
}

/** Add an instrument, or take it off when it is already there. */
export function toggleInstrument(lines: string[], name: string): string[] {
  const list = instrumentsOf(lines);
  const at = list.findIndex((x) => x.toLowerCase() === name.trim().toLowerCase());
  const next = at >= 0 ? list.filter((_, i) => i !== at) : [...list, name.trim()];
  return setFocusPart(lines, 'Instruments', next.join('; '));
}
