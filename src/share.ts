import { ABILITY_GROUPS, ATTRIBUTE_GROUPS, clampWheel, HEALTH_LEVELS, newCharacter, type Character, type HealthMark, type Rated } from './character';
import { SPHERES, type Sphere } from './types';
import { safePortrait } from './portrait';
import { OUTCOMES, type CastLog, type Spell, type SpellVersion } from './spells';

/**
 * Versioned wire format for moving characters between devices and players: a JSON
 * file, or a share link / QR code carrying #import=<mode>.<base64url(deflate(json))>.
 * Never carries the stored sheet PDF, ids or timestamps; notes only when asked. A backup
 * file also carries the spell ideas, tied to their character by its place in the file.
 */

export type SharedCharacter = Omit<Character, 'id' | 'createdAt' | 'updatedAt' | 'sheet'>;

export interface SharePayload {
  app: 'agathon';
  kind: 'characters';
  version: 1;
  exportedAt: string;
  characters: SharedCharacter[];
  /** a backup also carries the spell ideas, each with the index of its character */
  spells?: BackupSpell[];
}

/** A spell idea in a backup: all of it (versions, AI answers, log), tied to its character by index. */
export type BackupSpell = Omit<Spell, 'id' | 'characterId'> & { character: number };

/** Spell ideas for a link: the ideas and their plans, without the AI's whole answers and the log. */
export const lightSpells = (spells: Spell[]): Spell[] => spells.map((s) => ({ ...s, log: [], versions: s.versions.map(({ reply: _r, ...v }) => v) }));

export function buildPayload(characters: Character[], includeNotes: boolean, includePortraits = true, spells: Spell[] = []): SharePayload {
  const index = new Map(characters.map((c, i) => [c.id, i]));
  const backup = spells
    .filter((s) => index.has(s.characterId))
    .map(({ id: _i, characterId, ...rest }) => ({ ...rest, character: index.get(characterId)! }));
  return {
    app: 'agathon',
    kind: 'characters',
    version: 1,
    exportedAt: new Date().toISOString().slice(0, 10),
    characters: characters.map(({ id: _i, createdAt: _c, updatedAt: _u, sheet: _s, ...rest }) => ({
      ...rest,
      notes: includeNotes ? rest.notes : '',
      portrait: includePortraits ? rest.portrait : undefined,
    })),
    ...(backup.length ? { spells: backup } : {}),
  };
}

// ---------- validation: everything from outside is untrusted ----------

const str = (v: unknown, max = 4000) => (typeof v === 'string' ? v.slice(0, max) : '');
const int = (v: unknown, min: number, max: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.round(v))) : min;
const arr = (v: unknown, max = 50): unknown[] => (Array.isArray(v) ? v.slice(0, max) : []);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const rated = (v: unknown, maxRating: number): Rated[] =>
  arr(v).map((r) => ({ name: str(obj(r).name, 200), rating: int(obj(r).rating, 0, maxRating) })).filter((r) => r.name || r.rating);
const lines = (v: unknown) => arr(v).map((l) => str(l, 500)).filter(Boolean);

const KNOWN_TRAITS = [...ATTRIBUTE_GROUPS, ...ABILITY_GROUPS].flatMap((g) => [...g.traits] as string[]);

/** Rebuild a character from untrusted JSON onto a blank template: known fields only, values clamped. */
export function sanitizeCharacter(raw: unknown): SharedCharacter {
  const r = obj(raw);
  const { id: _i, createdAt: _c, updatedAt: _u, sheet: _s, ...c } = newCharacter('', '');
  for (const k of ['name', 'player', 'chronicle', 'nature', 'demeanor', 'essence', 'affiliation', 'sect', 'concept', 'experience'] as const)
    c[k] = str(r[k], 200);
  c.name = c.name.trim() || 'Unnamed mage';
  const traits = obj(r.traits);
  for (const t of KNOWN_TRAITS) if (t in traits) c.traits[t] = int(traits[t], 0, 5);
  const specs = obj(r.specialties);
  for (const t of [...KNOWN_TRAITS, ...SPHERES]) if (typeof specs[t] === 'string' && specs[t]) c.specialties[t] = str(specs[t], 200);
  const spheres = obj(r.spheres);
  for (const s of SPHERES) c.spheres[s] = int(spheres[s], 0, 5);
  c.affinitySphere = (SPHERES as readonly string[]).includes(r.affinitySphere as string) ? (r.affinitySphere as Sphere) : undefined;
  c.arete = int(r.arete, 0, 10);
  c.willpower = int(r.willpower, 0, 10);
  c.willpowerSpent = int(r.willpowerSpent, 0, c.willpower);
  Object.assign(c, clampWheel(int(r.quintessence, 0, 20), int(r.paradox, 0, 20)));
  const health = arr(r.health, HEALTH_LEVELS.length);
  c.health = HEALTH_LEVELS.map((_, i) => (['/', 'X', '*'].includes(health[i] as string) ? health[i] : '') as HealthMark);
  c.backgrounds = rated(r.backgrounds, 10);
  c.otherTraits = rated(r.otherTraits, 10);
  c.merits = rated(r.merits, 20);
  c.flaws = rated(r.flaws, 20);
  c.rotes = lines(r.rotes);
  c.focus = lines(r.focus);
  c.gear = lines(r.gear);
  c.wonders = arr(r.wonders).map((w) => ({ name: str(obj(w).name, 200), description: str(obj(w).description) })).filter((w) => w.name || w.description);
  c.history = str(r.history, 20000);
  c.goals = str(r.goals);
  const d = obj(r.description);
  c.description = {
    text: str(d.text),
    age: str(d.age, 60),
    apparentAge: str(d.apparentAge, 60),
    sex: str(d.sex, 60),
    ethnicity: str(d.ethnicity, 60),
    hair: str(d.hair, 60),
    eyes: str(d.eyes, 60),
    height: str(d.height, 60),
    weight: str(d.weight, 60),
  };
  c.combat = arr(r.combat).map((w) => {
    const o = obj(w);
    return {
      weapon: str(o.weapon, 120),
      difficulty: str(o.difficulty, 20),
      damage: str(o.damage, 40),
      range: str(o.range, 40),
      rate: str(o.rate, 20),
      clip: str(o.clip, 20),
    };
  });
  c.notes = str(r.notes, 50000);
  c.portrait = safePortrait(r.portrait);
  c.pinned = arr(r.pinned, 300)
    .map((v) => str(v, 80))
    .filter((v) => /^[a-z0-9][a-z0-9-]*$/.test(v));
  return c;
}

