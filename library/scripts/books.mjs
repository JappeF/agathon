// Shared helpers for the library scripts: where the rulebooks and their extracted
// text live, and how printed page numbers map to PDF pages.
//
// The PDFs and every bit of text pulled out of them stay outside git (refs/ is
// gitignored). In a worktree there is no refs/, so we fall back to the refs/ of
// the main checkout (the parent of the shared .git dir). AGATHON_REFS overrides both.
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const LIBRARY_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const REPO_DIR = resolve(LIBRARY_DIR, '..');

export const BOOKS = {
  M20: {
    file: 'Mage_20th_Anniversary_Edition_(Final_Download).pdf',
    slug: 'm20',
    // pdf page = printed page + offset (checked against the running footers)
    offset: 1,
  },
  HDYDT: {
    file: 'M20_How_Do_You_DO_That_(Final_Download).pdf',
    slug: 'hdydt',
    offset: 1,
  },
};

export function refsDir() {
  if (process.env.AGATHON_REFS) return resolve(process.env.AGATHON_REFS);
  const local = join(REPO_DIR, 'refs');
  if (existsSync(local)) return local;
  try {
    const common = execFileSync('git', ['rev-parse', '--git-common-dir'], { cwd: REPO_DIR, encoding: 'utf8' }).trim();
    const main = join(resolve(REPO_DIR, common), '..', 'refs');
    if (existsSync(main)) return main;
  } catch {}
  throw new Error('refs/ not found: set AGATHON_REFS to the folder holding the rulebook PDFs');
}

export function textDir() {
  return join(refsDir(), 'text');
}

// Text of one PDF page (1-based), in pdftotext reading order and in -layout mode.
const pageCache = new Map();
export function pageText(book, pdfPage, { layout = false } = {}) {
  const key = `${book}:${pdfPage}:${layout}`;
  if (pageCache.has(key)) return pageCache.get(key);
  const b = BOOKS[book];
  const f = join(textDir(), layout ? `${b.slug}-layout` : b.slug, `p${String(pdfPage).padStart(3, '0')}.txt`);
  const t = existsSync(f) ? readFileSync(f, 'utf8') : null;
  pageCache.set(key, t);
  return t;
}
