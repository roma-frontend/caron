// Backfill a long browser Cache-Control on EXISTING R2 objects.
//
// Updates metadata ONLY — does a server-side CopyObject onto the same key with
// MetadataDirective=REPLACE, preserving the original ContentType. The image
// bytes are NOT re-encoded. Idempotent: objects that already have the target
// Cache-Control are skipped.
//
// Usage (Node 20.6+, reads creds from .env.local):
//   node --env-file=.env.local scripts/backfill-cache-control.cjs            # dry-run (no writes)
//   node --env-file=.env.local scripts/backfill-cache-control.cjs --apply    # actually write
//
// Requires: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME

const { S3Client, ListObjectsV2Command, HeadObjectCommand, CopyObjectCommand } = require('@aws-sdk/client-s3');

const APPLY = process.argv.includes('--apply');
const CACHE = 'public, max-age=31536000, immutable';
const bucket = process.env.R2_BUCKET_NAME;

for (const k of ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME']) {
  if (!process.env[k]) { console.error(`Missing env ${k}. Run with: node --env-file=.env.local ...`); process.exit(1); }
}

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

(async () => {
  console.log(`${APPLY ? 'APPLY' : 'DRY-RUN'} — bucket "${bucket}", target Cache-Control: ${CACHE}\n`);
  let token;
  let total = 0, updated = 0, skipped = 0, failed = 0;
  do {
    const list = await r2.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token, MaxKeys: 1000 }));
    token = list.IsTruncated ? list.NextContinuationToken : undefined;
    for (const obj of list.Contents ?? []) {
      const key = obj.Key;
      total++;
      try {
        const head = await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        if (head.CacheControl === CACHE) { skipped++; continue; }
        if (!APPLY) { updated++; if (updated <= 20) console.log(`would update: ${key} (${head.ContentType ?? '?'})`); continue; }
        await r2.send(new CopyObjectCommand({
          Bucket: bucket,
          Key: key,
          CopySource: `${bucket}/${key}`,
          MetadataDirective: 'REPLACE',
          ContentType: head.ContentType || 'application/octet-stream',
          CacheControl: CACHE,
        }));
        updated++;
        if (updated % 50 === 0) console.log(`...updated ${updated}`);
      } catch (e) {
        failed++;
        console.warn(`FAIL ${key}: ${e.message}`);
      }
    }
  } while (token);
  console.log(`\nDone: total=${total} ${APPLY ? 'updated' : 'to-update'}=${updated} skipped=${skipped} failed=${failed}${APPLY ? '' : ' (dry-run, nothing written)'}`);
})().catch((e) => { console.error(e); process.exit(1); });
