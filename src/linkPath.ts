/**
 * Links with a preview card (/c/<data>, /i/<data>, /s/<spell id>) normally pass a Pages
 * Function that shows the card and forwards to the app's own links (#import=,
 * #import-spell=, #/library/<id>). When no function runs, the app itself arrives on such a
 * path: an installed app's service worker answers it (also offline), and Pages answers it
 * with the app when the day's Functions quota is spent. Then the app reads the path itself.
 */
const DATA = /^[01]\.[A-Za-z0-9_-]{1,16000}$/;
const SPELL_ID = /^[a-z0-9-]{1,120}$/;

export function hashForLinkPath(path: string): string | null {
  const m = /^\/([cis])\/([^/]+)\/?$/.exec(path);
  if (!m) return null;
  const [, kind, raw] = m;
  if (kind === 's') return SPELL_ID.test(raw.toLowerCase()) ? `#/library/${raw.toLowerCase()}` : '#/library';
  // anything else is not a link the app made: carry nothing in
  if (!DATA.test(raw)) return kind === 'c' ? '#/characters' : '#/spells';
  return kind === 'c' ? `#import=${raw}` : `#import-spell=${raw}`;
}

/** Turn such a path into the app link in place, before the app first reads the URL. */
export function adoptLinkPath() {
  const hash = hashForLinkPath(location.pathname);
  if (hash) history.replaceState(null, '', `/${hash}`);
}
