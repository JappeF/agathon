import { usePauseOffscreen } from './usePauseOffscreen';

/**
 * The sparking golden portal behind the logo, the same image as the app icon but
 * alive: the glow breathes, a glint runs clockwise round the ring and sparks fly
 * off clockwise. CSS-only motion; everything stops under
 * prefers-reduced-motion. Spark positions come from a fixed seed so they never jump.
 */

const R = 72; // ring radius in the 200x200 viewBox
const C = 100;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export interface Spark {
  x: number;
  y: number;
  dx: number;
  dy: number;
  len: number;
  fly: number;
  w: number;
  hot: boolean;
  dur: number;
  delay: number;
}

/** Sparks thrown off a ring of radius r around (c, c), clockwise, from a fixed seed. */
export function makeSparks(n: number, c: number, r: number, fly: [number, number], len: [number, number], seed = 1017): Spark[] {
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return Array.from({ length: n }, () => {
    // like the icon: more of them spray off the right and bottom
    const a = rand() < 0.55 ? lerp(-0.6, 2.2, rand()) : rand() * Math.PI * 2;
    const out = lerp(0.25, 0.75, rand());
    // clockwise tangent on screen (y down) is (-sin a, cos a), plus an outward pull
    const dx = -Math.sin(a) * (1 - out) + Math.cos(a) * out;
    const dy = Math.cos(a) * (1 - out) + Math.sin(a) * out;
    return {
      x: c + Math.cos(a) * r,
      y: c + Math.sin(a) * r,
      dx,
      dy,
      len: lerp(len[0], len[1], rand()),
      fly: lerp(fly[0], fly[1], rand()),
      w: lerp(0.8, 1.6, rand()),
      hot: rand() < 0.4,
      dur: lerp(1.4, 3.2, rand()),
      delay: -rand() * 3.2,
    };
  });
}

/**
 * The sparks as HTML, not SVG, built so the compositor can run them: SVG shapes and
 * keyframes that use var() both force a main-thread frame every time (as SVG lines they
 * were about half the CPU of an idle page). Each spark is a still element turned to its
 * direction, holding a box as long as its flight that slides one box-width
 * (translateX(100%)) and fades, with the visible streak at its start. Coordinates are in
 * the box's own units; the parent sets `--k`, the size of one unit in px.
 */
export function Sparks({ sparks, className = '' }: { sparks: Spark[]; className?: string }) {
  return (
    <div className={`spark-field ${className}`}>
      {sparks.map((s, i) => (
        <span
          key={i}
          className={`spark${s.hot ? ' hot' : ''}`}
          style={
            {
              '--x': s.x.toFixed(2),
              '--y': s.y.toFixed(2),
              '--len': s.len.toFixed(2),
              '--w': s.w.toFixed(2),
              '--fly': s.fly.toFixed(2),
              transform: `rotate(${Math.atan2(s.dy, s.dx).toFixed(3)}rad)`,
            } as React.CSSProperties
          }
        >
          <span className="spark-fly" style={{ animationDuration: `${(s.dur * FLIGHTS).toFixed(2)}s`, animationDelay: `${s.delay.toFixed(2)}s` }} />
        </span>
      ))}
    </div>
  );
}

/** flights per animation iteration, as in the spark-fly keyframes in styles.css */
const FLIGHTS = 8;

const SPARKS = makeSparks(46, C, R, [14, 46], [2, 5]);

/**
 * Layered so every moving part is a whole element: the breathing glow and the turning
 * glint are their own SVGs (opacity and rotate on the element itself, compositor work),
 * the rest of the ring is a still SVG, and the sparks are HTML on top.
 */
export function Portal() {
  const ref = usePauseOffscreen<HTMLDivElement>();
  return (
    <div className="portal" aria-hidden="true" ref={ref}>
      <svg viewBox="0 0 200 200" className="portal-layer">
        <defs>
          <radialGradient id="portal-heart" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#1f1340" />
            <stop offset="0.7" stopColor="#150c2a" />
            <stop offset="1" stopColor="#160c26" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx={C} cy={C} r={R + 4} fill="url(#portal-heart)" />
      </svg>
      <svg viewBox="0 0 200 200" className="portal-layer portal-glow-layer">
        <defs>
          <filter id="portal-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>
        <circle cx={C} cy={C} r={R} className="portal-glow" filter="url(#portal-glow)" />
      </svg>
      <svg viewBox="0 0 200 200" className="portal-layer">
        <defs>
          <filter id="portal-soft" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.4" />
          </filter>
        </defs>
        <circle cx={C} cy={C} r={R} className="portal-mid" filter="url(#portal-soft)" />
        <circle cx={C} cy={C} r={R} className="portal-core" />
      </svg>
      <svg viewBox="0 0 200 200" className="portal-layer portal-glint-layer">
        <circle cx={C} cy={C} r={R} className="portal-glint" />
      </svg>
      <Sparks sparks={SPARKS} className="portal-sparks" />
    </div>
  );
}
