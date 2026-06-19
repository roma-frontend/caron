'use node';

import { v } from 'convex/values';
import { action, internalAction } from './_generated/server';
import { internal, api } from './_generated/api';
import { S3Client, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

// Node runtime action: deletes objects from Cloudflare R2. Mutations cannot do
// network I/O, so product create/update/delete schedules this action to clean
// up removed images. The AWS SDK handles SigV4 signing & multi-segment keys
// correctly (the previous hand-rolled signer dropped the `products/` prefix).
export const deleteObjects = internalAction({
  args: { keys: v.array(v.string()) },
  handler: async (_ctx, { keys }): Promise<void> => {
    const bucket = process.env.R2_BUCKET_NAME;
    if (!bucket || !process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
      return;
    }
    if (keys.length === 0) return;

    const r2 = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
    });

    await Promise.all(
      keys.map(async (Key) => {
        try {
          await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key }));
        } catch (e) {
          console.error('R2 delete failed for', Key, e instanceof Error ? e.message : e);
        }
      }),
    );
  },
});


// ── Orphan image cleanup ────────────────────────────────────────────────────

function r2KeyFromUrl(imageUrl: string): string | null {
  let s = (imageUrl ?? '').trim();
  if (!s) return null;
  const keyParam = s.match(/[?&]key=([^&]+)/);
  if (keyParam) s = decodeURIComponent(keyParam[1]);
  else {
    const urlParam = s.match(/[?&]url=([^&]+)/);
    if (urlParam) s = decodeURIComponent(urlParam[1]);
  }
  let key: string;
  try {
    const u = new URL(s);
    const host = u.hostname.toLowerCase();
    if (!host.endsWith('.r2.dev') && !host.endsWith('.r2.cloudflarestorage.com')) return null;
    key = decodeURIComponent(u.pathname).replace(/^\/+/, '');
  } catch {
    key = s.replace(/^\/+/, '');
  }
  const bucket = process.env.R2_BUCKET_NAME;
  if (bucket && (key === bucket || key.startsWith(`${bucket}/`))) {
    key = key.slice(bucket.length).replace(/^\/+/, '');
  }
  if (!key.startsWith('products/') && !key.startsWith('reviews/')) return null;
  return key;
}

// Special, non-product assets that live under products/ but aren't referenced
// by any document (hero video, poster, preloader). Never delete these.
function isWhitelisted(key: string): boolean {
  const name = key.replace(/^products\//, '');
  return /^(hero|preloader|poster)/i.test(name) || /poster/i.test(name);
}

/**
 * Find R2 objects under products/ and reviews/ that are not referenced by any
 * document. Dry-run by default (apply=false → only reports). Skips whitelisted
 * special assets and objects newer than minAgeDays (avoid deleting freshly
 * uploaded images that aren't saved to a product yet).
 */
export type AuditResult =
  | { error: string }
  | { applied: true; deleted: number; freedBytes: number; freedMB: number }
  | { applied: false; totalObjects: number; usedKeys: number; orphanCount: number; orphanMB: number; sample: string[] };

export const auditOrphans = internalAction({
  args: { apply: v.optional(v.boolean()), minAgeDays: v.optional(v.number()) },
  handler: async (ctx, args): Promise<AuditResult> => {
    const apply = args.apply ?? false;
    const minAgeDays = args.minAgeDays ?? 7;
    const bucket = process.env.R2_BUCKET_NAME;
    if (!bucket || !process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
      return { error: 'R2 env not configured in Convex' };
    }

    // 1. Collect every referenced key from the DB.
    const refs = await ctx.runQuery(internal.products.imageReferences, {});
    const used = new Set<string>();
    for (const url of refs.urls) {
      const k = r2KeyFromUrl(url);
      if (k) used.add(k);
    }
    // Extract any R2 urls/keys embedded in CMS page HTML.
    const htmlBlob = refs.html.join('\n');
    for (const m of htmlBlob.matchAll(/https?:\/\/[^\s"'<>)]+|[?&](?:key|url)=[^\s"'<>)&]+/gi)) {
      const k = r2KeyFromUrl(m[0]);
      if (k) used.add(k);
    }

    // 2. List all R2 objects under our prefixes.
    const r2 = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
    });

    const objects: { key: string; size: number; lastModified: number }[] = [];
    for (const Prefix of ['products/', 'reviews/']) {
      let token: string | undefined;
      do {
        const res = await r2.send(new ListObjectsV2Command({ Bucket: bucket, Prefix, ContinuationToken: token }));
        for (const o of res.Contents ?? []) {
          if (o.Key) objects.push({ key: o.Key, size: o.Size ?? 0, lastModified: o.LastModified?.getTime() ?? 0 });
        }
        token = res.IsTruncated ? res.NextContinuationToken : undefined;
      } while (token);
    }

    // 3. Diff: orphan = not referenced, not whitelisted, older than cutoff.
    const cutoff = Date.now() - minAgeDays * 86400000;
    const orphans = objects.filter(
      (o) => !used.has(o.key) && !isWhitelisted(o.key) && o.lastModified < cutoff,
    );
    const totalBytes = orphans.reduce((s, o) => s + o.size, 0);

    if (apply) {
      let deleted = 0;
      for (const o of orphans) {
        try {
          await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: o.key }));
          deleted++;
        } catch (e) {
          console.error('delete failed', o.key, e instanceof Error ? e.message : e);
        }
      }
      return { applied: true, deleted, freedBytes: totalBytes, freedMB: +(totalBytes / 1048576).toFixed(1) };
    }

    return {
      applied: false,
      totalObjects: objects.length,
      usedKeys: used.size,
      orphanCount: orphans.length,
      orphanMB: +(totalBytes / 1048576).toFixed(1),
      sample: orphans.slice(0, 40).map((o) => o.key),
    };
  },
});

/**
 * Admin-facing wrapper for the orphan-image cleanup, callable from the settings
 * page. apply=false returns the count to delete (preview); apply=true deletes.
 */
export const cleanupImages = action({
  args: { sessionToken: v.string(), apply: v.optional(v.boolean()) },
  handler: async (ctx, { sessionToken, apply }): Promise<AuditResult> => {
    const me = await ctx.runQuery(api.auth.me, { sessionToken });
    if (!me || me.role !== 'admin') throw new Error('Admin access required');
    return await ctx.runAction(internal.r2Actions.auditOrphans, {
      apply: apply ?? false,
      minAgeDays: 7,
    });
  },
});
