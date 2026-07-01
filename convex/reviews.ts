import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import type { MutationCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { getAuthCaller, requireCapability } from './lib/auth';
import { adjustLoyalty } from './lib/loyalty';

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
    // dist[0..4] = count of 1..5 star reviews
    const dist = [0, 0, 0, 0, 0];
    for (const r of reviews) {
      const idx = Math.min(5, Math.max(1, Math.round(r.rating))) - 1;
      dist[idx]++;
    }
    if (reviews.length === 0) return { avg: 0, count: 0, dist };
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    return { avg: Math.round(avg * 10) / 10, count: reviews.length, dist };
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
    photos: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    if (args.text && args.text.length > 1000) throw new Error('Text too long');
    if (!Number.isInteger(args.rating) || args.rating < 1 || args.rating > 5) {
      throw new Error('Invalid rating');
    }
    if (!args.authorName.trim() || args.authorName.length > 100) {
      throw new Error('Invalid author name');
    }
    if (args.photos && args.photos.length > 5) throw new Error('Too many photos');

    // "Verified purchase": the logged-in author has an order containing this product.
    let verified = false;
    const caller = await getAuthCaller(ctx, args.sessionToken);
    if (caller) {
      const orders = await ctx.db
        .query('orders')
        .withIndex('by_user', (q) => q.eq('userId', caller._id))
        .collect();
      verified = orders.some((o) => o.items.some((it) => it.productId === args.productId));
    }

    const id = await ctx.db.insert('reviews', {
      productId: args.productId,
      authorName: args.authorName,
      rating: args.rating,
      text: args.text,
      photos: args.photos && args.photos.length > 0 ? args.photos : undefined,
      verified,
      helpfulCount: 0,
      reviewerUserId: caller?._id,
      reviewerEmail: caller?.email,
      pointsAwarded: false,
      isApproved: false,
      createdAt: Date.now(),
    });
    await recomputeRating(ctx, args.productId);
    return id;
  },
});

export const markHelpful = mutation({
  args: { id: v.id('reviews') },
  handler: async (ctx, args) => {
    const review = await ctx.db.get(args.id);
    if (!review) return;
    await ctx.db.patch(args.id, { helpfulCount: (review.helpfulCount ?? 0) + 1 });
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
    await requireCapability(ctx, args.sessionToken, 'reviews');
    const review = await ctx.db.get(args.id);
    if (!review) return;
    await ctx.db.patch(args.id, { isApproved: args.approved });

    // Reward the reviewer with loyalty points on first approval (WB-style).
    if (args.approved && !review.pointsAwarded && (review.reviewerUserId || review.reviewerEmail)) {
      const settings = await ctx.db.query('settings').first();
      if (settings?.enableLoyalty) {
        const hasPhotos = (review.photos?.length ?? 0) > 0;
        const base = settings.loyaltyReviewPoints ?? 20;
        const bonus = hasPhotos ? (settings.loyaltyReviewPhotoBonus ?? 30) : 0;
        const pts = base + bonus;
        if (pts > 0) {
          await adjustLoyalty(ctx, { userId: review.reviewerUserId, email: review.reviewerEmail ?? '', points: pts });
          await ctx.db.patch(args.id, { pointsAwarded: true });
        }
      }
    }

    await recomputeRating(ctx, review.productId);
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), id: v.id('reviews') },
  handler: async (ctx, args) => {
    await requireCapability(ctx, args.sessionToken, 'reviews');
    const review = await ctx.db.get(args.id);
    await ctx.db.delete(args.id);
    if (review) await recomputeRating(ctx, review.productId);
  },
});
