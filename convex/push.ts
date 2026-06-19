import { v } from 'convex/values';
import { mutation, internalQuery, internalMutation } from './_generated/server';
import { getAuthCaller } from './lib/auth';

/** Store (or refresh) a browser push subscription. */
export const subscribe = mutation({
  args: { sessionToken: v.optional(v.string()), endpoint: v.string(), p256dh: v.string(), auth: v.string() },
  handler: async (ctx, args) => {
    const caller = await getAuthCaller(ctx, args.sessionToken);
    const existing = await ctx.db.query('pushSubscriptions').withIndex('by_endpoint', (q) => q.eq('endpoint', args.endpoint)).first();
    if (existing) {
      await ctx.db.patch(existing._id, { p256dh: args.p256dh, auth: args.auth, userId: caller?._id ?? existing.userId });
      return;
    }
    await ctx.db.insert('pushSubscriptions', {
      endpoint: args.endpoint,
      p256dh: args.p256dh,
      auth: args.auth,
      userId: caller?._id,
      createdAt: Date.now(),
    });
  },
});

export const unsubscribe = mutation({
  args: { endpoint: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query('pushSubscriptions').withIndex('by_endpoint', (q) => q.eq('endpoint', args.endpoint)).first();
    if (existing) await ctx.db.delete(existing._id);
  },
});

export const getSubsForUser = internalQuery({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    return await ctx.db.query('pushSubscriptions').withIndex('by_user', (q) => q.eq('userId', args.userId)).collect();
  },
});

export const removeByEndpoint = internalMutation({
  args: { endpoint: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query('pushSubscriptions').withIndex('by_endpoint', (q) => q.eq('endpoint', args.endpoint)).first();
    if (existing) await ctx.db.delete(existing._id);
  },
});
