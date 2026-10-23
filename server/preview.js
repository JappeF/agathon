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

export function previewPage({ title, description, url, target }) {
  const origin = new URL(url).origin;
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
<meta property="og:site_name" content="Agathon">
<meta property="og:type" content="article">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${origin}/icons/icon-512.png">
<meta property="og:image:width" content="512">
<meta property="og:image:height" content="512">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<meta name="twitter:image" content="${origin}/icons/icon-512.png">
<meta http-equiv="refresh" content="0;url=${esc(target)}">
<script>location.replace(${js})</script>
</head>
<body style="background:#120b1c;color:#ddd3e8;font-family:system-ui,sans-serif;padding:2rem">
<p><a style="color:#f3d58a" href="${esc(target)}">Open in Agathon</a></p>
</body>
</html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
