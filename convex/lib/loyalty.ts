import type { MutationCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';

/**
 * Add (or subtract, when negative) loyalty points for a customer.
 * Resolves the record by userId first, then by email; creates one if missing.
 * Balance never goes negative; `totalEarned` only ever grows.
 */
export async function adjustLoyalty(
  ctx: MutationCtx,
  opts: { userId?: Id<'users'>; email: string; points: number },
): Promise<void> {
  if (opts.points === 0) return;
  let rec = null;
  if (opts.userId) {
    rec = await ctx.db.query('loyaltyPoints').withIndex('by_user', (q) => q.eq('userId', opts.userId)).first();
  }
  if (!rec && opts.email) {
    rec = await ctx.db.query('loyaltyPoints').withIndex('by_email', (q) => q.eq('email', opts.email)).first();
  }
  if (rec) {
    await ctx.db.patch(rec._id, {
      points: Math.max(0, rec.points + opts.points),
      totalEarned: rec.totalEarned + Math.max(0, opts.points),
    });
  } else {
    await ctx.db.insert('loyaltyPoints', {
      userId: opts.userId,
      email: opts.email,
      points: Math.max(0, opts.points),
      totalEarned: Math.max(0, opts.points),
      createdAt: Date.now(),
    });
  }
}
