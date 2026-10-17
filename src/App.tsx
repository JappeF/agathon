import { SphereRing } from './components/SphereRing';
import { CharactersView } from './components/CharactersView';
import { useHashRoute, type View } from './useHashRoute';

const NAV: { view: View; label: string; icon: JSX.Element }[] = [
  {
    view: 'library',
    label: 'Library',
    icon: <path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5C4.7 20 4 19.3 4 18.5zM13 4h5.5c.8 0 1.5.7 1.5 1.5v13c0 .8-.7 1.5-1.5 1.5H13z" />,
  },
  {
    view: 'spells',
    label: 'Spells',
    icon: <path d="M12 2.5l2.2 6.3 6.3 2.2-6.3 2.2L12 19.5l-2.2-6.3L3.5 11l6.3-2.2zM18.5 17l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />,
  },
  {
    view: 'characters',
    label: 'Characters',
    icon: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
      </>
    ),
  },
];

function Placeholder({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="view">
      <h2 className="view-title">{title}</h2>
      <p className="flavor">{children}</p>
    </section>
  );
}

export default function App() {
  const view = useHashRoute();

  return (
    <>
      <div className="sparks" aria-hidden="true" />
      <header className="app-header">
        <SphereRing />
        <h1 className="logo">Agathon</h1>
        <p className="tagline">a grimoire for the Awakened</p>
      </header>

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
      </nav>

      <main className="app-main">
        {view === 'library' && (
          <Placeholder title="Library">
            Every effect from Mage 20 and How Do You DO That, searchable by Sphere. Being written now.
          </Placeholder>
        )}
        {view === 'spells' && (
          <Placeholder title="Spells">
            Your spell ideas, their versions and how they went at the table. Coming soon.
          </Placeholder>
        )}
        {view === 'characters' && <CharactersView />}
      </main>
    </>
  );
}
