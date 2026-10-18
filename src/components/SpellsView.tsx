import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useActiveCharacter } from '../activeCharacter';
import { db, requestPersistence, saveCharacter, saveSpell } from '../db/db';
import { useEffects, type Effect } from '../library/data';
import { deficit, difficulties, parseQuery, search } from '../library/search';
import { newSpell, newVersion, normalizeSpell, OUTCOMES, versionCombo, versionLabel, type Outcome, type Spell, type SpellVersion } from '../spells';
import { SPHERES, type Sphere } from '../types';
import { go } from '../useHashRoute';
import { ComboChips } from './ComboChips';
import { EffectDetail } from './EffectDetail';
import { Icon } from './Icon';
import { searchLibrary, togglePinned } from './LibraryView';
import { Modal } from './Modal';
import { SphereGlyph } from './SphereGlyph';

/** Fit a textarea to its text (for browsers without field-sizing: content). */
const grow = (el: HTMLTextAreaElement | null) => {
  if (!el || CSS.supports('field-sizing', 'content')) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
};

const when = (t: number) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export function SpellsView({ id }: { id?: string }) {
  return id ? <SpellDossier key={id} id={id} /> : <SpellList />;
}

// ---------- the list: the spell ideas of the character in play ----------

function SpellList() {
  const { active } = useActiveCharacter();
  const spells = useLiveQuery(
    async () => (active ? (await db.spells.where('characterId').equals(active.id).toArray()).map(normalizeSpell) : []),
    [active?.id],
  );
  const [title, setTitle] = useState('');

  if (!active) {
    return (
      <section className="view spells">
        <h2 className="view-title">Spells</h2>
        <p className="flavor">Spell ideas belong to a character. Add or import one first.</p>
        <a className="btn" href="#/characters">
          Characters
        </a>
      </section>
    );
  }

  const start = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    const s = newSpell(active.id, t);
    await saveSpell(s);
    requestPersistence();
    setTitle('');
    go('spells', s.id);
  };

  const list = [...(spells ?? [])].sort((a, b) => b.updatedAt - a.updatedAt);
  return (
    <section className="view spells">
      <h2 className="view-title">Spells</h2>
      <p className="spells-sub">{active.name}'s spell ideas: what to pull off, how, and how it went.</p>
      <form className="add-row" onSubmit={start}>
        <input
          className="text-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Kill every streetlight on our way out"
          aria-label="New spell idea"
        />
        <button className="btn btn-gold" type="submit">
          Start
        </button>
      </form>
      <p className="fine-print">Or start one from an effect in the library.</p>
      {spells && list.length === 0 && <p className="empty">No spell ideas yet.</p>}
      <ul className="spell-list">
        {list.map((s) => {
          const v = s.versions[s.versions.length - 1];
          const combo = versionCombo(v);
          const last = s.log[s.log.length - 1];
          return (
            <li key={s.id}>
              <a className="spell-card" href={`#/spells/${encodeURIComponent(s.id)}`}>
                <span className="spell-title">{s.title || 'Untitled idea'}</span>
                {s.goal && <span className="spell-goal">{s.goal}</span>}
                <span className="spell-meta">
                  {Object.keys(combo.spheres).length ? <ComboChips combo={combo} dots={active.spheres} /> : <span>No Spheres yet</span>}
                  {s.versions.length > 1 && <span>{s.versions.length} versions</span>}
                  {last && (
                    <span className={`outcome outcome-${last.outcome}`}>
                      Cast {s.log.length}x, last {OUTCOMES.find((o) => o.id === last.outcome)?.label.toLowerCase()}
                    </span>
                  )}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ---------- one dossier ----------

function useSpell(id: string) {
  const [s, setS] = useState<Spell | null | undefined>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const pending = useRef<Spell | null>(null);
  useEffect(() => {
    let live = true;
    db.spells.get(id).then((x) => live && setS(x ? normalizeSpell(x) : null));
    return () => {
      live = false;
      clearTimeout(timer.current);
      if (pending.current) saveSpell(pending.current);
      pending.current = null;
    };
  }, [id]);
  const patch = (p: Partial<Spell>) =>
    setS((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...p };
      pending.current = next;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        saveSpell(next);
        pending.current = null;
      }, 250);
      return next;
    });
  return { s, patch };
}

function SpellDossier({ id }: { id: string }) {
  const { s, patch } = useSpell(id);
  const character = useLiveQuery(() => (s ? db.characters.get(s.characterId) : undefined), [s?.characterId]);
  const effects = useEffects();
  const byId = useMemo(() => new Map((effects ?? []).map((e) => [e.id, e])), [effects]);
  const [openEffect, setOpenEffect] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (s === undefined) return null;
  if (s === null) {
    return (
      <section className="view">
        <p className="empty">This spell idea isn't on this device.</p>
        <a className="btn" href="#/spells">
          Spells
        </a>
      </section>
    );
  }

  const dots = character?.spheres;
  const setVersion = (vid: string, p: Partial<SpellVersion>) => patch({ versions: s.versions.map((v) => (v.id === vid ? { ...v, ...p } : v)) });
  const current = s.versions[s.versions.length - 1];
  const older = s.versions.slice(0, -1).reverse();

  return (
    <section className="view dossier">
      <div className="sheet-head">
        <a className="back" href="#/spells">
          <Icon name="back" /> Spells
        </a>
        <button type="button" className="btn btn-small" onClick={() => setConfirmDelete(true)}>
          Delete idea
        </button>
      </div>

      {/* a textarea so long titles wrap on phones; Enter just ends editing */}
      <textarea
        className="dossier-title"
        rows={1}
        value={s.title}
        placeholder="What do you want to do?"
        aria-label="Spell idea"
        ref={grow}
        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), e.currentTarget.blur())}
        onChange={(e) => {
          patch({ title: e.target.value.replace(/\n/g, ' ') });
          grow(e.target);
        }}
      />
      {character && <p className="dossier-for">An idea of {character.name}</p>}
      <label className="field field-long">
        <span className="field-label">What should happen</span>
        <textarea
          className="text-area"
          rows={3}
          value={s.goal}
          placeholder="In your own words: the result you want, for whom, where, how long."
          onChange={(e) => patch({ goal: e.target.value })}
        />
      </label>

      <div className="dossier-grid">
        <div className="dossier-main">
          <h3 className="block-title">The plan</h3>
          <VersionEditor s={s} v={current} dots={dots} characterName={character?.name} onChange={(p) => setVersion(current.id, p)} />
          <div className="version-actions">
            <button
              type="button"
              className="btn btn-small"
              onClick={() => {
                const { id: _id, createdAt: _at, ...copy } = current;
                patch({ versions: [...s.versions, newVersion({ ...copy, source: 'me' })] });
              }}
            >
              Try another way
            </button>
            <span className="fine-print">Keeps this one as {versionLabel(s, current)} and starts a copy.</span>
          </div>
          {older.length > 0 && (
            <>
              <h3 className="block-title">Earlier versions</h3>
              {older.map((v) => (
                <details key={v.id} className="old-version">
                  <summary>
                    <span className="old-version-name">{versionLabel(s, v)}</span>
                    <ComboChips combo={versionCombo(v)} dots={dots} />
                  </summary>
                  <VersionEditor s={s} v={v} dots={dots} characterName={character?.name} onChange={(p) => setVersion(v.id, p)} />
                  <div className="version-actions">
                    <button
                      type="button"
                      className="btn btn-small"
                      onClick={() => patch({ versions: [...s.versions.filter((x) => x.id !== v.id), v] })}
                    >
                      Make this the plan
                    </button>
                    <button type="button" className="link-btn" onClick={() => patch({ versions: s.versions.filter((x) => x.id !== v.id) })}>
                      Remove
                    </button>
                  </div>
                </details>
              ))}
            </>
          )}
        </div>

        <div className="dossier-side">
          <h3 className="block-title">From the library</h3>
          {s.effects.length === 0 && <p className="empty-small">No effects linked yet. Link the ones this idea builds on.</p>}
          <ul className="pin-list">
            {s.effects.map((eid) => {
              const e = byId.get(eid);
              if (!e) return null;
              return (
                <li key={eid} className="linked-effect">
                  <button type="button" className="pin-row" onClick={() => setOpenEffect(eid)}>
                    <span className="pin-name">{e.name}</span>
                    <ComboChips combo={e.combos[0]} dots={dots} />
                  </button>
                  <button type="button" className="btn-icon" aria-label={`Unlink ${e.name}`} onClick={() => patch({ effects: s.effects.filter((x) => x !== eid) })}>
                    <Icon name="close" />
                  </button>
                </li>
              );
            })}
          </ul>
          {linking ? (
            <EffectPicker
              effects={effects ?? []}
              exclude={s.effects}
              onPick={(eid) => {
                patch({ effects: [...s.effects, eid] });
                setLinking(false);
              }}
              onCancel={() => setLinking(false)}
            />
          ) : (
            <button type="button" className="btn btn-small" onClick={() => setLinking(true)}>
              Link an effect
            </button>
          )}

          <h3 className="block-title">At the table</h3>
          <CastLogView s={s} onChange={(log) => patch({ log })} />
        </div>
      </div>

      {openEffect && byId.get(openEffect) && (
        <EffectDetail
          effect={byId.get(openEffect)!}
          character={character}
          pinned={!!character?.pinned?.includes(openEffect)}
          onPin={character ? () => saveCharacter({ ...character, pinned: togglePinned(character, openEffect) }) : undefined}
          onClose={() => setOpenEffect(null)}
          onTag={(t) => searchLibrary(`tag:${t} `)}
        />
      )}
      {confirmDelete && (
        <Modal title={`Delete "${s.title || 'this idea'}"?`} onClose={() => setConfirmDelete(false)}>
          <p>This removes the idea, its versions and its log from this device.</p>
          <div className="modal-actions">
            <button className="btn" onClick={() => setConfirmDelete(false)}>
              Cancel
            </button>
            <button
              className="btn btn-danger"
              onClick={async () => {
                await db.spells.delete(s.id);
                setConfirmDelete(false);
                go('spells');
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

/** One version: its Spheres (tap to raise, past 5 back to 0), difficulty and notes. */
function VersionEditor({
  s,
  v,
  dots,
  characterName,
  onChange,
}: {
  s: Spell;
  v: SpellVersion;
  dots?: Record<Sphere, number>;
  characterName?: string;
  onChange: (p: Partial<SpellVersion>) => void;
}) {
  const combo = versionCombo(v);
  const used = Object.keys(combo.spheres).length > 0;
  const d = difficulties(combo);
  const miss = dots && used ? deficit(combo, dots) : undefined;
  return (
    <div className="version">
      <p className="version-head">
        <span>{versionLabel(s, v)}</span>
        {v.source === 'ai' && <span className="kind-badge">from AI</span>}
        <span className="fine-print">{when(v.createdAt)}</span>
      </p>
      <div className="sphere-bar version-spheres" role="group" aria-label={`${versionLabel(s, v)} Spheres`}>
        {SPHERES.map((sp) => {
          const r = v.spheres[sp] ?? 0;
          return (
            <button
              key={sp}
              type="button"
              className={`sphere-btn sph-${sp}${r ? ' on' : ''}`}
              aria-label={`${sp}${r ? ` ${r}` : ''}`}
              title={sp}
              onClick={() => onChange({ spheres: { ...v.spheres, [sp]: r >= 5 ? 0 : r + 1 } })}
            >
              <SphereGlyph sphere={sp} size={20} />
              <span className="sphere-btn-name">{sp === 'Correspondence' ? 'Corresp.' : sp}</span>
              <span className="sphere-btn-rank">{r || ''}</span>
            </button>
          );
        })}
      </div>
      {used ? (
        <>
          <div className="difficulty">
            <span>
              Coincidental <strong>{d.coincidental}</strong>
            </span>
            <span>
              Vulgar <strong>{d.vulgar}</strong>
            </span>
            <span>
              With witnesses <strong>{d.witnessed}</strong>
            </span>
          </div>
          {miss !== undefined && (
            <p className={`castable${miss === 0 ? ' yes' : ''}`}>
              {miss === 0 ? `${characterName} has the dots for this` : `${miss} dot${miss > 1 ? 's' : ''} short`}
            </p>
          )}
        </>
      ) : (
        <p className="empty-small">Tap the Spheres this takes; tap again to raise the rank.</p>
      )}
      <label className="field field-long">
        <span className="field-label">How it looks</span>
        <textarea className="text-area" rows={2} value={v.how} placeholder="Focus and instruments, words, gestures, what others see" onChange={(e) => onChange({ how: e.target.value })} />
      </label>
      <label className="field field-long">
        <span className="field-label">Keeping it coincidental</span>
        <textarea className="text-area" rows={2} value={v.coincidental} placeholder="Why it could just be chance, or why it's vulgar anyway" onChange={(e) => onChange({ coincidental: e.target.value })} />
      </label>
      <label className="field field-long">
        <span className="field-label">Notes</span>
        <textarea className="text-area" rows={2} value={v.notes} placeholder="Open questions for the Storyteller, risks, ideas" onChange={(e) => onChange({ notes: e.target.value })} />
      </label>
    </div>
  );
}

/** Search the library by name or words and pick one effect to link. */
function EffectPicker({ effects, exclude, onPick, onCancel }: { effects: Effect[]; exclude: string[]; onPick: (id: string) => void; onCancel: () => void }) {
  const [q, setQ] = useState('');
  const hits = useMemo(
    () => (q.trim() ? search(effects, parseQuery(q, [])).filter((h) => !exclude.includes(h.effect.id)).slice(0, 8) : []),
    [effects, q, exclude],
  );
  return (
    <div className="effect-picker">
      <div className="add-row">
        <input className="text-input" autoFocus value={q} placeholder="Search the library, e.g. portal or forces:3" aria-label="Find an effect" onChange={(e) => setQ(e.target.value)} />
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
      {hits.length > 0 && (
        <ul className="picker-list">
          {hits.map((h) => (
            <li key={h.effect.id}>
              <button type="button" className="picker-row" onClick={() => onPick(h.effect.id)}>
                <span className="pin-name">{h.effect.name}</span>
                <ComboChips combo={h.effect.combos[h.combos[0]]} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** How the idea went at the table: newest first, plus a short form to add a casting. */
function CastLogView({ s, onChange }: { s: Spell; onChange: (log: Spell['log']) => void }) {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [paradox, setParadox] = useState(0);
  const [notes, setNotes] = useState('');
  const current = s.versions[s.versions.length - 1];
  const add = () => {
    if (!outcome) return;
    onChange([...s.log, { id: crypto.randomUUID(), at: Date.now(), version: current.id, outcome, paradox, notes: notes.trim() }]);
    setOutcome(null);
    setParadox(0);
    setNotes('');
  };
  const versionOf = (id: string) => {
    const v = s.versions.find((x) => x.id === id);
    return v ? versionLabel(s, v) : 'a removed version';
  };
  return (
    <div className="cast-log">
      <div className="log-form">
        <div className="outcome-row" role="group" aria-label="How did it go">
          {OUTCOMES.map((o) => (
            <button key={o.id} type="button" className={`outcome-btn outcome-${o.id}${outcome === o.id ? ' on' : ''}`} aria-pressed={outcome === o.id} onClick={() => setOutcome(o.id)}>
              {o.label}
            </button>
          ))}
        </div>
        {outcome && (
          <>
            <label className="log-paradox">
              Paradox gained
              <input
                className="text-input"
                type="text"
                inputMode="numeric"
                value={paradox || ''}
                placeholder="0"
                onChange={(e) => setParadox(Math.min(20, parseInt(e.target.value.replace(/\D/g, ''), 10) || 0))}
              />
            </label>
            <textarea className="text-area" rows={2} value={notes} placeholder="What happened, what the Storyteller said" aria-label="Log notes" onChange={(e) => setNotes(e.target.value)} />
            <button type="button" className="btn btn-gold" onClick={add}>
              Add to the log
            </button>
          </>
        )}
      </div>
      {s.log.length > 0 && (
        <ul className="log-list">
          {[...s.log].reverse().map((l) => (
            <li key={l.id} className="log-entry">
              <span className="log-head">
                <span className={`outcome outcome-${l.outcome}`}>{OUTCOMES.find((o) => o.id === l.outcome)?.label}</span>
                <span className="fine-print">
                  {when(l.at)}, {versionOf(l.version)}
                  {l.paradox > 0 && `, +${l.paradox} Paradox`}
                </span>
                <button type="button" className="btn-icon" aria-label="Remove from the log" onClick={() => onChange(s.log.filter((x) => x.id !== l.id))}>
                  <Icon name="close" size={16} />
                </button>
              </span>
              {l.notes && <span className="log-notes">{l.notes}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
