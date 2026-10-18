import { useState } from 'react';
import { newCharacter } from '../character';
import { newId, requestPersistence, saveCharacter, saveSpell } from '../db/db';
import { setActiveCharacter, useActiveCharacter } from '../activeCharacter';
import type { SpellSharePayload } from '../share';
import { newVersion, type Spell } from '../spells';
import { SPHERES } from '../types';
import { go } from '../useHashRoute';
import { Modal } from './Modal';

/**
 * A spell idea from a link: preview it and add a copy to one of your characters (or to a
 * new one when there are none). Only ever adds; the log and ids never travel.
 */
export function SharedSpellImport({ payload, error, onClose }: { payload: SpellSharePayload | null; error?: string; onClose: () => void }) {
  const { characters, active } = useActiveCharacter();
  const [target, setTarget] = useState('');
  const [newName, setNewName] = useState('');
  const [failed, setFailed] = useState('');

  if (error || !payload) {
    return (
      <Modal title="Can't open this spell idea" onClose={onClose}>
        <p>{error ?? 'Nothing to add.'}</p>
        <div className="modal-actions">
          <button className="btn btn-gold" onClick={onClose}>
            OK
          </button>
        </div>
      </Modal>
    );
  }

  const s = payload.spell;
  const plan = s.versions[s.versions.length - 1];
  const spheres = SPHERES.filter((sp) => plan.spheres[sp]).map((sp) => `${sp} ${plan.spheres[sp]}`);
  const chosen = target || active?.id || '';

  const add = async () => {
    setFailed('');
    try {
      let characterId = chosen;
      if (!characterId) {
        const c = newCharacter(newId(), newName.trim() || 'Unnamed mage');
        await saveCharacter(c);
        characterId = c.id;
      }
      const now = Date.now();
      const spell: Spell = {
        id: newId(),
        characterId,
        createdAt: now,
        updatedAt: now,
        title: s.title,
        goal: s.goal,
        effects: s.effects,
        // versions keep their order: they are numbered by creation time, oldest first
        versions: s.versions.map((v, i) => newVersion({ ...v, createdAt: now - (s.versions.length - i) })),
        log: [],
      };
      await saveSpell(spell);
      requestPersistence();
      setActiveCharacter(characterId);
      onClose();
      go('spells', spell.id);
    } catch (e) {
      setFailed(`Nothing was added: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <Modal title={`Add "${s.title}"?`} onClose={onClose}>
      <p className="empty-small">A spell idea someone shared with you.</p>
      {s.goal && <p className="shared-spell-goal">{s.goal}</p>}
      <p className="empty-small">
        {spheres.length ? `Plan: ${spheres.join(', ')}` : 'No Spheres in the plan yet'}
        {s.effects.length ? `. Builds on ${s.effects.length === 1 ? 'one library spell' : `${s.effects.length} library spells`}` : ''}
        {s.versions.length > 1 ? `. ${s.versions.length} versions` : ''}.
      </p>
      {characters?.length ? (
        <label className="field">
          <span className="field-label">Add it to</span>
          <select className="text-input" value={chosen} onChange={(e) => setTarget(e.target.value)}>
            {characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <label className="field">
          <span className="field-label">You have no characters yet; this makes one</span>
          <input className="text-input" value={newName} placeholder="Name of your mage" onChange={(e) => setNewName(e.target.value)} />
        </label>
      )}
      {failed && (
        <p className="paste-error" role="alert">
          {failed}
        </p>
      )}
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-gold" onClick={add}>
          Add spell idea
        </button>
      </div>
    </Modal>
  );
}
