import { query } from './_generated/server';
import { v } from 'convex/values';
import { getAuthCaller } from './lib/auth';

/**
 * Current loyalty balance for the logged-in customer.
 * Resolves the record by userId first, then by email (covers points earned
 * as a guest before registering with the same email).
 */
export const getBalance = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const caller = await getAuthCaller(ctx, args.sessionToken);
    if (!caller) return { points: 0, totalEarned: 0 };

    let rec = await ctx.db
      .query('loyaltyPoints')
      .withIndex('by_user', (q) => q.eq('userId', caller._id))
      .first();

    if (!rec) {
      rec = await ctx.db
        .query('loyaltyPoints')
        .withIndex('by_email', (q) => q.eq('email', caller.email))
        .first();
    }

    return { points: rec?.points ?? 0, totalEarned: rec?.totalEarned ?? 0 };
  },
});
