import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { checkRateLimit } from '@/lib/ratelimit';
import { optimizeImage } from '@/lib/optimizeImage';

export const runtime = 'nodejs';

/**
 * Public, rate-limited upload endpoint for customer review photos.
 *
 * Unlike /api/upload (admin-only, products/ prefix), this route is open to
 * anonymous shoppers so they can attach photos to reviews. It is therefore
 * intentionally stricter: IP rate-limited, a smaller size cap, image-only MIME
 * allowlist, and a separate reviews/ key prefix.
 */
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

function buildImageUrl(key: string): string {
  const base = process.env.R2_PUBLIC_URL?.replace(/\/+$/, '') ?? '';
  const directUrl = `${base}/${key}`;
  try {
    const parsed = new URL(directUrl);
    if (parsed.hostname.endsWith('.r2.cloudflarestorage.com')) {
      return `/api/r2-image?url=${encodeURIComponent(directUrl)}`;
    }
  } catch {
    // fall through to direct URL
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
  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET_NAME || !process.env.R2_PUBLIC_URL) {
    console.error('Missing R2 env vars');
    return NextResponse.json({ error: 'R2 not configured on server' }, { status: 500 });
  }

  // Rate limit per IP, in a bucket separate from the admin upload route.
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1';
  const { allowed } = await checkRateLimit(`review-upload:${ip}`);
  if (!allowed) return NextResponse.json({ error: 'Չափից շատ հարցումներ։ Փորձեք մի փոքր ուշ' }, { status: 429 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
  }

  const key = `reviews/${crypto.randomUUID()}`;

  try {
    const original = Buffer.from(await file.arrayBuffer());
    const { buffer, contentType } = await optimizeImage(original, file.type, 1280);
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
    console.error('R2 review upload error:', msg);
    return NextResponse.json({ error: `R2 error: ${msg}` }, { status: 500 });
  }
}
