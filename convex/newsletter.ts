import { v } from 'convex/values';
import { mutation } from './_generated/server';

export const subscribe = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('newsletterSubscribers')
      .withIndex('by_email', (q) => q.eq('email', args.email.toLowerCase().trim()))
      .first();
    if (existing) return { alreadySubscribed: true };
    await ctx.db.insert('newsletterSubscribers', {
      email: args.email.toLowerCase().trim(),
      createdAt: Date.now(),
    });
    return { success: true };
  },
});
