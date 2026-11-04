// A tiny page for link previews: other apps (WhatsApp, Discord, Signal...) read its
// Open Graph tags, people are sent straight on into the app. Shared by the functions
// under functions/s and functions/i; nothing is stored.

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const BACKSLASH = String.fromCharCode(92);
const UNSAFE = new RegExp("[<>&" + String.fromCharCode(0x2028, 0x2029) + "]", "g");

/** About two lines of a preview card, cut at a word. */
export const short = (s, max = 200) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : `${t.slice(0, max).replace(/\s+\S*$/, '')}...`;
};

/** What a link that carries its data holds (/i/, /c/): <mode>.<base64url>, nothing else. */
export const LINK_DATA = /^[01]\.[A-Za-z0-9_-]{1,16000}$/;

/**
 * The JSON inside such a link: mode 1 is deflate-raw, 0 plain. A hostile link may not
 * inflate past `limit` bytes. Throws on anything damaged.
 */
export async function readLink(data, limit) {
  const dot = data.indexOf('.');
  const bin = atob(data.slice(dot + 1).replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  if (data.slice(0, dot) !== '1') return JSON.parse(new TextDecoder().decode(bytes));
  const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) {
      await reader.cancel();
      throw new Error('too large');
    }
    chunks.push(value);
  }
  return JSON.parse(new TextDecoder().decode(await new Blob(chunks).arrayBuffer()));
}

/**
 * `image`: { url, size } for a square picture of the subject; the app's sigil otherwise.
 * `listed`: a public page (a library spell) that search engines may index under this URL;
 * a link that carries someone's character or spell idea is kept out of them.
 */
export function previewPage({ title, description, url, target, image, listed = false }) {
  const origin = new URL(url).origin;
  // a full square without transparency: WhatsApp fills transparent corners with white
  const img = esc(image?.url ?? `${origin}/icons/share-512.png`);
  const alt = esc(image ? title : 'The Agathon sigil, a golden ring on violet');
  const side = image?.size ?? 512;
  const t = esc(title);
  const d = esc(description);
  // the target goes into a script as JSON, with < > & and the two line separators written as
  // unicode escapes, so nothing in it can close the tag or break the line. The backslash is
  // built from its char code: tools that write this file turn an escape typed in the source
  // into the character itself (which is how a no-op replace once slipped in here).
  const js = JSON.stringify(target).replace(UNSAFE, (c) => BACKSLASH + "u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t}</title>
<meta name="description" content="${d}">
${listed ? `<link rel="canonical" href="${esc(url)}">` : '<meta name="robots" content="noindex">'}
<meta name="theme-color" content="#120b1c">
<link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<meta property="og:site_name" content="Agathon">
<meta property="og:locale" content="en_US">
<meta property="og:type" content="article">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${img}">
<meta property="og:image:width" content="${side}">
<meta property="og:image:height" content="${side}">
<meta property="og:image:alt" content="${alt}">
<!-- a small square card on purpose; X reads title, text and picture from the og tags -->
<meta name="twitter:card" content="summary">
<meta http-equiv="refresh" content="0;url=${esc(target)}">
<script>location.replace(${js})</script>
</head>
<body style="background:#120b1c;color:#ddd3e8;font-family:system-ui,sans-serif;padding:2rem">
<h1 style="font-size:1.4rem">${t}</h1>
<p>${d}</p>
<p><a style="color:#f3d58a" href="${esc(target)}">Open in Agathon</a></p>
</body>
</html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
