import { ABILITY_GROUPS, ATTRIBUTE_GROUPS, type Character } from './character';
import { sourceLabel, type Combo, type Effect } from './library/data';
import { difficulties } from './library/search';
import { favoriteNames } from './favorites';
import { newVersion, versionCombo, versionLabel, OUTCOMES, type Spell, type SpellVersion } from './spells';
import { SPHERES, type Sphere } from './types';

/**
 * The "context pack": one prompt with everything an AI needs to think along about a
 * spell idea, to paste into the player's own Claude, ChatGPT or Gemini. Built on the
 * device, nothing is sent anywhere. Rules text is ours (summaries with book pages),
 * never the books' own words.
 */
export interface PackOptions {
  /** the scene, or the player's own question */
  ask: string;
  history: boolean;
  library: boolean;
  notes: boolean;
}

const comboText = (c: Combo) =>
  SPHERES.filter((s) => c.spheres[s] !== undefined)
    .map((s) => `${s} ${c.spheres[s]}`)
    .join(' + ') || 'no Spheres yet';

/** an intended empty line (a plain '' would be dropped with the empty optional ones) */
const GAP = ' ';

const section = (title: string, lines: (string | false | undefined | 0)[]) => {
  const body = lines
    .filter(Boolean)
    .map((l) => (l === GAP ? '' : l))
    .join('\n');
  return body ? `## ${title}\n\n${body}` : '';
};

function characterText(c: Character, notes: boolean, favorites: string[]) {
  const rated = (names: readonly string[]) =>
    names
      .filter((t) => (c.traits[t] ?? 0) > 0)
      .map((t) => `${t} ${c.traits[t]}${c.specialties[t] ? ` (${c.specialties[t]})` : ''}`)
      .join(', ');
  const spheres = SPHERES.filter((s) => c.spheres[s] > 0)
    .map((s) => {
      const extra = [c.affinitySphere === s && 'affinity', c.specialties[s]].filter(Boolean).join('; ');
      return `${s} ${c.spheres[s]}${extra ? ` (${extra})` : ''}`;
    })
    .join(', ');
  const who = [c.concept, c.affiliation, c.sect, c.essence && `${c.essence} Essence`].filter(Boolean).join(', ');
  return [
    `${c.name}${who ? `: ${who}` : ''}.`,
    (c.nature || c.demeanor) && `Nature ${c.nature || '-'}, Demeanor ${c.demeanor || '-'}.`,
    `Arete ${c.arete}. Willpower ${c.willpower - c.willpowerSpent} of ${c.willpower}. Quintessence ${c.quintessence}, Paradox ${c.paradox}.`,
    `Spheres: ${spheres || 'none'}.`,
    c.focus.filter(Boolean).length > 0 && `Focus (paradigm, practice, instruments):\n${c.focus.filter(Boolean).map((f) => `- ${f}`).join('\n')}`,
    `Attributes: ${ATTRIBUTE_GROUPS.map((g) => rated(g.traits)).join('; ')}.`,
    `Abilities: ${ABILITY_GROUPS.map((g) => rated(g.traits)).filter(Boolean).join('; ') || 'none'}.`,
    c.otherTraits.length > 0 && `Other traits: ${c.otherTraits.map((t) => `${t.name} ${t.rating}`).join(', ')}.`,
    c.backgrounds.length > 0 && `Backgrounds: ${c.backgrounds.map((b) => `${b.name} ${b.rating}`).join(', ')}.`,
    favorites.length > 0 && `Favorite spells (the rotes on their sheet): ${favorites.join('; ')}.`,
    notes && c.notes.trim() && `Player's notes:\n${c.notes.trim()}`,
  ];
}

function versionText(s: Spell, v: SpellVersion) {
  const combo = versionCombo(v);
  const d = difficulties(combo);
  return [
    `${versionLabel(s, v)}: ${comboText(combo)}${Object.keys(combo.spheres).length ? `. Base difficulty ${d.coincidental} coincidental, ${d.vulgar} vulgar, ${d.witnessed} vulgar with witnesses.` : '.'}`,
    v.how.trim() && `How it looks: ${v.how.trim()}`,
    v.coincidental.trim() && `Keeping it coincidental: ${v.coincidental.trim()}`,
    v.notes.trim() && `Notes: ${v.notes.trim()}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function effectText(e: Effect) {
  return [
    `### ${e.name} (${e.source.map(sourceLabel).join(', ')})`,
    `Ways to cast it: ${e.combos.map((c) => comboText(c) + (c.note ? ` (${c.note})` : '')).join('; or ')}.`,
    e.optional?.length && `Add-ons: ${e.optional.map((o) => `${comboText(o)} to ${o.purpose}`).join('; ')}.`,
    e.summary,
    e.system && `System: ${e.system}`,
    e.coincidentalIf && `The book says it stays coincidental if ${e.coincidentalIf}.`,
    e.vulgarity && `Usually ${e.vulgarity === 'depends' ? 'coincidental or vulgar, depending on how it is done' : e.vulgarity}.`,
  ]
    .filter(Boolean)
    .join('\n');
}

