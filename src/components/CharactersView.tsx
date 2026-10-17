import { useEffect } from 'react';
import type { Character } from '../character';
import { CharacterTools } from './CharacterMenu';
import { PortalPortrait } from './PortalPortrait';

/**
 * #/characters without an id. With characters on this device it goes straight to the
 * one in play (switching happens in the character menu); without any it is the place
 * to add or import the first.
 */
export function CharactersView({ characters, active }: { characters?: Character[]; active?: Character }) {
  useEffect(() => {
    if (!active) return;
    history.replaceState(null, '', `#/characters/${encodeURIComponent(active.id)}`);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }, [active]);

  if (!characters || active) return null;
  return (
    <section className="view characters welcome">
      <PortalPortrait name="?" size={120} />
      <h2 className="view-title">Characters</h2>
      <p className="flavor">No mage on this device yet. Start one by name, import your Mr. Gone sheet, or open a character file someone shared.</p>
      <CharacterTools />
    </section>
  );
}
