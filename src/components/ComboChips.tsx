import type { Combo } from '../library/data';
import { SPHERES, type Sphere } from '../types';
import { SphereGlyph } from './SphereGlyph';

/** One Sphere combination as a row of Sphere chips (Forces 3, Mind 2); approximate ranks get a "~". */
export function ComboChips({ combo, dots }: { combo: Combo; dots?: Record<Sphere, number> }) {
  const entries = SPHERES.filter((s) => combo.spheres[s] !== undefined);
  return (
    <span className="combo">
      {entries.map((s) => {
        const need = combo.spheres[s]!;
        const short = dots ? (dots[s] ?? 0) < need : false;
        const approx = combo.inferred?.includes(s);
        return (
          <span key={s} className={`sphere-chip sph-${s}${short ? ' short' : ''}`} title={approx ? 'Rank not printed in the book; our best reading' : undefined}>
            <SphereGlyph sphere={s} size={14} />
            {s} {approx ? '~' : ''}
            {need}
          </span>
        );
      })}
    </span>
  );
}
