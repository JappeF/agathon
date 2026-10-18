import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

/**
 * What every dialog needs, once, on mount: focus moves in (unless a field already took it
 * with autoFocus), Tab and Shift+Tab stay inside, Escape closes, and on close focus goes
 * back to what opened it, or to its menu's button when that sat in a menu that has
 * closed since. `onClose` is read from a ref, so a parent re-render (a debounced save, a
 * live query) never re-runs this and pulls focus out of a field mid-typing.
 */
export function useDialog(ref: RefObject<HTMLElement>, onClose: () => void) {
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const box = ref.current;
    const opener = document.activeElement as HTMLElement | null;
    if (box && !box.contains(document.activeElement)) box.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close.current();
        return;
      }
      if (e.key !== 'Tab' || !box) return;
      const items = [...box.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.getClientRects().length > 0);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const at = document.activeElement;
      if (!box.contains(at)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && (at === first || at === box)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && at === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (!opener?.isConnected) return;
      if (opener.getClientRects().length > 0) opener.focus();
      else opener.closest('details')?.querySelector<HTMLElement>('summary')?.focus();
    };
  }, [ref]);
}
