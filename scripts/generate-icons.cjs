/* Generate all brand icons (favicons, app icons, ICO, OG) from one source mark. */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const PUB = path.join(__dirname, '..', 'public');
const APP = path.join(__dirname, '..', 'src', 'app');

/** Brand mark SVG. `rounded` keeps a squircle (favicons); square = full-bleed (app/maskable). */
function markSVG(size, rounded) {
  const rx = rounded ? 12 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 48 48" fill="none">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="48" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#1A7BD4"/><stop offset="0.55" stop-color="#0066AE"/><stop offset="1" stop-color="#064D86"/>
  </linearGradient></defs>
  <rect width="48" height="48" rx="${rx}" fill="url(#bg)"/>
  <rect width="48" height="24" rx="${rx}" fill="#FFFFFF" opacity="0.06"/>
  <path d="M31.7 33.2 A12 12 0 1 1 31.7 14.8" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" fill="none"/>
  <circle cx="24" cy="24" r="3.1" fill="#FFB020"/>
</svg>`;
}

const png = (size, rounded) => sharp(Buffer.from(markSVG(size, rounded))).png().toBuffer();

/** Build a multi-resolution ICO that embeds PNG frames. */
function icoFromPngs(frames) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(frames.length, 4);
  const entries = [];
  const datas = [];
  let offset = 6 + frames.length * 16;
  for (const { size, buf } of frames) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(buf.length, 8);
    e.writeUInt32LE(offset, 12);
    entries.push(e);
    datas.push(buf);
    offset += buf.length;
  }
  return Buffer.concat([header, ...entries, ...datas]);
}

(async () => {
  const tasks = [
    ['icon-192x192.png', 192, false],
    ['icon-512x512.png', 512, false],
    ['apple-touch-icon.png', 180, false],
    ['favicon-48x48.png', 48, true],
    ['favicon-32x32.png', 32, true],
    ['favicon-16x16.png', 16, true],
  ];
  for (const [name, size, rounded] of tasks) {
    fs.writeFileSync(path.join(PUB, name), await png(size, rounded));
    console.log('wrote public/' + name);
  }

  // OG image (PNG) from the SVG source
  const ogSvg = fs.readFileSync(path.join(PUB, 'og-image.svg'));
  fs.writeFileSync(path.join(PUB, 'og-image.png'), await sharp(ogSvg).resize(1200, 630).png().toBuffer());
  console.log('wrote public/og-image.png');

  // favicon.ico (16/32/48) — written to both public/ and the App Router location
  const frames = [];
  for (const s of [16, 32, 48]) frames.push({ size: s, buf: await png(s, true) });
  const ico = icoFromPngs(frames);
  fs.writeFileSync(path.join(PUB, 'favicon.ico'), ico);
  fs.writeFileSync(path.join(APP, 'favicon.ico'), ico);
  console.log('wrote favicon.ico (public + src/app)');
})().catch((e) => { console.error(e); process.exit(1); });
