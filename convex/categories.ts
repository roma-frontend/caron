import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { getAdminCaller } from './lib/auth';

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('categories')
      .withIndex('by_active', (q) => q.eq('isActive', true))
      .take(100);
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('categories').order('desc').take(100);
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('categories')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique();
  },
});

export const create = mutation({
  args: {
    sessionToken: v.string(),
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    parentId: v.optional(v.id('categories')),
    order: v.number(),
    isActive: v.boolean(),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    const { sessionToken: _, ...data } = args;
    const catId = await ctx.db.insert('categories', { ...data, createdAt: Date.now() });
    await ctx.db.insert('filterDefinitions', {
      categoryId: catId, name: 'Անվանում', slug: 'type',
      type: 'multiselect', options: [], order: 0,
    });
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
    imageUrl: v.optional(v.string()),
    parentId: v.optional(v.id('categories')),
    order: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    const { id, sessionToken: _, ...patch } = args;
    await ctx.db.patch(id, patch);
  },
});

export const listWithCounts = query({
  args: {},
  handler: async (ctx) => {
    const cats = await ctx.db
      .query('categories')
      .withIndex('by_active', (q) => q.eq('isActive', true))
      .take(100);
    const products = await ctx.db.query('products').collect();
    return cats.map((c) => ({
      ...c,
      count: products.filter((p) => p.categoryId === c._id && p.isActive).length,
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
