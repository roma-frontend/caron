import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { getAdminCaller } from './lib/auth';

export const getByCategory = query({
  args: { categoryId: v.id('categories') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('filterDefinitions')
      .withIndex('by_category', (q) => q.eq('categoryId', args.categoryId))
      .take(50);
  },
});

export const create = mutation({
  args: {
    sessionToken: v.string(),
    categoryId: v.id('categories'),
    name: v.string(),
    slug: v.string(),
    type: v.union(v.literal('select'), v.literal('multiselect'), v.literal('range'), v.literal('boolean')),
    options: v.optional(v.array(v.string())),
    unit: v.optional(v.string()),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    const { sessionToken: _, ...data } = args;
    return await ctx.db.insert('filterDefinitions', data);
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), id: v.id('filterDefinitions') },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    await ctx.db.delete(args.id);
  },
});

export const update = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id('filterDefinitions'),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    type: v.optional(v.union(v.literal('select'), v.literal('multiselect'), v.literal('range'), v.literal('boolean'))),
    options: v.optional(v.array(v.string())),
    unit: v.optional(v.string()),
    order: v.optional(v.number()),
    categoryId: v.optional(v.id('categories')),
  },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    const { id, sessionToken: _, ...patch } = args;
    await ctx.db.patch(id, patch);
  },
});

export const migrateTesak = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    const cats = await ctx.db.query('categories').collect();
    let added = 0;
    for (const cat of cats) {
      const existing = (await ctx.db.query('filterDefinitions')
        .withIndex('by_category', (q) => q.eq('categoryId', cat._id))
        .take(50)).find((f) => f.slug === 'type');
      if (!existing) {
        await ctx.db.insert('filterDefinitions', {
          categoryId: cat._id, name: 'Տեսակ', slug: 'type',
          type: 'multiselect', options: [], order: 0,
        });
        added++;
      }
    }
    return added > 0 ? `${added} Կատեգորիաների համար ավելացվել է ֆիլտրը Տեսակ` : 'Բոլոր կատեգորիաների համար արդեն կա Տեսակ ֆիլտր';
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('filterDefinitions').order('asc').take(200);
  },
});
