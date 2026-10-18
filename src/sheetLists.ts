/**
 * The Backgrounds, Merits and Flaws M20 defines, for the pick lists on the sheet. Names,
 * costs and pages from the book; the one-line hints are our own words. Free-form names
 * stay possible everywhere: sourcebooks add many more.
 */
export interface Pick {
  name: string;
  /** the Technocratic name, when it has one */
  tech?: string;
  /** a Technocracy-only Background */
  technocracy?: boolean;
  /** Merit and Flaw point cost as printed ("1 or 3", "1 to 5") */
  cost?: string;
  /** Physical, Mental, Social, Supernatural */
  kind?: string;
  /** printed M20 page */
  page: number;
  hint: string;
}

export const BACKGROUNDS: Pick[] = [
  { name: 'Allies', page: 303, hint: 'Friends who stick their necks out for you' },
  { name: 'Alternate Identity', page: 304, hint: 'A second life with papers that hold up' },
  { name: 'Arcane', tech: 'Cloaking', page: 305, hint: 'The world tends to overlook and forget you' },
  { name: 'Avatar', tech: 'Genius', page: 305, hint: 'The strength of your Avatar; Quintessence it can draw' },
  { name: 'Backup', technocracy: true, page: 306, hint: 'Agents you can call in' },
  { name: 'Blessing', page: 307, hint: 'A small supernatural gift' },
  { name: 'Certification', technocracy: true, page: 308, hint: 'Clearance to use specialised gear and procedures' },
  { name: 'Chantry', tech: 'Construct', page: 308, hint: 'A share in a stronghold you hold with others' },
  { name: 'Contacts', page: 309, hint: 'People who pass you information' },
  { name: 'Cult', page: 310, hint: 'Followers who believe in you and your Arts' },
  { name: 'Demesne', page: 310, hint: 'A private realm inside your mind' },
  { name: 'Destiny', page: 311, hint: 'A fate that drives and protects you' },
  { name: 'Dream', tech: 'Hypercram', page: 312, hint: 'Drawing on knowledge you do not really have' },
  { name: 'Enhancement', page: 312, hint: 'Body modifications, at the price of permanent Paradox' },
  { name: 'Fame', page: 313, hint: 'People know who you are' },
  { name: 'Familiar', tech: 'Companion', page: 314, hint: 'A spirit bound into a creature or device that aids you' },
  { name: 'Influence', page: 316, hint: 'Pull in mortal institutions' },
  { name: 'Legend', page: 317, hint: 'A heroic archetype you can call upon' },
  { name: 'Library', page: 318, hint: 'Books and data for your research' },
  { name: 'Mentor', page: 318, hint: 'A teacher who guides and speaks for you' },
  { name: 'Node', page: 319, hint: 'A place of power that yields Quintessence' },
  { name: 'Past Lives', page: 320, hint: 'Memories and skills from earlier incarnations' },
  { name: 'Patron', page: 320, hint: 'A powerful sponsor with plans for you' },
  { name: 'Rank', technocracy: true, page: 312, hint: 'Your standing in the Union hierarchy' },
  { name: 'Requisitions', technocracy: true, page: 321, hint: 'Gear you can draw from the Union' },
  { name: 'Resources', page: 322, hint: 'Money, property and income' },
  { name: 'Retainers', page: 323, hint: 'Loyal followers who serve you' },
  { name: 'Sanctum', tech: 'Laboratory', page: 323, hint: 'A private place where your paradigm holds sway' },
  { name: 'Secret Weapons', technocracy: true, page: 325, hint: 'Prototype gear to field-test' },
  { name: 'Spies', page: 325, hint: 'A network that watches for you' },
  { name: 'Status', page: 325, hint: 'Standing among other mages' },
  { name: 'Totem', page: 326, hint: 'A great spirit that watches over you' },
  { name: 'Wonder', page: 328, hint: 'A magickal item of your own' },
];

export const MERITS: Pick[] = [
  { name: 'Acute Senses', cost: '1 or 3', kind: 'Physical', page: 642, hint: 'One sense, or all five, sharper than normal' },
  { name: 'Berserker', cost: '4', kind: 'Mental', page: 644, hint: 'A combat rage that is a gift and a danger' },
  { name: 'Dark Triad', cost: '3', kind: 'Social', page: 643, hint: 'A charming, ruthless rule-breaker people follow' },
  { name: 'Language', cost: '1', kind: 'Mental', page: 643, hint: 'One more language per point' },
  { name: 'Stormwarden', tech: 'Quantum Voyager', cost: '3 or 5', kind: 'Supernatural', page: 643, hint: 'Crossing the Gauntlet without the Avatar Storm tearing at you' },
  { name: 'Ties', cost: '3', kind: 'Social', page: 643, hint: 'Pull with one group: police, a gang, a cartel' },
  { name: 'Too Tough to Die', cost: '5', kind: 'Physical', page: 644, hint: 'You can soak lethal damage' },
  { name: 'True Faith', cost: '7', kind: 'Supernatural', page: 644, hint: 'Belief in a higher power strong enough for miracles' },
  { name: 'Umbral Affinity', cost: '4', kind: 'Supernatural', page: 644, hint: 'At home in the Otherworlds' },
];

export const FLAWS: Pick[] = [
  { name: 'Addiction', cost: '1 or 3', kind: 'Physical', page: 646, hint: 'A habit or substance that runs your life' },
  { name: 'Construct', cost: '2', kind: 'Social', page: 647, hint: 'Made in a lab, and people sense it' },
  { name: 'Cursed', cost: '1 to 5', kind: 'Supernatural', page: 646, hint: 'Misfortune of an uncanny kind follows you' },
  { name: 'Deranged', cost: '3 or 5', kind: 'Mental', page: 648, hint: 'A lasting derangement' },
  { name: 'Echoes', cost: '1 to 5', kind: 'Supernatural', page: 646, hint: 'Strange phenomena gather around you' },
  { name: 'Enemy', cost: '1 to 5', kind: 'Social', page: 647, hint: 'Someone wants to make your life hell' },
  { name: 'Genetic Flaw', cost: '1', kind: 'Physical, Mental or Social', page: 650, hint: 'A side effect of a heavily altered Pattern' },
  { name: 'PTSD', cost: '2 to 5', kind: 'Mental', page: 647, hint: 'A hair-trigger response to certain situations' },
  { name: 'Stress Atavism', cost: '4', kind: 'Mental', page: 644, hint: 'Under pressure you lose yourself, like the Berserker Merit' },
];

/** The lowest cost of a printed range, as the starting value. */
export const firstCost = (cost?: string) => parseInt(cost ?? '', 10) || 0;
