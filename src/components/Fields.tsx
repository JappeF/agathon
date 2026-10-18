import { useState } from 'react';
import type { Rated } from '../character';
import type { Pick } from '../sheetLists';
import { TraitPicker } from './TraitPicker';
import { Dots } from './Dots';
import { Icon } from './Icon';

/** A labelled value: plain text while playing, an input in edit mode. */
export function Field({
  label,
  value,
  edit,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  edit: boolean;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  if (!edit && !value) return null;
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {edit ? (
        <input className="text-input" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <span className="field-value">{value}</span>
      )}
    </label>
  );
}

export function LongText({
  label,
  value,
  edit,
  onChange,
  placeholder,
  className = '',
}: {
  label: string;
  value: string;
  edit: boolean;
  onChange: (v: string) => void;
  placeholder?: string;
  /** extra class for the textarea (the Notes tab's notebook) */
  className?: string;
}) {
  if (!edit && !value) return null;
  return (
    <div className="field field-long">
      <span className="field-label">{label}</span>
      {edit ? (
        <textarea className={`text-area ${className}`} value={value} rows={4} placeholder={placeholder} aria-label={label} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <p className="field-value prose">{value}</p>
      )}
    </div>
  );
}

/** Name + rating rows (backgrounds, other traits) or name + cost rows (merits, flaws). */
export function RatedList({
  items,
  edit,
  onChange,
  kind = 'dots',
  addLabel,
  empty,
  picks,
  technocrat = false,
}: {
  items: Rated[];
  edit: boolean;
  onChange: (items: Rated[]) => void;
  kind?: 'dots' | 'cost';
  addLabel: string;
  empty: string;
  /** the ones the book defines: Add opens a picker (free-form names stay possible) */
  picks?: Pick[];
  technocrat?: boolean;
}) {
  const [picking, setPicking] = useState(false);
  const set = (i: number, p: Partial<Rated>) => onChange(items.map((it, j) => (j === i ? { ...it, ...p } : it)));
  const known = (name: string) => picks?.find((p) => [p.name, p.tech].some((n) => n && n.toLowerCase() === name.trim().toLowerCase()));
  if (!edit && items.length === 0) return <p className="empty-small">{empty}</p>;
  return (
    <ul className="rated-list">
      {items.map((it, i) => (
        <li key={i} className="trait-row">
          {edit ? (
            <input className="text-input row-input" value={it.name} aria-label="Name" onChange={(e) => set(i, { name: e.target.value })} />
          ) : (
            <span className="trait-name" title={known(it.name) ? `${known(it.name)!.hint} (M20 p. ${known(it.name)!.page})` : undefined}>
              {it.name}
            </span>
          )}
          {kind === 'dots' ? (
            <Dots value={it.rating} label={it.name || 'Rating'} onChange={edit ? (v) => set(i, { rating: v }) : undefined} />
          ) : edit ? (
            <input
              className="text-input cost-input"
              inputMode="numeric"
              value={it.rating || ''}
              aria-label="Points"
              onChange={(e) => set(i, { rating: parseInt(e.target.value, 10) || 0 })}
            />
          ) : (
            <span className="cost">{it.rating ? `${it.rating} pt` : ''}</span>
          )}
          {edit && (
            <button type="button" className="btn-icon" aria-label={`Remove ${it.name || 'row'}`} onClick={() => onChange(items.filter((_, j) => j !== i))}>
              <Icon name="close" />
            </button>
          )}
        </li>
      ))}
      {edit && (
        <li>
          <button type="button" className="btn btn-small" onClick={() => (picks ? setPicking(true) : onChange([...items, { name: '', rating: 1 }]))}>
            {addLabel}
          </button>
          {picking && picks && (
            <TraitPicker
              title={addLabel}
              picks={picks}
              taken={items.map((it) => it.name)}
              technocrat={technocrat}
              dots={kind === 'dots'}
              onPick={(name, rating) => {
                onChange([...items, { name, rating }]);
                setPicking(false);
              }}
              onClose={() => setPicking(false)}
            />
          )}
        </li>
      )}
    </ul>
  );
}

/** A list of single lines (rotes, focus, gear). */
export function LineList({
  items,
  edit,
  onChange,
  addLabel,
  empty,
  placeholder,
  suggestions,
  renderItem,
}: {
  items: string[];
  edit: boolean;
  onChange: (items: string[]) => void;
  addLabel: string;
  empty: string;
  placeholder?: string;
  /** id of a <datalist> to suggest values while editing */
  suggestions?: string;
  /** how a line shows in play mode (default: the text) */
  renderItem?: (item: string) => React.ReactNode;
}) {
  if (!edit && items.length === 0) return <p className="empty-small">{empty}</p>;
  return (
    <ul className="line-list">
      {items.map((it, i) =>
        edit ? (
          <li key={i} className="line-edit">
            <input
              className="text-input"
              value={it}
              placeholder={placeholder}
              list={suggestions}
              aria-label={`Line ${i + 1}`}
              onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
            />
            <button type="button" className="btn-icon" aria-label="Remove line" onClick={() => onChange(items.filter((_, j) => j !== i))}>
              <Icon name="close" />
            </button>
          </li>
        ) : (
          <li key={i}>{renderItem ? renderItem(it) : it}</li>
        ),
      )}
      {edit && (
        <li>
          <button type="button" className="btn btn-small" onClick={() => onChange([...items, ''])}>
            {addLabel}
          </button>
        </li>
      )}
    </ul>
  );
}
