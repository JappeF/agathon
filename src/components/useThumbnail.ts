import { useEffect, useState } from 'react';

const cache = new Map<string, Promise<string>>();

/** Halve step by step down to `px` with smoothing at every step: one big jump looks grainy. */
async function shrink(src: string, px: number): Promise<string> {
  const img = new Image();
  img.src = src;
  await img.decode();
  let canvas = document.createElement('canvas');
  let w = img.naturalWidth;
  let h = img.naturalHeight;
  let from: CanvasImageSource = img;
  while (w > px * 2 || h > px * 2 || from === img) {
    const nw = Math.max(px, Math.round(w / 2));
    const nh = Math.max(px, Math.round(h / 2));
    const next = document.createElement('canvas');
    next.width = nw;
    next.height = nh;
    const ctx = next.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(from, 0, 0, nw, nh);
    from = canvas = next;
    w = nw;
    h = nh;
  }
  if (w !== px) {
    const last = document.createElement('canvas');
    last.width = px;
    last.height = Math.round((h / w) * px);
    const ctx = last.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, 0, 0, last.width, last.height);
    canvas = last;
  }
  return canvas.toDataURL('image/png');
}

/**
 * A small copy of a portrait for small places (the nav, the sheet's mini bar, lists).
 * Phones scale a 640px picture down to 30px in one go and it looks grainy, worst in a
 * fixed bar; a copy shrunk in steps is smooth. Made once per picture and size; until it
 * is ready the picture itself shows. `cssPx` 0 means: no copy, show the picture.
 */
export function useThumbnail(src: string | undefined, cssPx: number): string | undefined {
  const px = cssPx ? Math.ceil(cssPx * Math.min(3, window.devicePixelRatio || 1)) : 0;
  const key = src && px ? `${px}|${src}` : '';
  const [thumb, setThumb] = useState<{ key: string; url: string } | null>(null);
  useEffect(() => {
    if (!key || !src) return;
    let live = true;
    if (!cache.has(key)) cache.set(key, shrink(src, px).catch(() => src));
    cache.get(key)!.then((url) => live && setThumb({ key, url }));
    return () => {
      live = false;
    };
  }, [key, src, px]);
  return thumb && thumb.key === key ? thumb.url : src;
}
