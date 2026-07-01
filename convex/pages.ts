import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { internal } from './_generated/api';
import { requireCapability } from './lib/auth';

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('pages').collect();
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db.query('pages').withIndex('by_slug', (q) => q.eq('slug', slug)).first();
  },
});

export const save = mutation({
  args: {
    sessionToken: v.string(),
    id: v.optional(v.id('pages')),
    title: v.string(),
    slug: v.string(),
    content: v.string(),
    isPublished: v.boolean(),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireCapability(ctx, args.sessionToken, 'pages');
    const { sessionToken: _, id, ...data } = args;
    const now = Date.now();
    if (id) {
      await ctx.db.patch(id, { ...data, updatedAt: now });
      // Re-translate after edits (content/title may have changed).
      await ctx.scheduler.runAfter(0, internal.translate.translatePage, { id, force: true });
      return id;
    }
    const newId = await ctx.db.insert('pages', { ...data, createdAt: now, updatedAt: now });
    await ctx.scheduler.runAfter(0, internal.translate.translatePage, { id: newId });
    return newId;
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), id: v.id('pages') },
  handler: async (ctx, args) => {
    await requireCapability(ctx, args.sessionToken, 'pages');
    await ctx.db.delete(args.id);
  },
});
