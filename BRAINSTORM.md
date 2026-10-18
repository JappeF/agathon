# Agathon - brainstorm

Werkdocument van de grill-sessie. Wat onder "Besloten" staat is afgesproken, de rest niet.

## Wat het is

Offline-first PWA voor Mage: The Ascension (M20), met React + TypeScript + Vite + vite-plugin-pwa, Cloudflare Pages,
verify-scripts met playwright-core en Edge.

Naam: Agathon (Grieks *to agathon*, "het Goede"). Let op: de lore-claim uit de Google-chat
(Agathon als bekende Virtual Adept) staat niet in M20 of How Do You DO That.

## Besloten

### Doel en gebruik
- **Hoofdmoment:** aan tafel, op de telefoon (mobiel eerst). Daarna: thuis voorbereiden
  (character, spells uitzoeken).
- **De app is hulp, inspiratie en klankbord**, geen rules engine. Rollen gebeurt buiten de
  app; de app houdt alleen de stand bij (Paradox, Quintessence) als je die invult.
- **Spell-ideeen zijn de kern:** elk idee krijgt een eigen dossier met versies en de uitkomst
  aan tafel ("ST zei vulgar, 3 Paradox"). Dossiers zijn persoonlijk (per character); delen
  gaat als kopie via link of QR. Geen gedeelde cabal-grimoire in v1.
- **Taal: Engels** voor interface, bibliotheek en context pack (termen zoals in de boeken).
  Vertalingen zijn een nice-to-have.

### Effect-bibliotheek
- De effecten en voorbeelden uit M20 en How Do You DO That komen in de app, in **eigen
  herschreven tekst** met boek + pagina. Geen boektekst meeleveren (de app is publiek).
- De boeken hebben geen rote-lijst: de effecten staan in lopende tekst, vaak met
  alternatieven ("Entropy 2, Forces 2, or both"; "Forces or Matter 3"). Datamodel: een
  effect heeft een of meer alternatieve combinaties van "Sphere >= rank", plus optionele
  toevoegingen.
- Uitlezen gebeurt met de hand per sectie (geen regex-klus), met een veld
  *Coincidental if...* waar het boek dat zegt.
- **Omvang v1: alles uit beide boeken** (Sphere-rank-beschrijvingen uit M20, alle feats uit
  How Do You DO That; naar schatting 300-500 entries).
- **Controle:** een build-script legt elke entry naast de lokale boektekst van zijn pagina en
  meldt Sphere-ranks die daar niet staan, entries zonder pagina/combinatie en dubbelingen.
  Het rapport moet op 0 staan. Per batch een steekproef van ~10 entries ter controle, met de
  originele passage ernaast.
- **Zoeken op Spheres, standaard "precies deze combinatie"** (`mind:3 forces:2`). Daarnaast
  een schakelaar "wat kan mijn character casten" op de dots van het actieve character, met
  een sectie "net buiten bereik". Verder zoek-operators, ook met de
  Technocratische namen (`data:`, `primal:`, `dimsci:`).

### Vulgar mitigation
1. Per effect uit de boeken (offline).
2. Een vaste M20-checklist (witnesses, afstand, timing, focus/instruments, Abilities,
   ritual casting), gefilterd op het effect en de dots (offline).
3. Een verhaal dat past bij de scene en het paradigm: via de AI.

### AI
- **Eerst kijken hoe ver we met alleen de boeken komen.**
- **v1: promptgeneratie ("context pack").** De knop *Copy for AI* stelt lokaal een
  prompt samen met de rol-instructie, het character, het spell-idee en de versies, de
  relevante regelsamenvattingen en passages uit je eigen PDF's (lokaal geindexeerd). Die
  plak je in je eigen Claude/ChatGPT/Gemini. Het antwoord terugplakken mag; een JSON-blok
  wordt dan ingelezen en als versie opgeslagen.
- Geen key, geen server, geen kosten.

### Eigen boeken in de app (context-laag 2)
- Je kiest de PDF in de app; pdf.js haalt lokaal de tekst per pagina eruit, alleen die tekst
  gaat in IndexedDB (~3,5 MB voor beide boeken). De PDF zelf wordt niet bewaard. Het boek
  wordt herkend aan de inhoud, zodat de paginanummers kloppen met de bibliotheek.
