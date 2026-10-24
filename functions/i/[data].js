// GET /i/<mode>.<data>: a shared spell idea. The idea travels in the link itself (as
// with character links); this reads only its title and goal for the preview card in
// other apps and stores nothing, then hands the link to the app (#import-spell=...),
// which shows the import preview.
import { LINK_DATA, previewPage, readLink, short } from '../../server/preview.js';

const LIMIT = 256 * 1024; // a spell idea is a few KB; a hostile link may not inflate past this

export async function onRequestGet({ params, request }) {
  const data = String(params.data ?? '');
  // anything else is not a link the app made: send it to the spell ideas, carrying nothing
  if (!LINK_DATA.test(data)) return Response.redirect(new URL('/#/spells', request.url).toString(), 302);
  const target = `/#import-spell=${data}`;
  let title = 'A spell idea';
  let goal = 'A spell idea shared from Agathon, a companion for Mage: The Ascension.';
  try {
    const spell = (await readLink(data, LIMIT))?.spell ?? {};
    if (typeof spell.title === 'string' && spell.title.trim()) title = `Spell idea: ${short(spell.title, 90)}`;
    if (typeof spell.goal === 'string' && spell.goal.trim()) goal = short(spell.goal);
  } catch {
    // a damaged link still goes on; the app explains what is wrong with it
  }
  return previewPage({ title, description: goal, url: request.url, target });
}
