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

/** M20's three big allegiances (the sheet's Affiliation); `tech` holds the longer name. */
export const AFFILIATIONS: Pick[] = [
  { name: 'Traditions', tech: 'Council of Nine Mystic Traditions', page: 147, hint: 'The mystic Council: nine paths of willworking' },
  { name: 'Technocracy', tech: 'Technocratic Union', page: 166, hint: 'Enlightened science that guards the consensus' },
  { name: 'Disparate', tech: 'Disparate Alliance', page: 196, hint: 'The Crafts that answer to neither' },
];

/** The groups within each Affiliation (the sheet's Sect); `tech` holds M20's other name. */
export const SECTS: (Pick & { affiliation: string })[] = [
  { affiliation: 'Traditions', name: 'Akashic Brotherhood', tech: 'Akashayana', kind: 'Tradition', page: 148, hint: 'Martial artists who perfect body and mind as one' },
  { affiliation: 'Traditions', name: 'Celestial Chorus', kind: 'Tradition', page: 150, hint: 'Singers of the One, magick as faith and devotion' },
  { affiliation: 'Traditions', name: 'Cult of Ecstasy', tech: 'Sahajiya', kind: 'Tradition', page: 152, hint: 'Seers who reach truth through rapture and altered states' },
  { affiliation: 'Traditions', name: 'Dreamspeakers', tech: "Kha'vadi", kind: 'Tradition', page: 154, hint: 'Shamans who walk and bargain with the spirits' },
  { affiliation: 'Traditions', name: 'Euthanatos', tech: 'Chakravanti', kind: 'Tradition', page: 156, hint: 'Keepers of the Wheel of death and rebirth' },
  { affiliation: 'Traditions', name: 'Order of Hermes', kind: 'Tradition', page: 158, hint: 'High Ritual Magick, Houses and arcane formulae' },
  { affiliation: 'Traditions', name: 'Society of Ether', tech: 'Sons of Ether', kind: 'Tradition', page: 160, hint: 'Mad scientists of Etheric weird tech' },
  { affiliation: 'Traditions', name: 'Verbena', kind: 'Tradition', page: 162, hint: 'Blood, life and the old pagan ways' },
  { affiliation: 'Traditions', name: 'Virtual Adepts', tech: 'Mercurial Elite', kind: 'Tradition', page: 164, hint: 'Reality hackers of the Digital Web' },
  { affiliation: 'Technocracy', name: 'Iteration X', kind: 'Convention', page: 186, hint: 'Machines, cybernetics and perfect calculation' },
  { affiliation: 'Technocracy', name: 'New World Order', tech: 'NWO', kind: 'Convention', page: 188, hint: 'Information, surveillance and the shaping of minds' },
  { affiliation: 'Technocracy', name: 'Progenitors', kind: 'Convention', page: 190, hint: 'Life science, genetics and medicine' },
  { affiliation: 'Technocracy', name: 'Syndicate', kind: 'Convention', page: 192, hint: 'Money, markets and the power they buy' },
  { affiliation: 'Technocracy', name: 'Void Engineers', kind: 'Convention', page: 194, hint: 'Explorers of deep space and the spirit worlds' },
  { affiliation: 'Disparate', name: 'Ahl-i-Batin', kind: 'Craft', page: 202, hint: 'The Subtle Ones, seekers of Unity' },
  { affiliation: 'Disparate', name: "Bata'a", kind: 'Craft', page: 204, hint: 'Afro-Caribbean workers with the spirits' },
  { affiliation: 'Disparate', name: 'Children of Knowledge', tech: 'True Solificati', kind: 'Craft', page: 206, hint: 'Alchemists of the Great Work' },
  { affiliation: 'Disparate', name: 'Hollow Ones', kind: 'Craft', page: 208, hint: 'Gothic romantics who learned magick on their own terms' },
  { affiliation: 'Disparate', name: 'Kopa Loei', kind: 'Craft', page: 210, hint: 'Hawaiian guardians of the old gods and the land' },
  { affiliation: 'Disparate', name: 'Ngoma', kind: 'Craft', page: 212, hint: 'African high ritualists and keepers of the ancestors' },
  { affiliation: 'Disparate', name: 'Orphans', kind: 'Craft', page: 214, hint: 'Self-taught mages with no group behind them' },
  { affiliation: 'Disparate', name: 'Sisters of Hippolyta', tech: 'Hippolytoi', kind: 'Craft', page: 216, hint: 'A sisterhood of women and the Goddess' },
  { affiliation: 'Disparate', name: 'Taftani', kind: 'Craft', page: 218, hint: 'Persian weavers of spirits and bold magick' },
  { affiliation: 'Disparate', name: 'Templar Knights', kind: 'Craft', page: 220, hint: 'A Christian warrior order' },
  { affiliation: 'Disparate', name: 'Wu Lung', kind: 'Craft', page: 222, hint: "Dragon wizards of Heaven's bureaucracy" },
];

