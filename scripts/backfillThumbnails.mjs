// One-off backfill: generate a ~400px `-thumb` WebP variant for every existing
// product image in R2 (`products/<uuid>` → `products/<uuid>-thumb`), so catalog
// grids can serve small thumbnails for products uploaded before thumbnails
// existed. New uploads already create thumbnails in /api/upload.
//
// Usage:
//   node scripts/backfillThumbnails.mjs           # inspect only (counts)
//   node scripts/backfillThumbnails.mjs --write    # generate + upload
import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

const WRITE = process.argv.includes('--write');
const BUCKET = process.env.R2_BUCKET_NAME;
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  return Buffer.concat(chunks);
}

// 1. List every object under products/
const keys = new Set();
let token;
do {
  const res = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: 'products/', ContinuationToken: token }));
  for (const o of res.Contents ?? []) keys.add(o.Key);
  token = res.IsTruncated ? res.NextContinuationToken : undefined;
} while (token);

const originals = [...keys].filter((k) => !k.endsWith('-thumb') && !k.includes('.'));
const missing = originals.filter((k) => !keys.has(`${k}-thumb`));
console.log(`Objects under products/: ${keys.size} | originals: ${originals.length} | missing thumbnails: ${missing.length}`);

if (!WRITE) {
  console.log('\n(dry run — re-run with --write to generate & upload thumbnails)');
  process.exit(0);
}

let done = 0, skipped = 0, failed = 0;
for (const key of missing) {
  try {
    const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    if ((obj.ContentType || '').includes('gif')) { skipped++; continue; }
    const input = await streamToBuffer(obj.Body);
    const buffer = await sharp(input, { failOn: 'none' })
      .rotate()
      .resize({ width: 400, height: 400, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 72, effort: 4 })
      .toBuffer();
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: `${key}-thumb`,
      Body: buffer,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    }));
    done++;
    if (done % 25 === 0) console.log(`  …${done}/${missing.length}`);
  } catch (e) {
    failed++;
    console.error(`  ✗ ${key}: ${e instanceof Error ? e.message : e}`);
  }
}
console.log(`Done. Generated ${done}, skipped ${skipped} (gif), failed ${failed}.`);
