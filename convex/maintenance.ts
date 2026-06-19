import { internalMutation } from './_generated/server';

/**
 * Flip promotions whose end date has passed to inactive, so expired sales stop
 * showing on the storefront without manual admin action.
 */
export const deactivateExpiredPromotions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const active = await ctx.db
      .query('promotions')
      .withIndex('by_active', (q) => q.eq('isActive', true))
      .take(5000);
    let deactivated = 0;
    for (const p of active) {
      if (p.endDate && p.endDate < now) {
        await ctx.db.patch(p._id, { isActive: false });
        deactivated++;
      }
    }
    return { deactivated };
  },
});

/**
 * Housekeeping: delete expired session rows and stale auth-attempt records so
 * those tables stay small and fast. Safe — only removes already-expired data.
 */
export const purgeStaleAuth = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const expiredSessions = (await ctx.db.query('sessions').take(10000)).filter(
      (s) => s.expiresAt < now,
    );
    for (const s of expiredSessions) await ctx.db.delete(s._id);

    const cutoff = now - 30 * 86400000; // 30 days
    const staleAttempts = (await ctx.db.query('authAttempts').take(10000)).filter(
      (a) => (a.updatedAt ?? 0) < cutoff && (!a.lockedUntil || a.lockedUntil < now),
    );
    for (const a of staleAttempts) await ctx.db.delete(a._id);

    return { sessions: expiredSessions.length, authAttempts: staleAttempts.length };
  },
});
