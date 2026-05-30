import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { getAdminCaller } from './lib/auth';

export const subscribe = mutation({
  args: { productId: v.id('products'), contact: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query('backInStock').withIndex('by_product', (q) => q.eq('productId', args.productId)).collect();
    if (existing.some((r) => r.contact === args.contact && !r.notified)) return null;
    return await ctx.db.insert('backInStock', { productId: args.productId, contact: args.contact, notified: false, createdAt: Date.now() });
  },
});

export const list = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    return await ctx.db.query('backInStock').order('desc').take(200);
  },
});

export const markNotified = mutation({
  args: { sessionToken: v.string(), id: v.id('backInStock') },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    await ctx.db.patch(args.id, { notified: true });
  },
});
