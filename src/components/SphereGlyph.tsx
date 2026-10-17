import type { Sphere } from '../types';

/**
 * Our own simple line glyphs for the nine Spheres (not the book symbols).
 * 24x24, drawn with currentColor so they inherit gold, violet or ink.
 */
const PATHS: Record<Sphere, JSX.Element> = {
  Correspondence: (
    <>
      <circle cx="9" cy="12" r="5.5" />
      <circle cx="15" cy="12" r="5.5" />
    </>
  ),
  Entropy: <path d="M12 12a1.5 1.5 0 1 1 1.5 1.5a3.5 3.5 0 1 1 -3.5 -3.5a5.5 5.5 0 1 1 5.5 5.5a7.5 7.5 0 0 1 -7.5 -7.5" />,
  Forces: <path d="M13.5 2.5 5.5 13h6l-1.5 8.5 8-11h-6z" />,
  Life: (
    <>
      <path d="M5 19C5 10 11 4.5 19.5 5 20 13.5 14.5 19 5 19z" />
      <path d="M5 19l9-9" />
    </>
  ),
  Matter: (
    <>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
      <path d="M4 7.5l8 4.5 8-4.5M12 12v9" />
    </>
  ),
  Mind: (
    <>
      <path d="M2.5 12C6.5 5.5 17.5 5.5 21.5 12 17.5 18.5 6.5 18.5 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  Prime: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="2.2" fill="currentColor" />
    </>
  ),
  Spirit: (
    <>
      <path d="M12 21.5C6 17.5 6.5 11 12 2.5c5.5 8.5 6 15 0 19z" />
      <path d="M12 21.5c-2-3-1.5-6 0-9" />
    </>
  ),
  Time: <path d="M6 3h12M6 21h12M7 3c0 6 10 12 10 18M17 3c0 6-10 12-10 18" />,
};

export function SphereGlyph({ sphere, size = 20 }: { sphere: Sphere; size?: number }) {
  return (
    <svg
      className="sphere-glyph"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[sphere]}
    </svg>
  );
}
