import { useState } from 'react';
import { characterLine, newCharacter } from '../character';
import { db, freeName, newId, requestPersistence, saveCharacter } from '../db/db';
import { newVersion } from '../spells';
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
  const [failed, setFailed] = useState('');

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

  // all or nothing: a full device halfway through a backup adds no one
  const add = async () => {
    setBusy(true);
    setFailed('');
    try {
      let first = '';
      await db.transaction('rw', db.characters, db.spells, async () => {
        const taken = new Set((await db.characters.toArray()).map((c) => c.name.toLowerCase()));
        const ids: string[] = [];
        for (const shared of payload.characters) {
          const name = freeName(taken, shared.name, (n) => `${shared.name} (${n})`);
          const c = { ...newCharacter(newId(), name), ...shared, name };
          await saveCharacter(c);
          ids.push(c.id);
          first ||= c.id;
        }
        // a backup's spell ideas go back to their own character, as new rows
        const now = Date.now();
        await db.spells.bulkAdd(
          (payload.spells ?? []).map(({ character, ...s }) => ({
            ...s,
            id: newId(),
            characterId: ids[character],
            createdAt: s.createdAt || now,
            // the list keeps its order: newest change first, as before the backup
            updatedAt: s.updatedAt || now,
            versions: s.versions.map((v) => newVersion({ ...v, createdAt: v.createdAt || now })),
          })),
        );
      });
      requestPersistence();
      onDone(first);
    } catch (e) {
      setFailed(`Nothing was added: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const n = payload.characters.length;
  const spells = payload.spells?.length ?? 0;
  return (
    <Modal title={n === 1 ? `Add ${payload.characters[0].name}?` : `Add ${n} characters?`} onClose={onClose}>
      <ul className="import-list">
        {payload.characters.map((c, i) => (
          <li key={i} className="import-item">
            <PortalPortrait src={c.portrait} name={c.name} size={52} />
            <span className="import-item-text">
            <strong>{c.name}</strong>
            <span className="empty-small">
              {characterLine(c)}
              {characterLine(c) ? '. ' : ''}
              Arete {c.arete}
              {SPHERES.filter((s) => c.spheres[s]).map((s) => `, ${s} ${c.spheres[s]}`).join('')}
            </span>
            </span>
          </li>
        ))}
      </ul>
      <p className="empty-small">
        {spells ? `Characters and ${spells === 1 ? 'one spell idea' : `${spells} spell ideas`}` : 'Characters'} are added to this device. Nothing gets
        overwritten.
      </p>
      {failed && <p className="paste-error" role="alert">{failed}</p>}
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
