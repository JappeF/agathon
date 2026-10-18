// Render one page of a PDF with pdf.js in Edge, to eyeball an export:
//   node scripts/render-pdf-page.mjs <file.pdf> <out.png> [page, default 2]
import { chromium } from 'playwright-core';
import { readFile } from 'node:fs/promises';
const [pdfPath, out, pageNo = '2'] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'msedge' });
const page = await b.newPage({ viewport: { width: 1224, height: 1584 } });
await page.route('http://x/**', async (r) => {
  const u = r.request().url();
  if (u.endsWith('/doc.pdf')) return r.fulfill({ body: await readFile(pdfPath), contentType: 'application/pdf' });
  if (u.endsWith('pdf.mjs')) return r.fulfill({ body: await readFile('node_modules/pdfjs-dist/legacy/build/pdf.mjs'), contentType: 'text/javascript' });
  if (u.endsWith('pdf.worker.mjs')) return r.fulfill({ body: await readFile('node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'), contentType: 'text/javascript' });
  return r.fulfill({ body: '<canvas id=c></canvas>', contentType: 'text/html' });
});
await page.goto('http://x/');
await page.evaluate(async (n) => {
  const pdfjs = await import('http://x/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = 'http://x/pdf.worker.mjs';
  const doc = await pdfjs.getDocument('http://x/doc.pdf').promise;
  const p = await doc.getPage(n);
  const vp = p.getViewport({ scale: 2 });
  const c = document.getElementById('c'); c.width = vp.width; c.height = vp.height;
  await p.render({ canvasContext: c.getContext('2d'), viewport: vp, annotationMode: pdfjs.AnnotationMode.ENABLE_FORMS }).promise;
}, Number(pageNo));
await page.locator('#c').screenshot({ path: out });
await b.close();
