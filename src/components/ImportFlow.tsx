import { useRef, useState } from 'react';
import type { Character } from '../character';
import { applyImport, prepareImport, type PendingImport } from '../sheetActions';
import { SheetFormatError } from '../sheets/mrgone';
import { SPHERES } from '../types';
import { Modal } from './Modal';

/**
 * "Import PDF sheet" button plus the confirmation dialog. A new character gets a short
 * preview; an existing one (same name, or `target`) gets the list of changes first,
 * because an import never overwrites anything without asking.
 */
export function ImportFlow({
  target,
  label,
  className = 'btn',
  onDone,
}: {
  target?: Character;
  label: string;
  className?: string;
  onDone: (c: Character) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      setPending(await prepareImport(file, target));
    } catch (e) {
      setError(e instanceof SheetFormatError ? e.message : "Couldn't read that file.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  const confirm = async (asNew = false) => {
    if (!pending) return;
    const c = await applyImport(pending, asNew);
    setPending(null);
    onDone(c);
  };

  const f = pending?.fields;
  const spheres = f ? SPHERES.filter((s) => f.spheres[s] > 0).map((s) => `${s} ${f.spheres[s]}`) : [];

  return (
    <>
      <button type="button" className={className} onClick={() => input.current?.click()} disabled={busy}>
        {busy ? 'Reading...' : label}
      </button>
      <input ref={input} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => pick(e.target.files?.[0])} />

      {error && (
        <Modal title="Can't import this sheet" onClose={() => setError('')}>
          <p>{error}</p>
          <div className="modal-actions">
            <button className="btn btn-gold" onClick={() => setError('')}>
              OK
            </button>
          </div>
        </Modal>
      )}

      {pending && f && !pending.target && (
        <Modal title={`Import ${f.name || 'this mage'}?`} onClose={() => setPending(null)}>
          <p className="import-summary">
            {[f.concept, f.affiliation, f.essence && `${f.essence} Essence`].filter(Boolean).join(', ')}
          </p>
          <p>
            Arete {f.arete}, Willpower {f.willpower}, Quintessence {f.quintessence}, Paradox {f.paradox}
          </p>
          <p>{spheres.join(', ') || 'No Spheres yet'}</p>
          <p className="empty-small">
            The PDF stays on this device so you can export the character back into it later.
          </p>
          <div className="modal-actions">
            <button className="btn" onClick={() => setPending(null)}>
              Cancel
            </button>
            <button className="btn btn-gold" onClick={() => confirm()}>
              Import
            </button>
          </div>
        </Modal>
      )}

      {pending && f && pending.target && (
        <Modal title={`Update ${pending.target.name}?`} onClose={() => setPending(null)}>
          {pending.changes.length === 0 ? (
            <p>The sheet matches what you have. Nothing would change.</p>
          ) : (
            <>
              <p>The sheet differs in {pending.changes.length === 1 ? 'one place' : `${pending.changes.length} places`}:</p>
              <ul className="change-list">
                {pending.changes.map((ch) => (
                  <li key={ch}>{ch}</li>
                ))}
              </ul>
            </>
          )}
          <p className="empty-small">Your notes and spell ideas stay as they are.</p>
          <div className="modal-actions">
            <button className="btn" onClick={() => setPending(null)}>
              Cancel
            </button>
            {!target && (
              <button className="btn" onClick={() => confirm(true)}>
                Import as new
              </button>
            )}
            <button className="btn btn-gold" onClick={() => confirm()}>
              Update
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
