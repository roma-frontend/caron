'use node';

import webpush from 'web-push';
import { v } from 'convex/values';
import { internalAction } from './_generated/server';
import { internal } from './_generated/api';

/**
 * Send a web-push notification to all of a user's subscribed devices.
 * Requires VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY (set via `npx convex env set`).
 * Dead subscriptions (404/410) are pruned automatically.
 */
export const sendToUser = internalAction({
  args: {
    userId: v.id('users'),
    title: v.string(),
    body: v.string(),
    url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (process.env.NOTIFICATIONS_DISABLED === '1') return;
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || 'mailto:admin@caron.group';
    if (!publicKey || !privateKey) return; // not configured — silently skip

    webpush.setVapidDetails(subject, publicKey, privateKey);

    const subs = await ctx.runQuery(internal.push.getSubsForUser, { userId: args.userId });
    const payload = JSON.stringify({ title: args.title, body: args.body, url: args.url ?? '/' });

    await Promise.all(subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
      } catch (e: unknown) {
        const code = (e as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) {
          await ctx.runMutation(internal.push.removeByEndpoint, { endpoint: s.endpoint });
        }
      }
    }));
  },
});
