// Dump the printed words of a PDF character sheet with their positions, so the
// form-field mapping can be built from where each field sits next to its label.
// Usage: node scripts/sheet-words.mjs <sheet.pdf>
import { readFile } from 'node:fs/promises';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const data = new Uint8Array(await readFile(process.argv[2]));
const pdf = await getDocument({ data, verbosity: 0 }).promise;
for (let i = 1; i <= pdf.numPages; i++) {
  const page = await pdf.getPage(i);
  const { height } = page.getViewport({ scale: 1 });
  const tc = await page.getTextContent();
  const lines = new Map();
  for (const it of tc.items) {
    const t = it.str.trim();
    if (!t) continue;
    const x = Math.round(it.transform[4]);
    const y = Math.round(height - it.transform[5]);
    const key = Math.round(y / 4) * 4;
    if (!lines.has(key)) lines.set(key, []);
    lines.get(key).push([x, t]);
  }
  console.log(`== page ${i}`);
  for (const y of [...lines.keys()].sort((a, b) => a - b)) {
    const ws = lines.get(y).sort((a, b) => a[0] - b[0]);
    console.log(y, ws.map(([x, t]) => `${t}@${x}`).join(' | ').slice(0, 240));
  }
}
