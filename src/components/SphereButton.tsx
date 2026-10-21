import type { Sphere } from '../types';
import { SphereGlyph } from './SphereGlyph';

/** Five arcs around the disc, one per rank, with a small gap between them; the first starts at the top. */
const SEGMENTS = Array.from({ length: 5 }, (_, i) => i);

/**
 * A Sphere as a round button: its glyph in a disc, the rank as lit arcs of a ring around
 * it (in the Sphere's colour), the name below. Used by a dossier version and the library
 * filters; the label says the rank for screen readers.
 */
export function SphereButton({ sphere, rank, label, onClick }: { sphere: Sphere; rank: number; label: string; onClick: () => void }) {
  return (
    <button type="button" className={`sphere-btn sph-${sphere}${rank ? ' on' : ''}`} aria-label={label} title={sphere} onClick={onClick}>
      <span className="sphere-disc">
        <svg className="sphere-ring" viewBox="0 0 40 40" aria-hidden="true">
          {SEGMENTS.map((i) => (
            <circle
              key={i}
              className={i < rank ? 'lit' : undefined}
              cx="20"
              cy="20"
              r="18.5"
              pathLength="100"
              strokeDasharray="16 84"
              strokeDashoffset={-(i * 20 + 2)}
            />
          ))}
        </svg>
        <SphereGlyph sphere={sphere} size={20} />
      </span>
      <span className="sphere-btn-name">{sphere === 'Correspondence' ? 'Corresp.' : sphere}</span>
    </button>
  );
}