- Het context pack neemt de pagina's van de gekoppelde effecten, de regelpagina's van de
  betrokken Spheres en de vaste pagina's over coincidental/vulgar en Paradox. Voor het
  kopieren zie je de passages (vinkjes) en de lengte; standaard onder ~15 pagina's.
- De boekindex kan op de desktop gemaakt worden en als privebestand naar de telefoon; hij
  zit nooit in een character-export of deellink.
- v1: alleen M20 core en How Do You DO That. Geen vrij zoeken in de boektekst.

### Character sheet
- **De volledige M20-sheet** (Attributes, Abilities, alle Backgrounds, merits/flaws,
  health, XP), goed leesbaar op mobiel. Geen creation-wizard.
- **Tabbladen:** Magick (Arete, Spheres, paradigm, instruments, het wiel) | Traits |
  Background | Notes, met een vaste balk voor health en Willpower.
- **Speelmodus en bewerkmodus:** in de speelmodus zijn alleen de trackers aan te tikken
  (Willpower, health, Quintessence/Paradox); dots zitten vast tot je het slotje opent.
- Een trait per regel (naam links, dots rechts, cijfer erbij), tikdoelen van 44px, een
  schakelaar om Abilities met 0 dots te verbergen. Op tablet/desktop meer kolommen.

### Ontwerp en app
- Paars en goud. **Cinzel** voor koppen (Cinzel Decorative voor het logo), **Manrope**
  voor de UI-tekst, **EB Garamond cursief** alleen voor flavortekst en citaten. Alles
  zelf gehost via fontsource (offline).
- **Animaties** (alleen CSS, uit bij `prefers-reduced-motion`): langzaam opstijgende
  gouden Quintessence-vonkjes, en achter de header een ring met de negen
  Sphere-symbolen die heel langzaam draait.
- PWA met auto-update (update-toast, elk uur checken en bij focus).
- Characters en sets delen als bestand, link of QR.

### PDF-sheet import
- Mr. Gone's sheets. (De officiele M20-sheets zijn niet invulbaar, dus Mr. Gone's sheets
  zijn de enige invulbare in omloop; een tweede importformaat is niet nodig.)
