import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

/**
 * Share a link: the system share sheet on phones (WhatsApp, Signal...), the clipboard on
 * desktops, where people expect "copy link". `url` may be a promise (a spell idea's link
 * is encoded first). A tick and "Link copied" show for a moment after copying.
 */
export async function shareOrCopy(url: string, title: string): Promise<'shared' | 'copied' | 'cancelled'> {
  const phone = /Android|iPhone|iPad/i.test(navigator.userAgent);
  if (phone && navigator.share) {
    try {
      await navigator.share({ title, url });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
      // no share target: copy instead
    }
  }
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    // no clipboard (an insecure page, an old browser): let them copy it by hand
    window.prompt('Copy this link', url);
  }
  return 'copied';
}

export function ShareButton({ url, title, label, className = '' }: { url: () => string | Promise<string>; title: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  // the link starts encoding as the finger or mouse goes down, so by the click it is usually
  // ready and the share sheet opens straight from the tap (Safari drops it after a wait)
  const ready = useRef<{ value?: string; promise?: Promise<string> }>({});
  const prepare = () => {
    const r: { value?: string; promise?: Promise<string> } = {};
    r.promise = Promise.resolve(url()).then((v) => (r.value = v));
    ready.current = r;
    return r;
  };
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <button
      type="button"
      className={`share-btn ${className}${copied ? ' done' : ''}`}
      aria-label={copied ? 'Link copied' : label}
      title={copied ? 'Link copied' : label}
      onPointerDown={prepare}
      onClick={async () => {
        const r = ready.current.promise ? ready.current : prepare();
        ready.current = {};
        const link = r.value ?? (await r.promise!);
        if ((await shareOrCopy(link, title)) === 'copied') setCopied(true);
      }}
    >
      <Icon name={copied ? 'check' : 'share'} size={20} />
      {copied && <span className="share-done">Link copied</span>}
    </button>
  );
}
