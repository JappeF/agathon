import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Icon } from './Icon';

const CHECK_EVERY = 60 * 60 * 1000;

/**
 * Service worker registration + update prompt. A new deploy is downloaded in the
 * background; the toast lets the player reload when it suits them instead of
 * yanking the page mid-game. Installed PWAs can stay open for days, so we also
 * re-check periodically and whenever the app comes back to the foreground.
 */
export function UpdateToast() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      const check = () => {
        if (navigator.onLine && !reg.installing) reg.update().catch(() => {});
      };
      setInterval(check, CHECK_EVERY);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
    },
  });

  useEffect(() => {
    if (!offlineReady) return;
    const t = setTimeout(() => setOfflineReady(false), 4000);
    return () => clearTimeout(t);
  }, [offlineReady, setOfflineReady]);

  // updateServiceWorker reloads once the new worker takes control. A page that was
  // never controlled (the very first visit) gets no such event, so reload it ourselves.
  const reload = () => {
    const controlled = !!navigator.serviceWorker?.controller;
    updateServiceWorker(true);
    if (!controlled) setTimeout(() => location.reload(), 300);
  };

  if (!needRefresh && !offlineReady) return null;

  return (
    <div className="update-toast" role="status" aria-live="polite">
      {needRefresh ? (
        <>
          <span>New version ready</span>
          <button className="btn btn-gold" onClick={reload}>
            Reload
          </button>
          <button className="btn-icon" onClick={() => setNeedRefresh(false)} aria-label="Later">
            <Icon name="close" />
          </button>
        </>
      ) : (
        <span>Ready to work offline.</span>
      )}
    </div>
  );
}
