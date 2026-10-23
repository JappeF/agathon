import { useEffect, useState } from 'react';
import { Portal } from './components/Portal';
import { SharedImport } from './components/SharedImport';
import { decodeShare, decodeSpellShare, ShareFormatError, type SharePayload, type SpellSharePayload } from './share';
import { SharedSpellImport } from './components/SharedSpellImport';
import { CharactersView } from './components/CharactersView';
import { CharacterMenu, openCharacterMenu } from './components/CharacterMenu';
import { PortalPortrait } from './components/PortalPortrait';
import { Icon } from './components/Icon';
import { useActiveCharacter } from './activeCharacter';
import { CharacterSheet } from './components/CharacterSheet';
import { LibraryView } from './components/LibraryView';
import { SpellsView } from './components/SpellsView';
import { HelpView } from './components/HelpView';
import { go, useHashRoute, type View } from './useHashRoute';

const NAV: { view: Exclude<View, 'characters' | 'help'>; label: string; icon: JSX.Element }[] = [
  {
    view: 'library',
    label: 'Library',
    icon: <path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5C4.7 20 4 19.3 4 18.5zM13 4h5.5c.8 0 1.5.7 1.5 1.5v13c0 .8-.7 1.5-1.5 1.5H13z" />,
  },
  {
    view: 'spells',
    label: 'Spell ideas',
    icon: <path d="M12 2.5l2.2 6.3 6.3 2.2-6.3 2.2L12 19.5l-2.2-6.3L3.5 11l6.3-2.2zM18.5 17l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />,
  },
];

const PERSON = (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
  </svg>
);

export default function App() {
  const { view, parts } = useHashRoute();
  const { characters, active } = useActiveCharacter();
  const [shared, setShared] = useState<{ payload: SharePayload | null; error?: string } | null>(null);
  const [sharedSpell, setSharedSpell] = useState<{ payload: SpellSharePayload | null; error?: string } | null>(null);

  // #import=<payload> share links open the import preview, then leave the URL clean
  useEffect(() => {
    const check = () => {
      // a shared spell idea (from /i/<data>, whose preview page sends people here)
      if (location.hash.startsWith('#import-spell=')) {
        const encoded = location.hash.slice('#import-spell='.length);
        history.replaceState(null, '', '/#/spells');
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        decodeSpellShare(encoded)
          .then((payload) => setSharedSpell({ payload }))
          .catch((e) => setSharedSpell({ payload: null, error: e instanceof ShareFormatError ? e.message : 'This link is invalid or damaged.' }));
        return;
      }
      if (!location.hash.startsWith('#import=')) return;
      const encoded = location.hash.slice('#import='.length);
      history.replaceState(null, '', location.pathname + location.search + '#/characters');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      decodeShare(encoded)
        .then((payload) => setShared({ payload }))
        .catch((e) => setShared({ payload: null, error: e instanceof ShareFormatError ? e.message : 'This share link is invalid or damaged.' }));
    };
    check();
    window.addEventListener('hashchange', check);
    return () => window.removeEventListener('hashchange', check);
  }, []);

  return (
    <>
      <div className="sparks" aria-hidden="true" />
      <header className="app-header">
        <a className="brand" href="#/library" aria-label="Agathon, to the library">
          <Portal />
          <span className="brand-text">
            <span className="logo-wrap">
              <h1 className="logo">Agathon</h1>
              <span className="logo-sheen" aria-hidden="true">
                <span className="logo-sheen-text">Agathon</span>
              </span>
            </span>
            <p className="tagline">a grimoire for the Awakened</p>
          </span>
        </a>

      <nav className="app-nav" aria-label="Main">
        {NAV.map((n) => (
          <a
            key={n.view}
            href={`#/${n.view}`}
            className={`nav-item${view === n.view ? ' on' : ''}`}
            aria-current={view === n.view ? 'page' : undefined}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
              {n.icon}
            </svg>
            <span>{n.label}</span>
          </a>
        ))}
        {/* the character in play: tap for the sheet; the caret beside the portrait (or the
            sheet's own switch button) opens the switcher */}
        <span className={`nav-char${view === 'characters' ? ' on' : ''}`}>
          <a
            href={active ? `#/characters/${encodeURIComponent(active.id)}` : '#/characters'}
            className={`nav-item${view === 'characters' ? ' on' : ''}`}
            aria-current={view === 'characters' ? 'page' : undefined}
            aria-label={active ? `${active.name}, character sheet` : 'Characters'}
          >
            {active ? <PortalPortrait src={active.portrait} name={active.name} size={30} /> : PERSON}
            <span className="nav-char-name">{active ? active.name : 'Characters'}</span>
          </a>
          {active && (
            <button
              type="button"
              className="nav-caret"
              aria-haspopup="dialog"
              aria-expanded="false"
              aria-label="Switch character"
              title="Switch character"
              onClick={(e) => openCharacterMenu(e.currentTarget.parentElement!)}
            >
              <Icon name="down" size={16} />
            </button>
          )}
        </span>
        {/* the guide: an item like the others, last in the row (narrower on phones) */}
        <a className={`nav-item nav-help${view === 'help' ? ' on' : ''}`} href="#/help" aria-current={view === 'help' ? 'page' : undefined}>
          {/* the ring fills the icon, so it matches the 30px portrait beside it */}
          <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="11.3" />
            <path d="M8.9 9.2a3.2 3.2 0 1 1 4.6 2.8c-1 .5-1.5 1.2-1.5 2.2v.6" />
            <circle cx="12" cy="17.6" r="0.6" fill="currentColor" />
          </svg>
          <span>Help</span>
        </a>
      </nav>
      </header>

      <main className="app-main">
        {view === 'library' && <LibraryView selectedId={parts[0]} />}
        {view === 'spells' && <SpellsView id={parts[0]} />}
        {view === 'help' && <HelpView section={parts[0]} />}
        {/* keyed per character: switching starts fresh (play mode, no dialog left open) */}
        {view === 'characters' &&
          (parts[0] ? <CharacterSheet key={parts[0]} id={parts[0]} tab={parts[1]} /> : <CharactersView characters={characters} active={active} />)}
      </main>
      <CharacterMenu characters={characters} active={active} />
      {sharedSpell && <SharedSpellImport payload={sharedSpell.payload} error={sharedSpell.error} onClose={() => setSharedSpell(null)} />}
      {shared && (
        <SharedImport
          payload={shared.payload}
          error={shared.error}
          onClose={() => setShared(null)}
          onDone={(id) => {
            setShared(null);
            go('characters', id);
          }}
        />
      )}
    </>
  );
}
