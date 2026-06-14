import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { getAuthCaller } from './lib/auth';

export const save = mutation({
  args: {
    sessionToken: v.string(),
    cartJson: v.string(),
  },
  handler: async (ctx, args) => {
    const caller = await getAuthCaller(ctx, args.sessionToken);
    if (!caller) return; // silently skip if not authenticated
    await ctx.db.patch(caller._id, { cartJson: args.cartJson });
  },
});

export const get = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const caller = await getAuthCaller(ctx, args.sessionToken);
    if (!caller) return null;
    const user = await ctx.db.get(caller._id);
    return user?.cartJson ?? null;
  },
});
