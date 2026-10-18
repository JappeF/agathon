// A tiny page for link previews: other apps (WhatsApp, Discord, Signal...) read its
// Open Graph tags, people are sent straight on into the app. Shared by the functions
// under functions/s and functions/i; nothing is stored.

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** About two lines of a preview card, cut at a word. */
export const short = (s, max = 200) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : `${t.slice(0, max).replace(/\s+\S*$/, '')}...`;
};

export function previewPage({ title, description, url, target }) {
  const origin = new URL(url).origin;
  const t = esc(title);
  const d = esc(description);
  // the target goes into a script as JSON; "<" escaped so it can't close the tag
  const js = JSON.stringify(target).replace(/</g, '\u003c');
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
