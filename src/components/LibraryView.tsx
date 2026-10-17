import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getActiveCharacter } from '../activeCharacter';
import { db } from '../db/db';
import { sourceLabel, useEffects, type Effect } from '../library/data';
import { parseQuery, search, setSphereInQuery, sphereRankInQuery, type Hit } from '../library/search';
import { SPHERES, type Sphere } from '../types';
import { go } from '../useHashRoute';
import { ComboChips } from './ComboChips';
import { EffectDetail } from './EffectDetail';
import { SphereGlyph } from './SphereGlyph';

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

function EffectCard({ hit, dots, onOpen }: { hit: Hit; dots?: Record<Sphere, number>; onOpen: () => void }) {
  const e = hit.effect;
  const shown = hit.combos.slice(0, 3);
  return (
    <li>
      <button type="button" className={`effect-card kind-${e.kind}`} onClick={onOpen}>
        <span className="effect-head">
          <span className="effect-name">{e.name}</span>
          {e.kind !== 'feat' && <span className={`kind-badge kind-${e.kind}`}>{e.kind === 'rank' ? 'Sphere rank' : 'rote'}</span>}
        </span>
        <span className="effect-combos">
          {shown.map((i, n) => (
            <span key={i} className="effect-combo">
              {n > 0 && <span className="combo-or">or</span>}
              <ComboChips combo={e.combos[i]} dots={dots} />
            </span>
          ))}
          {hit.combos.length > shown.length && <span className="combo-or">+{hit.combos.length - shown.length} more</span>}
        </span>
        <span className="effect-summary">{e.summary}</span>
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
  const activeId = getActiveCharacter();
  const character = useLiveQuery(() => (activeId ? db.characters.get(activeId) : undefined), [activeId]);

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

  const tags = useMemo(() => {
    const count = new Map<string, number>();
    for (const e of effects ?? []) for (const t of e.tags) count.set(t, (count.get(t) ?? 0) + 1);
    return [...count].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [effects]);

  const parsed = useMemo(() => {
    const q = parseQuery(query, tags);
    // "allow other Spheres": the asked Spheres must be there, anything else may join them
    if (prefs.others) q.uses = [...new Set([...q.uses, ...q.spheres.filter((o) => !o.neg).map((o) => o.sphere)])];
    return q;
  }, [query, tags, prefs.others]);

  const castable = prefs.castable && character ? character.spheres : undefined;
  const hits = useMemo(() => (effects ? search(effects, parsed, { castable }) : []), [effects, parsed, castable]);
  const ready = hits.filter((h) => !h.missing);
  const near = hits.filter((h) => h.missing === 1);
  const selected: Effect | undefined = selectedId ? effects?.find((e) => e.id === selectedId) : undefined;

  const cycleSphere = (s: (typeof SPHERES)[number]) => {
    const r = sphereRankInQuery(parsed, s);
    setQuery(setSphereInQuery(query, s, r >= 5 ? 0 : r + 1));
  };
  const toggleTag = (t: string) => {
    const has = parsed.tags.some((x) => x.value === t && !x.neg);
    setQuery(
      has
        ? query.replace(new RegExp(`(^|\\s)tag:${t}\\S*`, 'i'), ' ').replace(/\s+/g, ' ').trimStart()
        : `${query.trim()} tag:${t} `.trimStart(),
    );
  };

  const list = (items: Hit[]) => (
    <ul className="effect-list">
      {items.map((h) => (
        <EffectCard
          key={h.effect.id}
          hit={h}
          dots={castable}
          onOpen={() => {
            openedFromList = true;
            go('library', h.effect.id);
          }}
        />
      ))}
    </ul>
  );

  return (
    <section className="view library">
      <h2 className="view-title">Library</h2>
      <input
        className="text-input search-input"
        type="search"
        value={query}
        placeholder="portal, mind:3 forces:2, tag:healing"
        aria-label="Search effects"
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="sphere-bar" role="group" aria-label="Sphere ranks">
        {SPHERES.map((s) => {
          const r = sphereRankInQuery(parsed, s);
          return (
            <button
              key={s}
              type="button"
              className={`sphere-btn${r ? ' on' : ''}`}
              aria-label={`${s}${r ? ` up to ${r}` : ''}`}
              title={s}
              onClick={() => cycleSphere(s)}
            >
              <SphereGlyph sphere={s} size={20} />
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

      <div className="tag-bar">
        {tags.map((t) => (
          <button
            key={t}
            type="button"
            className={`tag${parsed.tags.some((x) => x.value === t && !x.neg) ? ' on' : ''}`}
            onClick={() => toggleTag(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {parsed.chips.length > 0 && (
        <p className="op-chips">
          {parsed.chips.map((c, i) => (
            <span key={i} className={`op-chip${c.neg ? ' neg' : ''}${c.ok ? '' : ' bad'}`} title={c.ok ? undefined : 'Not recognised'}>
              {c.label}
            </span>
          ))}
        </p>
      )}

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

      {selected && (
        <EffectDetail
          effect={selected}
          character={character}
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
