import { clampWheel, HEALTH_LEVELS, WHEEL_SIZE, type Character, type HealthMark } from '../character';
import { Dots } from './Dots';

type Patch = (p: Partial<Character>) => void;

const NEXT_MARK: Record<HealthMark, HealthMark> = { '': '/', '/': 'X', X: '*', '*': '' };
const MARK_NAME: Record<HealthMark, string> = { '': 'unmarked', '/': 'bashing', X: 'lethal', '*': 'aggravated' };

/** Seven health boxes; tapping cycles unmarked, bashing, lethal, aggravated. */
export function HealthTrack({ c, patch }: { c: Character; patch: Patch }) {
  let worst = -1;
  c.health.forEach((m, i) => m && (worst = i));
  const status =
    worst < 0 ? 'Unhurt' : `${HEALTH_LEVELS[worst].name}${HEALTH_LEVELS[worst].penalty ? ` ${HEALTH_LEVELS[worst].penalty}` : ''}`;
  return (
    <div className="track">
      <div className="track-head">
        <span className="track-title">Health</span>
        <span className={`track-status${worst >= 3 ? ' bad' : ''}`}>{status}</span>
      </div>
      <div className="health-boxes">
        {HEALTH_LEVELS.map((lvl, i) => (
          <button
            key={lvl.name}
            type="button"
            className={`health-box mark-${MARK_NAME[c.health[i]]}`}
            aria-label={`${lvl.name}: ${MARK_NAME[c.health[i]]}`}
            title={lvl.name}
            onClick={() => patch({ health: c.health.map((m, j) => (j === i ? NEXT_MARK[m] : m)) })}
          >
            {c.health[i]}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Permanent Willpower (dots, edit mode only) over the spendable boxes (always tappable). */
export function WillpowerTrack({ c, patch, edit }: { c: Character; patch: Patch; edit: boolean }) {
  const left = Math.max(0, c.willpower - c.willpowerSpent);
  return (
    <div className="track">
      <div className="track-head">
        <span className="track-title">Willpower</span>
        <span className="track-status">
          {left} of {c.willpower}
        </span>
      </div>
      <Dots value={c.willpower} max={10} label="Willpower" onChange={edit ? (v) => patch({ willpower: v, willpowerSpent: Math.min(c.willpowerSpent, v) }) : undefined} />
      <div className="wp-boxes">
        {Array.from({ length: c.willpower }, (_, i) => (
          <button
            key={i}
            type="button"
            className={`wp-box${i < c.willpowerSpent ? ' spent' : ''}`}
            aria-label={`Willpower point ${i + 1}${i < c.willpowerSpent ? ', spent' : ''}`}
            onClick={() => patch({ willpowerSpent: c.willpowerSpent === i + 1 ? i : i + 1 })}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * The M20 Quintessence/Paradox wheel: 20 boxes, Quintessence filling clockwise from
 * the dot on the left, Paradox counterclockwise. Paradox cancels Quintessence where
 * they meet; Quintessence stops at the Paradox (M20 p. 331).
 */
export function QPWheel({ c, patch }: { c: Character; patch: Patch }) {
  const size = 220;
  const cx = size / 2;
  const R = 84;
  const set = (q: number, p: number) => patch(clampWheel(q, p));
  return (
    <div className="wheel">
      <svg viewBox={`0 0 ${size} ${size}`} className="wheel-svg" role="img" aria-label={`Quintessence ${c.quintessence}, Paradox ${c.paradox}`}>
        <circle cx={cx} cy={cx} r={R} className="wheel-ring" />
        <circle cx={cx - R - 14} cy={cx} r="3.5" className="wheel-dot" />
        {Array.from({ length: WHEEL_SIZE }, (_, k) => {
          const a = Math.PI + ((k + 0.5) * 2 * Math.PI) / WHEEL_SIZE;
          const x = cx + R * Math.cos(a);
          const y = cx + R * Math.sin(a);
          const state = k < c.quintessence ? 'q' : k >= WHEEL_SIZE - c.paradox ? 'p' : '';
          return (
            <rect
              key={k}
              x={x - 7}
              y={y - 7}
              width="14"
              height="14"
              rx="2"
              transform={`rotate(${(a * 180) / Math.PI + 45} ${x} ${y})`}
              className={`wheel-box ${state}`}
            />
          );
        })}
        <text x={cx} y={cx - 6} className="wheel-q">
          {c.quintessence}
        </text>
        <text x={cx} y={cx + 26} className="wheel-p">
          {c.paradox}
        </text>
      </svg>
      <div className="wheel-controls">
        <div className="stepper">
          <span className="stepper-label q">Quintessence</span>
          <button type="button" className="step" aria-label="Spend Quintessence" onClick={() => set(c.quintessence - 1, c.paradox)}>
            -
          </button>
          <button type="button" className="step" aria-label="Gain Quintessence" onClick={() => set(c.quintessence + 1, c.paradox)}>
            +
          </button>
        </div>
        <div className="stepper">
          <span className="stepper-label p">Paradox</span>
          <button type="button" className="step" aria-label="Lose Paradox" onClick={() => set(c.quintessence, c.paradox - 1)}>
            -
          </button>
          <button type="button" className="step" aria-label="Gain Paradox" onClick={() => set(c.quintessence, c.paradox + 1)}>
            +
          </button>
        </div>
      </div>
    </div>
  );
}
