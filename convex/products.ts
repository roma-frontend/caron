import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { paginationOptsValidator } from 'convex/server';
import { getAuthCaller, requireAdmin } from './lib/auth';

export const listPaginated = query({
  args: {
    categoryId: v.optional(v.id('categories')),
    search: v.optional(v.string()),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    inStockOnly: v.optional(v.boolean()),
    sort: v.optional(v.union(v.literal('newest'), v.literal('priceAsc'), v.literal('priceDesc'), v.literal('popular'))),
    attributes: v.optional(v.any()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const hasFilters = !!(args.minPrice || args.maxPrice || args.inStockOnly || args.attributes);
    const paginationOpts = hasFilters
      ? { ...args.paginationOpts, numItems: Math.max(args.paginationOpts.numItems ?? 20, 200) }
      : args.paginationOpts;
    let result;

    if (args.search) {
      result = await ctx.db
        .query('products')
        .withSearchIndex('search_products', (q) => {
          let s = q.search('name', args.search!);
          if (args.categoryId) s = s.eq('categoryId', args.categoryId);
          return s.eq('isActive', true);
        })
        .paginate(paginationOpts);
    } else if (args.categoryId) {
      result = await ctx.db
        .query('products')
        .withIndex('by_category', (q) => q.eq('categoryId', args.categoryId!))
        .paginate(paginationOpts);
    } else {
      result = await ctx.db
        .query('products')
        .withIndex('by_active', (q) => q.eq('isActive', true))
        .paginate(paginationOpts);
    }

    // Post-filter
    let filtered = result.page.filter((p) => p.isActive);
    if (args.minPrice) filtered = filtered.filter((p) => p.price >= args.minPrice!);
    if (args.maxPrice) filtered = filtered.filter((p) => p.price <= args.maxPrice!);
    if (args.inStockOnly) filtered = filtered.filter((p) => p.stock > 0);

    // Attribute filtering
    if (args.attributes && typeof args.attributes === 'object') {
      const attrs = args.attributes as Record<string, unknown>;
      filtered = filtered.filter((p) => {
        if (!p.attributes) return false;
        const pa = p.attributes as Record<string, unknown>;
        for (const [key, val] of Object.entries(attrs)) {
          if (val === null || val === undefined || val === '') continue;
          if (Array.isArray(val)) {
            if (val.length === 0) continue;
            const pVal = pa[key];
            if (Array.isArray(pVal)) {
              if (!val.some((v) => pVal.includes(v))) return false;
            } else {
              if (!val.includes(pVal as string)) return false;
            }
          } else if (typeof val === 'boolean') {
            if (pa[key] !== val) return false;
          } else {
            if (pa[key] !== val) return false;
          }
        }
        return true;
      });
    }

    // Sort
    if (args.sort === 'priceAsc') filtered.sort((a, b) => a.price - b.price);
    else if (args.sort === 'priceDesc') filtered.sort((a, b) => b.price - a.price);
    else if (args.sort === 'newest') filtered.sort((a, b) => b.createdAt - a.createdAt);
    else if (args.sort === 'popular') filtered.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));

    return { ...result, page: filtered };
  },
});

export const list = query({
  args: {
    categoryId: v.optional(v.id('categories')),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (args.search) {
      let results = await ctx.db
        .query('products')
        .withSearchIndex('search_products', (q) => {
          let search = q.search('name', args.search!);
          if (args.categoryId) search = search.eq('categoryId', args.categoryId);
          return search.eq('isActive', true);
        })
        .take(args.limit ?? 100);
      if (args.minPrice) results = results.filter((p) => p.price >= args.minPrice!);
      if (args.maxPrice) results = results.filter((p) => p.price <= args.maxPrice!);
      return results;
    }
    let products;
    if (args.categoryId) {
      products = await ctx.db.query('products').withIndex('by_category', (q) => q.eq('categoryId', args.categoryId!)).take(args.limit ?? 100);
      products = products.filter((p) => p.isActive);
    } else {
      products = await ctx.db.query('products').withIndex('by_active', (q) => q.eq('isActive', true)).take(args.limit ?? 100);
    }
    if (args.minPrice) products = products.filter((p) => p.price >= args.minPrice!);
    if (args.maxPrice) products = products.filter((p) => p.price <= args.maxPrice!);
    return products;
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query('products').withIndex('by_slug', (q) => q.eq('slug', args.slug)).unique();
  },
});

export const getFeatured = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('products').withIndex('by_featured', (q) => q.eq('isFeatured', true)).take(12);
  },
});

export const create = mutation({
  args: {
    name: v.string(), slug: v.string(), description: v.string(), price: v.number(),
    compareAtPrice: v.optional(v.number()), categoryId: v.id('categories'),
    images: v.array(v.string()), sku: v.optional(v.string()), stock: v.number(),
    isActive: v.boolean(), isFeatured: v.optional(v.boolean()),
    attributes: v.optional(v.any()),
    seoTitle: v.optional(v.string()), seoDescription: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert('products', { ...args, createdAt: now, updatedAt: now });
  },
});

export const update = mutation({
  args: {
    id: v.id('products'), name: v.optional(v.string()), slug: v.optional(v.string()),
    description: v.optional(v.string()), price: v.optional(v.number()),
    compareAtPrice: v.optional(v.number()), categoryId: v.optional(v.id('categories')),
    images: v.optional(v.array(v.string())), sku: v.optional(v.string()),
    stock: v.optional(v.number()), isActive: v.optional(v.boolean()),
    isFeatured: v.optional(v.boolean()), attributes: v.optional(v.any()),
    seoTitle: v.optional(v.string()), seoDescription: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...patch } = args;
    await ctx.db.patch(id, { ...patch, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id('products') },
  handler: async (ctx, args) => { await ctx.db.delete(args.id); },
});
