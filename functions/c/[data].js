// GET /c/<mode>.<data>: a shared character. The character travels in the link itself;
// this reads only its name, a line about it and its magic for the preview card in other
// apps and stores nothing, then hands the link to the app (#import=...), which shows the
// import preview. With ?portrait it answers with the small portrait the link carries
// (when the player ticked "Portrait in the link"), the card's picture.
import { LINK_DATA, previewPage, readLink, short } from '../../server/preview.js';

const LIMIT = 1024 * 1024; // a link holds one character, a few KB; a hostile one may not inflate past this
const SPHERES = ['Correspondence', 'Entropy', 'Forces', 'Life', 'Matter', 'Mind', 'Prime', 'Spirit', 'Time'];
const PORTRAIT = /^data:(image\/(?:webp|jpeg|png));base64,([A-Za-z0-9+/=]{1,400000})$/;

const text = (v) => (typeof v === 'string' ? v.trim() : '');
const dots = (v) => (Number.isInteger(v) && v > 0 && v <= 10 ? v : 0);

export async function onRequestGet({ params, request }) {
  const data = String(params.data ?? '');
  // anything else is not a link the app made: send it to the characters, carrying nothing
  if (!LINK_DATA.test(data)) return Response.redirect(new URL('/#/characters', request.url).toString(), 302);
  const wantsPortrait = new URL(request.url).searchParams.has('portrait');
  let c = {};
  try {
    c = (await readLink(data, LIMIT))?.characters?.[0] ?? {};
  } catch {
    // a damaged link still goes on; the app explains what is wrong with it
  }
  const portrait = typeof c.portrait === 'string' ? PORTRAIT.exec(c.portrait) : null;

  if (wantsPortrait) {
    if (!portrait) return Response.redirect(new URL('/icons/icon-512.png', request.url).toString(), 302);
    const bytes = Uint8Array.from(atob(portrait[2]), (ch) => ch.charCodeAt(0));
    return new Response(bytes, { headers: { 'Content-Type': portrait[1], 'Cache-Control': 'public, max-age=86400' } });
  }

  const name = text(c.name);
  const who = [text(c.concept), text(c.sect) || text(c.affiliation), text(c.essence) && `${text(c.essence)} Essence`].filter(Boolean).join(', ');
  const spheres = c.spheres && typeof c.spheres === 'object' ? SPHERES.filter((s) => dots(c.spheres[s])).map((s) => `${s} ${c.spheres[s]}`) : [];
  const magic = [dots(c.arete) && `Arete ${c.arete}`, ...spheres].filter(Boolean).join(', ');
  const line = [who, magic].filter(Boolean).join('. ');
  // the picture's address carries the data again: it is in this page, never in the shared link
  const image = portrait ? { url: `${new URL(request.url).origin}/c/${data}?portrait`, size: 128 } : undefined;
  return previewPage({
    title: name ? `Character: ${short(name, 90)}` : 'A character',
    description: line ? short(line) : 'A mage shared from Agathon, a companion for Mage: The Ascension.',
    url: request.url,
    target: `/#import=${data}`,
    image,
  });
}
