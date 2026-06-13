import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { getAdminCaller } from './lib/auth';
import { api } from './_generated/api';
import { normalizeImageUrl, normalizeImageUrls } from './lib/imageUrl';

function normalizePromotionImages<T extends { imageUrl?: string | null; images?: string[] }>(promotion: T): T {
  const imageUrl = normalizeImageUrl(promotion.imageUrl);
  const images = normalizeImageUrls(promotion.images) as string[] | undefined;
  const changed = imageUrl !== promotion.imageUrl || (images && promotion.images && images.some((img, i) => img !== promotion.images![i]));
  return changed ? { ...promotion, imageUrl, images } : promotion;
}

function normalizeProductImages<T extends { images?: string[] }>(product: T): T {
  if (!product.images || product.images.length === 0) return product;
  const images = normalizeImageUrls(product.images) as string[];
  const changed = images.some((img, i) => img !== product.images![i]);
  return changed ? { ...product, images } : product;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const promotions = await ctx.db.query('promotions').order('desc').take(50);
    return promotions.map(normalizePromotionImages);
  },
});

export const active = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const all = await ctx.db.query('promotions').withIndex('by_active', (q) => q.eq('isActive', true)).take(50);
    return all.filter((p) => p.startDate <= now && p.endDate >= now).map(normalizePromotionImages);
  },
});

export const getPromoProducts = query({
  args: {},
  handler: async (ctx) => {
    const inactiveCats = await ctx.db
      .query('categories')
      .withIndex('by_active', (q) => q.eq('isActive', false))
      .take(200);
    const inactiveCatIds = new Set(inactiveCats.map((c) => c._id));

    const all = await ctx.db.query('products').collect();
    return all
      .filter((p) =>
        p.isActive &&
        p.stock > 0 &&
        !inactiveCatIds.has(p.categoryId) &&
        (
          (p.showInPromotions && p.compareAtPrice && p.compareAtPrice > p.price) ||
          (p.retailDiscount != null && p.retailDiscount > 0)
        ),
      )
      .slice(0, 50)
      .map(normalizeProductImages);
  },
});

export const create = mutation({
  args: {
    sessionToken: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    discountPercent: v.optional(v.number()),
    discountAmount: v.optional(v.number()),
    startDate: v.number(),
    endDate: v.number(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    const { sessionToken, ...data } = args;
    if (data.images && data.images.length > 0) {
      data.imageUrl = data.images[0];
    }
    return await ctx.db.insert('promotions', { ...data, createdAt: Date.now() });
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), id: v.id('promotions') },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    await ctx.db.delete(args.id);
  },
});

export const update = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id('promotions'),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    discountPercent: v.optional(v.number()),
    productIds: v.optional(v.array(v.id('products'))),
    categoryIds: v.optional(v.array(v.id('categories'))),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    const { id, sessionToken, productIds, images, ...rest } = args;

    const old = await ctx.db.get(id);
    const oldIds = old?.productIds ?? [];
    const newIds = productIds ?? oldIds;

    const added = newIds.filter((id) => !oldIds.includes(id));
    if (added.length > 0) {
      await ctx.scheduler.runAfter(0, api.promotionSubscribers.notifySubscribers, {
        promotionId: id,
        promotionTitle: old?.title ?? '',
        newProductIds: added,
      });
    }

    const patch: Record<string, unknown> = { ...rest };
    if (productIds !== undefined) patch.productIds = productIds;
    if (images !== undefined) {
      patch.images = images;
      patch.imageUrl = images.length > 0 ? images[0] : undefined;
    }
    await ctx.db.patch(id, patch);
  },
});
