import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, newId, requestPersistence } from '../db/db';

/** Phase 1: a plain character list to prove storage works; the full sheet comes next. */
export function CharactersView() {
  const characters = useLiveQuery(() => db.characters.orderBy('updatedAt').reverse().toArray(), []);
  const [name, setName] = useState('');

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    const now = Date.now();
    await db.characters.add({ id: newId(), name: n, createdAt: now, updatedAt: now });
    setName('');
    requestPersistence();
  };

  return (
    <section className="view">
      <h2 className="view-title">Characters</h2>
      <form className="add-row" onSubmit={add}>
        <input
          className="text-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Saito Weinberg"
          aria-label="Character name"
        />
        <button className="btn btn-gold" type="submit">
          Add
        </button>
      </form>
      {characters && characters.length === 0 && (
        <p className="empty">
          Add a character by name. Importing a Mr. Gone PDF sheet and the full M20 sheet are next.
        </p>
      )}
      <ul className="char-list">
        {characters?.map((c) => (
          <li key={c.id} className="char-row">
            <span className="char-name">{c.name}</span>
            <button
              className="btn-icon"
              aria-label={`Delete ${c.name}`}
              onClick={() => confirm(`Delete ${c.name}?`) && db.characters.delete(c.id)}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
