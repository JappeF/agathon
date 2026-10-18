import { useState } from 'react';
import { characterLine, type Character } from '../character';
import { db } from '../db/db';
import { applyImport, prepareImport, type PendingImport } from '../sheetActions';
import { SheetFormatError } from '../sheets/mrgone';
import { SPHERES } from '../types';
import { Modal } from './Modal';
import { FilePick } from './FilePick';
import { SharedImport } from './SharedImport';
import { PortalPortrait } from './PortalPortrait';
import { parsePayload, ShareFormatError, type SharePayload } from '../share';

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
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [shared, setShared] = useState<SharePayload | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      // Import (no target) tells a PDF from a character file by content, not name: a shared
      // file often arrives renamed (".json.txt", no extension). Update from PDF takes PDFs.
      const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
      if (!target && String.fromCharCode(...head) !== '%PDF-') {
        setShared(parsePayload(JSON.parse(await file.text())));
      } else {
        setPending(await prepareImport(file, target));
      }
    } catch (e) {
      setError(
        e instanceof SheetFormatError || e instanceof ShareFormatError
          ? e.message
          : "Couldn't read that file. Agathon imports Mr. Gone M20 PDF sheets and Agathon character files.",
      );
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (asNew = false) => {
    if (!pending) return;
    try {
      const c = await applyImport(pending, asNew);
      setPending(null);
      onDone(c);
    } catch (e) {
      setPending(null);
      setError(`Saving the import failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const f = pending?.fields;
  const spheres = f ? SPHERES.filter((s) => f.spheres[s] > 0).map((s) => `${s} ${f.spheres[s]}`) : [];

  return (
    <>
      <FilePick className={className} accept={target ? 'application/pdf,.pdf' : 'application/pdf,.pdf,application/json,.json'} disabled={busy} onFile={pick}>
        {busy ? 'Reading...' : label}
      </FilePick>

      {shared && (
        <SharedImport
          payload={shared}
          onClose={() => setShared(null)}
          onDone={async (id) => {
            setShared(null);
            const c = await db.characters.get(id);
            if (c) onDone(c);
          }}
        />
      )}

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
          {pending.portrait && (
            <div className="import-portrait">
              <PortalPortrait src={pending.portrait} name={f.name} size={96} />
            </div>
          )}
          <p className="import-summary">
            {characterLine(f)}
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
