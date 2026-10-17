import { useState } from 'react';
import { newCharacter } from '../character';
import { db, newId, requestPersistence, saveCharacter } from '../db/db';
import type { SharePayload } from '../share';
import { SPHERES } from '../types';
import { Modal } from './Modal';
import { PortalPortrait } from './PortalPortrait';

/**
 * Preview and add characters from a share link or file. Imports only ever add:
 * a name that already exists gets a numbered suffix instead of replacing anyone.
 */
export function SharedImport({
  payload,
  error,
  onClose,
  onDone,
}: {
  payload: SharePayload | null;
  error?: string;
  onClose: () => void;
  onDone: (firstId: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  if (error || !payload) {
    return (
      <Modal title="Can't import" onClose={onClose}>
        <p>{error ?? 'Nothing to import.'}</p>
        <div className="modal-actions">
          <button className="btn btn-gold" onClick={onClose}>
            OK
          </button>
        </div>
      </Modal>
    );
  }

  const add = async () => {
    setBusy(true);
    const taken = new Set((await db.characters.toArray()).map((c) => c.name.toLowerCase()));
    let first = '';
    for (const shared of payload.characters) {
      let name = shared.name;
      for (let n = 2; taken.has(name.toLowerCase()); n++) name = `${shared.name} (${n})`;
      taken.add(name.toLowerCase());
      const c = { ...newCharacter(newId(), name), ...shared, name };
      await saveCharacter(c);
      first ||= c.id;
    }
    requestPersistence();
    onDone(first);
  };

  const n = payload.characters.length;
  return (
    <Modal title={n === 1 ? `Add ${payload.characters[0].name}?` : `Add ${n} characters?`} onClose={onClose}>
      <ul className="import-list">
        {payload.characters.map((c, i) => (
          <li key={i} className="import-item">
            <PortalPortrait src={c.portrait} name={c.name} size={52} />
            <span className="import-item-text">
            <strong>{c.name}</strong>
            <span className="empty-small">
              {[c.concept, c.affiliation].filter(Boolean).join(', ')}
              {c.concept || c.affiliation ? '. ' : ''}
              Arete {c.arete}
              {SPHERES.filter((s) => c.spheres[s]).map((s) => `, ${s} ${c.spheres[s]}`).join('')}
            </span>
            </span>
          </li>
        ))}
      </ul>
      <p className="empty-small">Characters are added to this device. Nothing gets overwritten.</p>
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-gold" onClick={add} disabled={busy}>
          {n === 1 ? 'Add character' : `Add ${n} characters`}
        </button>
      </div>
    </Modal>
  );
}
