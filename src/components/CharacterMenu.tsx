import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Character } from '../character';
import { characterLine, newCharacter } from '../character';
import { newId, requestPersistence, saveCharacter } from '../db/db';
import { setActiveCharacter } from '../activeCharacter';
import { SPHERES } from '../types';
import { go } from '../useHashRoute';
import { Icon } from './Icon';
import { ImportFlow } from './ImportFlow';
import { PortalPortrait } from './PortalPortrait';
import { ShareDialog } from './ShareDialog';
import { SphereGlyph } from './SphereGlyph';

const OPEN = 'agathon:character-menu';

/** Open (or, from the same trigger, close) the character switcher next to `trigger`. */
export function openCharacterMenu(trigger: HTMLElement) {
  window.dispatchEvent(new CustomEvent(OPEN, { detail: trigger }));
}

const open = (c: Character) => {
  setActiveCharacter(c.id);
  go('characters', c.id);
};

/** Add a character by name, or bring one in from a PDF or a character file. */
export function CharacterTools({ onPick, onBackup }: { onPick?: () => void; onBackup?: () => void }) {
  const [name, setName] = useState('');
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    const c = newCharacter(newId(), n);
    await saveCharacter(c);
    setName('');
    requestPersistence();
    onPick?.();
    open(c);
  };
  return (
    <div className="char-tools">
      <form className="add-row" onSubmit={add}>
        <input
          className="text-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="De Tovenaar van Salsaborenco"
          aria-label="New character name"
        />
        <button className="btn btn-gold" type="submit">
          Add
        </button>
      </form>
      <div className="import-row">
        {/* the menu stays open while the picker is up (Android lost the file when its
            input sat in a menu that had just hidden); picking a character closes it */}
        <ImportFlow label="Import" onDone={open} />
        {onBackup && (
          <button type="button" className="btn" onClick={onBackup}>
            Back up all characters
          </button>
        )}
      </div>
      <p className="fine-print">Imports Mr. Gone's fillable M20 2-page PDF sheet and Agathon character files.</p>
    </div>
  );
}

/**
 * The character switcher: who is in play, the others one tap away, and adding or
 * importing one. A bottom sheet on phones, a drop-down under its trigger on wider
 * screens. It stays mounted while hidden, so an import or back-up it started keeps going.
 */
export function CharacterMenu({ characters, active }: { characters?: Character[]; active?: Character }) {
  const [trigger, setTrigger] = useState<HTMLElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [backup, setBackup] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const isOpen = !!trigger;

  useEffect(() => {
    // the same trigger again closes it, like any drop-down
    const onOpen = (e: Event) => {
      const t = (e as CustomEvent<HTMLElement>).detail;
      setTrigger((open) => (open === t ? null : t));
    };
    // going somewhere else (a pick, an import, the back button) closes it
    const onRoute = () => setTrigger(null);
    window.addEventListener(OPEN, onOpen);
    window.addEventListener('hashchange', onRoute);
    return () => {
      window.removeEventListener(OPEN, onOpen);
      window.removeEventListener('hashchange', onRoute);
    };
  }, []);

  const close = (refocus = true) => {
    if (refocus) trigger?.focus();
    setTrigger(null);
  };

  // anchor the drop-down under its trigger, kept inside the window
  useLayoutEffect(() => {
    if (!trigger) return;
    const place = () => {
      const r = trigger.getBoundingClientRect();
      const w = panel.current?.offsetWidth ?? 380;
      setPos({ top: Math.round(r.bottom + 8), left: Math.round(Math.max(12, Math.min(r.left, innerWidth - w - 16))) });
    };
    place();
    panel.current?.querySelector<HTMLElement>('[aria-current="true"], .switch-row')?.focus();
    // the button that opened it says so (the nav passes its wrapper, which holds the caret)
    const button = trigger.matches('button') ? trigger : trigger.querySelector<HTMLElement>('button[aria-haspopup]');
    button?.setAttribute('aria-expanded', 'true');
    // stay under the trigger when the page scrolls with the drop-down open
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, { passive: true });
    return () => {
      button?.setAttribute('aria-expanded', 'false');
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place);
    };
  }, [trigger]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !trigger?.contains(t)) close(false);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }); // eslint-disable-line react-hooks/exhaustive-deps

  // the one in play first, then the rest by when they last changed
  const list = active ? [active, ...(characters ?? []).filter((c) => c.id !== active.id)] : characters ?? [];

  return createPortal(
    <>
      {isOpen && <div className="switch-backdrop" aria-hidden="true" />}
      <div
        ref={panel}
        className="switch-menu"
        role="dialog"
        aria-label="Characters"
        hidden={!isOpen}
        style={pos ? ({ '--menu-top': `${pos.top}px`, '--menu-left': `${pos.left}px` } as React.CSSProperties) : undefined}
      >
        <div className="switch-head">
          <h2 className="switch-title">Characters</h2>
          <button type="button" className="switch-close" aria-label="Close" onClick={() => close()}>
            <Icon name="close" />
          </button>
        </div>
        {list.length > 0 && (
          <ul className="switch-list">
            {list.map((c) => {
              const on = c.id === active?.id;
              const spheres = SPHERES.filter((s) => c.spheres[s] > 0);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    className={`switch-row${on ? ' on' : ''}`}
                    aria-current={on ? 'true' : undefined}
                    onClick={() => {
                      close(false);
                      open(c);
                    }}
                  >
                    <PortalPortrait src={c.portrait} name={c.name} size={48} />
                    <span className="char-text">
                      <span className="char-name">{c.name}</span>
                      <span className="char-sub">{characterLine(c) || 'Mage'}</span>
                      <span className="char-stats">
                        <span className="char-arete">Arete {c.arete}</span>
                        {spheres.map((s) => (
                          <span key={s} className={`char-sphere sph-${s}`} title={`${s} ${c.spheres[s]}`}>
                            <SphereGlyph sphere={s} size={13} />
                            {c.spheres[s]}
                          </span>
                        ))}
                      </span>
                    </span>
                    {on && <span className="switch-in-play">In play</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <CharacterTools
          onPick={() => close(false)}
          onBackup={
            characters?.length
              ? () => {
                  close(false);
                  setBackup(true);
                }
              : undefined
          }
        />
      </div>
      {backup && characters && <ShareDialog characters={characters} title="Back up all characters" backup onClose={() => setBackup(false)} />}
    </>,
    document.body,
  );
}
