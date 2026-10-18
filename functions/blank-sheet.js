// Cloudflare Pages Function: GET /blank-sheet hands the app Mr. Gone's blank M20 2-page
// sheet, fetched live from his site. His server sends no CORS header, so the app can't
// fetch it itself; we don't keep a copy (it's his work, with the publisher's logo), we
// pass his current file on. One fixed URL only, so this is no open proxy. Cloudflare's
// edge cache keeps it a day, so his server sees few requests.
const SHEET = 'https://mrgone.rocksolidshells.com/pdf/M20/M20_2-Page_Interactive.pdf';

export async function onRequestGet() {
  let upstream;
  try {
    upstream = await fetch(SHEET, { cf: { cacheTtl: 86400, cacheEverything: true } });
  } catch {
    return new Response('The blank sheet could not be fetched.', { status: 502 });
  }
  const type = upstream.headers.get('content-type') ?? '';
  if (!upstream.ok || !/pdf|octet-stream/i.test(type)) {
    return new Response('The blank sheet could not be fetched.', { status: 502 });
  }
  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Cache-Control': 'public, max-age=86400',
      'X-Source': SHEET,
    },
  });
}
