import { useEffect, useMemo, useState } from 'react';
import { useActiveCharacter } from '../activeCharacter';
import { sourceLabel, useEffects, type Effect } from '../library/data';
import { parseQuery, search, setSphereInQuery, sphereRankInQuery, type Hit } from '../library/search';
import { SPHERES, type Sphere } from '../types';
import { go } from '../useHashRoute';
import { ComboChips } from './ComboChips';
import { EffectDetail } from './EffectDetail';
import { SphereGlyph } from './SphereGlyph';
import { Icon } from './Icon';
import { hasMatch, Highlighted, snippet } from './Highlighted';

const PAGE = 40;

// remembered while the app is open, so switching tabs doesn't lose the search
let lastQuery = '';
// whether the open detail came from the list (then closing = going back), or from a link
let openedFromList = false;
const PREFS = 'agathon:library';
const loadPrefs = (): { castable: boolean; others: boolean } => {
  try {
    return { castable: false, others: false, ...JSON.parse(localStorage.getItem(PREFS) ?? '{}') };
  } catch {
    return { castable: false, others: false };
  }
};

/** The Sphere that colours a card: the highest-ranked one of the combo shown first. */
function accentSphere(e: Effect, combo: number): Sphere {
  const entries = Object.entries(e.combos[combo].spheres) as [Sphere, number][];
  return entries.sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Prime';
}

/**
 * One effect as a card. Only the first (best matching) way to cast it is shown, with
 * "+N more" for the rest, so every card has the same shape; the detail has them all.
 * Search words are marked; when they only occur further down (the system, a combo note,
 * the coincidental note) a line from there shows why the card matched.
 */
function EffectCard({ hit, dots, terms, onOpen }: { hit: Hit; dots?: Record<Sphere, number>; terms: string[]; onOpen: () => void }) {
  const e = hit.effect;
  const first = hit.combos[0];
  const more = e.combos.length - 1;
  const inSummary = hasMatch(e.summary, terms);
  const elsewhere =
    terms.length && !inSummary
      ? [e.system, e.coincidentalIf, ...e.combos.map((c) => c.note), ...(e.optional ?? []).map((o) => o.purpose)].find((t) => hasMatch(t, terms))
      : undefined;
  return (
    <li>
      <button type="button" className={`effect-card kind-${e.kind} sph-${accentSphere(e, first)}`} onClick={onOpen}>
        <span className="effect-head">
          <span className="effect-name">
            <Highlighted text={e.name} terms={terms} />
          </span>
          {e.kind !== 'feat' && <span className={`kind-badge kind-${e.kind}`}>{e.kind === 'rank' ? 'Sphere rank' : 'rote'}</span>}
        </span>
        <span className="effect-combos">
          <span className="effect-combo">
            <ComboChips combo={e.combos[first]} dots={dots} />
          </span>
          {more > 0 && <span className="more-ways">+{more} more</span>}
        </span>
        <span className="effect-summary">
          <Highlighted text={inSummary ? snippet(e.summary, terms) : e.summary} terms={terms} />
        </span>
        {elsewhere && (
          <span className="effect-match">
            <Highlighted text={snippet(elsewhere, terms, 40, 140)} terms={terms} />
          </span>
        )}
        <span className="effect-meta">
          {e.vulgarity && <span className={`vulg vulg-${e.vulgarity}`}>{e.vulgarity === 'depends' ? 'coincidental or vulgar' : e.vulgarity}</span>}
          <span>{e.source.map(sourceLabel).join(', ')}</span>
        </span>
      </button>
    </li>
  );
}

