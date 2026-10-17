import { useEffect, useState } from 'react';

export const VIEWS = ['library', 'spells', 'characters'] as const;
export type View = (typeof VIEWS)[number];

const parse = (): View => {
  const head = location.hash.replace(/^#\/?/, '').split('/')[0];
  return (VIEWS as readonly string[]).includes(head) ? (head as View) : 'library';
};

/** Top-level view from the URL hash (#/library, #/spells, #/characters), so back and links work. */
export function useHashRoute(): View {
  const [view, setView] = useState<View>(parse);
  useEffect(() => {
    const on = () => setView(parse());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return view;
}
