import { SPHERES } from '../types';
import { SphereGlyph } from './SphereGlyph';

/**
 * The nine Sphere glyphs on a ring behind the header, turning very slowly.
 * Purely decorative; the rotation is CSS and stops under prefers-reduced-motion.
 */
export function SphereRing() {
  const r = 42; // percent of the box, glyph centres
  return (
    <div className="sphere-ring" aria-hidden="true">
      <div className="sphere-ring-spin">
        <svg className="sphere-ring-lines" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="48" />
          <circle cx="50" cy="50" r={r} />
          <circle cx="50" cy="50" r="36" />
        </svg>
        {SPHERES.map((s, i) => {
          const a = -Math.PI / 2 + (i * 2 * Math.PI) / SPHERES.length;
          return (
            <span
              key={s}
              className="sphere-ring-glyph"
              style={{ left: `${50 + r * Math.cos(a)}%`, top: `${50 + r * Math.sin(a)}%` }}
            >
              <SphereGlyph sphere={s} size={22} />
            </span>
          );
        })}
      </div>
    </div>
  );
}
