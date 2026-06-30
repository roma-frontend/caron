// One-off: download products/hero-poster.jpg from R2, report its size, and
// (when run with --write) re-encode it as a much smaller, optimized image so it
// stops being a slow LCP element. The hero poster sits *under* dark/blue/vignette
// overlays, so aggressive compression is visually imperceptible.
//
// Usage:
//   node scripts/optimizeHeroPoster.mjs            # inspect only (no upload)
//   node scripts/optimizeHeroPoster.mjs --write    # encode + upload variants
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

const KEY = 'products/hero-poster.jpg';
const WRITE = process.argv.includes('--write');

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
const BUCKET = process.env.R2_BUCKET_NAME;

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  return Buffer.concat(chunks);
}

async function put(key, body, contentType) {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }));
  console.log(`  ↑ uploaded ${key} (${kb(body.length)}, ${contentType})`);
}

const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: KEY }));
const original = await streamToBuffer(obj.Body);
const meta = await sharp(original).metadata();
console.log(`Original ${KEY}: ${kb(original.length)}, ${meta.width}x${meta.height}, ${meta.format}`);

// Resize to a sane hero width and compress hard. The poster is decorative and
// always covered by overlays, so quality can be low without visible artifacts.
const pipeline = (img) => img.resize({ width: 1920, height: 1080, fit: 'cover', withoutEnlargement: true });

const jpg = await pipeline(sharp(original)).jpeg({ quality: 60, mozjpeg: true, progressive: true }).toBuffer();

console.log(`Optimized: jpg ${kb(jpg.length)} (was ${kb(original.length)})`);

if (!WRITE) {
  console.log('\n(dry run — re-run with --write to upload)');
  process.exit(0);
}

// Re-encode in place on the same key, so the existing <img> + preload keep
// working unchanged — just smaller, progressive bytes.
await put(KEY, jpg, 'image/jpeg');
console.log('Done.');
