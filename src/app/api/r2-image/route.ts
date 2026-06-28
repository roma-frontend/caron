import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

export const runtime = 'nodejs';

const R2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

function extractObjectKey(urlStr: string, bucketName: string): string | null {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();
    // Accept both the private S3 endpoint and the public r2.dev bucket domain.
    if (!host.endsWith('.r2.cloudflarestorage.com') && !host.endsWith('.r2.dev')) return null;

    let key = parsed.pathname.replace(/^\/+/, '');
    if (!key) return null;

    if (bucketName && (key === bucketName || key.startsWith(`${bucketName}/`))) {
      key = key.slice(bucketName.length).replace(/^\/+/, '');
    }

    if (!key.startsWith('products/') && !key.startsWith('reviews/')) return null;

    return key || null;
  } catch {
    return null;
  }
}

// Error responses must never be cached — otherwise a transient failure (e.g.
// a 402/404 during a misconfiguration window) sticks in the browser/CDN and
// the image stays "broken" long after the underlying issue is fixed.
function imageError(error: string, status: number): NextResponse {
  return NextResponse.json(
    { error },
    { status, headers: { 'Cache-Control': 'no-store, max-age=0' } },
  );
}

export async function GET(req: NextRequest) {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !bucket) {
    return imageError('R2 not configured on server', 500);
  }

  const rawUrl = req.nextUrl.searchParams.get('url');
  if (!rawUrl) {
    return imageError('Missing url param', 400);
  }

  // No rate limiting here: this route serves public, immutable, CDN-cacheable
  // images and only ever returns whitelisted R2 keys (products/ and reviews/).
  // A single page legitimately loads dozens of images, so the generic public
  // limiter (5/60s) would (and did) throttle normal browsing → 429 / broken
  // images, especially now that images bypass Next's optimizer and hit this
  // route directly. The CDN absorbs repeat loads via the immutable cache below.

  const key = extractObjectKey(rawUrl, bucket);
  if (!key) {
    return imageError('Unsupported or invalid R2 url', 400);
  }

  try {
    const object = await R2.send(new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }));

    if (!object.Body) {
      return imageError('Image body is empty', 404);
    }

    const bytes = await object.Body.transformToByteArray();
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        'Content-Type': object.ContentType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown R2 error';
    return imageError(msg, 404);
  }
}
