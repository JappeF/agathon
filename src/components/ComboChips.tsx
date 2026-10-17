import type { Combo } from '../library/data';
import { SPHERES, type Sphere } from '../types';
import { SphereGlyph } from './SphereGlyph';

/** One Sphere combination as gold chips: "Forces 3 + Mind 2"; approximate ranks get a "~". */
export function ComboChips({ combo, dots }: { combo: Combo; dots?: Record<Sphere, number> }) {
  const entries = SPHERES.filter((s) => combo.spheres[s] !== undefined);
  return (
    <span className="combo">
      {entries.map((s, i) => {
        const need = combo.spheres[s]!;
        const short = dots ? (dots[s] ?? 0) < need : false;
        const approx = combo.inferred?.includes(s);
        return (
          <span key={s} className="combo-part">
            {i > 0 && <span className="combo-plus">+</span>}
            <span className={`sphere-chip${short ? ' short' : ''}`} title={approx ? 'Rank not printed in the book; our best reading' : undefined}>
              <SphereGlyph sphere={s} size={14} />
              {s} {approx ? '~' : ''}
              {need}
            </span>
          </span>
        );
      })}
    </span>
  );
}
