import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { cookies } from 'next/headers';
import { ConvexHttpClient } from 'convex/browser';
import { requireAdminAuth } from '@/lib/adminAuth';
import { optimizeImage } from '@/lib/optimizeImage';
import { api } from '../../../../../convex/_generated/api';
import type { Id } from '../../../../../convex/_generated/dataModel';

export const runtime = 'nodejs';
export const maxDuration = 60;

const BATCH = 4; // products processed per request

function r2KeyFromUrl(imageUrl: string, bucket: string): string | null {
  let s = (imageUrl ?? '').trim();
  if (!s) return null;
  const m = s.match(/[?&](?:key|url)=([^&]+)/);
  if (m) s = decodeURIComponent(m[1]);
  let key: string;
  try {
    const u = new URL(s);
    if (!u.hostname.toLowerCase().endsWith('.r2.dev') && !u.hostname.toLowerCase().endsWith('.r2.cloudflarestorage.com')) return null;
    key = decodeURIComponent(u.pathname).replace(/^\/+/, '');
  } catch {
    key = s.replace(/^\/+/, '');
  }
  if (bucket && (key === bucket || key.startsWith(`${bucket}/`))) key = key.slice(bucket.length).replace(/^\/+/, '');
  return key.startsWith('products/') ? key : null;
}

function publicUrl(key: string): string {
  const base = process.env.R2_PUBLIC_URL?.replace(/\/+$/, '') ?? '';
  return `${base}/${key}`;
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const bucket = process.env.R2_BUCKET_NAME;
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!bucket || !process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !convexUrl) {
    return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  }

  const { cursor = 0 } = (await req.json().catch(() => ({}))) as { cursor?: number };
  const token = (await cookies()).get('auth-token')?.value ?? '';

  const client = new ConvexHttpClient(convexUrl);
  const products = (await client.query(api.products.listAll)) as Array<{ _id: string; images?: string[] }>;
  const batch = products.slice(cursor, cursor + BATCH);

  const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
    forcePathStyle: true,
  });

  let converted = 0;
  for (const p of batch) {
    const images = p.images ?? [];
    const next = [...images];
    let changed = false;
    for (let i = 0; i < images.length; i++) {
      const key = r2KeyFromUrl(images[i], bucket);
      if (!key) continue;
      try {
        const obj = await r2.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        if (obj.ContentType === 'image/webp') continue; // already optimized
        if (!obj.Body) continue;
        const original = Buffer.from(await obj.Body.transformToByteArray());
        const { buffer, contentType } = await optimizeImage(original, obj.ContentType ?? 'image/jpeg', 1600);
        if (contentType !== 'image/webp') continue; // gif/failed → leave as is
        const newKey = `products/${crypto.randomUUID()}`;
        await r2.send(new PutObjectCommand({
          Bucket: bucket, Key: newKey, Body: buffer, ContentType: contentType,
          CacheControl: 'public, max-age=31536000, immutable',
        }));
        next[i] = publicUrl(newKey);
        changed = true;
        converted++;
      } catch {
        // skip this image on any error
      }
    }
    if (changed) {
      // update() replaces images and auto-deletes the now-unreferenced old keys
      await client.mutation(api.products.update, { sessionToken: token, id: p._id as Id<'products'>, images: next.filter(Boolean) });
    }
  }

  const processed = cursor + batch.length;
  return NextResponse.json({ processed, total: products.length, converted, done: processed >= products.length });
}