export class ShareFormatError extends Error {}

export function parsePayload(raw: unknown): SharePayload {
  const p = obj(raw);
  if (p.app !== 'agathon' || p.kind !== 'characters' || !Array.isArray(p.characters)) {
    throw new ShareFormatError("This isn't an Agathon character file.");
  }
  if (typeof p.version !== 'number' || p.version > 1) {
    throw new ShareFormatError('This file comes from a newer version of Agathon. Reload the app and try again.');
  }
  const characters = p.characters.slice(0, 100).map(sanitizeCharacter);
  // spell ideas only for a character in this file
  const spells = arr(p.spells, 2000)
    .filter((x) => typeof obj(x).character === 'number')
    .map(sanitizeBackupSpell)
    .filter((s) => s.character < characters.length);
  return {
    app: 'agathon',
    kind: 'characters',
    version: 1,
    exportedAt: str(p.exportedAt, 30),
    characters,
    ...(spells.length ? { spells } : {}),
  };
}

const ID = /^[A-Za-z0-9-]{1,64}$/;
const time = (v: unknown) => int(v, 0, 8.64e15);

/** One plan: Spheres 1-5, known fields only. */
function cleanVersion(v: unknown): Omit<SpellVersion, 'id' | 'createdAt' | 'reply'> {
  const o = obj(v);
  const given = obj(o.spheres);
  const spheres: SpellVersion['spheres'] = {};
  for (const sp of SPHERES) {
    const r = int(given[sp], 0, 5);
    if (r) spheres[sp] = r;
  }
  return { spheres, how: str(o.how), coincidental: str(o.coincidental), notes: str(o.notes), source: o.source === 'ai' ? 'ai' : 'me' };
}

const libraryIds = (v: unknown) => arr(v).filter((e): e is string => typeof e === 'string' && /^[a-z0-9-]{1,120}$/.test(e));

function sanitizeBackupSpell(raw: unknown): BackupSpell {
  const s = obj(raw);
  const versions: SpellVersion[] = arr(s.versions, 100).map((v, i) => {
    const o = obj(v);
    const reply = str(o.reply, 30000);
    return {
      ...cleanVersion(o),
      id: typeof o.id === 'string' && ID.test(o.id) ? o.id : `v${i}`,
      createdAt: time(o.createdAt),
      ...(reply ? { reply } : {}),
    };
  });
  const outcomes = OUTCOMES.map((o) => o.id) as string[];
  const log: CastLog[] = arr(s.log, 500).map((l, i) => {
    const o = obj(l);
    return {
      id: typeof o.id === 'string' && ID.test(o.id) ? o.id : `l${i}`,
      at: time(o.at),
      version: typeof o.version === 'string' && ID.test(o.version) ? o.version : '',
      outcome: outcomes.includes(o.outcome as string) ? (o.outcome as CastLog['outcome']) : 'worked',
      paradox: int(o.paradox, 0, 20),
      notes: str(o.notes),
    };
  });
  return {
    character: int(s.character, 0, 1e6),
    createdAt: time(s.createdAt),
    updatedAt: time(s.updatedAt),
    title: str(s.title, 200).trim() || 'Untitled spell idea',
    goal: str(s.goal),
    effects: libraryIds(s.effects),
    versions: versions.length ? versions : [{ ...cleanVersion({}), id: 'v0', createdAt: 0 }],
    log,
  };
}