/** A page from the player's own rulebook, quoted in full for the AI. */
export interface PackPage {
  book: string;
  page: number;
  label: string;
  text: string;
}

export function buildPack(s: Spell, c: Character, effects: Effect[], o: PackOptions, pages: PackPage[] = []): string {
  const current = s.versions[s.versions.length - 1];
  const older = s.versions.slice(0, -1);
  const versionOf = (id: string) => {
    const v = s.versions.find((x) => x.id === id);
    return v ? versionLabel(s, v) : 'an earlier version';
  };
  const linked = s.effects.map((id) => effects.find((e) => e.id === id)).filter((e): e is Effect => !!e);

  return [
    `# A spell for ${c.name} (Mage: The Ascension, 20th Anniversary Edition)`,
    `I play ${c.name} in a Mage: The Ascension 20th Anniversary (M20) chronicle and want to work out a spell before or during a session. Think along as an experienced Mage player and Storyteller. The Storyteller at our table has the final say, so suggest, don't rule. Use the M20 rules; when you are not sure of a rule or a page, say so instead of guessing. Dice are rolled at the table, not by you.`,
    section('The mage', characterText(c, o.notes, favoriteNames(c, effects))),
    section('The idea', [
      `**${s.title || 'Untitled idea'}**`,
      s.goal.trim() && `What should happen: ${s.goal.trim()}`,
      GAP,
      `The current plan, ${versionText(s, current)}`,
      o.history && older.length > 0 && `\nEarlier versions:\n${older.map((v) => versionText(s, v)).join('\n\n')}`,
      o.history &&
        s.log.length > 0 &&
        `\nHow it went at the table:\n${s.log
          .map(
            (l) =>
              `- ${new Date(l.at).toISOString().slice(0, 10)}, ${versionOf(l.version)}: ${OUTCOMES.find((x) => x.id === l.outcome)?.label.toLowerCase()}${l.paradox ? `, +${l.paradox} Paradox` : ''}${l.notes ? `. ${l.notes}` : ''}`,
          )
          .join('\n')}`,
    ]),
    o.library && linked.length > 0 && section('Related spells from my library (summaries with M20 / How Do You DO That? pages)', [linked.map(effectText).join('\n\n')]),
    section('Rules I use', [
      '- Base difficulty is the highest Sphere in the effect +3 coincidental, +4 vulgar, +5 vulgar with witnesses (M20 p. 501). All modifiers together stay within +3 / -3, and the difficulty never drops below 3.',
      '- A fitting focus and instruments, a related Ability roll first, or taking time (an extended ritual) can lower the difficulty within those limits.',
      '- Quintessence and Paradox share one wheel; Paradox cancels Quintessence where they meet (M20 p. 331).',
    ]),
    pages.length > 0 &&
      section('Pages from my own rulebooks', [
        'For reference while you think; base the rules on these pages where they apply.',
        GAP,
        pages.map((p) => `### ${p.book} p. ${p.page} (${p.label})\n\n${p.text.replace(/^\d{1,3}(?=[A-Z])/, '').trim()}`).join('\n\n'),
      ]),
    o.ask.trim() && section('The scene, and my question', [o.ask.trim()]),
    section('What I would like from you', [
      '1. Is this the right Sphere combination and rank? Is there a cheaper or more elegant way?',
      `2. How ${c.name} would do it, in their paradigm, practice and instruments: what it looks like, sounds like, what it takes.`,
      '3. How to keep it coincidental in this scene, or how to soften it if it has to be vulgar.',
      '4. The risks: Paradox, a botch, side effects, what the Storyteller is likely to ask.',
      GAP,
      'Keep it practical, we are at the table. End your answer with the improved plan as one JSON block, exactly in this shape (Sphere names in English, ranks 1-5):',
      GAP,
      '```json',
      '{"agathon": "version", "spheres": {"Forces": 3, "Prime": 2}, "how": "what it looks like", "coincidental": "how it stays coincidental", "notes": "risks and open questions"}',
      '```',
    ]),
  ]
    .filter(Boolean)
    .join('\n\n');
}

export class ReplyError extends Error {}

