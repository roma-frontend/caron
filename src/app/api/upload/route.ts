import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { checkAdminRateLimit } from '@/lib/ratelimit';
import { requireAdminAuth } from '@/lib/adminAuth';
import { optimizeImage } from '@/lib/optimizeImage';

export const runtime = 'nodejs';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']);

function buildImageUrl(key: string): string {
  const base = process.env.R2_PUBLIC_URL?.replace(/\/+$/, '') ?? '';
  const directUrl = `${base}/${key}`;

  try {
    const parsed = new URL(directUrl);
    // Route both the private S3 endpoint and the public r2.dev domain through
    // the same-origin proxy: Vercel optimizes local sources but returns 402 for
    // remote r2.dev images.
    if (parsed.hostname.endsWith('.r2.cloudflarestorage.com') || parsed.hostname.endsWith('.r2.dev')) {
      return `/api/r2-image?url=${encodeURIComponent(directUrl)}`;
    }
  } catch {
    // Keep default fallback below for malformed URLs.
  }

  return directUrl;
}

const R2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET_NAME || !process.env.R2_PUBLIC_URL) {
    console.error('Missing R2 env vars');
    return NextResponse.json({ error: 'R2 not configured on server' }, { status: 500 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1';
  const { allowed } = await checkAdminRateLimit(ip);
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large' }, { status: 400 });
  }

  const key = `products/${crypto.randomUUID()}`;

  try {
    const original = Buffer.from(await file.arrayBuffer());
    const { buffer, contentType } = await optimizeImage(original, file.type, 1600);

    await R2.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }));

    const publicUrl = buildImageUrl(key);

    return NextResponse.json({ publicUrl, key });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('R2 upload error:', msg);
    return NextResponse.json({ error: `R2 error: ${msg}` }, { status: 500 });
  }
}
