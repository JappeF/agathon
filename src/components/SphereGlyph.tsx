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
  // a spiral that comes apart: jagged turns breaking into scattered shards
  Entropy: (
    <>
      <path d="M12 12.5l1.3-1.1.6 1.9-2.4 1.2-1.9-1.6.4-2.9 3-1.4 3 1.2.9 3.2-1.6 2.7" />
      <path d="M17.6 17.3l-1.2 1.6M19.6 13.4l1.6.3M18.4 7.6l1.3-1.3M13.4 4.3l.4-1.6M7.8 5.8l-1.4-.9M4.4 10.6l-1.6.2M5.6 16.2l-1.2 1.4M10.4 19.6l-.5 1.6" />
      <circle cx="21" cy="19.5" r="0.6" fill="currentColor" />
      <circle cx="3" cy="4.5" r="0.6" fill="currentColor" />
      <circle cx="15.5" cy="21.2" r="0.6" fill="currentColor" />
    </>
  ),
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
  // a brain: two lobed hemispheres with a few folds
  Mind: (
    <>
      <path d="M12 5.2C11 3.7 8.6 3.6 7.4 5 5.7 4.9 4.4 6.5 4.9 8.2 3.4 9.1 3.4 11.4 4.7 12.3 3.9 14 4.9 15.9 6.6 16.1 7 17.9 9.1 18.9 10.7 18.1 11.3 19 11.7 19.2 12 19.2" />
      <path d="M12 5.2C13 3.7 15.4 3.6 16.6 5 18.3 4.9 19.6 6.5 19.1 8.2 20.6 9.1 20.6 11.4 19.3 12.3 20.1 14 19.1 15.9 17.4 16.1 17 17.9 14.9 18.9 13.3 18.1 12.7 19 12.3 19.2 12 19.2" />
      <path d="M12 5.2v14" />
      <path d="M8.3 8.2c1.1.1 1.8.9 1.7 2M6.8 12.6c1-.5 2.3-.1 2.7.9M15.7 8.2c-1.1.1-1.8.9-1.7 2M17.2 12.6c-1-.5-2.3-.1-2.7.9M9.4 15.8c.6-.3 1.4-.2 1.8.3M14.6 15.8c-.6-.3-1.4-.2-1.8.3" />
    </>
  ),
  // a trident over a flared cross
  Prime: (
    <>
      <path d="M3 2.5l5.2 8.7h7.6L21 2.5M12 2.5v19.5" />
      <path d="M6.8 14.2v6.6l5.2-3.3zM17.2 14.2v6.6L12 17.5z" />
    </>
  ),
  // a little ghost
  Spirit: (
    <>
      <path d="M5.5 20.5V10a6.5 6.5 0 0 1 13 0v10.5l-2.2-1.6-2.1 1.6-2.2-1.6-2.2 1.6-2.1-1.6z" />
      <circle cx="9.6" cy="10.2" r="1" fill="currentColor" />
      <circle cx="14.4" cy="10.2" r="1" fill="currentColor" />
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
