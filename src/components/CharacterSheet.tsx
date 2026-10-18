import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ABILITY_GROUPS, ATTRIBUTE_GROUPS, woundLabel, woundLevel, type Character } from '../character';
import { copyCharacter, db, deleteCharacter, saveCharacter } from '../db/db';
import { exportPdf, MRGONE_BLANK_URL, NoSheetError } from '../sheetActions';
import { SheetFormatError } from '../sheets/mrgone';
import { SPHERES, type Sphere } from '../types';
import { go } from '../useHashRoute';
import { useDraft } from '../useDraft';
import { Dots } from './Dots';
import { Field, LineList, LongText, PickField, RatedList } from './Fields';
import { ImportFlow } from './ImportFlow';
import { Modal } from './Modal';
import { ShareDialog } from './ShareDialog';
import { PortalPortrait } from './PortalPortrait';
import { imageToPortrait } from '../portrait';
import { SphereGlyph } from './SphereGlyph';
import { HealthTrack, QPWheel, WillpowerTrack } from './Trackers';
import { Icon } from './Icon';
import { setActiveCharacter } from '../activeCharacter';
import { openCharacterMenu } from './CharacterMenu';
import { FilePick } from './FilePick';
import { AFFILIATIONS, ARCHETYPES, BACKGROUNDS, CONCEPTS, ESSENCES, FLAWS, MERITS, SECTS, SPECIALTIES, affiliationOf } from '../sheetLists';
import { useEffects, type Effect } from '../library/data';
import { deficit } from '../library/search';
import { ComboChips } from './ComboChips';
import { EffectDetail } from './EffectDetail';
import { searchLibrary } from './LibraryView';
import { togglePinned } from '../favorites';
import { startSpellFrom } from '../spellActions';

const UNTRAINED_KEY = 'agathon:show-untrained';

/** id of the <datalist> with suggested specialties for a trait (M20's examples plus ours) */
const specList = (trait: string) => (SPECIALTIES[trait] ? `spec-${trait.replace(/\s+/g, '-')}` : undefined);

