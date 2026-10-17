import { makeSparks, SparkLines } from './Portal';

// one set of sparks for every small portal: a 100x100 box with the ring at radius 41
const SPARKS = makeSparks(16, 50, 41, [5, 13], [1.5, 3.5], 2026);

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '?';

/**
 * A character portrait inside a small sparking portal, like the logo. The glow is
 * plain CSS (cheap enough for a list of cards); motion stops under reduced motion.
 */
export function PortalPortrait({ src, name, size = 64 }: { src?: string; name: string; size?: number }) {
  return (
    <span className="pp" style={{ '--pp': `${size}px` } as React.CSSProperties} aria-hidden="true">
      <span className="pp-ring" />
      <span className="pp-face">{src ? <img src={src} alt="" /> : <span className="pp-initials">{initials(name)}</span>}</span>
      <svg className="pp-sparks" viewBox="0 0 100 100">
        <g className="portal-sparks pp-spin">
          <SparkLines sparks={SPARKS} />
        </g>
      </svg>
    </span>
  );
}
