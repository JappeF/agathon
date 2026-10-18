import { useMemo, useState } from 'react';
import { firstCost, type Pick } from '../sheetLists';
import { Modal } from './Modal';

/**
 * Pick a Background, Merit or Flaw from the ones M20 defines, or add your own: search
 * filters names, Technocratic names and hints; the typed text can always be added as is.
 */
export function TraitPicker({
  title,
  picks,
  taken,
  technocrat,
  dots,
  onPick,
  onClose,
  mode = 'add',
}: {
  title: string;
  picks: Pick[];
  /** names already on the sheet */
  taken: string[];
  /** use the Technocratic names */
  technocrat: boolean;
  /** Backgrounds start at one dot; Merits and Flaws at their lowest cost */
  dots: boolean;
  onPick: (name: string, rating: number, pick?: Pick) => void;
  /** 'set' fills one field (Affiliation, Sect) instead of adding a row */
  mode?: 'add' | 'set';
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const shown = useMemo(
    () => picks.filter((p) => !query || [p.name, p.tech, p.hint, p.kind].some((x) => x?.toLowerCase().includes(query))),
    [picks, query],
  );
  const nameOf = (p: Pick) => (technocrat && p.tech ? p.tech : p.name);
  const has = (p: Pick) => taken.some((t) => [p.name, p.tech].some((n) => n && t.trim().toLowerCase() === n.toLowerCase()));
  const exact = picks.some((p) => [p.name, p.tech].some((n) => n?.toLowerCase() === query));

  return (
    <Modal title={title} onClose={onClose}>
      <input
        className="text-input picker-search"
        value={q}
        placeholder="Search, or type your own"
        aria-label="Search or type a name"
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          if (shown.length === 1) onPick(nameOf(shown[0]), dots ? 1 : firstCost(shown[0].cost), shown[0]);
          else if (q.trim()) onPick(q.trim(), dots ? 1 : 1);
        }}
      />
      <ul className="trait-picks">
        {shown.map((p) => (
          <li key={p.name}>
            <button type="button" className={`trait-pick${has(p) ? ' taken' : ''}`} onClick={() => onPick(nameOf(p), dots ? 1 : firstCost(p.cost), p)}>
              <span className="trait-pick-head">
                <span className="trait-pick-name">
                  {nameOf(p)}
                  {p.tech && <span className="trait-pick-alt"> ({technocrat ? p.name : p.tech})</span>}
                </span>
                {p.cost && <span className="trait-pick-cost">{p.cost} pt</span>}
              </span>
              <span className="trait-pick-hint">{p.hint}</span>
              <span className="trait-pick-meta">
                {[p.kind, p.technocracy && 'Technocracy', `M20 p. ${p.page}`, has(p) && (mode === 'set' ? 'chosen now' : 'on the sheet')].filter(Boolean).join(', ')}
              </span>
            </button>
          </li>
        ))}
        {q.trim() && !exact && (
          <li>
            <button type="button" className="trait-pick own" onClick={() => onPick(q.trim(), 1)}>
              <span className="trait-pick-name">
                {mode === 'set' ? 'Use' : 'Add'} "{q.trim()}"
              </span>
              <span className="trait-pick-hint">Your own, or from another book</span>
            </button>
          </li>
        )}
        {!q.trim() && mode === 'add' && (
          <li>
            <button type="button" className="trait-pick own" onClick={() => onPick('', 1)}>
              <span className="trait-pick-name">An empty row</span>
              <span className="trait-pick-hint">Type the name on the sheet</span>
            </button>
          </li>
        )}
      </ul>
    </Modal>
  );
}