/** The suggestion lists for every trait's specialty input; rendered once, in edit mode. */
function SpecialtyLists() {
  return (
    <>
      {Object.entries(SPECIALTIES).map(([trait, list]) => (
        <datalist key={trait} id={specList(trait)}>
          {list.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      ))}
    </>
  );
}

/** Technocrats get the Union's names in the pick lists (Laboratory, Genius...). */
const isTechnocrat = (c: Character) => /technocra|iteration x|new world order|progenitor|syndicate|void engineer|union/i.test(`${c.affiliation} ${c.sect}`);

/** The way to cast an effect that needs the fewest extra dots. */
const bestCombo = (e: Effect, dots: Record<Sphere, number>) =>
  e.combos.reduce((best, combo, i) => (deficit(combo, dots) < deficit(e.combos[best], dots) ? i : best), 0);

const TABS = [
  { id: 'magick', label: 'Magick' },
  { id: 'traits', label: 'Traits' },
  { id: 'background', label: 'Background' },
  { id: 'notes', label: 'Notes' },
] as const;
type Tab = (typeof TABS)[number]['id'];

/** The open character: a local copy that saves itself (see useDraft). */
function useCharacter(id: string) {
  const { draft: c, patch, replace } = useDraft(id, (i) => db.characters.get(i), saveCharacter);
  return { c, patch, replace };
}

function TraitRow({
  name,
  value,
  specialty,
  edit,
  onValue,
  onSpecialty,
}: {
  name: string;
  value: number;
  specialty?: string;
  edit: boolean;
  onValue: (v: number) => void;
  onSpecialty: (s: string) => void;
}) {
  return (
    <li className="trait-row">
      <span className="trait-label">
        <span className="trait-name">{name}</span>
        {edit ? (
          <input
            className="spec-input"
            value={specialty ?? ''}
            placeholder="specialty"
            list={specList(name)}
            aria-label={`${name} specialty`}
            onChange={(e) => onSpecialty(e.target.value)}
          />
        ) : (
          specialty && <span className="trait-spec">{specialty}</span>
        )}
      </span>
      <span className="trait-num" aria-hidden="true">
        {value}
      </span>
      <Dots value={value} label={name} onChange={edit ? onValue : undefined} />
    </li>
  );
}

export function CharacterSheet({ id, tab: tabParam }: { id: string; tab?: string }) {
  const { c, patch, replace } = useCharacter(id);
  const [edit, setEdit] = useState(false);
  const [vitalsOpen, setVitalsOpen] = useState(false);
  // "show Abilities at 0" is remembered on this device, for every character
  const [showUntrained, setShowUntrainedState] = useState(() => {
    try {
      return localStorage.getItem(UNTRAINED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const setShowUntrained = (on: boolean) => {
    setShowUntrainedState(on);
    try {
      localStorage.setItem(UNTRAINED_KEY, on ? '1' : '0');
    } catch {
      // private mode: only for this visit
    }
  };
  const [message, setMessage] = useState<{ title: string; lines: string[] } | null>(null);
  const [needBlank, setNeedBlank] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // a snapshot taken when Share opens: a fresh [c] on every render re-encoded the link and hid the QR code
  const [sharing, setSharing] = useState<Character[] | null>(null);
  const [zoom, setZoom] = useState(false);
  // the mini bar has its own drop-down, so opening it never changes the page height
  const [miniOpen, setMiniOpen] = useState(false);
  // the pills sit beside the portrait; once that scrolls away a fixed mini bar takes over
  const [heroGone, setHeroGone] = useState(false);
  const heroObserver = useRef<IntersectionObserver | null>(null);
  const heroRef = (el: HTMLDivElement | null) => {
    heroObserver.current?.disconnect();
    if (!el) return;
    heroObserver.current = new IntersectionObserver(
      ([e]) => {
        setHeroGone(!e.isIntersecting);
        if (e.isIntersecting) setMiniOpen(false);
      },
      { rootMargin: '-60px 0px 0px 0px' },
    );
    heroObserver.current.observe(el);
  };
  const menuRef = useRef<HTMLDetailsElement>(null);
  // library effects: pinned ones on the Magick tab, rotes whose name is in the library
  const effects = useEffects();
  const [openEffect, setOpenEffect] = useState<string | null>(null);
  const spellIdeas = useLiveQuery(() => db.spells.where('characterId').equals(id).toArray(), [id]);
  const byId = useMemo(() => new Map((effects ?? []).map((e) => [e.id, e])), [effects]);
  const tab: Tab = (TABS.some((t) => t.id === tabParam) ? tabParam : 'magick') as Tab;

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setZoom(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoom]);
  useEffect(() => () => heroObserver.current?.disconnect(), []);

  // the actions menu is a plain <details>: close it on a tap outside it or on Escape
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const m = menuRef.current;
      if (m?.open && !m.contains(e.target as Node)) m.open = false;
    };
    const onKey = (e: KeyboardEvent) => {
      const m = menuRef.current;
      if (e.key !== 'Escape' || !m?.open) return;
      m.open = false;
      m.querySelector('summary')?.focus();
    };
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => {
    if (c) setActiveCharacter(c.id);
  }, [c?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (c === undefined) return null;
  if (c === null) {
    return (
      <section className="view">
        <p className="empty">This character isn't on this device.</p>
        <a className="btn" href="#/characters">
          Your characters
        </a>
      </section>
    );
  }

  const setPortraitFrom = async (f: File) => {
    try {
      patch({ portrait: await imageToPortrait(f) });
    } catch {
      setMessage({ title: "Can't use that image", lines: ['Pick a JPEG, PNG or WebP photo.'] });
    }
  };
  const setSpec = (trait: string, s: string) => patch({ specialties: { ...c.specialties, [trait]: s } });
  const technocrat = isTechnocrat(c);
  const worst = woundLevel(c);

  const pills = (open: boolean, toggle: () => void) => (
    <button type="button" className="vitals-bar" aria-expanded={open} onClick={toggle}>
      <span className={`chip hp hp-${worst + 1}`}>{woundLabel(worst)}</span>
      <span className="chip">
        WP {Math.max(0, c.willpower - c.willpowerSpent)}/{c.willpower}
      </span>
      <span className="chip q">Q {c.quintessence}</span>
      <span className="chip p">P {c.paradox}</span>
      <span className="vitals-toggle" aria-hidden="true">
        <Icon name={open ? 'up' : 'down'} size={16} />
      </span>
    </button>
  );
  const panel = (
    <div className="vitals-panel">
      <HealthTrack c={c} patch={patch} />
      <WillpowerTrack c={c} patch={patch} edit={edit} />
    </div>
  );

  const doExport = async (blank?: File) => {
    try {
      const warnings = await exportPdf(c, blank);
      setMessage({ title: 'PDF exported', lines: warnings.length ? warnings : ['Your sheet has been filled in and downloaded.'] });
    } catch (e) {
      // only a missing sheet asks for a blank one; anything else says what went wrong
      if (e instanceof SheetFormatError) setMessage({ title: "That's not the right sheet", lines: [e.message] });
      else if (e instanceof NoSheetError) setNeedBlank(true);
      else setMessage({ title: 'Export failed', lines: [`The PDF couldn't be written (${e instanceof Error ? e.message : String(e)}).`] });
    }
  };

  return (
    <section className="view sheet">
      <div className="sheet-head">
        <button type="button" className="back switch-btn" aria-haspopup="dialog" onClick={(e) => openCharacterMenu(e.currentTarget)}>
          Characters <Icon name="down" size={16} />
        </button>
        <div className="sheet-actions">
          <button
            type="button"
            className={`btn btn-small lock${edit ? ' on' : ''}`}
            aria-pressed={edit}
            onClick={() => setEdit(!edit)}
          >
            <Icon name={edit ? 'unlock' : 'lock'} size={16} /> {edit ? 'Done' : 'Edit'}
          </button>
          <details className="menu" ref={menuRef}>
            <summary className="btn btn-small" aria-label="More actions">
              <Icon name="more" />
            </summary>
            <div
              className="menu-items"
              onClick={(e) => {
                // a file picker item keeps the menu open until a file is chosen (Android lost it otherwise)
                if ((e.target as HTMLElement).closest('.file-pick')) return;
                (e.currentTarget.parentElement as HTMLDetailsElement).removeAttribute('open');
              }}
            >
              <button type="button" onClick={() => setSharing([c])}>
                Share character
              </button>
              <button type="button" onClick={() => doExport()}>
                Export PDF sheet
              </button>
              <ImportFlow target={c} label="Update from PDF" className="menu-btn" onDone={(n) => replace(n)} />
              <button
                type="button"
                onClick={async () => {
                  const copy = await copyCharacter(c);
                  setActiveCharacter(copy.id);
                  go('characters', copy.id, tab);
                }}
              >
                Copy character
              </button>
              <button type="button" className="danger" onClick={() => setConfirmDelete(true)}>
                Delete character
              </button>
            </div>
          </details>
        </div>
      </div>

      <div className="sheet-hero" ref={heroRef}>
        {edit ? (
          <span className="portrait-edit">
            <FilePick className="portrait-btn" accept="image/*" onFile={setPortraitFrom}>
              <PortalPortrait src={c.portrait} name={c.name} size={128} />
              <span className="portrait-hint">{c.portrait ? 'Change' : 'Add photo'}</span>
            </FilePick>
            {c.portrait && (
              <button type="button" className="link-btn" onClick={() => patch({ portrait: undefined })}>
                Remove
              </button>
            )}
          </span>
        ) : c.portrait ? (
          <button type="button" className="portrait-btn" aria-label={`Show ${c.name}'s portrait`} onClick={() => setZoom(true)}>
            <PortalPortrait src={c.portrait} name={c.name} size={128} />
          </button>
        ) : (
          <PortalPortrait name={c.name} size={128} />
        )}
        <div className="sheet-title">
          <div className="sheet-ident">
            {edit ? (
              <input className="text-input name-input" value={c.name} aria-label="Name" onChange={(e) => patch({ name: e.target.value })} />
            ) : (
              <h2 className="sheet-name">{c.name}</h2>
            )}
            <p className="sheet-sub">
              <span>{[c.concept, c.sect || c.affiliation, c.essence && `${c.essence} Essence`].filter(Boolean).join(', ')}</span>
              {/* experience is handed out at the table, so it is editable in play mode too */}
              <label className="xp">
                XP
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={c.experience}
                  placeholder="0"
                  aria-label="Experience"
                  style={{ width: `${Math.max(1, c.experience.length) + 0.6}ch` }}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => patch({ experience: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                />
              </label>
            </p>
          </div>
          {pills(vitalsOpen, () => setVitalsOpen(!vitalsOpen))}
        </div>
      </div>
      {vitalsOpen && panel}
      {heroGone && (
        <div className="vitals-fixed">
          <div className="vitals-fixed-inner">
            <span className="mini-face" aria-hidden="true">
              {c.portrait ? <img src={c.portrait} alt="" /> : c.name.slice(0, 1)}
            </span>
            {pills(miniOpen, () => setMiniOpen(!miniOpen))}
          </div>
          {miniOpen && panel}
        </div>
      )}
      {zoom && c.portrait && (
        <div className="zoom-backdrop" role="dialog" aria-modal="true" aria-label={`${c.name}'s portrait`} onClick={() => setZoom(false)}>
          <PortalPortrait src={c.portrait} name={c.name} size={Math.round(Math.min(window.innerWidth * 0.82, window.innerHeight * 0.6, 460))} />
          <p className="zoom-name">{c.name}</p>
        </div>
      )}

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <a
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`tab${tab === t.id ? ' on' : ''}`}
            href={`#/characters/${encodeURIComponent(c.id)}/${t.id}`}
            onClick={(e) => {
              e.preventDefault();
              history.replaceState(null, '', `#/characters/${encodeURIComponent(c.id)}/${t.id}`);
              window.dispatchEvent(new HashChangeEvent('hashchange'));
            }}
          >
            {t.label}
          </a>
        ))}
      </div>

      {tab === 'magick' && (
        <div className="tab-body spread">
          <div className="spread-col">
          <div className="block">
            <ul className="trait-list">
              <li className="trait-row arete-row">
                <span className="trait-label">
                  <span className="trait-name big">Arete</span>
                </span>
                <span className="trait-num" aria-hidden="true">
                  {c.arete}
                </span>
                <Dots value={c.arete} max={10} label="Arete" onChange={edit ? (v) => patch({ arete: v }) : undefined} />
              </li>
            </ul>
          </div>
          <div className="block">
            <h3 className="block-title">Spheres</h3>
            <ul className="trait-list">
              {SPHERES.map((s) => (
                <li key={s} className={`trait-row sphere-row sph-${s}${c.spheres[s] ? '' : ' zero'}`}>
                  <span className="trait-label">
                    <span className="trait-name">
                      <SphereGlyph sphere={s} size={18} /> {s}
                      {!edit && c.affinitySphere === s && (
                        <span className="affinity" title="Affinity Sphere">
                          affinity
                        </span>
                      )}
                    </span>
                    {!edit && c.specialties[s] && <span className="trait-spec">{c.specialties[s]}</span>}
                  </span>
                  <span className="trait-num" aria-hidden="true">
                    {c.spheres[s]}
                  </span>
                  <Dots value={c.spheres[s]} label={s} onChange={edit ? (v) => patch({ spheres: { ...c.spheres, [s]: v } }) : undefined} />
                  {/* in edit mode on a line of its own: beside the dots it got squeezed on phones */}
                  {edit && (
                    <span className="sphere-edit">
                      <input
                        className="spec-input"
                        value={c.specialties[s] ?? ''}
                        placeholder="specialty"
                        list={specList(s)}
                        aria-label={`${s} specialty`}
                        onChange={(e) => setSpec(s, e.target.value)}
                      />
                      <label className="check">
                        <input
                          type="radio"
                          name="affinity"
                          checked={c.affinitySphere === s}
                          onChange={() => patch({ affinitySphere: s as Sphere })}
                        />
                        affinity
                      </label>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          </div>
          <div className="spread-col">
          <div className="block">
            <h3 className="block-title">Quintessence and Paradox</h3>
            <QPWheel c={c} patch={patch} />
          </div>
          <div className="block">
            <h3 className="block-title">Focus</h3>
            <LineList
              items={c.focus}
              edit={edit}
              onChange={(focus) => patch({ focus })}
              addLabel="Add line"
              placeholder="Paradigm, practice or instruments"
              empty="No paradigm, practice or instruments yet."
            />
          </div>
          <div className="block">
            {/* what M20 sheets call rotes: library favorites (starred) and the mage's own
                spells that aren't in the library; both go into the PDF's rotes fields */}
            <h3 className="block-title">Favorite spells</h3>
            {(c.pinned ?? []).length === 0 && c.rotes.length === 0 && !edit ? (
              <p className="empty-small">
                Tap the star on a spell in the <a href="#/library">library</a> and it waits here, one tap away. Spells of your own go in with Edit.
              </p>
            ) : (
              <ul className="pin-list">
                {(c.pinned ?? []).map((id) => {
                  const e = byId.get(id);
                  if (!e) return null;
                  const combo = e.combos[bestCombo(e, c.spheres)];
                  return (
                    <li key={id} className={edit ? 'fav-edit' : undefined}>
                      <button type="button" className="pin-row" onClick={() => setOpenEffect(id)}>
                        <span className="pin-name">{e.name}</span>
                        <ComboChips combo={combo} dots={c.spheres} />
                      </button>
                      {edit && (
                        <button type="button" className="btn-icon" aria-label={`Remove ${e.name} from favorites`} onClick={() => patch({ pinned: togglePinned(c, id) })}>
                          <Icon name="close" />
                        </button>
                      )}
                    </li>
                  );
                })}
                {!edit &&
                  c.rotes
                    .filter((r) => r.trim())
                    .map((r, i) => (
                      <li key={`own-${i}`}>
                        <span className="pin-row own-spell">
                          <span className="pin-name">{r}</span>
                          <span className="own-note">Your own spell</span>
                        </span>
                      </li>
                    ))}
              </ul>
            )}
            {edit && (
              <LineList
                items={c.rotes}
                edit
                onChange={(rotes) => patch({ rotes })}
                addLabel="Add your own spell"
                empty=""
                placeholder="A spell that isn't in the library"
              />
            )}
          </div>
          <div className="block">
            <h3 className="block-title">Spell ideas</h3>
            {spellIdeas?.length ? (
              <ul className="pin-list">
                {[...spellIdeas]
                  .sort((a, b) => b.updatedAt - a.updatedAt)
                  .map((sp) => (
                    <li key={sp.id}>
                      <a className="pin-row" href={`#/spells/${encodeURIComponent(sp.id)}`}>
                        <span className="pin-name">{sp.title || 'Untitled idea'}</span>
                      </a>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="empty-small">
                Work them out in <a href="#/spells">Spell ideas</a>, or start one from a spell in the library.
              </p>
            )}
          </div>
          <div className="block">
            <h3 className="block-title">Wonders</h3>
            {c.wonders.length === 0 && !edit && <p className="empty-small">No Wonders.</p>}
            {c.wonders.map((w, i) => (
              <div key={i} className="wonder">
                {edit ? (
                  <>
                    <div className="line-edit">
                      <input
                        className="text-input"
                        value={w.name}
                        aria-label="Wonder name"
                        onChange={(e) => patch({ wonders: c.wonders.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })}
                      />
                      <button type="button" className="btn-icon" aria-label="Remove Wonder" onClick={() => patch({ wonders: c.wonders.filter((_, j) => j !== i) })}>
                        <Icon name="close" />
                      </button>
                    </div>
                    <textarea
                      className="text-area"
                      rows={2}
                      value={w.description}
                      aria-label="Wonder description"
                      onChange={(e) => patch({ wonders: c.wonders.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)) })}
                    />
                  </>
                ) : (
                  <>
                    <strong>{w.name}</strong>
                    {w.description && <p className="prose">{w.description}</p>}
                  </>
                )}
              </div>
            ))}
            {edit && (
              <button type="button" className="btn btn-small" onClick={() => patch({ wonders: [...c.wonders, { name: '', description: '' }] })}>
                Add Wonder
              </button>
            )}
          </div>
          </div>
        </div>
      )}

      {tab === 'traits' && (
        <div className="tab-body">
          <div className="trio">
          {ATTRIBUTE_GROUPS.map((g) => (
            <div key={g.title} className="block">
              <h3 className="block-title">{g.title}</h3>
              <ul className="trait-list">
                {g.traits.map((t) => (
                  <TraitRow
                    key={t}
                    name={t}
                    value={c.traits[t] ?? 0}
                    specialty={c.specialties[t]}
                    edit={edit}
                    onValue={(v) => patch({ traits: { ...c.traits, [t]: v } })}
                    onSpecialty={(s) => setSpec(t, s)}
                  />
                ))}
              </ul>
            </div>
          ))}
          </div>
          {!edit && (
            <label className="check toggle-untrained">
              <input type="checkbox" checked={showUntrained} onChange={(e) => setShowUntrained(e.target.checked)} />
              Show Abilities at 0
            </label>
          )}
          <div className="trio">
          {ABILITY_GROUPS.map((g) => {
            const shown = g.traits.filter((t) => edit || showUntrained || (c.traits[t] ?? 0) > 0);
            return (
              <div key={g.title} className="block">
                <h3 className="block-title">{g.title}</h3>
                {shown.length === 0 && <p className="empty-small">None trained.</p>}
                <ul className="trait-list">
                  {shown.map((t) => (
                    <TraitRow
                      key={t}
                      name={t}
                      value={c.traits[t] ?? 0}
                      specialty={c.specialties[t]}
                      edit={edit}
                      onValue={(v) => patch({ traits: { ...c.traits, [t]: v } })}
                      onSpecialty={(s) => setSpec(t, s)}
                    />
                  ))}
                </ul>
              </div>
            );
          })}
          </div>
          <div className="block">
            <h3 className="block-title">Other traits</h3>
            <RatedList
              items={c.otherTraits}
              edit={edit}
              onChange={(otherTraits) => patch({ otherTraits })}
              addLabel="Add trait"
              empty="No other traits."
            />
          </div>
        </div>
      )}

      {tab === 'background' && (
        <div className="tab-body flow">
          <div className="block field-grid">
            <PickField label="Concept" value={c.concept} edit={edit} onChange={(concept) => patch({ concept })} picks={CONCEPTS} />
            <PickField label="Affiliation" value={c.affiliation} edit={edit} onChange={(affiliation) => patch({ affiliation })} picks={AFFILIATIONS} />
            <PickField
              label="Sect"
              value={c.sect}
              edit={edit}
              onChange={(sect) => patch({ sect })}
              picks={SECTS.filter((s) => !affiliationOf(c.affiliation) || s.affiliation === affiliationOf(c.affiliation))}
              onPick={(p) => !affiliationOf(c.affiliation) && patch({ affiliation: (p as (typeof SECTS)[number]).affiliation })}
            />
            <PickField label="Essence" value={c.essence} edit={edit} onChange={(essence) => patch({ essence })} picks={ESSENCES} />
            <PickField label="Nature" value={c.nature} edit={edit} onChange={(nature) => patch({ nature })} picks={ARCHETYPES} />
            <PickField label="Demeanor" value={c.demeanor} edit={edit} onChange={(demeanor) => patch({ demeanor })} picks={ARCHETYPES} />
            {(
              [
                ['player', 'Player'],
                ['chronicle', 'Chronicle'],
              ] as const
            ).map(([k, label]) => (
              <Field key={k} label={label} value={c[k]} edit={edit} onChange={(v) => patch({ [k]: v })} />
            ))}
          </div>
          <div className="block">
            <h3 className="block-title">Backgrounds</h3>
            <RatedList
              items={c.backgrounds}
              edit={edit}
              onChange={(backgrounds) => patch({ backgrounds })}
              addLabel="Add background"
              empty="No Backgrounds."
              picks={BACKGROUNDS}
              technocrat={technocrat}
            />
          </div>
          <div className="block">
            <h3 className="block-title">Merits</h3>
            <RatedList items={c.merits} kind="cost" edit={edit} onChange={(merits) => patch({ merits })} addLabel="Add merit" empty="No Merits." picks={MERITS} technocrat={technocrat} />
          </div>
          <div className="block">
            <h3 className="block-title">Flaws</h3>
            <RatedList items={c.flaws} kind="cost" edit={edit} onChange={(flaws) => patch({ flaws })} addLabel="Add flaw" empty="No Flaws." picks={FLAWS} technocrat={technocrat} />
          </div>
          <div className="block field-grid">
            {(
              [
                ['age', 'Age'],
                ['apparentAge', 'Apparent age'],
                ['sex', 'Sex'],
                ['ethnicity', 'Ethnicity'],
                ['hair', 'Hair'],
                ['eyes', 'Eyes'],
                ['height', 'Height'],
                ['weight', 'Weight'],
              ] as const
            ).map(([k, label]) => (
              <Field key={k} label={label} value={c.description[k]} edit={edit} onChange={(v) => patch({ description: { ...c.description, [k]: v } })} />
            ))}
          </div>
          <div className="block">
            <LongText label="Description" value={c.description.text} edit={edit} onChange={(text) => patch({ description: { ...c.description, text } })} />
            <LongText label="History" value={c.history} edit={edit} onChange={(history) => patch({ history })} />
            <LongText label="Goals and destiny" value={c.goals} edit={edit} onChange={(goals) => patch({ goals })} />
          </div>
          <div className="block">
            <h3 className="block-title">Gear</h3>
            <LineList items={c.gear} edit={edit} onChange={(gear) => patch({ gear })} addLabel="Add gear" empty="No gear listed." />
          </div>
          <div className="block">
            <h3 className="block-title">Weapons</h3>
            {c.combat.length === 0 && !edit && <p className="empty-small">No weapons listed.</p>}
            {c.combat.map((w, i) =>
              edit ? (
                <div key={i} className="weapon-edit">
                  {(['weapon', 'difficulty', 'damage', 'range', 'rate', 'clip'] as const).map((k) => (
                    <input
                      key={k}
                      className="text-input"
                      value={w[k]}
                      placeholder={k}
                      aria-label={k}
                      onChange={(e) => patch({ combat: c.combat.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)) })}
                    />
                  ))}
                  <button type="button" className="btn-icon" aria-label="Remove weapon" onClick={() => patch({ combat: c.combat.filter((_, j) => j !== i) })}>
                    <Icon name="close" />
                  </button>
                </div>
              ) : (
                <p key={i} className="weapon">
                  <strong>{w.weapon}</strong>{' '}
                  {[w.difficulty && `diff ${w.difficulty}`, w.damage && `dmg ${w.damage}`, w.range && `range ${w.range}`, w.rate && `rate ${w.rate}`, w.clip && `clip ${w.clip}`]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              ),
            )}
            {edit && (
              <button
                type="button"
                className="btn btn-small"
                onClick={() => patch({ combat: [...c.combat, { weapon: '', difficulty: '', damage: '', range: '', rate: '', clip: '' }] })}
              >
                Add weapon
              </button>
            )}
          </div>
        </div>
      )}

      {tab === 'notes' && (
        <div className="tab-body">
          <div className="block notes-block">
            <LongText
              label="Notes"
              value={c.notes}
              edit
              className="notes-area"
              onChange={(notes) => patch({ notes })}
              placeholder="Resonance, Seekings, scenes, anything."
            />
          </div>
        </div>
      )}

      {needBlank && (
        <Modal title="Pick a blank sheet" onClose={() => setNeedBlank(false)}>
          <p>
            {c.name} wasn't imported from a PDF, so there's no sheet to fill in yet. Download Mr. Gone's free M20 2-page sheet, then choose it here.
            Agathon keeps it, so this is a one-time step on this device.
          </p>
          <p>
            <a className="btn btn-small" href={MRGONE_BLANK_URL} target="_blank" rel="noopener noreferrer">
              Download the blank sheet
            </a>
          </p>
          <div className="modal-actions">
            <button className="btn" onClick={() => setNeedBlank(false)}>
              Cancel
            </button>
            <FilePick
              className="btn btn-gold"
              accept="application/pdf,.pdf"
              onFile={(f) => {
                setNeedBlank(false);
                doExport(f);
              }}
            >
              Choose PDF
            </FilePick>
          </div>
        </Modal>
      )}
      {message && (
        <Modal title={message.title} onClose={() => setMessage(null)}>
          <ul className="change-list">
            {message.lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          <div className="modal-actions">
            <button className="btn btn-gold" onClick={() => setMessage(null)}>
              OK
            </button>
          </div>
        </Modal>
      )}
      {edit && <SpecialtyLists />}
      {openEffect && byId.get(openEffect) && (
        <EffectDetail
          effect={byId.get(openEffect)!}
          character={c}
          pinned={!!c.pinned?.includes(openEffect)}
          onPin={() => patch({ pinned: togglePinned(c, openEffect) })}
          onStartSpell={(i) => startSpellFrom(c, byId.get(openEffect)!, i)}
          onClose={() => setOpenEffect(null)}
          onTag={(t) => searchLibrary(`tag:${t} `)}
        />
      )}
      {sharing && <ShareDialog characters={sharing} title={`Share ${c.name}`} onClose={() => setSharing(null)} />}
      {confirmDelete && (
        <Modal title={`Delete ${c.name}?`} onClose={() => setConfirmDelete(false)}>
          <p>This removes the character, its stored PDF and its spell ideas from this device.</p>
          <div className="modal-actions">
            <button className="btn" onClick={() => setConfirmDelete(false)}>
              Cancel
            </button>
            <button
              className="btn btn-danger"
              onClick={async () => {
                await deleteCharacter(c.id);
                setConfirmDelete(false);
                // the most recent of the others takes over, or the empty characters page
                const next = await db.characters.orderBy('updatedAt').reverse().first();
                if (next) {
                  setActiveCharacter(next.id);
                  go('characters', next.id);
                } else go('characters');
              }}
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}

