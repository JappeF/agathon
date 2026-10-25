// Rasterize public/icons/sigil.svg into the PNG sizes the manifest needs.
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';

const svg = await readFile('public/icons/sigil.svg');

await sharp(svg, { density: 300 }).resize(192, 192).png().toFile('public/icons/icon-192.png');
await sharp(svg, { density: 300 }).resize(512, 512).png().toFile('public/icons/icon-512.png');

// maskable: same art with extra safe-zone padding
const padded = await sharp(svg, { density: 300 }).resize(400, 400).png().toBuffer();
await sharp({
  create: { width: 512, height: 512, channels: 4, background: '#120a1d' },
})
  .composite([{ input: padded, top: 56, left: 56 }])
  .png()
  .toFile('public/icons/icon-512-maskable.png');

// for link previews and the home screen: chat apps and iOS round the corners themselves and
// fill transparent ones with white, so these are full squares, flattened on the page colour
const square = Buffer.from(svg.toString().replace(' rx="112"', ''));
if (square.equals(svg)) throw new Error('sigil.svg: the rounded background rect was not found');
const flat = (size, file) => sharp(square, { density: 300 }).resize(size, size).flatten({ background: '#120a1d' }).png().toFile(`public/icons/${file}`);
await flat(512, 'share-512.png');
await flat(180, 'apple-touch-icon.png');

console.log('Icons generated.');
