// One-off: shrink the oversized logo PNGs into small WebP wordmarks.
// The logo renders at ~34px tall (≈135px wide); 480px wide is plenty for 2-3x DPR.
const sharp = require('sharp');
const path = require('node:path');
const fs = require('node:fs');

(async () => {
  const dir = path.join(process.cwd(), 'public', 'logo');
  for (const name of ['caron-light', 'caron-dark']) {
    const src = path.join(dir, `${name}.png`);
    const out = path.join(dir, `${name}.webp`);
    const before = fs.statSync(src).size;
    const info = await sharp(src).resize({ width: 480 }).webp({ quality: 90 }).toFile(out);
    console.log(`${name}: ${before} B (png) -> ${info.size} B (webp) ${info.width}x${info.height}`);
  }
})();
