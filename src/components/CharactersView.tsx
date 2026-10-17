import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { newCharacter } from '../character';
import { db, newId, requestPersistence, saveCharacter } from '../db/db';
import { SPHERES } from '../types';
import { go } from '../useHashRoute';
import { getActiveCharacter } from '../activeCharacter';
import { ImportFlow } from './ImportFlow';
import { SphereGlyph } from './SphereGlyph';
import { ShareDialog } from './ShareDialog';
import { PortalPortrait } from './PortalPortrait';

export function CharactersView() {
  const characters = useLiveQuery(() => db.characters.orderBy('updatedAt').reverse().toArray(), []);
  const [name, setName] = useState('');
  const [backup, setBackup] = useState(false);
  const active = getActiveCharacter();

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    const c = newCharacter(newId(), n);
    await saveCharacter(c);
    setName('');
    requestPersistence();
    go('characters', c.id);
  };

  return (
    <section className="view">
      <h2 className="view-title">Characters</h2>
      <form className="add-row" onSubmit={add}>
        <input
          className="text-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="De Tovenaar van Salsaborenco"
          aria-label="Character name"
        />
        <button className="btn btn-gold" type="submit">
          Add
        </button>
      </form>
      <div className="import-row">
        <ImportFlow label="Import" onDone={(c) => go('characters', c.id)} />
        {!!characters?.length && (
          <button type="button" className="btn" onClick={() => setBackup(true)}>
            Back up all
          </button>
        )}
        <span className="empty-small">Mr. Gone M20 PDF sheets or Agathon character files</span>
      </div>
      {backup && characters && (
        <ShareDialog characters={characters} title="Back up all characters" onClose={() => setBackup(false)} />
      )}

      {characters && characters.length === 0 && (
        <p className="empty">No characters yet. Add one by name or import a PDF sheet.</p>
      )}
      <ul className="char-list">
        {characters?.map((c) => {
          const spheres = SPHERES.filter((s) => c.spheres[s] > 0);
          return (
            <li key={c.id}>
              <a className={`char-card${c.id === active ? ' active' : ''}`} href={`#/characters/${encodeURIComponent(c.id)}`}>
                <PortalPortrait src={c.portrait} name={c.name} size={68} />
                <span className="char-text">
                <span className="char-name">{c.name}</span>
                <span className="char-sub">{[c.concept, c.affiliation].filter(Boolean).join(', ') || 'Mage'}</span>
                <span className="char-stats">
                  <span className="char-arete">Arete {c.arete}</span>
                  {spheres.map((s) => (
                    <span key={s} className="char-sphere" title={`${s} ${c.spheres[s]}`}>
                      <SphereGlyph sphere={s} size={15} />
                      {c.spheres[s]}
                    </span>
                  ))}
                </span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
