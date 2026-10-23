// GET /i/<mode>.<data>: a shared spell idea. The idea travels in the link itself (as
// with character links); this reads only its title and goal for the preview card in
// other apps and stores nothing, then hands the link to the app (#import-spell=...),
// which shows the import preview.
import { previewPage, short } from '../../server/preview.js';

const LIMIT = 256 * 1024; // a spell idea is a few KB; a hostile link may not inflate past this

async function inflate(bytes) {
  const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > LIMIT) {
      await reader.cancel();
      throw new Error('too large');
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(await new Blob(chunks).arrayBuffer());
}

/** What a spell idea link carries: <mode>.<base64url>, nothing else. */
const DATA = /^[01]\.[A-Za-z0-9_-]{1,16000}$/;

export async function onRequestGet({ params, request }) {
  const data = String(params.data ?? '');
  // anything else is not a link the app made: send it to the spell ideas, carrying nothing
  if (!DATA.test(data)) return Response.redirect(new URL('/#/spells', request.url).toString(), 302);
  const target = `/#import-spell=${data}`;
  let title = 'A spell idea';
  let goal = 'A spell idea shared from Agathon, a companion for Mage: The Ascension.';
  try {
    const dot = data.indexOf('.');
    const bin = atob(data.slice(dot + 1).replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const json = data.slice(0, dot) === '1' ? await inflate(bytes) : new TextDecoder().decode(bytes);
    const spell = JSON.parse(json)?.spell ?? {};
    if (typeof spell.title === 'string' && spell.title.trim()) title = `Spell idea: ${short(spell.title, 90)}`;
    if (typeof spell.goal === 'string' && spell.goal.trim()) goal = short(spell.goal);
  } catch {
    // a damaged link still goes on; the app explains what is wrong with it
  }
  return previewPage({ title, description: goal, url: request.url, target });
}
