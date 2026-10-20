/**
 * The Backgrounds, Merits, Flaws and secondary Abilities M20 defines, for the pick lists on the sheet. Names,
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

/**
 * M20's secondary Abilities (pp. 289-300) and the optional catch-alls (p. 277), for Other
 * traits; Mr. Gone's newer sheet brings own-Ability rows in there too. `kind` says which
 * group. Cultural Savvy is only named in the quick reference, so it isn't here.
 */
export const SECONDARY_ABILITIES: Pick[] = [
  { name: 'Animal Kinship', kind: 'Talent', page: 289, hint: 'A way with animals: calming, reading and training them' },
  { name: 'Blatancy', kind: 'Talent', page: 291, hint: 'Doing the outrageous and making people swallow it' },
  { name: 'Carousing', kind: 'Talent', page: 292, hint: 'Partying with people until they open up' },
  { name: 'Do', kind: 'Talent', page: 292, hint: 'The Akashic way of movement, body and mind as one' },
  { name: 'Flying', kind: 'Talent', page: 293, hint: 'Moving through the air, by wings, magick or gear' },
  { name: 'High Ritual', kind: 'Talent', page: 293, hint: 'Grand ceremonial magick, done exactly right' },
  { name: 'Lucid Dreaming', kind: 'Talent', page: 294, hint: 'Staying aware and in control inside dreams' },
  { name: 'Seduction', kind: 'Talent', page: 295, hint: 'Attraction, flirting and getting what you want from it' },
  { name: 'Hobby Talent', kind: 'Talent', page: 277, hint: 'Optional: a knack refined by practice; name it yourself' },
  { name: 'Acrobatics', kind: 'Skill', page: 295, hint: 'Tumbling, balance, flips and landing on your feet' },
  { name: 'Archery', kind: 'Skill', page: 295, hint: 'Bows and crossbows' },
  { name: 'Biotech', kind: 'Skill', page: 295, hint: 'Living technology: grown, spliced and engineered' },
  { name: 'Energy Weapons', kind: 'Skill', page: 296, hint: 'Lasers, plasma and other beam guns' },
  { name: 'Hypertech', kind: 'Skill', page: 296, hint: 'Building and fixing tech beyond the mainstream' },
  { name: 'Jetpack', kind: 'Skill', page: 297, hint: 'Flying with a rocket on your back' },
  { name: 'Riding', kind: 'Skill', page: 297, hint: 'Horses and other mounts' },
  { name: 'Torture', kind: 'Skill', page: 298, hint: 'Breaking people, for answers or worse' },
  { name: 'Professional Skill', kind: 'Skill', page: 277, hint: 'Optional: one trained craft, such as cooking or gambling' },
  { name: 'Area Knowledge', kind: 'Knowledge', page: 298, hint: 'One place known inside out: streets, people, secrets' },
  { name: 'Belief Systems', kind: 'Knowledge', page: 298, hint: 'Religions and philosophies, and how their followers think' },
  { name: 'Cryptography', kind: 'Knowledge', page: 299, hint: 'Making and breaking codes' },
  { name: 'Demolitions', kind: 'Knowledge', page: 299, hint: 'Explosives: placing, shaping and defusing them' },
  { name: 'Finance', kind: 'Knowledge', page: 299, hint: 'Money, markets and where the money goes' },
  { name: 'Lore', tech: 'RD Data', kind: 'Knowledge', page: 299, hint: 'What you know about the Night-Folk: spirits, fae, vampires' },
  { name: 'Media', kind: 'Knowledge', page: 300, hint: 'How news and entertainment work, and how to steer them' },
  { name: 'Pharmacopoeia', kind: 'Knowledge', page: 300, hint: 'Drugs, medicines and poisons, and what they do' },
  { name: 'Expert Knowledge', kind: 'Knowledge', page: 277, hint: 'Optional: one field of learning, such as journalism' },
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

/** M20's sample concepts (p. 250), with the book's examples of each as the hint. */
export const CONCEPTS: Pick[] = [
  { name: 'Activist', page: 250, hint: 'Journalist, blogger, lobbyist, malcontent' },
  { name: 'Artist', page: 250, hint: 'Writer, dancer, painter, musician' },
  { name: 'Athlete', page: 250, hint: 'Team player, personal trainer, physical artisan, thrill-seeker' },
  { name: 'Caretaker', page: 250, hint: 'Parent, teacher, social worker, medical professional' },
  { name: 'Criminal', page: 250, hint: 'Gang member, con artist, drug dealer, thief' },
  { name: 'Executive', page: 250, hint: 'Tycoon, manager, facilitator, power-player' },
  { name: 'Guardian', page: 250, hint: 'Cop, security guard, conspiracy theorist, social watchdog' },
  { name: 'Intellectual', page: 250, hint: 'Scholar, professor, philosopher, social critic' },
  { name: 'Kid', page: 250, hint: 'Child, student, innocent, gutter-punk' },
  { name: 'Laborer', page: 250, hint: 'Factory worker, sales clerk, roadie, construction worker' },
  { name: 'Mystic', page: 250, hint: 'Priest or priestess, hermit, shaman, enlightened weirdo' },
  { name: 'Night-Owl', page: 250, hint: 'Bartender, bouncer, club-goer, celebrity' },
  { name: 'Rebel', page: 250, hint: 'Vagabond, outlaw, urban tribalist, subculture devotee' },
  { name: 'Technician', page: 250, hint: 'Mechanic, lab tech, craftsman, computer geek' },
  { name: 'Warrior', page: 250, hint: 'Soldier, mercenary, vigilante, prophet' },
];

/** The four Essences of the Avatar (pp. 266-267); Pattern is also called Static. */
export const ESSENCES: Pick[] = [
  { name: 'Dynamic', page: 266, hint: 'A passionate force for progress and change' },
  { name: 'Pattern', tech: 'Static', page: 267, hint: 'A grounded keeper of stability and order' },
  { name: 'Primordial', page: 267, hint: 'An elusive figure of primal mystery' },
  { name: 'Questing', page: 267, hint: 'A wandering dreamer who seeks new horizons' },
];

/** M20's personality Archetypes, for Nature and Demeanor (pp. 268-273). Make up your own too. */
export const ARCHETYPES: Pick[] = [
  { name: 'Activist', page: 268, hint: 'Fights for a cause and wants to change the world' },
  { name: 'Benefactor', page: 268, hint: 'Gives, helps and looks after others' },
  { name: 'Contrary', page: 268, hint: 'Goes against the grain on principle' },
  { name: 'Crusader', page: 268, hint: 'Driven by a higher goal, sometimes to a fault' },
  { name: 'Hacker', page: 269, hint: 'Takes systems apart to see how they work' },
  { name: 'Idealist', page: 269, hint: 'Believes a better world is possible' },
  { name: 'Innovator', page: 270, hint: 'Has to make something new' },
  { name: 'Kid', page: 270, hint: 'Wonder and innocence, and a need to be cared for' },
  { name: 'Loner', page: 270, hint: 'Goes it alone and trusts few' },
  { name: 'Machine', page: 270, hint: 'Logic, precision and efficiency first' },
  { name: 'Mad Scientist', page: 270, hint: 'Brilliant, restless and past every limit' },
  { name: 'Martyr', page: 271, hint: 'Suffers and sacrifices for others or a cause' },
  { name: 'Monster', page: 271, hint: 'Embraces the dark side and lets it show' },
  { name: 'Prophet', page: 272, hint: 'Speaks visions and truths others would rather not hear' },
  { name: 'Rogue', page: 272, hint: 'Looks out for number one and stays free' },
  { name: 'Sensualist', page: 272, hint: 'Lives for sensation and pleasure' },
  { name: 'Survivor', page: 272, hint: 'Endures anything and keeps going' },
  { name: 'Traditionalist', page: 272, hint: 'Upholds the old ways and proven order' },
  { name: 'Trickster', page: 272, hint: 'Laughs, pranks and deflates the pompous' },
  { name: 'Visionary', page: 273, hint: 'Sees what could be, beyond what is' },
];

/** M20's common paradigms for Focus (pp. 568-571): what the mage believes reality is. Make up your own too. */
export const PARADIGMS: Pick[] = [
  { name: 'A Mechanistic Cosmos', page: 568, hint: 'The universe is a vast machine that runs on laws you can learn' },
  { name: 'A World of Gods and Monsters', page: 568, hint: 'Mighty beings rule; mortals bargain, hide or fight' },
  { name: 'Bring Back the Golden Age!', page: 568, hint: 'Things were better once, and can be made so again' },
  { name: 'Creation is Innately Divine and Alive', page: 569, hint: 'Everything holds spirit and holiness' },
  { name: 'Divine Order and Earthly Chaos', page: 569, hint: 'A higher order exists; the world below has fallen from it' },
  { name: 'Everything is Chaos - You Only Think it Makes Sense', page: 570, hint: 'Order is a story we tell; underneath it all is chaos' },
  { name: 'Everything is Data', page: 570, hint: 'Reality is information that can be read and rewritten' },
  { name: 'Everything is an Illusion, Prison, or Mistake', page: 570, hint: 'The world is a trap to see through or break out of' },
  { name: "It's All Good - Have Faith!", page: 570, hint: 'Trust the greater good; belief carries you through' },
  { name: 'Might is Right', page: 570, hint: 'Power decides what is true, and the strong shape the world' },
  { name: 'One-Way Trip to Oblivion', page: 571, hint: 'Everything ends; decay is the deepest truth' },
  { name: 'Tech Holds All Answers', page: 571, hint: 'Science and technology can solve any problem' },
];

/** M20's practices for Focus (pp. 573-585): how the mage works magick. */
export const PRACTICES: Pick[] = [
  { name: 'Alchemy', page: 573, hint: 'Refining substances, and the self, through careful processes' },
  { name: 'The Art of Desire/Hypereconomics', page: 573, hint: 'Will, wealth and markets as levers on reality' },
  { name: 'Chaos Magick', page: 574, hint: 'Use whatever belief or tool works, drop it when it stops working' },
  { name: 'Craftwork', page: 574, hint: 'Making things by hand and putting power into them' },
  { name: 'Crazy Wisdom', page: 576, hint: 'Breaking sense and convention to shake reality loose' },
  { name: 'Cybernetics', page: 576, hint: 'Joining body, mind and machine' },
  { name: 'Dominion', page: 577, hint: 'Rule by authority and sheer will' },
  { name: 'Faith', page: 577, hint: 'Miracles through devotion to a higher power' },
  { name: 'Gutter Magick', page: 578, hint: 'Street tricks made from whatever is at hand' },
  { name: 'High Ritual Magick', page: 578, hint: 'Formal ceremony, correspondences and learned rites' },
  { name: 'Hypertech', page: 579, hint: 'Enlightened science beyond what the Masses accept' },
  { name: 'Maleficia', page: 579, hint: 'Power through pacts, harm and forbidden bargains' },
  { name: 'Martial Arts', page: 580, hint: 'Trained body and breath channel inner force' },
  { name: 'Medicine Work', page: 581, hint: 'Healing and harm through body and spirit' },
  { name: 'Reality Hacking', page: 581, hint: 'Finding and using exploits in the code of the world' },
  { name: 'Shamanism', page: 582, hint: 'Dealing with spirits and walking between worlds' },
  { name: 'Voudoun', page: 583, hint: 'Serving the lwa through rite, song and offering' },
  { name: 'Weird Science', page: 584, hint: 'Wild invention that works because its maker believes it will' },
  { name: 'Witchcraft', page: 584, hint: 'Folk magic of herbs, charms and the turning year' },
  { name: 'Yoga', page: 585, hint: 'Uniting body, breath and mind to master the self' },
];

/** M20's common instruments for Focus (pp. 588-600): the tools a mage works through. */
export const INSTRUMENTS: Pick[] = [
  { name: 'Armor', page: 588, hint: 'Protective gear made or charged by the mage' },
  { name: 'Artwork', page: 588, hint: 'Drawing, painting, sculpture, graffiti' },
  { name: 'Blessings and Curses', page: 588, hint: 'Spoken favor or ill luck laid on someone' },
  { name: 'Blood and Other Fluids', page: 588, hint: 'The body\'s fluids and the life in them' },
  { name: 'Bodywork', page: 589, hint: 'Massage, acupuncture, energy work by touch' },
  { name: 'Bones, Skins, Organs, and Other Remains', page: 589, hint: 'What is left of living things' },
  { name: 'Books, Scrolls, and Periodicals', page: 589, hint: 'Written lore, old grimoires to zines' },
  { name: 'Brain/Computer Interface', page: 589, hint: 'Wiring the mind straight into machines' },
  { name: 'Brews, Potions, Powders, and Other Concoctions', page: 589, hint: 'Mixtures made to carry an effect' },
  { name: 'Cards, Dice, and Other Instruments of Chance', page: 589, hint: 'Tarot, dice and lots that steer probability' },
  { name: 'Celestial Alignments', page: 590, hint: 'Stars, planets and the right moment' },
  { name: 'Circles, Pentacles, and Other Geometric Designs', page: 590, hint: 'Shapes that bound and channel power' },
  { name: 'Computers and IT Gear', page: 590, hint: 'Hardware, code and the network' },
  { name: 'Crossroads and Crossing-Days', page: 590, hint: 'Places and times where ways meet' },
  { name: 'Cups, Chalices, Cauldrons, and Other Vessels', page: 590, hint: 'Containers that hold and mix' },
  { name: 'Dances, Gestures, Postures, and Other Movement Practices', page: 590, hint: 'Moving the body to move reality' },
  { name: 'Devices and Machines', page: 591, hint: 'Built tools, from clockwork to engines' },
  { name: 'Drugs and Poisons', page: 591, hint: 'Substances that alter body and mind' },
  { name: 'Elements', page: 591, hint: 'Fire, water, earth, air and their kin' },
  { name: 'Energy', page: 591, hint: 'Life force and raw power, channeled' },
  { name: 'Eye Contact', page: 591, hint: 'A look that charms, frightens or binds' },
  { name: 'Fashion', page: 591, hint: 'Clothes, style, or the lack of them' },
  { name: 'Food and Drink', page: 591, hint: 'Meals and drinks charged with intent' },
  { name: 'Formulae, Equations, and Sacred or Advanced Mathematics', page: 592, hint: 'Math as a key to reality' },
  { name: 'Gadgets and Inventions', page: 592, hint: 'Personal, one-of-a-kind devices' },
  { name: 'Gems, Stones, and Minerals', page: 592, hint: 'Crystals, metals and their properties' },
  { name: 'Group Rites', page: 592, hint: 'Raising power together' },
  { name: 'Herbs, Roots, Seeds, Flowers, and Plants', page: 592, hint: 'Growing things and their uses' },
  { name: 'Household Tools', page: 592, hint: 'Brooms, knives, needles: everyday things' },
  { name: 'Knots and Ropes', page: 593, hint: 'Binding and loosing, quite literally' },
  { name: 'Laboratories and Lab Gear', page: 593, hint: 'Beakers, crucibles and the work space' },
  { name: 'Languages', page: 593, hint: 'Words, old tongues and code' },
  { name: 'Mass Media', page: 594, hint: 'Broadcasts, feeds and viral spread' },
  { name: 'Meditation', page: 594, hint: 'Stillness and inner focus' },
  { name: 'Management and Human Resources', page: 595, hint: 'Getting things done through other people (optional rule)' },
  { name: 'Money and Wealth', page: 596, hint: 'Cash and the deals it moves' },
  { name: 'Music', page: 596, hint: 'Song, rhythm and sound' },
  { name: 'Nanotech', page: 596, hint: 'Swarms of tiny machines' },
  { name: 'Numbers and Numerology', page: 596, hint: 'The meaning hidden in numbers' },
  { name: 'Offerings and Sacrifices', page: 596, hint: 'Giving something up to get something' },
  { name: 'Ordeals and Exertion', page: 597, hint: 'Pain and effort that sharpen the will' },
  { name: 'Prayers and Invocations', page: 597, hint: 'Calling on higher or lower powers' },
  { name: 'Sacred Iconography', page: 598, hint: 'Holy symbols and images' },
  { name: 'Sex and Sensuality', page: 598, hint: 'Intimacy as a channel of power' },
  { name: 'Social Domination', page: 598, hint: 'Commanding presence that makes people yield' },
  { name: 'Symbols', page: 598, hint: 'Signs and sigils that stand for power' },
  { name: 'Thought Forms', page: 598, hint: 'Ideas grown into beings of their own' },
  { name: 'Toys', page: 599, hint: 'Playthings, cute or creepy' },
  { name: 'Tricks and Illusions', page: 599, hint: 'Sleight of hand, cons and misdirection' },
  { name: 'True Names', page: 599, hint: 'Knowing what something truly is called' },
  { name: 'Vehicles', page: 599, hint: 'Cars, bikes, ships and stranger rides' },
  { name: 'Voice and Vocalizations', page: 599, hint: 'Chant, song, shouts and sounds' },
  { name: 'Wands, Rods, and Staves', page: 600, hint: 'The classic pointed tool of will' },
  { name: 'Weapons', page: 600, hint: 'Blades and guns as focus' },
  { name: 'Writings, Inscriptions, and Runes', page: 600, hint: 'Marks that hold meaning and power' },
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
