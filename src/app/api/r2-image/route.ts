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

function extractObjectKey(urlStr: string, bucketName: string): string | null {
  try {
    const parsed = new URL(urlStr);
    if (!parsed.hostname.endsWith('.r2.cloudflarestorage.com')) return null;

    let key = parsed.pathname.replace(/^\/+/, '');
    if (!key) return null;

    if (bucketName && (key === bucketName || key.startsWith(`${bucketName}/`))) {
      key = key.slice(bucketName.length).replace(/^\/+/, '');
    }

    if (!key.startsWith('products/')) return null;

    return key || null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !bucket) {
    return NextResponse.json({ error: 'R2 not configured on server' }, { status: 500 });
  }

  const rawUrl = req.nextUrl.searchParams.get('url');
  if (!rawUrl) {
    return NextResponse.json({ error: 'Missing url param' }, { status: 400 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown';
  const { allowed } = await checkRateLimit(`r2-image:${ip}`);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const key = extractObjectKey(rawUrl, bucket);
  if (!key) {
    return NextResponse.json({ error: 'Unsupported or invalid R2 url' }, { status: 400 });
  }

  try {
    const object = await R2.send(new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }));

    if (!object.Body) {
      return NextResponse.json({ error: 'Image body is empty' }, { status: 404 });
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
    return NextResponse.json({ error: msg }, { status: 404 });
  }
}
