import type { MutationCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';

export interface LoyaltyTier { minQty: number; percent: number }

/**
 * Cashback (RANGE model). The applicable percent is the highest tier whose
 * `minQty` ≤ qty; below the first threshold → `basePercent`. The percent only
 * steps up at thresholds and is constant within a range. Points = percent × sum.
 *
 * Example (base 0%, tiers 10→3%, 50→5%):
 *   1–9 → 0% · 10–49 → 3% · 50+ → 5%   (points grow with the order amount)
 */
export function resolveCashback(
  qty: number,
  sum: number,
  tiers: LoyaltyTier[] | undefined,
  basePercent: number,
): { percent: number; points: number } {
  let percent = basePercent;
  let bestMin = -1;
  for (const t of tiers ?? []) {
    if (t.minQty > 0 && qty >= t.minQty && t.minQty > bestMin) {
      bestMin = t.minQty;
      percent = t.percent;
    }
  }
  return { percent, points: Math.round((percent / 100) * sum) };
}

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