/** Which Affiliation a typed one most likely means ("Council", "Union", "Tradition"...). */
export function affiliationOf(text: string): string | null {
  const t = text.toLowerCase();
  if (/tradition|council/.test(t)) return 'Traditions';
  if (/techno|union/.test(t)) return 'Technocracy';
  if (/disparate|craft/.test(t)) return 'Disparate';
  return null;
}

/**
 * Suggested specialties per Attribute, Ability and Sphere: our own short lists in the
 * spirit of M20's examples. Any specialty can be typed instead.
 */
export const SPECIALTIES: Record<string, string[]> = {
  Strength: ['Lean', 'Deceptive Strength', 'Raw Power', 'Iron Grip', 'Lifting', 'Powerful grip', 'Wrestling', 'Sudden bursts', 'Carrying loads'],
  Dexterity: ['Smooth', 'Graceful', 'Nimble', 'Feline Reflexes', 'Hand-Eye Coordination', 'Quick hands', 'Balance', 'Reflexes', 'Precise'],
  Stamina: ['Tireless', 'Tough', 'Tenacious', 'Inexhaustible', 'Energizer Bunny', 'Shrugs off pain', 'Iron stomach', 'Holding breath'],
  Charisma: ['Charming', 'Sexy', 'Bold', 'Inspirational', 'Sophisticated', 'Regal', 'Inspiring', 'Smooth talker', 'Commanding presence', 'Sincere'],
  Manipulation: ['Guile', 'Charm', 'Eloquence', 'Emotional Appeals', 'True Believer', 'Persuasion', 'Lies', 'Seduction', 'Haggling', 'Reading the room'],
  Appearance: ['Cute', 'Hawt', 'Captivating', 'Roguish', 'Adorable', 'Classic Hollywood Beauty', 'Striking', 'Elegant', 'Alluring', 'Unforgettable eyes'],
  Perception: ['Uncanny Insight', 'Astute', 'Intuitive', 'Sharp Senses', 'Hawkeye', 'Keen eyes', 'Sharp hearing', 'Details', 'Ambushes', 'Hunches'],
  Intelligence: ['Book-Learning', 'Deep Thoughts', 'Bright', 'Creative', 'Keen-Edged Mind', 'Analysis', 'Memory', 'Logic', 'Lateral thinking', 'Book smarts'],
  Wits: ['Combat Reflexes', 'Street Survivor', 'Cunning', 'Feral', 'Fox-Witted', 'Quick thinking', 'Comebacks', 'Ambushes', 'Improvising', 'Keeping cool'],
  Alertness: ['Ambushes', 'Instincts', 'Omens', 'Urban Wastelands', 'Combat Zones', 'Covert Pursuit', 'Warning Signs', 'Danger sense', 'Crowds', 'Noises', 'Being followed', 'Hidden weapons'],
  Art: ['Painting', 'Video', 'Singing', 'Acting', 'Dance', 'Mixed Media', 'CGI', 'Model-Making', 'Classical Art', 'Avant-Garde', 'Unrefined Intuition', 'Mad Brilliance', 'Uncanny Truths', 'Primitive Techniques', 'specific musical instruments', 'Music', 'Writing', 'Sculpture', 'Photography'],
  Athletics: ['Bodybuilding', 'Cycling', 'Climbing', 'Equestrian', 'Swimming', 'Survival Training', 'Extreme Endurance', 'FlowArts', 'Parkour', 'Skiing', 'specific sports', 'Running', 'Throwing'],
  Awareness: ['Omens', 'Auras', 'Resonance', 'Weird Feelings', 'Mystic Instincts', 'Hidden Magic', 'Spiritual Vidare', 'Magick', 'Spirits', 'Ghosts', 'Gut feelings'],
  Brawl: ['Barroom', 'Boxing', 'Beast-Form Fighting', 'Dirty Fighting', 'Disarming', 'Peaceful Warrior', 'Grappling', 'Bar fights', 'Headbutts'],
  Empathy: ['Hidden Feelings', 'Subtle Cues', 'Emotional Manipulation', 'Trust', 'Sensing Emotions', 'Life-Force Fluctuations', 'Interpersonal Psychology', 'Seeing Past the Mask', 'I Know What You Need', 'Emotions', 'Lies', 'Motives', 'Comforting', 'Reading people'],
  Expression: ['Passion Plays', 'Poetic Eloquence', 'Motivational Speaking', 'Tactical Rhetoric', 'Preaching', 'Command', 'Shut-Downs', 'Rocking the Mic', 'Speeches', 'Poetry', 'Storytelling', 'Debate', 'Writing'],
  Intimidation: ['Bad Cop', 'BDSM', 'Pack Hierarchy', 'Cold Stare', 'Brutal Threats', 'Topping From Below', 'PantsCrapping Terror', 'Threats', 'Quiet menace', 'Staredowns', 'Interrogation', 'Bullying'],
  Leadership: ['Competent', 'Inspiring', 'Regal', 'Harsh', 'Do-Or-Die', 'Soft-Voiced Command', 'Command', 'Inspiration', 'Tactics', 'Rallying', 'Delegating'],
  Streetwise: ['Theft', 'Survival Skills', 'Outlaw Hacker Culture', 'Crash Space', 'Street Politics', 'Urban Tribes', 'Trust', 'Hiding Spots', 'Sex Trade', 'Drug Trade', 'Music Culture', 'Gangs', 'Seeing Nothing Yet Everything', 'Black market', 'Rumors', 'Fencing', 'Finding a fix'],
  Subterfuge: ['Con Games', 'Sexual Manipulation', 'False Innocence', 'Politics', 'Law', 'Cheating', 'Undermining Opposition', 'Sensing Deceptions', 'Lying', 'Disguise', 'Seduction', 'Misdirection', 'Poker face'],
  Crafts: ['Armor', 'Weaponsmith', 'Carpentry', 'Invention', 'Tailoring', 'Design', 'Vehicle Repair', 'Home Repair', 'Leatherwork', 'High-Tech Tinkering', 'Electronics', 'Smithing', 'Mechanics', 'Jewelry'],
  Drive: ['Racing', 'Pursuit', 'Shadowing', 'Stunts', 'Vintage Cars', 'Heavy Trucks', 'Long-Distance', 'Shaking Tails', 'Bad Conditions', 'Snow and Ice', 'Off-Road', 'Showing Off', 'Motorcycles', 'Trucks'],
  Etiquette: ['High Society', 'Royalty', 'Dining', 'Subcultures', 'International Travel', 'Umbral Courts', 'Master Mages', 'Internet Culture', 'Digital Web', 'Technocratic Politesse', 'Business', 'Street', 'Mage protocol', 'Diplomacy'],
  Firearms: ['Sniper', 'Quick-Draw', 'Target Shooting', 'Rifles', 'Handguns', 'Drive-Bys', 'Military Hardware', 'Heavy Weapons', 'Vintage Firearms', 'Cybernetic Weaponry', 'Pistols', 'Shotguns', 'Quick draw', 'Sniping'],
  'Martial Arts': ['Soft Style', 'Hard Style', 'Aikido', 'Judo', 'Karate', 'Muay Thai', 'Kuei Lung Chuan', 'Kung fu', 'Krav Maga', 'Do'],
  Meditation: ['Zen', 'Yoga', 'Do', 'Trance', 'Nodes', 'Relaxation', 'Therapy', 'Tantra', "T'ai Chi", 'Virtual Reality', 'Focus', 'Meditative Movement', 'Grace Under Pressure', 'Breathing', 'Calm under fire', 'Visualization'],
  Melee: ['Blades', 'Polearms', 'Staves', 'Stunts', 'Combat Sports', 'Weapons of Opportunity', 'Kendo', 'Fencing', 'Martial Arts Weapons', 'Knives', 'Swords', 'Improvised weapons', 'Disarming'],
  Research: ['Arcane Collections', 'Forbidden Lore', 'Hidden Sources', 'Secrets', 'Net Searches', 'Oral Traditions', 'specific topics', 'Libraries', 'Archives', 'Online searches', 'Occult texts', 'Public records'],
  Stealth: ['Blending Into Shadows', 'Woodlands', 'Alleys', 'Concealment', 'Squeaky Floors', 'Moving Silently', 'Shadowing a Target', 'Shadowing', 'Hiding', 'Silent movement', 'Urban', 'Wilderness'],
  Survival: ['Old-School Wisdom', 'Traps', 'Shelters', 'Weather Hazards', 'End-Times Preparedness', 'specific environments', 'Tracking', 'Foraging', 'Shelter', 'Urban survival', 'Navigation'],
  Technology: ['Electronics', 'Vehicles', 'Modification', 'Invention', 'Media Tech', 'Technomagick', 'Hardware', 'Security systems', 'Repair', 'Jury-rigging'],
  Academics: ['Teaching', 'Liberal Arts', 'specific field of study', 'History', 'Philosophy', 'Literature', 'Languages', 'Theology'],
  Computer: ['General Use', 'Internet', 'Programming', 'Repair', 'IT Culture', 'Office Tech', 'Entertainment Tech', 'CGI', 'Data Systems', 'Hacking', 'Cracking', 'Organization', 'Current Market', 'Underground', 'Advanced Tech', 'Cryptanalysis', 'Networks', 'Data mining', 'Security'],
  Cosmology: ['Astral Voyaging', 'Courts', 'Paths', 'Hazards', 'Omens', 'Realms', 'Navigation', 'Dimensional Exploration', 'Threat Factors', 'Otherworldly Etiquette', 'Umbra', 'Horizon', 'Digital Web', 'Spirit courts'],
  Enigmas: ['Riddles', 'Puzzles', 'Metaphysics', 'Deduction', 'Zen', 'Arcane Enigmas', 'Codes and Ciphers', 'Classic Mysteries', 'Intuitive Leaps', 'Deciphering Madness', 'Paradoxes', 'Codes', 'Patterns'],
  Esoterica: ['Yoga', 'Tantra', 'Herbalism', 'Kabbalah', 'Fortune-Telling', 'Hypnosis', 'Astrology', 'Celestiography', 'Demonology', 'Sacred Geometry', 'Gematria', 'Goetia', 'Prophecies', 'Omens', "T'ai Chi", 'I Ching', 'Stone Lore', 'Alchemy', 'Symbolism', 'Transhumanist Theory', 'Esoteric Musicology', 'Bakemono-Jutsu', 'Iconology', 'Numerology', 'Voodoo', 'Crystalmancy', 'Tarot', 'specific arcane languages', 'Sigils', 'Ritual', 'Correspondences'],
  Investigation: ['Forensics', 'Deduction', 'Interrogation', 'Crime Scenes', 'Data Sorting', 'Criminal Psychology', 'Spotting Clues', 'Personal Details', 'Paranormal Investigations', 'Interviews', 'Surveillance', 'Missing persons'],
  Law: ['Local Beat', 'Crimes', 'Customs', 'Procedures', 'Bribery', 'Internal Affairs', 'Courts', 'International Agencies', 'Occult Crimes', 'Jurisdiction', 'Chain of Command', 'Bending the Rules', 'Criminal law', 'Contracts', 'Police procedure', 'Loopholes', 'Courtroom'],
  Medicine: ['First Aid', 'Surgery', 'Nursing', 'BareBones Facilities', 'Improvised Techniques', 'Traditional Remedies', 'Alternative Medicine', 'Physical Deconstruction', 'Magickal Healing', 'Frankensteinian Techniques', 'Live', 'Damn You - LIVE!', 'Pharmacology', 'Diagnosis', 'Emergency care'],
  Occult: ['Neopaganism', 'Occult History', 'Conspiracy Theories', 'Secret Societies', 'New Age', 'Alternative Sciences', 'Mystic Lore', 'Folk Magic', 'Moral Panic', 'Urban Legends', 'Satanic Folklore', 'Pop-Culture Satanism', 'Actual Satanism', 'any specific occult discipline or field', 'Vampires', 'Ghosts', 'Rituals', 'Curses', 'Folklore'],
  Politics: ['Legal Codes', 'Law Enforcement', 'Gang Culture', 'Local Government', 'National Government', 'International Politics', 'Corporate Influence', 'Media Influence', 'Blogosphere', 'Loopholes', 'Dog Whistles', 'Radical Politics', 'Celebrity Media', 'Organized Crime', 'Power-Brokering', 'Specific Groups', 'Specific Cultures', 'Specific Supernatural Groups', 'Local', 'International', 'Bureaucracy', 'Elections', 'Mage politics'],
  Science: ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'Engineering'],
  Correspondence: ['Scrying', 'Teleportation', 'Wards', 'Co-location', 'Distant touch'],
  Entropy: ['Luck', 'Decay', 'Probability', 'Fate', 'Chaos'],
  Forces: ['Fire', 'Electricity', 'Light', 'Sound', 'Kinetics', 'Weather'],
  Life: ['Healing', 'Shapechanging', 'Animals', 'Plants', 'Enhancement'],
  Matter: ['Metals', 'Transmutation', 'Shaping', 'Machines', 'Gems'],
  Mind: ['Telepathy', 'Illusions', 'Mind control', 'Astral travel', 'Emotions'],
  Prime: ['Quintessence', 'Nodes', 'Tass', 'Wonders', 'Countermagick'],
  Spirit: ['Spirits', 'Umbra', 'The dead', 'Gauntlet', 'Bindings'],
  Time: ['Precognition', 'Postcognition', 'Speed', 'Slowing time', 'Delays'],
};
