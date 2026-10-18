import { useEffect, useState } from 'react';
import type { Character } from '../character';
import { BOOK_NAMES, type Combo, type Effect } from '../library/data';
import { deficit, highestRank } from '../library/search';
import type { Sphere } from '../types';
import { ComboChips } from './ComboChips';
import { Icon } from './Icon';
import { Highlighted } from './Highlighted';

/** Base difficulty from M20 p. 501: highest Sphere +3 / +4 / +5, never below 3. */
function difficulties(c: Combo) {
  const h = highestRank(c);
  return { coincidental: Math.max(3, h + 3), vulgar: Math.max(3, h + 4), witnessed: Math.max(3, h + 5), highest: h };
}

interface Tip {
  title: string;
  text: string;
  /** set when the tip depends on a Sphere the character has (or the combo uses) */
  sphere?: Sphere;
  ready?: boolean;
}

/**
 * Ways to keep an Effect coincidental or soften a vulgar one. The rule numbers come
 * from M20 p. 501; the Sphere tricks only show when the character has the dots
 * (or the Effect already uses that Sphere).
 */
function mitigation(combo: Combo, c?: Character | null): Tip[] {
  const has = (s: Sphere, r: number) => (c ? c.spheres[s] >= r : (combo.spheres[s] ?? 0) >= r);
  const tips: Tip[] = [
    {
      title: 'Make it look like it could happen',
      text: 'Frame the result as luck, skill, good gear or bad timing that fits the scene. The more ordinary the explanation, the more likely the Storyteller calls it coincidental.',
    },
    {
      title: 'Keep Sleepers out of sight',
      text: 'Vulgar with witnesses is one step harder than without (highest Sphere +5 instead of +4), and a botch in front of them costs double Paradox.',
    },
    {
      title: 'Use a focus that fits',
      text: 'Instruments that suit your paradigm and the scene can earn a difficulty bonus; all modifiers together stay within +3 / -3.',
    },
    {
      title: 'Back it with a mundane roll',
      text: 'A related Ability roll first (Computer for a hack, Medicine for healing): each success can lower the magick roll by 1, up to -3.',
    },
    {
      title: 'Take your time',
      text: 'An extended ritual spreads the successes over several rolls and gives you time to set the scene up so it looks natural.',
    },
  ];
  const sphereTips: [Sphere, number, string, string][] = [
    ['Correspondence', 2, 'Work from out of sight', 'Correspondence lets you act on a place you are not standing in, so nobody sees who did it.'],
    ['Mind', 2, 'Turn their attention away', 'A Mind impulse can make onlookers look elsewhere or shrug it off.'],
    ['Entropy', 2, 'Ride the odds', 'Entropy can wait for, or nudge, the moment when chance already favours the result.'],
    ['Time', 2, 'Pick the moment', 'Time lets you see when nobody will be watching, or what is about to happen anyway.'],
  ];
  for (const [s, r, title, text] of sphereTips) {
    if (has(s, r) || combo.spheres[s] !== undefined) tips.push({ title, text, sphere: s, ready: has(s, r) });
  }
  return tips;
}

