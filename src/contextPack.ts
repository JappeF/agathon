import { ABILITY_GROUPS, ATTRIBUTE_GROUPS, type Character } from './character';
import { sourceLabel, type Combo, type Effect } from './library/data';
import { difficulties } from './library/search';
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

function characterText(c: Character, notes: boolean) {
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
    c.rotes.filter(Boolean).length > 0 && `Known rotes: ${c.rotes.filter(Boolean).join('; ')}.`,
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

export function buildPack(s: Spell, c: Character, effects: Effect[], o: PackOptions): string {
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
    section('The mage', characterText(c, o.notes)),
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
    o.library && linked.length > 0 && section('Related effects from my library (summaries with M20 / How Do You DO That? pages)', [linked.map(effectText).join('\n\n')]),
    section('Rules I use', [
      '- Base difficulty is the highest Sphere in the effect +3 coincidental, +4 vulgar, +5 vulgar with witnesses (M20 p. 501). All modifiers together stay within +3 / -3, and the difficulty never drops below 3.',
      '- A fitting focus and instruments, a related Ability roll first, or taking time (an extended ritual) can lower the difficulty within those limits.',
      '- Quintessence and Paradox share one wheel; Paradox cancels Quintessence where they meet (M20 p. 331).',
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

const str = (v: unknown, max = 4000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/**
 * Read the JSON block from an AI's answer and turn it into a new version. The answer
 * is untrusted text: only known fields, Sphere names and ranks 1-5 get through.
 */
export function parseReply(text: string): SpellVersion {
  const blocks = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map((m) => m[1]);
  // no fenced block: try the last {...} in the text
  if (!blocks.length) {
    const i = text.lastIndexOf('{"agathon"') >= 0 ? text.lastIndexOf('{"agathon"') : text.lastIndexOf('{');
    const j = text.lastIndexOf('}');
    if (i >= 0 && j > i) blocks.push(text.slice(i, j + 1));
  }
  let data: Record<string, unknown> | null = null;
  for (const b of blocks.reverse()) {
    try {
      const parsed = JSON.parse(b.trim().replace(/[“”]/g, '"'));
      if (parsed && typeof parsed === 'object' && ('spheres' in parsed || parsed.agathon === 'version')) {
        data = parsed;
        break;
      }
    } catch {
      // not this block
    }
  }
  if (!data) throw new ReplyError("There is no plan block in this answer. Ask the AI to end with the JSON block from the prompt, or copy the parts you like into the plan by hand.");
  const spheres: SpellVersion['spheres'] = {};
  const raw = data.spheres && typeof data.spheres === 'object' ? (data.spheres as Record<string, unknown>) : {};
  for (const [k, v] of Object.entries(raw)) {
    const s = SPHERES.find((x) => x.toLowerCase() === k.trim().toLowerCase()) as Sphere | undefined;
    const r = typeof v === 'number' ? Math.round(v) : parseInt(String(v), 10);
    if (s && r >= 1 && r <= 5) spheres[s] = r;
  }
  return newVersion({
    spheres,
    how: str(data.how),
    coincidental: str(data.coincidental),
    notes: str(data.notes),
    source: 'ai',
    reply: text.trim().slice(0, 30000),
  });
}

/** A rough size, so the player knows whether it fits a free chat. */
export const packSize = (text: string) => ({ words: text.split(/\s+/).filter(Boolean).length, tokens: Math.round(text.length / 4) });
