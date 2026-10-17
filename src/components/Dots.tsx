/**
 * A rating as gold dots. Read-only by default; with `onChange` each dot is a
 * 44px tap target (tap the current top dot again to lower it by one).
 */
export function Dots({
  value,
  max = 5,
  label,
  onChange,
}: {
  value: number;
  max?: number;
  label: string;
  onChange?: (v: number) => void;
}) {
  const dots = Array.from({ length: max }, (_, i) => i < value);
  if (!onChange) {
    return (
      <span className={`dots${max > 5 ? ' dots-wide' : ''}`} role="img" aria-label={`${label}: ${value}`}>
        {dots.map((on, i) => (
          <span key={i} className={`dot${on ? ' on' : ''}`} />
        ))}
      </span>
    );
  }
  return (
    <span className={`dots dots-edit${max > 5 ? ' dots-wide' : ''}`} role="group" aria-label={label}>
      {dots.map((on, i) => (
        <button
          key={i}
          type="button"
          className="dot-btn"
          aria-label={`${label} ${i + 1}`}
          aria-pressed={on}
          onClick={() => onChange(value === i + 1 ? i : i + 1)}
        >
          <span className={`dot${on ? ' on' : ''}`} />
        </button>
      ))}
    </span>
  );
}