export function EffectDetail({
  effect,
  character,
  terms = [],
  tagsOn = [],
  pinned = false,
  onPin,
  onClose,
  onTag,
}: {
  effect: Effect;
  character?: Character | null;
  /** search words to mark, and the tags the search filters on */
  terms?: string[];
  tagsOn?: string[];
  /** whether the active character has this effect pinned; onPin toggles it */
  pinned?: boolean;
  onPin?: () => void;
  onClose: () => void;
  onTag: (tag: string) => void;
}) {
  const hl = (text: string) => <Highlighted text={text} terms={terms} />;
  const dots = character?.spheres;
  // start on the first combo the character can cast, else the first one
  const firstCastable = dots ? effect.combos.findIndex((c) => deficit(c, dots) === 0) : -1;
  const [pick, setPick] = useState(Math.max(0, firstCastable));
  const combo = effect.combos[pick] ?? effect.combos[0];
  const d = difficulties(combo);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  useEffect(() => setPick(Math.max(0, firstCastable)), [effect.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="detail-overlay" onClick={onClose}>
      <article className="detail" role="dialog" aria-modal="true" aria-label={effect.name} onClick={(e) => e.stopPropagation()}>
        <div className="detail-top">
          <button type="button" className="back" onClick={onClose}>
            <Icon name="back" /> Library
          </button>
          <span className="detail-top-end">
            <span className={`kind-badge kind-${effect.kind}`}>{effect.kind === 'rank' ? 'Sphere rank' : effect.kind}</span>
            {character && onPin && (
              <button
                type="button"
                className={`pin-btn${pinned ? ' on' : ''}`}
                aria-pressed={pinned}
                title={pinned ? `Unpin from ${character.name}` : `Pin to ${character.name}'s sheet`}
                onClick={onPin}
              >
                <Icon name="star" size={16} filled={pinned} /> {pinned ? 'Pinned' : 'Pin'}
              </button>
            )}
          </span>
        </div>
        <h2 className="detail-name">{hl(effect.name)}</h2>
        <p className="detail-summary">{hl(effect.summary)}</p>
        {effect.system && (
          <p className="detail-system">
            <strong>System.</strong> {hl(effect.system)}
          </p>
        )}

        <h3 className="block-title">{effect.combos.length > 1 ? 'Ways to cast it' : 'Spheres'}</h3>
        <ul className="combo-list">
          {effect.combos.map((c, i) => {
            const miss = dots ? deficit(c, dots) : undefined;
            return (
              <li key={i}>
                <button type="button" className={`combo-pick${i === pick ? ' on' : ''}`} aria-pressed={i === pick} onClick={() => setPick(i)}>
                  <ComboChips combo={c} dots={dots} />
                  {c.note && <span className="combo-note">{hl(c.note)}</span>}
                  {miss !== undefined && (
                    <span className={`castable${miss === 0 ? ' yes' : ''}`}>
                      {miss === 0 ? `${character!.name} can cast this` : `${miss} dot${miss > 1 ? 's' : ''} short`}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        {effect.optional && effect.optional.length > 0 && (
          <>
            <h3 className="block-title">Add-ons</h3>
            <ul className="combo-list">
              {effect.optional.map((o, i) => (
                <li key={i} className="addon">
                  <ComboChips combo={o} dots={dots} />
                  <span className="combo-note">{hl(o.purpose)}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        <h3 className="block-title">Casting it</h3>
        <div className="difficulty">
          <span>
            Coincidental <strong>{d.coincidental}</strong>
          </span>
          <span>
            Vulgar <strong>{d.vulgar}</strong>
          </span>
          <span>
            With witnesses <strong>{d.witnessed}</strong>
          </span>
        </div>
        <p className="empty-small">
          Base difficulty for the selected way (highest Sphere {d.highest}), before modifiers. M20 p. 501.
          {effect.vulgarity && ` The book calls this ${effect.vulgarity === 'depends' ? 'coincidental or vulgar depending on how it is done' : effect.vulgarity}.`}
        </p>

        <h3 className="block-title">Keeping it coincidental</h3>
        {effect.coincidentalIf && (
          <p className="book-tip">
            <strong>The book:</strong> it stays coincidental if {hl(effect.coincidentalIf)}.
          </p>
        )}
        <ul className="tips">
          {mitigation(combo, character).map((t) => (
            <li key={t.title} className={t.sphere && !t.ready ? 'tip-off' : ''}>
              <strong>{t.title}</strong>
              {t.sphere && (
                <span className={`tip-sphere${t.ready ? ' ready' : ''}`}>
                  {t.ready ? (character ? `${t.sphere} ${character.spheres[t.sphere]}` : t.sphere) : `needs ${t.sphere} 2`}
                </span>
              )}
              <span>{t.text}</span>
            </li>
          ))}
        </ul>
        {character && character.focus.length > 0 && (
          <div className="focus-reminder">
            <span className="field-label">{character.name}'s focus</span>
            {character.focus.map((f) => (
              <span key={f} className="flavor-line">
                {f}
              </span>
            ))}
          </div>
        )}

        <h3 className="block-title">Source</h3>
        <ul className="sources">
          {effect.source.map((s) => (
            <li key={`${s.book}${s.page}`}>
              {BOOK_NAMES[s.book]}, p. {s.page}
              {s.section && <span className="empty-small"> ({s.section})</span>}
            </li>
          ))}
        </ul>
        <p className="detail-tags">
          {effect.tags.map((t) => (
            <button key={t} type="button" className={`tag${tagsOn.includes(t) ? ' on' : ''}`} onClick={() => onTag(t)}>
              {t}
            </button>
          ))}
        </p>
      </article>
    </div>
  );
}

