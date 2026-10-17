// Rasterize public/icons/sigil.svg into the PNG sizes the manifest needs.
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';

const svg = await readFile('public/icons/sigil.svg');

await sharp(svg, { density: 300 }).resize(192, 192).png().toFile('public/icons/icon-192.png');
await sharp(svg, { density: 300 }).resize(512, 512).png().toFile('public/icons/icon-512.png');

// maskable: same art with extra safe-zone padding
const padded = await sharp(svg, { density: 300 }).resize(400, 400).png().toBuffer();
await sharp({
  create: { width: 512, height: 512, channels: 4, background: '#1a1027' },
})
  .composite([{ input: padded, top: 56, left: 56 }])
  .png()
  .toFile('public/icons/icon-512-maskable.png');

console.log('Icons generated.');