- Voorbeeld: een ingevulde sheet in `refs/` (Mr. Gone's M20
  2-page interactive, 2014). 625 AcroForm-velden (415 knoppen, 203 tekst, 7 keuzes).
  - Tekstvelden hebben goede namen (`name`, `nature`, `affiliation`, `backgrounds1`,
    `Merit1`, `flaw1`, `rotes1`, `experience`, `health1-7` met `/`, `X`, `*`).
  - Dots hebben generieke namen (`dot1..dot566`, `sdot` = Spheres, `bpdot` = Arete,
    `willdot`/`check1b-10b` = Willpower, `qpcheck1-20` = het Q/P-wiel, `xdot`/`xdotm`/
    `OTdot` = extra rijen). De koppeling aan traits leggen we eenmalig vast via de
    positie van elk veld en de gedrukte labels, als vaste mapping-tabel per sheetversie.
  - Tekst achter een Sphere-naam is een specialty/notitie (`spheres6` = "Extra dice mind
    spells"); een `x` (`spheres7`) markeert vermoedelijk de affinity Sphere.
  - In de app leest pdf.js de veldwaarden (`getFieldObjects`), helemaal offline.
  - Het Q/P-wiel: Quintessence telt vanaf het puntje met de klok mee (`qpcheck1`, `2`,
    ...), Paradox vanaf het puntje tegen de klok in (`qpcheck20`, `19`, ...). Saito heeft
    11 Quintessence en 1 Paradox; samen maximaal 20.
- **De app is na de import de bron.** Opnieuw importeren toont eerst de wijzigingen
  ("Forces 3 -> 4, +2 XP") en voegt samen; notities en spell-dossiers blijven staan.
- **Export terug naar PDF:** de mapping werkt twee kanten op; met pdf-lib vult de app
  offline de Mr. Gone-PDF die je zelf hebt geimporteerd (de lege sheet leveren we
  waarschijnlijk niet mee, licentie).
- Rotes op de sheet (`rotes1-8`) worden persoonlijke rotes van dat character.

### Repo en hosting
- Git-repo op GitHub; Cloudflare Pages-project `agathon`
  (`agathon.pages.dev`).
- `refs/` en alle uitgelezen boektekst blijven buiten git; alleen eigen samenvattingen
  worden gecommit.

## Nice to have en open punten: GitHub-issues

Alle nice-to-haves, losse ideeen en open punten staan sinds 18 okt 2026 als issues in de
GitHub-repo, met labels per soort (✨ nice to have,
🗺️ roadmap, 💬 to discuss, ⏳ needs input) en per onderwerp (🔮 AI, 📜 sheet, 🪄 spells,
🎲 at the table, 🤝 sharing, 📱 android...). Daar bijhouden, niet hier.

## Bronnen in refs/

- `Mage_20th_Anniversary_Edition_(Final_Download).pdf`: digitale tekstlaag, ~490k woorden,
  ~650 vermeldingen van een Sphere met rank
- `M20_How_Do_You_DO_That_(Final_Download).pdf`: digitale tekstlaag, ~96k woorden,
  ~930 vermeldingen van een Sphere met rank; het meeste materiaal voor de bibliotheek
- `pdftotext` werkt direct, geen OCR nodig.

## Status (18 okt 2026)

Live op https://agathon.pages.dev, GitHub-repo (private).

- **Fase 1, fundament:** klaar.
- **Fase 2, character:** klaar, inclusief portretten (uit de PDF of zelf gekozen) en delen
  via bestand, link en QR.
- **Fase 3, effect-bibliotheek:** klaar. 563 spells (in de app heten effecten nu
  spells). Na de eerste steekproefronde zijn op 18 okt alle 563 naast hun boekpagina's
  gelegd (issue #18): 24 correcties, waarvan vijf echte regelfouten.
- **Fase 4, spell-dossiers en context pack:** in vier stappen. A (favorite spells: een ster
  in de bibliotheek; rotes van de sheet zijn gewoon favorite spells, issue #17) en B (dossiers met versies,
  gekoppelde effecten en een logboek) en C (*Copy for AI* en het antwoord terugplakken
  als nieuwe versie) en D (boekindex: je eigen PDF's lokaal als tekst, pagina's
  aanvinken in Copy for AI, index als bestand naar de telefoon) zijn klaar. Fase 4 is
  daarmee af. Dossiers delen kan nog niet.
- **Fase 5, officiele M20-sheet:** vervallen (18 okt 2026, issue #1): de officiele sheets
  zijn niet invulbaar, dus er valt niets te importeren.

Onderweg erbij gekomen: het portaal-icoon en het geanimeerde portaal achter het logo,
eigen Sphere-symbolen (o.a. een brein voor Mind en een drietand voor Prime), de
vaste zijbalk voor de bibliotheek op desktop, een character-switcher in de nav,
zoekwoorden die oplichten, keuzelijsten uit M20 (Backgrounds, Merits, Flaws, Concept,
Essence, Nature, Demeanor, Affiliation, Sect, specialties), XP naast de naam, een
Notes-schrijfblok, en Android-proof bestandskiezers. Het tabblad Spells heet nu Spell
ideas (issue #22). Later op 18 okt: *Copy character* in het menu van de sheet, een
health-pil die van groen via geel naar rood loopt, een mini-balk die ook op een Z Flip
op een regel past, en de PDF-export opgepoetst: de lege sheet van Mr. Gone via een
downloadlink (een keer per apparaat), exports blijven invulbaar in Acrobat Reader, en
het portret uit de app gaat mee de PDF in.

## Bouwvolgorde (voorstel)

1. **Fundament:** repo, Vite/React/TS-PWA, thema (fonts, kleuren, animaties), auto-update,
   IndexedDB (Dexie), deploy naar `agathon.pages.dev`, eerste verify-script.
2. **Character:** volledig M20-datamodel, tabbladen, speel-/bewerkmodus, het Q/P-wiel
   (hoofdbeeld van het tabblad Magick, geanimeerd in goud en violet), Mr. Gone-import en
   export terug, meerdere characters, delen via bestand/link/QR.
3. **Effect-bibliotheek:** extractie in batches met het controlescript, zoeken met
   operators, "wat kan ik casten" met "net buiten bereik", de mitigation-checklist.
   Kan parallel aan 1 en 2 (eigen data, raakt de app-code niet).
4. **Spell-dossiers en context pack:** dossiers met versies en uitkomsten, de boekindex
   (laag 2), *Copy for AI* en het terugplakken van een antwoord.
5. ~~Officiele M20-sheet als tweede importformaat~~: vervallen, die sheets zijn niet
   invulbaar.

## Open vragen

Staan als issues met het label 💬 to discuss of ⏳ needs input.
