import { makeSparks, Sparks } from './Portal';
import { usePauseOffscreen } from './usePauseOffscreen';
import { useThumbnail } from './useThumbnail';

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
  const ref = usePauseOffscreen<HTMLSpanElement>();
  // small ones (the nav, lists) stay still: at that size the motion is noise, not magic
  const still = size < 64;
  // small ones get a copy shrunk in steps, which stays sharp on phones
  const face = useThumbnail(src, still ? size : 0);
  return (
    <span className={`pp${still ? ' pp-still' : ''}`} style={{ '--pp': `${size}px` } as React.CSSProperties} aria-hidden="true" ref={ref}>
      <span className="pp-ring" />
      <span className="pp-face">{face ? <img src={face} alt="" /> : <span className="pp-initials">{initials(name)}</span>}</span>
      {!still && <Sparks sparks={SPARKS} className="pp-sparks" />}
    </span>
  );
}
