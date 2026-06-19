'use node';

import { v } from 'convex/values';
import { internalAction } from './_generated/server';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Node runtime action: deletes objects from Cloudflare R2. Mutations cannot do
// network I/O, so product create/update/delete schedules this action to clean
// up removed images. The AWS SDK handles SigV4 signing & multi-segment keys
// correctly (the previous hand-rolled signer dropped the `products/` prefix).
export const deleteObjects = internalAction({
  args: { keys: v.array(v.string()) },
  handler: async (_ctx, { keys }) => {
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
