import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';

/**
 * A local copy of one stored row (a character, a spell idea) that updates at once while
 * typing. Writes are debounced and flushed on unmount and when the page is hidden (a PWA
 * swiped away right after a tap). A newer row in the database (an import from the
 * character menu, another window) is taken over whenever nothing of ours is waiting to be
 * written; before, the open copy wrote its older data back over it on the next tap.
 * Local edits bump `updatedAt`, so a late echo of an earlier save never undoes typing.
 */
export function useDraft<T extends { id: string; updatedAt: number }>(
  id: string,
  load: (id: string) => Promise<T | undefined>,
  save: (row: T) => Promise<unknown>,
) {
  const [draft, setDraft] = useState<T | null | undefined>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const pending = useRef<T | null>(null);
  const stored = useLiveQuery(async () => (await load(id)) ?? null, [id]);

  useEffect(() => {
    if (stored === undefined || pending.current) return;
    setDraft((prev) => (stored === null ? null : !prev || prev.id !== stored.id || stored.updatedAt > prev.updatedAt ? stored : prev));
  }, [stored]);

  useEffect(() => {
    const flush = () => {
      clearTimeout(timer.current);
      if (pending.current) save(pending.current);
      pending.current = null;
    };
    const onVisibility = () => document.visibilityState === 'hidden' && flush();
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
      flush();
    };
    // save is a module function; the row id is the component key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const patch = (p: Partial<T>) =>
    setDraft((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...p, updatedAt: Date.now() };
      pending.current = next;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        save(next);
        pending.current = null;
      }, 250);
      return next;
    });

  return { draft, patch, replace: setDraft };
}
