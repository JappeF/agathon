import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDraft } from '../useDraft';
import { ShareButton } from './ShareButton';
import { encodeSpellShare, spellIdeaUrl } from '../share';
import { useActiveCharacter } from '../activeCharacter';
import type { Character } from '../character';
import { db, requestPersistence, saveSpell } from '../db/db';
import { useEffects, type Effect } from '../library/data';
import { deficit, difficulties, parseQuery, search } from '../library/search';
import { newSpell, newVersion, normalizeSpell, OUTCOMES, versionCombo, versionLabel, type Outcome, type Spell, type SpellVersion } from '../spells';
import { SPHERES, type Sphere } from '../types';
import { go } from '../useHashRoute';
import { ComboChips } from './ComboChips';
import { EffectDetail } from './EffectDetail';
import { Icon } from './Icon';
import { searchLibrary } from './LibraryView';
import { toggleFavorite } from '../favorites';
import { Modal } from './Modal';
import { buildPack, packSize, parseReply, ReplyError, type PackOptions, type PackPage } from '../contextPack';
import { candidatePassages, printedPage } from '../books';
import { BooksPanel } from './BooksPanel';
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
        <h2 className="view-title">Spell ideas</h2>
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
      <h2 className="view-title">Spell ideas</h2>
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
      <p className="fine-print">Or start one from a spell in the library.</p>
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
      <BooksPanel />
    </section>
  );
}

// ---------- one dossier ----------

