import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import type { MutationCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { getAuthCaller, getAdminCaller } from './lib/auth';

export const getByProduct = query({
  args: { productId: v.id('products') },
  handler: async (ctx, args) => {
    return await ctx.db.query('reviews')
      .withIndex('by_product', (q) => q.eq('productId', args.productId))
      .collect()
      .then((r) => r.filter((rev) => rev.isApproved));
  },
});

export const getStats = query({
  args: { productId: v.id('products') },
  handler: async (ctx, args) => {
    const reviews = await ctx.db.query('reviews')
      .withIndex('by_product', (q) => q.eq('productId', args.productId))
      .collect()
      .then((r) => r.filter((rev) => rev.isApproved));
    if (reviews.length === 0) return { avg: 0, count: 0 };
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    return { avg: Math.round(avg * 10) / 10, count: reviews.length };
  },
});

export const getByProductWithStats = query({
  args: { productId: v.id('products') },
  handler: async (ctx, args) => {
    const reviews = await ctx.db.query('reviews')
      .withIndex('by_product', (q) => q.eq('productId', args.productId))
      .collect()
      .then((r) => r.filter((rev) => rev.isApproved));
    const count = reviews.length;
    const avg = count ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0;
    return { reviews, stats: { avg, count } };
  },
});

async function recomputeRating(ctx: MutationCtx, productId: Id<'products'>) {
  const reviews = (await ctx.db.query('reviews').withIndex('by_product', (q) => q.eq('productId', productId)).collect()).filter((r) => r.isApproved);
  const count = reviews.length;
  const avg = count ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0;
  await ctx.db.patch(productId, { rating: avg, reviewCount: count });
}

export const create = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    productId: v.id('products'),
    authorName: v.string(),
    rating: v.number(),
    text: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.text && args.text.length > 1000) throw new Error('Text too long');
    const id = await ctx.db.insert('reviews', {
      productId: args.productId,
      authorName: args.authorName,
      rating: args.rating,
      text: args.text,
      isApproved: true,
      createdAt: Date.now(),
    });
    await recomputeRating(ctx, args.productId);
    return id;
  },
});

export const listAll = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const caller = await getAuthCaller(ctx, args.sessionToken);
    if (!caller || caller.role !== 'admin') return [];
    return await ctx.db.query('reviews').order('desc').take(200);
  },
});

export const approve = mutation({
  args: { sessionToken: v.string(), id: v.id('reviews'), approved: v.boolean() },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    const review = await ctx.db.get(args.id);
    if (!review) return;
    await ctx.db.patch(args.id, { isApproved: args.approved });
    await recomputeRating(ctx, review.productId);
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), id: v.id('reviews') },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    const review = await ctx.db.get(args.id);
    await ctx.db.delete(args.id);
    if (review) await recomputeRating(ctx, review.productId);
  },
});
