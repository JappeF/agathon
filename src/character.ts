import { SPHERES, type Sphere } from './types';

export const ATTRIBUTE_GROUPS = [
  { title: 'Physical', traits: ['Strength', 'Dexterity', 'Stamina'] },
  { title: 'Social', traits: ['Charisma', 'Manipulation', 'Appearance'] },
  { title: 'Mental', traits: ['Perception', 'Intelligence', 'Wits'] },
] as const;

export const ABILITY_GROUPS = [
  {
    title: 'Talents',
    traits: ['Alertness', 'Art', 'Athletics', 'Awareness', 'Brawl', 'Empathy', 'Expression', 'Intimidation', 'Leadership', 'Streetwise', 'Subterfuge'],
  },
  {
    title: 'Skills',
    traits: ['Crafts', 'Drive', 'Etiquette', 'Firearms', 'Martial Arts', 'Meditation', 'Melee', 'Research', 'Stealth', 'Survival', 'Technology'],
  },
  {
    title: 'Knowledges',
    traits: ['Academics', 'Computer', 'Cosmology', 'Enigmas', 'Esoterica', 'Investigation', 'Law', 'Medicine', 'Occult', 'Politics', 'Science'],
  },
] as const;

export const HEALTH_LEVELS = [
  { name: 'Bruised', penalty: 0 },
  { name: 'Hurt', penalty: -1 },
  { name: 'Injured', penalty: -1 },
  { name: 'Wounded', penalty: -2 },
  { name: 'Mauled', penalty: -2 },
  { name: 'Crippled', penalty: -5 },
  { name: 'Incapacitated', penalty: null },
] as const;

/** M20 damage marks: none, bashing, lethal, aggravated (as on the sheet). */
export type HealthMark = '' | '/' | 'X' | '*';

export const WHEEL_SIZE = 20;

export interface Rated {
  name: string;
  rating: number;
}

export interface Character {
  id: string;
  createdAt: number;
  updatedAt: number;

  name: string;
  player: string;
  chronicle: string;
  nature: string;
  demeanor: string;
  essence: string;
  affiliation: string;
  sect: string;
  concept: string;

  /** Attribute and Ability ratings by trait name; custom abilities live in otherTraits. */
  traits: Record<string, number>;
  /** Specialty or note per trait or Sphere name. */
  specialties: Record<string, string>;
  spheres: Record<Sphere, number>;
  affinitySphere?: Sphere;

  arete: number;
  willpower: number;
  willpowerSpent: number;
  quintessence: number;
  paradox: number;
  health: HealthMark[];
  experience: string;

  backgrounds: Rated[];
  otherTraits: Rated[];
  merits: Rated[];
  flaws: Rated[];
  rotes: string[];
  /** Paradigm, practice and instruments, as free lines (the sheet's Focus box). */
  focus: string[];
  wonders: { name: string; description: string }[];
  history: string;
  goals: string;
  description: {
    text: string;
    age: string;
    apparentAge: string;
    sex: string;
    ethnicity: string;
    hair: string;
    eyes: string;
    height: string;
    weight: string;
  };
  gear: string[];
  combat: { weapon: string; difficulty: string; damage: string; range: string; rate: string; clip: string }[];
  notes: string;

  /** Where the character came from, so re-imports and PDF export know the sheet. */
  sheet?: { id: string; fileName: string; importedAt: number };
}

export const emptySpheres = () => Object.fromEntries(SPHERES.map((s) => [s, 0])) as Record<Sphere, number>;

export function newCharacter(id: string, name: string): Character {
  const now = Date.now();
  const traits: Record<string, number> = {};
  for (const g of ATTRIBUTE_GROUPS) for (const t of g.traits) traits[t] = 1;
  for (const g of ABILITY_GROUPS) for (const t of g.traits) traits[t] = 0;
  return {
    id,
    createdAt: now,
    updatedAt: now,
    name,
    player: '',
    chronicle: '',
    nature: '',
    demeanor: '',
    essence: '',
    affiliation: '',
    sect: '',
    concept: '',
    traits,
    specialties: {},
    spheres: emptySpheres(),
    arete: 1,
    willpower: 5,
    willpowerSpent: 0,
    quintessence: 0,
    paradox: 0,
    health: HEALTH_LEVELS.map(() => ''),
    experience: '',
    backgrounds: [],
    otherTraits: [],
    merits: [],
    flaws: [],
    rotes: [],
    focus: [],
    wonders: [],
    history: '',
    goals: '',
    description: { text: '', age: '', apparentAge: '', sex: '', ethnicity: '', hair: '', eyes: '', height: '', weight: '' },
    gear: [],
    combat: [],
    notes: '',
  };
}

/** Quintessence and Paradox share one wheel: together they never exceed its 20 boxes. */
export function clampWheel(quintessence: number, paradox: number) {
  const p = Math.max(0, Math.min(WHEEL_SIZE, paradox));
  const q = Math.max(0, Math.min(WHEEL_SIZE - p, quintessence));
  return { quintessence: q, paradox: p };
}
