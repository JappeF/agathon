import type { PDFDict as PDFDictType, PDFDocument as PDFDocumentType, PDFRef as PDFRefType } from 'pdf-lib';

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

/** A portrait as JPEG bytes for a PDF (pdf-lib can't embed WebP), cropped to the box's shape, a little above centre. */
export async function portraitJpeg(dataUrl: string, box: { width: number; height: number }): Promise<SheetPortrait> {
  const bmp = await createImageBitmap(await (await fetch(dataUrl)).blob());
  const aspect = box.width / box.height;
  const sw = Math.min(bmp.width, bmp.height * aspect);
  const sh = sw / aspect;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(sw);
  canvas.height = Math.round(sh);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, (bmp.width - sw) / 2, (bmp.height - sh) * 0.3, sw, sh, 0, 0, canvas.width, canvas.height);
  bmp.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.9));
  return { jpeg: new Uint8Array(await blob!.arrayBuffer()), width: canvas.width, height: canvas.height };
}

export interface SheetPortrait {
  jpeg: Uint8Array;
  width: number;
  height: number;
}

/**
 * The portrait pasted into a PDF sheet: the largest JPEG on any page that is not a
 * full-page background (same shape as the page) or a thin decorative strip. Returns its
 * object, so export can put a new picture in its place.
 */
export async function findPdfPortrait(doc: PDFDocumentType) {
  const { PDFName, PDFDict, PDFRawStream, PDFRef } = await import('pdf-lib');
  // a holder, not a plain let: TypeScript doesn't see assignments inside the walk closure
  const found = { best: null as { ref: PDFRefType; data: Uint8Array; width: number; height: number } | null };
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
        if (ref instanceof PDFRef && (!found.best || w * h > found.best.width * found.best.height)) found.best = { ref, data: obj.contents, width: w, height: h };
      }
    };
    walk(page.node.Resources(), 0);
  }
  return found.best;
}

export async function portraitFromPdf(bytes: ArrayBuffer): Promise<Blob | null> {
  const { PDFDocument } = await import('pdf-lib');
  const found = await findPdfPortrait(await PDFDocument.load(bytes, { ignoreEncryption: true }));
  return found ? new Blob([found.data as BlobPart], { type: 'image/jpeg' }) : null;
}

/** A small copy of a portrait for share links (a few KB instead of tens). */
export async function shrinkPortrait(dataUrl: string, size = 128): Promise<string> {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, size, size);
  const webp = canvas.toDataURL('image/webp', 0.7);
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.7);
}

/** A portrait from outside (a shared file) is only accepted as a small image data URL. */
export function safePortrait(v: unknown): string | undefined {
  return typeof v === 'string' && v.length < 400_000 && /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(v) ? v : undefined;
}
