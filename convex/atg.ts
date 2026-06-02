import { v } from 'convex/values';
import { query, mutation } from './_generated/server';

export const list = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const all = await ctx.db.query('atgCodes').order('asc').take(2000);
    if (!args.search) return all.slice(0, 50);
    const q = args.search.toLowerCase();
    return all.filter((c) => c.code.includes(q) || c.name.toLowerCase().includes(q)).slice(0, 50);
  },
});

export const seed = mutation({
  args: { codes: v.array(v.object({ code: v.string(), name: v.string() })) },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query('atgCodes').take(1);
    if (existing.length > 0) return 'Already seeded';
    for (const c of args.codes) {
      await ctx.db.insert('atgCodes', { code: c.code, name: c.name });
    }
    return `Seeded ${args.codes.length} ATG codes`;
  },
});
