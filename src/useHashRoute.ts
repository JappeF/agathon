import { useEffect, useState } from 'react';

export const VIEWS = ['library', 'spells', 'characters'] as const;
export type View = (typeof VIEWS)[number];

export interface Route {
  view: View;
  /** Path segments after the view, e.g. ['<character id>', 'traits']. */
  parts: string[];
}

// a stray % in a hand-typed or damaged link must not take the app down
const decode = (s: string) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

const parse = (): Route => {
  const [head, ...parts] = location.hash.replace(/^#\/?/, '').split('/').map(decode);
  const view = (VIEWS as readonly string[]).includes(head) ? (head as View) : 'library';
  return { view, parts: parts.filter(Boolean) };
};

/** Route from the URL hash (#/characters/<id>/<tab>), so back and links work. */
export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(parse);
  useEffect(() => {
    const on = () => setRoute(parse());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export const go = (...segments: string[]) => {
  location.hash = '#/' + segments.map(encodeURIComponent).join('/');
};
