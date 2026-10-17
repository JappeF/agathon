// Generate public/icons/sigil.svg: a sparking golden portal ring on dark violet with a
// dark violet heart. Sparks come from a seeded PRNG so the icon is reproducible.
// Run `npm run icons` afterwards for the PNG sizes.
import { writeFile } from 'node:fs/promises';

const S = 512;
const C = S / 2;
const R = 150; // ring radius

// mulberry32: tiny deterministic PRNG
let seed = 20261017;
const rand = () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const lerp = (a, b, t) => a + (b - a) * t;
const hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
// spark colour: white-gold when hot (near the ring), deep orange as it flies off
const sparkColor = (heat) => hex(255, lerp(110, 226, heat), lerp(10, 150, heat * heat));

const sparks = [];
const line = (x0, y0, dx, dy, len, heat, w) =>
  sparks.push(
    `<line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${(x0 + dx * len).toFixed(1)}" y2="${(y0 + dy * len).toFixed(1)}" stroke="${sparkColor(heat)}" stroke-width="${w.toFixed(2)}" stroke-opacity="${Math.max(0.2, lerp(0.45, 1, heat)).toFixed(2)}" stroke-linecap="round"/>`,
  );

// flying sparks, thrown off counterclockwise, with more of them spraying off the lower right
for (let i = 0; i < 420; i++) {
  let a = rand() * Math.PI * 2;
  if (rand() < 0.5) a = lerp(-0.4, 2.0, rand());
  const start = R + lerp(-3, 6, rand());
  const travel = Math.pow(rand(), 2.2) * 130; // most stay close, a few fly far
  const out = lerp(0.2, 0.85, rand());
  // counterclockwise tangent on screen (y down) is (sin a, -cos a)
  const dx = Math.sin(a) * (1 - out) + Math.cos(a) * out;
  const dy = -Math.cos(a) * (1 - out) + Math.sin(a) * out;
  const heat = Math.max(0, 1 - travel / 110);
  line(
    C + Math.cos(a) * start + dx * travel,
    C + Math.sin(a) * start + dy * travel,
    dx,
    dy,
    lerp(2, 16, rand()) * lerp(0.5, 1, heat),
    heat,
    lerp(1.4, 3.4, rand()) * lerp(0.6, 1, heat),
  );
}
// the crackle on the ring itself: short hot flecks crossing the edge
for (let i = 0; i < 260; i++) {
  const a = rand() * Math.PI * 2;
  const r = R + lerp(-9, 11, rand());
  const out = lerp(-0.3, 0.6, rand());
  const dx = Math.sin(a) * (1 - Math.abs(out)) + Math.cos(a) * out;
  const dy = -Math.cos(a) * (1 - Math.abs(out)) + Math.sin(a) * out;
  line(C + Math.cos(a) * r, C + Math.sin(a) * r, dx, dy, lerp(2, 7, rand()), lerp(0.7, 1, rand()), lerp(1.2, 2.6, rand()));
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}">
<defs>
<radialGradient id="bg" cx="50%" cy="50%" r="70%">
<stop offset="0" stop-color="#25153a"/>
<stop offset="1" stop-color="#120a1d"/>
</radialGradient>
<radialGradient id="heart" cx="50%" cy="50%" r="50%">
<stop offset="0" stop-color="#3a2468"/>
<stop offset="0.6" stop-color="#26163f"/>
<stop offset="1" stop-color="#170d28"/>
</radialGradient>
<filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="14"/></filter>
<filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3"/></filter>
<filter id="spark" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="0.6"/></filter>
</defs>
<rect width="${S}" height="${S}" rx="112" fill="url(#bg)"/>
<circle cx="${C}" cy="${C}" r="${R - 6}" fill="url(#heart)"/>
<circle cx="${C}" cy="${C}" r="${R}" fill="none" stroke="#ff7a12" stroke-width="44" opacity="0.55" filter="url(#glow)"/>
<circle cx="${C}" cy="${C}" r="${R}" fill="none" stroke="#ffb340" stroke-width="16" opacity="0.9" filter="url(#soft)"/>
<circle cx="${C}" cy="${C}" r="${R}" fill="none" stroke="#ffe7a3" stroke-width="7"/>
<circle cx="${C}" cy="${C}" r="${R}" fill="none" stroke="#fffaf0" stroke-width="2.5"/>
<g filter="url(#spark)">
${sparks.join('\n')}
</g>
</svg>
`;

await writeFile('public/icons/sigil.svg', svg);
console.log(`public/icons/sigil.svg written (${sparks.length} sparks)`);
