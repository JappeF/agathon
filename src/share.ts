import { ABILITY_GROUPS, ATTRIBUTE_GROUPS, clampWheel, HEALTH_LEVELS, newCharacter, type Character, type HealthMark, type Rated } from './character';
import { SPHERES, type Sphere } from './types';
import { safePortrait } from './portrait';

/**
 * Versioned wire format for moving characters between devices and players: a JSON
 * file, or a share link / QR code carrying #import=<mode>.<base64url(deflate(json))>.
 * Never carries the stored sheet PDF, ids or timestamps; notes only when asked.
 */

export type SharedCharacter = Omit<Character, 'id' | 'createdAt' | 'updatedAt' | 'sheet'>;

export interface SharePayload {
  app: 'agathon';
  kind: 'characters';
  version: 1;
  exportedAt: string;
  characters: SharedCharacter[];
}

export function buildPayload(characters: Character[], includeNotes: boolean, includePortraits = true): SharePayload {
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
  return {
    app: 'agathon',
    kind: 'characters',
    version: 1,
    exportedAt: str(p.exportedAt, 30),
    characters: p.characters.slice(0, 100).map(sanitizeCharacter),
  };
}

// ---------- share-link encoding: #import=<mode>.<base64url(deflate(json))> ----------

const b64uEncode = (bytes: Uint8Array) => {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const b64uDecode = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

/** Drop empty and default values so links and QR codes stay small; sanitize restores them. */
function compact(p: SharePayload): unknown {
  return JSON.parse(
    JSON.stringify(p, (_k, v) => {
      if (v === '' || v === undefined) return undefined;
      if (Array.isArray(v) && v.length === 0) return undefined;
      return v;
    }),
  );
}

export async function encodeShare(p: SharePayload): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(compact(p)));
  if (typeof CompressionStream !== 'undefined') return '1.' + b64uEncode(await pipe(json, new CompressionStream('deflate-raw')));
  return '0.' + b64uEncode(json);
}

export async function decodeShare(encoded: string): Promise<SharePayload> {
  try {
    const dot = encoded.indexOf('.');
    const bytes = b64uDecode(encoded.slice(dot + 1));
    const json = encoded.slice(0, dot) === '1' ? await pipe(bytes, new DecompressionStream('deflate-raw')) : bytes;
    return parsePayload(JSON.parse(new TextDecoder().decode(json)));
  } catch (e) {
    if (e instanceof ShareFormatError) throw e;
    throw new ShareFormatError('This share link is invalid or damaged.');
  }
}

export const shareUrl = (encoded: string) => `${location.origin}${location.pathname}#import=${encoded}`;

export function payloadFileName(p: SharePayload) {
  const who = p.characters.length === 1 ? p.characters[0].name.replace(/[\\/:*?"<>|]+/g, '').trim() || 'character' : 'characters';
  return `${who}.agathon.json`;
}
