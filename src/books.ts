import { db, type BookRecord } from './db/db';
import type { Effect } from './library/data';
import { SPHERES, type Sphere } from './types';

/**
 * The player's own rulebooks, as page text on this device only. The PDF is read once
 * with pdf.js and thrown away; only the text per page is kept (IndexedDB), so Copy for
 * AI can quote the real pages. Book text is never shipped, shared or sent anywhere.
 */
export const BOOKS = {
  M20: { title: 'Mage: The Ascension 20th Anniversary Edition', short: 'M20', pages: 698 },
  HDYDT: { title: 'How Do You DO That?', short: 'HDYDT', pages: 143 },
} as const;
export type BookId = keyof typeof BOOKS;

export class BookError extends Error {}

const pageText = async (doc: { getPage: (n: number) => Promise<unknown> }, n: number) => {
  const page = (await doc.getPage(n)) as { getTextContent: () => Promise<{ items: { str?: string; hasEOL?: boolean }[] }> };
  const content = await page.getTextContent();
  return content.items
    .map((it) => (it.str ?? '') + (it.hasEOL ? '\n' : ''))
    .join('')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

/** Which book this is, from the text of its first pages. HDYDT also says "20th Anniversary", so it goes first. */
function recognise(start: string, numPages: number): BookId | null {
  // the text layer has stray spaces ("20 th A nniversary"), so compare without any
  const t = start.toLowerCase().replace(/\s+/g, '');
  if (/practicalguidetospheremagick|howdoyoudothat/.test(t) && Math.abs(numPages - BOOKS.HDYDT.pages) < 40) return 'HDYDT';
  if (/20thanniversary/.test(t) && Math.abs(numPages - BOOKS.M20.pages) < 80) return 'M20';
  return null;
}

/**
 * pdf page = printed page + offset, voted from the running footers. pdf.js puts the
 * footer first, with the number stuck to it ("501Chapter Ten: The Book of Magick").
 * Falls back to 1, the offset of the DriveThruRPG PDFs.
 */
function footerOffset(pages: string[]): number {
  const votes = new Map<number, number>();
  pages.forEach((p, i) => {
    const m = p.trim().match(/^(\d{1,3})(?=[A-Z])/);
    if (m) votes.set(i + 1 - Number(m[1]), (votes.get(i + 1 - Number(m[1])) ?? 0) + 1);
  });
  const [best, most] = [...votes].sort((a, b) => b[1] - a[1])[0] ?? [1, 0];
  return most >= 10 ? best : 1;
}

/** Read a rulebook PDF into page text. Calls `progress(done, total)` while reading. */
export async function readBook(file: File, progress: (done: number, total: number) => void): Promise<BookRecord> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  let doc;
  try {
    doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  } catch {
    throw new BookError("This file can't be read as a PDF.");
  }
  try {
    const first: string[] = [];
    for (let n = 1; n <= Math.min(8, doc.numPages); n++) first.push(await pageText(doc, n));
    const id = recognise(first.join('\n'), doc.numPages);
    if (!id) throw new BookError("This isn't the M20 core book or How Do You DO That? (the PDFs from DriveThruRPG). Other books aren't supported yet.");
    const pages: string[] = [...first];
    for (let n = first.length + 1; n <= doc.numPages; n++) {
      pages.push(await pageText(doc, n));
      if (n % 10 === 0) progress(n, doc.numPages);
    }
    progress(doc.numPages, doc.numPages);
    if (pages.join('').trim().length < 1000) throw new BookError('This PDF has no text layer (a scan?), so there is nothing to search.');
    return { id, title: BOOKS[id].title, importedAt: Date.now(), pages, offset: footerOffset(pages) };
  } finally {
    doc.destroy();
  }
}

/** Text of a printed page, or null when that book isn't on this device. */
export const printedPage = (b: BookRecord | undefined, page: number) => b?.pages[page + (b.offset ?? 1) - 1] ?? null;

// ---------- passages for Copy for AI ----------

export interface Passage {
  key: string;
  book: BookId;
  page: number;
  label: string;
}

/** Rules pages worth having along for any spell (printed page numbers, M20). */
const RULES: { page: number; label: string }[] = [
  { page: 501, label: 'Casting magickal Effects, difficulty and modifiers' },
  { page: 502, label: 'Reference charts: difficulty and Paradox' },
  { page: 503, label: 'Reference charts: difficulty modifiers' },
  { page: 530, label: 'Coincidental vs. vulgar magick' },
  { page: 547, label: 'Botching, magick and Paradox' },
  { page: 548, label: 'The Paradox backlash' },
];

/**
 * The pages that could go along with a spell idea, most useful first: the linked effects,
 * the Sphere rank descriptions the plan uses, then the core rules pages.
 */
export function candidatePassages(linked: Effect[], spheres: Partial<Record<Sphere, number>>, effects: Effect[]): Passage[] {
  const out: Passage[] = [];
  const add = (book: string, page: number, label: string) => {
    const key = `${book}:${page}`;
    if ((book === 'M20' || book === 'HDYDT') && !out.some((p) => p.key === key)) out.push({ key, book, page, label });
  };
  for (const e of linked) for (const s of e.source) add(s.book, s.page, e.name);
  for (const s of SPHERES) {
    const r = spheres[s];
    if (!r) continue;
    const rank = effects.find((e) => e.id === `${s.toLowerCase()}-${r}`);
    for (const src of rank?.source ?? []) add(src.book, src.page, `${s} ${r}`);
  }
  for (const r of RULES) add('M20', r.page, r.label);
  return out;
}

// ---------- moving the index between devices ----------

/** Build the index on a computer, then load this private file on the phone (never share it). */
export async function exportBooks(): Promise<string> {
  const books = await db.books.toArray();
  return JSON.stringify({ app: 'agathon', kind: 'books', version: 1, books });
}

export async function importBooksFile(text: string): Promise<BookRecord[]> {
  let raw: { app?: string; kind?: string; books?: unknown };
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BookError("This isn't an Agathon book file.");
  }
  if (raw.app !== 'agathon' || raw.kind !== 'books' || !Array.isArray(raw.books)) throw new BookError("This isn't an Agathon book file.");
  const books: BookRecord[] = [];
  for (const b of raw.books as Partial<BookRecord>[]) {
    if (!b || !(b.id === 'M20' || b.id === 'HDYDT') || !Array.isArray(b.pages)) continue;
    const pages = b.pages.slice(0, 1200).map((p) => (typeof p === 'string' ? p.slice(0, 40000) : ''));
    const offset = typeof b.offset === 'number' && Math.abs(b.offset) < 50 ? Math.round(b.offset) : 1;
    books.push({ id: b.id, title: BOOKS[b.id].title, importedAt: Date.now(), pages, offset });
  }
  if (!books.length) throw new BookError('There are no books in this file.');
  await db.books.bulkPut(books);
  return books;
}