/** Every outermost {...} in the text with balanced braces (braces inside strings don't count), last first. */
function jsonObjects(text: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '{') continue;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let j = i; j < text.length; j++) {
      const ch = text[j];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === '\\') escaped = true;
        else if (ch === '"') inString = false;
      } else if (ch === '"') inString = true;
      else if (ch === '{') depth++;
      else if (ch === '}' && --depth === 0) {
        out.push(text.slice(i, j + 1));
        i = j;
        break;
      }
    }
  }
  return out.reverse();
}

/** JSON.parse, then again with curly quotes straightened and trailing commas dropped. */
function looseParse(block: string): Record<string, unknown> | null {
  for (const attempt of [block, block.replace(/[“”]/g, '"'), block.replace(/[“”]/g, '"').replace(/,\s*([}\]])/g, '$1')]) {
    try {
      const v = JSON.parse(attempt);
      if (v && typeof v === 'object' && !Array.isArray(v)) return v;
    } catch {
      // try the next repair
    }
  }
  return null;
}

const str = (v: unknown, max = 4000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/**
 * Read the JSON block from an AI's answer and turn it into a new version. The answer
 * is untrusted text: only known fields, Sphere names and ranks 1-5 get through.
 */
export function parseReply(text: string): SpellVersion {
  // the plan block sits at the end; a giant paste (100k stray braces) would make the
  // block scan crawl, so only the last 200k characters are read
  text = text.slice(-200_000);
  // AIs wrap the block in ```json fences, or not, spread it over lines, and put their own
  // label in "agathon" (Gemini: "Version 2 (Optimized Network Trace)"). So look at every
  // balanced {...} in the text and take the last one with a spheres object.
  let data: Json | null = null;
  let spheres: SpellVersion['spheres'] | null = null;
  for (const block of jsonObjects(text)) {
    const parsed = looseParse(block);
    spheres = parsed && findSpheres(parsed);
    if (spheres) {
      data = parsed;
      break;
    }
  }
  if (!data || !spheres) throw new ReplyError("There is no plan block in this answer. Ask the AI to end with the JSON block from the prompt, or copy the parts you like into the plan by hand.");
  // the asked-for fields first; AIs that invent their own shape get the nearest match
  return newVersion({
    spheres,
    how: str(data.how) || findText(data, /^(how|method|focus|instruments?|tools?|description|intent|effect)$/i),
    coincidental: str(data.coincidental) || findText(data, /coincidental|cover.?story|mitigation|disguise/i),
    notes: str(data.notes) || findText(data, /^(notes?|risks?|warnings?|bottleneck|system_bottleneck)$/i),
    source: 'ai',
    reply: text.trim().slice(0, 30000),
  });
}

type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => !!v && typeof v === 'object' && !Array.isArray(v);

/** Sphere ranks in an object like {"Forces": 3, "prime": "2"}: only Sphere names, ranks 1-5. */
function sphereRanks(o: Json): SpellVersion['spheres'] {
  const out: SpellVersion['spheres'] = {};
  for (const [k, v] of Object.entries(o)) {
    const s = SPHERES.find((x) => x.toLowerCase() === k.trim().toLowerCase()) as Sphere | undefined;
    const r = typeof v === 'number' ? Math.round(v) : parseInt(String(v), 10);
    if (s && r >= 1 && r <= 5) out[s] = r;
  }
  return out;
}

/** Every value in the JSON, depth first, with the key that leads to it. */
function* walk(v: unknown, key = ''): Generator<[string, unknown]> {
  yield [key, v];
  if (isObj(v)) for (const [k, x] of Object.entries(v)) yield* walk(x, k);
  else if (Array.isArray(v)) for (const x of v) yield* walk(x, key);
}

/**
 * The plan's Spheres, wherever the AI put them: the asked-for "spheres" key, then any
 * key that mentions Spheres ("spheres_required" inside "mechanics"), then any object
 * that is just Sphere ranks.
 */
function findSpheres(data: Json): SpellVersion['spheres'] | null {
  const objects = [...walk(data)].filter((e): e is [string, Json] => isObj(e[1]));
  const tests = [(k: string) => k === 'spheres', (k: string) => /sphere/i.test(k), () => true];
  for (const test of tests)
    for (const [k, o] of objects) {
      if (!test(k)) continue;
      const ranks = sphereRanks(o);
      if (Object.keys(ranks).length) return ranks;
    }
  return null;
}

/** The first non-empty text under a key that matches, at any depth. */
function findText(data: Json, keys: RegExp): string {
  for (const [k, v] of walk(data)) if (keys.test(k) && typeof v === 'string' && v.trim()) return str(v);
  return '';
}

/** A rough size, so the player knows whether it fits a free chat. */
export const packSize = (text: string) => ({ words: text.split(/\s+/).filter(Boolean).length, tokens: Math.round(text.length / 4) });