export function LibraryView({ selectedId }: { selectedId?: string }) {
  const effects = useEffects();
  const [query, setQuery] = useState(lastQuery);
  const [prefs, setPrefs] = useState(loadPrefs);
  const [limit, setLimit] = useState(PAGE);
  const [nearLimit, setNearLimit] = useState(10);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { active: character } = useActiveCharacter();

  useEffect(() => {
    lastQuery = query;
    setLimit(PAGE);
    setNearLimit(10);
  }, [query]);
  useEffect(() => {
    try {
      localStorage.setItem(PREFS, JSON.stringify(prefs));
    } catch {
      // private mode: just don't remember
    }
  }, [prefs]);

  const tagCounts = useMemo(() => {
    const count = new Map<string, number>();
    for (const e of effects ?? []) for (const t of e.tags) count.set(t, (count.get(t) ?? 0) + 1);
    return count;
  }, [effects]);
  const tags = useMemo(() => [...tagCounts.keys()].sort((a, b) => a.localeCompare(b)), [tagCounts]);

  const parsed = useMemo(() => {
    const q = parseQuery(query, tags);
    // "allow other Spheres": the asked Spheres must be there, anything else may join them
    if (prefs.others) q.uses = [...new Set([...q.uses, ...q.spheres.filter((o) => !o.neg).map((o) => o.sphere)])];
    return q;
  }, [query, tags, prefs.others]);

  // the words to mark in cards and the detail: free text, phrases and name: terms
  const terms = useMemo(() => [...parsed.terms, ...parsed.nameTerms], [parsed]);
  const castable = prefs.castable && character ? character.spheres : undefined;
  const hits = useMemo(() => (effects ? search(effects, parsed, { castable }) : []), [effects, parsed, castable]);
  const ready = hits.filter((h) => !h.missing);
  const near = hits.filter((h) => h.missing === 1);
  const selected: Effect | undefined = selectedId ? effects?.find((e) => e.id === selectedId) : undefined;

  const cycleSphere = (s: (typeof SPHERES)[number]) => {
    const r = sphereRankInQuery(parsed, s);
    setQuery(setSphereInQuery(query, s, r >= 5 ? 0 : r + 1));
  };
  /** Add or remove one `field:value` operator in the query text (the query stays the source of truth). */
  const toggleOp = (field: string, value: string) => {
    const re = new RegExp(`(^|\\s)${field}:${value}\\S*`, 'i');
    setQuery(re.test(query) ? query.replace(re, ' ').replace(/\s+/g, ' ').trimStart() : `${query.trim()} ${field}:${value} `.trimStart());
  };
  const hasOp = (field: string, value: string) => new RegExp(`(^|\\s)${field}:${value}(\\s|$)`, 'i').test(query);
  const toggleTag = (t: string) => toggleOp('tag', t);

  const list = (items: Hit[]) => (
    <ul className="effect-list">
      {items.map((h) => (
        <EffectCard
          key={h.effect.id}
          hit={h}
          dots={castable}
          terms={terms}
          onOpen={() => {
            openedFromList = true;
            go('library', h.effect.id);
          }}
        />
      ))}
    </ul>
  );

  const tagCount = (t: string) => tagCounts.get(t) ?? 0;
  const activeFilters = parsed.tags.length + parsed.kinds.length + parsed.books.length;

  return (
    <section className="view library">
      <div className="lib-layout">
        <div className="lib-search">
          <h2 className="view-title">Library</h2>
          <input
            className="text-input search-input"
            type="search"
            value={query}
            placeholder="portal, mind:3 forces:2, tag:healing"
            aria-label="Search effects"
            onChange={(e) => setQuery(e.target.value)}
          />
          {query.trim() && (
            <p className="op-chips">
              {parsed.chips.map((c, i) => (
                <span key={i} className={`op-chip${c.neg ? ' neg' : ''}${c.ok ? '' : ' bad'}`} title={c.ok ? undefined : 'Not recognised'}>
                  {c.label}
                </span>
              ))}
              <button
                type="button"
                className="op-clear"
                onClick={() => {
                  setQuery('');
                  setPrefs({ ...prefs, others: false });
                }}
              >
                <Icon name="close" size={13} /> Clear all
              </button>
            </p>
          )}
        </div>

        <aside className="lib-side" aria-label="Filters">
          <h3 className="side-title">Spheres</h3>
          <div className="sphere-bar" role="group" aria-label="Sphere ranks">
            {SPHERES.map((s) => {
              const r = sphereRankInQuery(parsed, s);
              return (
                <button
                  key={s}
                  type="button"
                  className={`sphere-btn sph-${s}${r ? ' on' : ''}`}
                  aria-label={`${s}${r ? ` up to ${r}` : ''}`}
                  title={s}
                  onClick={() => cycleSphere(s)}
                >
                  <SphereGlyph sphere={s} size={20} />
                  <span className="sphere-btn-name">{s === 'Correspondence' ? 'Corresp.' : s}</span>
                  <span className="sphere-btn-rank">{r || ''}</span>
                </button>
              );
            })}
          </div>

          <div className="lib-toggles">
            {character && (
              <label className="check">
                <input type="checkbox" checked={prefs.castable} onChange={(e) => setPrefs({ ...prefs, castable: e.target.checked })} />
                What {character.name} can cast
              </label>
            )}
            {parsed.spheres.some((o) => !o.neg) && (
              <label className="check">
                <input type="checkbox" checked={prefs.others} onChange={(e) => setPrefs({ ...prefs, others: e.target.checked })} />
                Allow other Spheres too
              </label>
            )}
          </div>

          <button
            type="button"
            className={`btn btn-small filters-toggle${activeFilters ? ' has-active' : ''}`}
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            Filters{activeFilters ? ` (${activeFilters})` : ''} <Icon name={filtersOpen ? 'up' : 'down'} size={14} />
          </button>
          <div className={`lib-filters${filtersOpen ? ' open' : ''}`}>
            <h3 className="side-title">Kind</h3>
            <div className="chip-row">
              {(['feat', 'rote', 'rank'] as const).map((k) => (
                <button key={k} type="button" className={`tag${hasOp('kind', k) ? ' on' : ''}`} onClick={() => toggleOp('kind', k)}>
                  {k === 'feat' ? 'Effects' : k === 'rote' ? 'Rotes' : 'Sphere ranks'}
                </button>
              ))}
            </div>
            <h3 className="side-title">Book</h3>
            <div className="chip-row">
              {(['m20', 'hdydt'] as const).map((b) => (
                <button key={b} type="button" className={`tag${hasOp('book', b) ? ' on' : ''}`} onClick={() => toggleOp('book', b)}>
                  {b === 'm20' ? 'Mage 20' : 'How Do You DO That?'}
                </button>
              ))}
            </div>
            <h3 className="side-title">Tags</h3>
            <ul className="tag-list">
              {tags.map((t) => {
                const on = parsed.tags.some((x) => x.value === t && !x.neg);
                return (
                  <li key={t}>
                    <button type="button" className={`tag-row${on ? ' on' : ''}`} aria-pressed={on} onClick={() => toggleTag(t)}>
                      <span>{t}</span>
                      <span className="tag-count">{tagCount(t)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        <div className="lib-results">
          {!effects ? (
            <p className="empty">Opening the library...</p>
          ) : (
            <>
              <p className="results-count">
                {castable
                  ? `${ready.length} ${character!.name} can cast, ${near.length} one dot away`
                  : `${hits.length} of ${effects.length} effects`}
                {parsed.spheres.some((o) => !o.neg) && !prefs.others && ' (exactly these Spheres)'}
              </p>
              {hits.length === 0 && <p className="empty">Nothing matches. Try fewer words, or allow other Spheres.</p>}
              {castable ? (
                <>
                  {list(ready.slice(0, limit))}
                  {ready.length > limit && (
                    <button type="button" className="btn load-more" onClick={() => setLimit(limit + PAGE)}>
                      Show more
                    </button>
                  )}
                  {near.length > 0 && (
                    <>
                      <h3 className="block-title near-title">One dot away</h3>
                      <p className="empty-small">Effects {character!.name} could cast with one more dot. The missing Sphere is marked.</p>
                      {list(near.slice(0, nearLimit))}
                      {near.length > nearLimit && (
                        <button type="button" className="btn load-more" onClick={() => setNearLimit(nearLimit + PAGE)}>
                          Show more
                        </button>
                      )}
                    </>
                  )}
                </>
              ) : (
                <>
                  {list(hits.slice(0, limit))}
                  {hits.length > limit && (
                    <button type="button" className="btn load-more" onClick={() => setLimit(limit + PAGE)}>
                      Show more
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {selected && (
        <EffectDetail
          effect={selected}
          character={character}
          terms={terms}
          tagsOn={parsed.tags.filter((t) => !t.neg).map((t) => t.value)}
          onClose={() => {
            if (openedFromList) history.back();
            else {
              history.replaceState(null, '', '#/library');
              window.dispatchEvent(new HashChangeEvent('hashchange'));
            }
            openedFromList = false;
          }}
          onTag={(t) => {
            setQuery(`tag:${t} `);
            go('library');
          }}
        />
      )}
    </section>
  );
}