// ---------- share-link encoding: #import=<mode>.<base64url(deflate(json))> ----------

const b64uEncode = (bytes: Uint8Array) => {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const b64uDecode = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

/**
 * Run bytes through a (de)compression stream, stopping past `limit` bytes of output: a
 * hostile link of a few MB can inflate to gigabytes and take the tab down before any
 * preview shows. A real link holds one character with a small portrait, far below 16 MB.
 */
async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream, limit = 16 * 1024 * 1024) {
  const reader = new Blob([bytes as BlobPart]).stream().pipeThrough(stream).getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) {
      await reader.cancel();
      throw new ShareFormatError('This share link is too large.');
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) out.set(c, (at += c.length) - c.length);
  return out;
}

/** Drop empty and default values so links and QR codes stay small; sanitize restores them. */
function compact(p: unknown): unknown {
  return JSON.parse(
    JSON.stringify(p, (_k, v) => {
      if (v === '' || v === undefined) return undefined;
      if (Array.isArray(v) && v.length === 0) return undefined;
      return v;
    }),
  );
}

/** <mode>.<base64url>: mode 1 is deflate-raw, 0 plain (browsers without CompressionStream). */
async function encodeJson(value: unknown): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(compact(value)));
  if (typeof CompressionStream !== 'undefined') return '1.' + b64uEncode(await pipe(json, new CompressionStream('deflate-raw')));
  return '0.' + b64uEncode(json);
}

async function decodeJson<T>(encoded: string, parse: (raw: unknown) => T): Promise<T> {
  try {
    const dot = encoded.indexOf('.');
    const bytes = b64uDecode(encoded.slice(dot + 1));
    const json = encoded.slice(0, dot) === '1' ? await pipe(bytes, new DecompressionStream('deflate-raw')) : bytes;
    return parse(JSON.parse(new TextDecoder().decode(json)));
  } catch (e) {
    if (e instanceof ShareFormatError) throw e;
    throw new ShareFormatError('This share link is invalid or damaged.');
  }
}

export const encodeShare = (p: SharePayload) => encodeJson(p);
export const decodeShare = (encoded: string) => decodeJson(encoded, parsePayload);

export const shareUrl = (encoded: string) => `${location.origin}${location.pathname}#import=${encoded}`;

export function payloadFileName(p: SharePayload) {
  const who = p.characters.length === 1 ? p.characters[0].name.replace(/[\\/:*?"<>|]+/g, '').trim() || 'character' : 'characters';
  return `${who}.agathon.json`;
}

// ---------- spell ideas: /i/<mode>.<data> (a link with a preview card) -> #import-spell=<mode>.<data> ----------

/** What a shared spell idea carries: the idea and its plans. Never the log, ids or the AI's full answers. */
export interface SharedSpell {
  title: string;
  goal: string;
  effects: string[];
  versions: Pick<SpellVersion, 'spheres' | 'how' | 'coincidental' | 'notes' | 'source'>[];
}

export interface SpellSharePayload {
  app: 'agathon';
  kind: 'spell';
  version: 1;
  spell: SharedSpell;
}

export function buildSpellPayload(s: Spell): SpellSharePayload {
  return {
    app: 'agathon',
    kind: 'spell',
    version: 1,
    spell: {
      title: s.title,
      goal: s.goal,
      effects: s.effects,
      versions: s.versions.map(({ spheres, how, coincidental, notes, source }) => ({ spheres, how, coincidental, notes, source })),
    },
  };
}

/** Rebuild a shared spell idea from untrusted JSON: known fields only, Spheres 1-5, library ids only. */
export function parseSpellPayload(raw: unknown): SpellSharePayload {
  const p = obj(raw);
  if (p.app !== 'agathon' || p.kind !== 'spell') throw new ShareFormatError("This isn't an Agathon spell idea.");
  if (typeof p.version !== 'number' || p.version > 1) {
    throw new ShareFormatError('This link comes from a newer version of Agathon. Reload the app and try again.');
  }
  const s = obj(p.spell);
  const versions = arr(s.versions, 30).map(cleanVersion);
  return {
    app: 'agathon',
    kind: 'spell',
    version: 1,
    spell: {
      title: str(s.title, 200).trim() || 'Untitled spell idea',
      goal: str(s.goal),
      effects: libraryIds(s.effects),
      versions: versions.length ? versions : [{ spheres: {}, how: '', coincidental: '', notes: '', source: 'me' }],
    },
  };
}

export const encodeSpellShare = (s: Spell) => encodeJson(buildSpellPayload(s));
export const decodeSpellShare = (encoded: string) => decodeJson(encoded, parseSpellPayload);

/** Links that other apps show with a preview card (the functions under functions/s and functions/i). */
export const spellIdeaUrl = (encoded: string) => `${location.origin}/i/${encoded}`;
export const librarySpellUrl = (id: string) => `${location.origin}/s/${encodeURIComponent(id)}`;
