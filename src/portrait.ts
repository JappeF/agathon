import type { PDFDict as PDFDictType } from 'pdf-lib';

/**
 * Character portraits: any image (an upload, or the picture inside a PDF sheet) becomes
 * a square data URL kept on the character, so it travels in backups and files.
 */

const SIZE = 640;

/** Crop to a square (slightly above centre, where faces usually are) and shrink to 640px (sharp enough for the enlarged view). */
export async function imageToPortrait(blob: Blob): Promise<string> {
  const bmp = await createImageBitmap(blob);
  const side = Math.min(bmp.width, bmp.height);
  const sx = (bmp.width - side) / 2;
  const sy = (bmp.height - side) * 0.3;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, sx, sy, side, side, 0, 0, SIZE, SIZE);
  bmp.close();
  const webp = canvas.toDataURL('image/webp', 0.82);
  // Safari before 17 can't encode WebP and silently returns PNG: use JPEG then
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.85);
}

/**
 * The portrait pasted into a PDF sheet: the largest JPEG on any page that is not a
 * full-page background (same shape as the page) or a thin decorative strip.
 */
export async function portraitFromPdf(bytes: ArrayBuffer): Promise<Blob | null> {
  const { PDFDocument, PDFName, PDFDict, PDFRawStream } = await import('pdf-lib');
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const best = { data: null as Uint8Array | null, area: 0 };
  for (const page of doc.getPages()) {
    const { width: pw, height: ph } = page.getSize();
    const seen = new Set<unknown>();
    const walk = (res: PDFDictType | undefined, depth: number) => {
      const xobjects = res?.lookupMaybe(PDFName.of('XObject'), PDFDict);
      if (!xobjects) return;
      for (const [, ref] of xobjects.entries()) {
        const obj = doc.context.lookup(ref);
        if (!(obj instanceof PDFRawStream) || seen.has(obj)) continue;
        seen.add(obj);
        const dict = obj.dict;
        const subtype = dict.get(PDFName.of('Subtype'))?.toString();
        if (subtype === '/Form' && depth < 3) {
          walk(dict.lookupMaybe(PDFName.of('Resources'), PDFDict), depth + 1);
          continue;
        }
        if (subtype !== '/Image' || dict.get(PDFName.of('Filter'))?.toString() !== '/DCTDecode') continue;
        const w = Number(dict.get(PDFName.of('Width'))?.toString());
        const h = Number(dict.get(PDFName.of('Height'))?.toString());
        if (!w || !h || Math.min(w, h) < 200) continue;
        if (Math.abs(w / h - pw / ph) < 0.02 && w > 1500) continue; // page background
        if (w * h > best.area) Object.assign(best, { data: obj.contents, area: w * h });
      }
    };
    walk(page.node.Resources(), 0);
  }
  return best.data ? new Blob([best.data as BlobPart], { type: 'image/jpeg' }) : null;
}

/** A portrait from outside (a shared file) is only accepted as a small image data URL. */
export function safePortrait(v: unknown): string | undefined {
  return typeof v === 'string' && v.length < 400_000 && /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(v) ? v : undefined;
}
