// GET /s/<spell id>: a link to a library spell that shows its name and summary as the
// preview card in other apps, then opens it in the app (#/library/<id>).
import { previewPage, short } from '../../server/preview.js';

export async function onRequestGet({ params, request, env }) {
  const id = String(params.id ?? '').toLowerCase();
  const target = `/#/library/${encodeURIComponent(id)}`;
  let entry = null;
  if (/^[a-z0-9-]{1,120}$/.test(id)) {
    try {
      const res = await env.ASSETS.fetch(new URL('/spell-index.json', request.url));
      if (res.ok) entry = (await res.json())[id] ?? null;
    } catch {
      // no index: still send them on
    }
  }
  if (!entry) return Response.redirect(new URL('/#/library', request.url).toString(), 302);
  const [name, summary] = entry;
  return previewPage({ title: name, description: short(summary), url: request.url, target, listed: true });
}
