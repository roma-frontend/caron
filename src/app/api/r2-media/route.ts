import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { checkRateLimit } from '@/lib/ratelimit';

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

function normalizeR2Key(rawKey: string, bucketName: string): string | null {
  let key = rawKey.replace(/^\/+/, '').trim();
  if (!key) return null;

  if (bucketName && (key === bucketName || key.startsWith(`${bucketName}/`))) {
    key = key.slice(bucketName.length).replace(/^\/+/, '');
  }

  if (!key.startsWith('products/')) return null;
  return key;
}

function extractKeyFromUrl(urlStr: string, bucketName: string): string | null {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();
    if (!host.endsWith('.r2.dev') && !host.endsWith('.r2.cloudflarestorage.com')) return null;
    return normalizeR2Key(parsed.pathname, bucketName);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !bucket) {
    return NextResponse.json({ error: 'R2 not configured on server' }, { status: 500 });
  }

  const keyParam = req.nextUrl.searchParams.get('key');
  const urlParam = req.nextUrl.searchParams.get('url');
  const key = keyParam
    ? normalizeR2Key(keyParam, bucket)
    : (urlParam ? extractKeyFromUrl(urlParam, bucket) : null);

  if (!key) {
    return NextResponse.json({ error: 'Invalid media key' }, { status: 400 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown';
  const { allowed } = await checkRateLimit(`r2-media:${ip}`);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const range = req.headers.get('range') ?? undefined;

  try {
    const object = await R2.send(new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ...(range ? { Range: range } : {}),
    }));

    if (!object.Body) {
      return NextResponse.json({ error: 'Media body is empty' }, { status: 404 });
    }

    const bytes = await object.Body.transformToByteArray();
    const headers = new Headers();
    headers.set('Content-Type', object.ContentType || 'application/octet-stream');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Accept-Ranges', 'bytes');

    if (object.ContentLength !== undefined) headers.set('Content-Length', String(object.ContentLength));
    if (object.ContentRange) headers.set('Content-Range', object.ContentRange);
    if (object.ETag) headers.set('ETag', object.ETag);
    if (object.LastModified) headers.set('Last-Modified', object.LastModified.toUTCString());

    const status = object.ContentRange ? 206 : 200;
    return new NextResponse(Buffer.from(bytes), { status, headers });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown R2 media error';
    const isRangeError = msg.toLowerCase().includes('range');
    return NextResponse.json({ error: msg }, { status: isRangeError ? 416 : 404 });
  }
}
