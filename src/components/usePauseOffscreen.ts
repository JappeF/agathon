import { useEffect, useRef } from 'react';

/**
 * Pauses the CSS animations inside an element while it is off screen (the `offscreen`
 * class, see styles.css): the header portal once the page scrolls, portraits in a list.
 */
export function usePauseOffscreen<T extends Element>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([e]) => el.classList.toggle('offscreen', !e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}
