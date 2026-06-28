import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { internal } from './_generated/api';
import { getAdminCaller } from './lib/auth';
import { normalizeImageUrl } from './lib/imageUrl';

function normalizeCategoryImage<T extends { imageUrl?: string | null }>(category: T): T {
  const normalized = normalizeImageUrl(category.imageUrl);
  if (normalized === category.imageUrl) return category;
  return { ...category, imageUrl: normalized };
}

function normalizeCategoryKey(value: string): string {
  return value.trim().toLowerCase();
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db
      .query('categories')
      .withIndex('by_active', (q) => q.eq('isActive', true))
      .take(100);
    return categories.map(normalizeCategoryImage);
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db.query('categories').order('desc').take(100);
    return categories.map(normalizeCategoryImage);
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const category = await ctx.db
      .query('categories')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .first();
    return category ? normalizeCategoryImage(category) : null;
  },
});

export const create = mutation({
  args: {
    sessionToken: v.string(),
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    nameRu: v.optional(v.string()),
    nameEn: v.optional(v.string()),
    descriptionRu: v.optional(v.string()),
    descriptionEn: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    parentId: v.optional(v.id('categories')),
    order: v.number(),
    isActive: v.boolean(),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    const all = await ctx.db.query('categories').take(500);
    const inputName = normalizeCategoryKey(args.name);
    const inputSlug = normalizeCategoryKey(args.slug);

    if (all.some((c) => normalizeCategoryKey(c.name) === inputName)) {
      throw new Error('Category name must be unique');
    }
    if (all.some((c) => normalizeCategoryKey(c.slug) === inputSlug)) {
      throw new Error('Category slug must be unique');
    }

    const { sessionToken: _, ...data } = args;
    const catId = await ctx.db.insert('categories', { ...data, createdAt: Date.now() });
    await ctx.db.insert('filterDefinitions', {
      categoryId: catId, name: 'Անվանում', slug: 'type',
      type: 'multiselect', options: [], order: 0,
    });
    await ctx.scheduler.runAfter(0, internal.translate.translateCategory, { id: catId });
    return catId;
  },
});

export const update = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id('categories'),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    nameRu: v.optional(v.string()),
    nameEn: v.optional(v.string()),
    descriptionRu: v.optional(v.string()),
    descriptionEn: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    parentId: v.optional(v.id('categories')),
    order: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);

    const current = await ctx.db.get(args.id);
    if (!current) throw new Error('Category not found');

    const nextName = args.name ?? current.name;
    const nextSlug = args.slug ?? current.slug;
    const inputName = normalizeCategoryKey(nextName);
    const inputSlug = normalizeCategoryKey(nextSlug);

    const all = await ctx.db.query('categories').take(500);
    if (all.some((c) => c._id !== args.id && normalizeCategoryKey(c.name) === inputName)) {
      throw new Error('Category name must be unique');
    }
    if (all.some((c) => c._id !== args.id && normalizeCategoryKey(c.slug) === inputSlug)) {
      throw new Error('Category slug must be unique');
    }

    const { id, sessionToken: _, ...patch } = args;
    await ctx.db.patch(id, patch);
    if (args.name !== undefined || args.description !== undefined) {
      await ctx.scheduler.runAfter(0, internal.translate.translateCategory, { id });
    }
  },
});

export const mergeCategories = mutation({
  args: {
    sessionToken: v.string(),
    sourceId: v.id('categories'),
    targetId: v.id('categories'),
  },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);

    if (args.sourceId === args.targetId) {
      throw new Error('Source and target category must be different');
    }

    const source = await ctx.db.get(args.sourceId);
    const target = await ctx.db.get(args.targetId);
    if (!source || !target) throw new Error('Category not found');

    const products = await ctx.db
      .query('products')
      .withIndex('by_category', (q) => q.eq('categoryId', args.sourceId))
      .collect();
    for (const product of products) {
      await ctx.db.patch(product._id, { categoryId: args.targetId, updatedAt: Date.now() });
    }

    const definitions = await ctx.db
      .query('filterDefinitions')
      .withIndex('by_category', (q) => q.eq('categoryId', args.sourceId))
      .collect();
    for (const definition of definitions) {
      await ctx.db.patch(definition._id, { categoryId: args.targetId });
    }

    const promotions = await ctx.db.query('promotions').collect();
    for (const promo of promotions) {
      if (!promo.categoryIds || promo.categoryIds.length === 0) continue;
      if (!promo.categoryIds.includes(args.sourceId)) continue;

      const updated = Array.from(new Set(promo.categoryIds.map((id) => (id === args.sourceId ? args.targetId : id))));
      await ctx.db.patch(promo._id, { categoryIds: updated });
    }

    const mergedSlug = `${source.slug}-merged-${Date.now()}`;
    await ctx.db.patch(args.sourceId, {
      isActive: false,
      slug: mergedSlug,
      name: `${source.name} (merged)`,
    });

    return {
      movedProducts: products.length,
      movedFilterDefinitions: definitions.length,
      sourceId: args.sourceId,
      targetId: args.targetId,
    };
  },
});

export const listWithCounts = query({
  args: {},
  handler: async (ctx) => {
    const cats = await ctx.db
      .query('categories')
      .withIndex('by_active', (q) => q.eq('isActive', true))
      .take(100);

    // Fast path: read precomputed per-category counts from the singleton, so we
    // don't scan the whole products table on every category/nav render.
    const stats = await ctx.db
      .query('catalogStats')
      .withIndex('by_key', (q) => q.eq('key', 'singleton'))
      .unique();
    if (stats && stats.categoryCounts) {
      const counts = stats.categoryCounts as Record<string, number>;
      return cats.map((c) => ({
        ...normalizeCategoryImage(c),
        count: counts[c._id as string] ?? 0,
      }));
    }

    // Fallback (stats not yet computed): live count from active products.
    const products = await ctx.db
      .query('products')
      .withIndex('by_active', (q) => q.eq('isActive', true))
      .take(100000);
    return cats.map((c) => ({
      ...normalizeCategoryImage(c),
      count: products.filter((p) => p.categoryId === c._id).length,
    }));
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), id: v.id('categories') },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    await ctx.db.delete(args.id);
  },
});
