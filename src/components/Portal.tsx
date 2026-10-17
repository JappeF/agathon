/**
 * The sparking golden portal behind the logo, the same image as the app icon but
 * alive: the glow breathes, a glint runs clockwise round the ring and sparks fly
 * off clockwise. CSS-only motion; everything stops under
 * prefers-reduced-motion. Spark positions come from a fixed seed so they never jump.
 */

const R = 72; // ring radius in the 200x200 viewBox
const C = 100;

let seed = 1017;
const rand = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const SPARKS = Array.from({ length: 46 }, () => {
  // like the icon: more of them spray off the right and bottom
  const a = rand() < 0.55 ? lerp(-0.6, 2.2, rand()) : rand() * Math.PI * 2;
  const out = lerp(0.25, 0.75, rand());
  // clockwise tangent on screen (y down) is (-sin a, cos a), plus an outward pull
  const dx = -Math.sin(a) * (1 - out) + Math.cos(a) * out;
  const dy = Math.cos(a) * (1 - out) + Math.sin(a) * out;
  const fly = lerp(14, 46, rand());
  const len = lerp(2, 5, rand());
  return {
    x: C + Math.cos(a) * R,
    y: C + Math.sin(a) * R,
    dx,
    dy,
    len,
    fly,
    w: lerp(0.8, 1.6, rand()),
    hot: rand() < 0.4,
    dur: lerp(1.4, 3.2, rand()),
    delay: -rand() * 3.2,
  };
});

export function Portal() {
  return (
    <div className="portal" aria-hidden="true">
      <svg viewBox="0 0 200 200" className="portal-svg">
        <defs>
          <radialGradient id="portal-heart" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#1f1340" />
            <stop offset="0.7" stopColor="#150c2a" />
            <stop offset="1" stopColor="#160c26" stopOpacity="0" />
          </radialGradient>
          <filter id="portal-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
          <filter id="portal-soft" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.4" />
          </filter>
        </defs>
        <circle cx={C} cy={C} r={R + 4} fill="url(#portal-heart)" />
        <circle cx={C} cy={C} r={R} className="portal-glow" filter="url(#portal-glow)" />
        <circle cx={C} cy={C} r={R} className="portal-mid" filter="url(#portal-soft)" />
        <circle cx={C} cy={C} r={R} className="portal-core" />
        <g className="portal-glint-spin">
          <circle cx={C} cy={C} r={R} className="portal-glint" />
        </g>
        <g className="portal-sparks">
          {SPARKS.map((s, i) => (
            <line
              key={i}
              x1={s.x}
              y1={s.y}
              x2={s.x + s.dx * s.len}
              y2={s.y + s.dy * s.len}
              strokeWidth={s.w}
              className={`portal-spark${s.hot ? ' hot' : ''}`}
              style={
                {
                  '--fx': `${(s.dx * s.fly).toFixed(1)}px`,
                  '--fy': `${(s.dy * s.fly).toFixed(1)}px`,
                  animationDuration: `${s.dur.toFixed(2)}s`,
                  animationDelay: `${s.delay.toFixed(2)}s`,
                } as React.CSSProperties
              }
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