function useSpell(id: string) {
  const { draft: s, patch } = useDraft(id, async (i) => {
    const x = await db.spells.get(i);
    return x && normalizeSpell(x);
  }, saveSpell);
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
  const [ai, setAi] = useState<'copy' | 'paste' | null>(null);

  if (s === undefined) return null;
  if (s === null) {
    return (
      <section className="view">
        <p className="empty">This spell idea isn't on this device.</p>
        <a className="btn" href="#/spells">
          Spell ideas
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
          <Icon name="back" /> Spell ideas
        </a>
        <span className="dossier-actions">
          {/* the idea travels in the link; other apps show its title and goal (functions/i) */}
          <ShareButton url={async () => spellIdeaUrl(await encodeSpellShare(s))} title={s.title || 'Spell idea'} label="Share this spell idea" />
          <button type="button" className="btn btn-small" onClick={() => setConfirmDelete(true)}>
            Delete idea
          </button>
        </span>
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

      {character && (
        <div className="ai-row">
          <button type="button" className="btn" onClick={() => setAi('copy')}>
            Copy for AI
          </button>
          <button type="button" className="btn" onClick={() => setAi('paste')}>
            Paste the answer
          </button>
          <span className="fine-print">Work out the Spheres, the rules and the story that keeps it coincidental with an AI: copy the idea out, paste the answer back.</span>
        </div>
      )}
      {ai === 'copy' && character && <CopyForAi s={s} c={character} effects={effects ?? []} onClose={() => setAi(null)} />}
      {ai === 'paste' && (
        <PasteAnswer
          title={s.title}
          goal={s.goal}
          onClose={() => setAi(null)}
          onTake={(v, also) => {
            patch({ versions: [...s.versions, v], ...also });
            setAi(null);
          }}
        />
      )}

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
          {s.effects.length === 0 && <p className="empty-small">No spells linked yet. Link the ones from the library this idea builds on.</p>}
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
              Link a spell
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
          onPin={character ? () => toggleFavorite(character.id, openEffect) : undefined}
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
      {v.reply && (
        <details className="ai-reply">
          <summary>The AI's whole answer</summary>
          <p className="prose">{v.reply}</p>
        </details>
      )}
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

/** Search the library by name or words and pick one spell to link. */
function EffectPicker({ effects, exclude, onPick, onCancel }: { effects: Effect[]; exclude: string[]; onPick: (id: string) => void; onCancel: () => void }) {
  const [q, setQ] = useState('');
  const hits = useMemo(
    () => (q.trim() ? search(effects, parseQuery(q, [])).filter((h) => !exclude.includes(h.effect.id)).slice(0, 8) : []),
    [effects, q, exclude],
  );
  return (
    <div className="effect-picker">
      <div className="add-row">
        <input className="text-input" autoFocus value={q} placeholder="Search the library, e.g. portal or forces:3" aria-label="Find a spell" onChange={(e) => setQ(e.target.value)} />
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

// ---------- the AI round trip: copy a context pack out, paste the answer back ----------

const PACK_PREFS = 'agathon:pack';
/** rulebook pages ticked by default; about 15 pages keeps the prompt inside a free chat */
const MAX_PAGES = 15;

function CopyForAi({ s, c, effects, onClose }: { s: Spell; c: Character; effects: Effect[]; onClose: () => void }) {
  const [o, setO] = useState<PackOptions>(() => {
    try {
      // the toggles are remembered per device; the question starts empty each time
      return { history: true, library: true, notes: false, ...JSON.parse(localStorage.getItem(PACK_PREFS) ?? '{}'), ask: '' };
    } catch {
      return { ask: '', history: true, library: true, notes: false };
    }
  });
  const [copied, setCopied] = useState(false);
  // pages from the player's own rulebooks: the linked effects, the Sphere ranks of the
  // plan, then the core rules, up to about 15 pages ticked to start with
  const books = useLiveQuery(() => db.books.toArray(), []);
  const candidates = useMemo(() => {
    const linked = s.effects.map((id) => effects.find((e) => e.id === id)).filter((e): e is Effect => !!e);
    const plan = s.versions[s.versions.length - 1];
    return candidatePassages(linked, plan.spheres, effects).filter((p) => printedPage(books?.find((b) => b.id === p.book), p.page));
  }, [s, effects, books]);
  // the player's own ticks; untouched pages follow the default (the first MAX_PAGES)
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const isTicked = (key: string, i: number) => picked[key] ?? i < MAX_PAGES;
  const pages: PackPage[] = candidates
    .filter((p, i) => isTicked(p.key, i))
    .map((p) => ({ ...p, text: printedPage(books?.find((b) => b.id === p.book), p.page) ?? '' }));
  const pageKeys = pages.map((p) => `${p.book}:${p.page}`).join();
  const text = useMemo(() => buildPack(s, c, effects, o, pages), [s, c, effects, o, pageKeys]); // eslint-disable-line react-hooks/exhaustive-deps
  const tick = (key: string, on: boolean) => {
    setCopied(false);
    setPicked((p) => ({ ...p, [key]: on }));
  };
  // all or none in one go, for AIs that choke on a long prompt
  const tickAll = (on: boolean) => {
    setCopied(false);
    setPicked(Object.fromEntries(candidates.map((p) => [p.key, on])));
  };
  const allTicked = pages.length === candidates.length;
  const size = packSize(text);
  const set = (p: Partial<PackOptions>) => {
    const next = { ...o, ...p };
    setO(next);
    setCopied(false);
    try {
      localStorage.setItem(PACK_PREFS, JSON.stringify({ history: next.history, library: next.library, notes: next.notes }));
    } catch {
      // private mode: just don't remember
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // no clipboard access: select the preview so it can be copied by hand
      const pre = document.querySelector<HTMLElement>('.pack-preview pre');
      if (pre) getSelection()?.selectAllChildren(pre);
    }
  };
  return (
    <Modal title="Copy for AI" onClose={onClose}>
      <p className="empty-small">
        Everything needed to work this spell out: {c.name}'s Arete, Spheres and focus, the idea and its plan, the spells it builds on and the
        rules. Paste it into Claude, ChatGPT or Gemini and ask away.
      </p>
      <label className="field field-long">
        <span className="field-label">The scene, or your question (optional)</span>
        <textarea
          className="text-area"
          rows={3}
          value={o.ask}
          placeholder="A crowded train platform, two Men in Black at the far end. Can I do it without them noticing?"
          onChange={(e) => set({ ask: e.target.value })}
        />
      </label>
      <div className="pack-options">
        <label className="check">
          <input type="checkbox" checked={o.library} onChange={(e) => set({ library: e.target.checked })} />
          Linked library spells
        </label>
        <label className="check">
          <input type="checkbox" checked={o.history} onChange={(e) => set({ history: e.target.checked })} />
          Earlier versions and the log
        </label>
        <label className="check">
          <input type="checkbox" checked={o.notes} onChange={(e) => set({ notes: e.target.checked })} />
          {c.name}'s private notes
        </label>
      </div>
      {candidates.length > 0 ? (
        <details className="pack-pages">
          <summary>
            Pages from your rulebooks: {pages.length} of {candidates.length}
          </summary>
          <label className="check pack-all">
            <input
              type="checkbox"
              checked={allTicked}
              ref={(el) => {
                if (el) el.indeterminate = pages.length > 0 && !allTicked;
              }}
              onChange={(e) => tickAll(e.target.checked)}
            />
            All pages
          </label>
          <ul>
            {candidates.map((p, i) => (
              <li key={p.key}>
                <label className="check">
                  <input type="checkbox" checked={isTicked(p.key, i)} onChange={(e) => tick(p.key, e.target.checked)} />
                  {p.book} p. {p.page}, {p.label}
                </label>
              </li>
            ))}
          </ul>
        </details>
      ) : (
        <p className="fine-print">
          Add your rulebook PDF under <a href="#/spells">Spell ideas</a> to bring the book's own pages along.
        </p>
      )}
      <details className="pack-preview">
        <summary>
          Preview, about {size.words} words ({size.tokens} tokens)
        </summary>
        <pre>{text}</pre>
      </details>
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>
          Close
        </button>
        <button className="btn btn-gold" onClick={copy}>
          {copied ? 'Copied' : 'Copy the prompt'}
        </button>
      </div>
      {copied && <p className="empty-small pack-done">Copied. Paste it into your AI chat; when you like the answer, bring it back with Paste the answer.</p>}
    </Modal>
  );
}

/**
 * Paste an AI's answer: its plan becomes a new version. When it also suggests a name or a
 * sharper goal, both show here with a checkbox (on), so the player decides what to take.
 */
function PasteAnswer({
  title,
  goal,
  onClose,
  onTake,
}: {
  title: string;
  goal: string;
  onClose: () => void;
  onTake: (v: SpellVersion, also: { title?: string; goal?: string }) => void;
}) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [skipTitle, setSkipTitle] = useState(false);
  const [skipGoal, setSkipGoal] = useState(false);
  // read as you paste, so the suggestions show before you take them
  const parsed = useMemo(() => {
    try {
      return text.trim() ? parseReply(text) : null;
    } catch {
      return null;
    }
  }, [text]);
  const newTitle = parsed?.title && parsed.title !== title.trim() ? parsed.title : '';
  const newGoal = parsed?.goal && parsed.goal !== goal.trim() ? parsed.goal : '';
  const take = () => {
    try {
      const r = parseReply(text);
      onTake(r.version, {
        ...(newTitle && !skipTitle ? { title: newTitle } : {}),
        ...(newGoal && !skipGoal ? { goal: newGoal } : {}),
      });
    } catch (e) {
      setError(e instanceof ReplyError ? e.message : "This answer couldn't be read.");
    }
  };
  return (
    <Modal title="Paste the answer" onClose={onClose}>
      <p className="empty-small">Paste the AI's answer. Its plan becomes a new version of this idea, with the whole answer kept beside it.</p>
      <textarea
        className="text-area paste-area"
        rows={8}
        value={text}
        autoFocus
        placeholder="Paste the AI's answer here"
        aria-label="The AI's answer"
        onChange={(e) => {
          setText(e.target.value);
          setError('');
        }}
      />
      {error && <p className="paste-error">{error}</p>}
      {(newTitle || newGoal) && (
        <div className="paste-suggest">
          <p className="empty-small">The AI also suggests:</p>
          {newTitle && (
            <label className="check">
              <input type="checkbox" checked={!skipTitle} onChange={(e) => setSkipTitle(!e.target.checked)} />
              <span>
                Name: <strong>{newTitle}</strong>
              </span>
            </label>
          )}
          {newGoal && (
            <label className="check">
              <input type="checkbox" checked={!skipGoal} onChange={(e) => setSkipGoal(!e.target.checked)} />
              <span>
                What should happen: <em>{newGoal}</em>
              </span>
            </label>
          )}
        </div>
      )}
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-gold" disabled={!text.trim()} onClick={take}>
          Add as a new version
        </button>
      </div>
    </Modal>
  );
}
