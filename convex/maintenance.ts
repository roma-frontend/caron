import { v } from 'convex/values';
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

/**
 * Normalize the quantity/packaging suffix in product names (name / nameRu /
 * nameEn), which was entered inconsistently on import. Conservative &
 * non-destructive — only fixes the token, never restructures slashes:
 *   "/10штшт/"      → "/10 шт/"   (typo)
 *   "/10 шт" (bare) → "/10 шт/"   (missing closing slash on a trailing group)
 *   "…10шт…"        → "…10 шт…"   (missing space; RU)
 *   "…10pcs…"       → "…10 pcs…"  (missing space; EN)
 *
 * Run (preview first):
 *   npx convex run maintenance:normalizeQtySuffixes '{"dryRun":true}' --prod
 *   npx convex run maintenance:normalizeQtySuffixes '{"dryRun":false}' --prod
 */
function normalizeQty(s: string | undefined): string | undefined {
  if (!s) return s;
  let out = s;
  // Fix the doubled-"шт" typo (штшт → шт) without touching slash structure.
  out = out.replace(/шт(?:\s*шт)+/gi, 'шт');
  // Ensure a space between the number and the unit (RU / EN).
  out = out.replace(/(\d)\s*шт/gi, '$1 шт');
  out = out.replace(/(\d)\s*(pcs|pc)\b/gi, '$1 pcs');
  // Add a missing closing slash only for a bare trailing "/<n> шт|pcs" group
  // (never restructures qty embedded inside a longer phrase like "/коробка 10шт/").
  out = out.replace(/\/\s*(\d+)\s*(шт|pcs)\s*$/i, '/$1 $2/');
  return out.replace(/[ \t]{2,}/g, ' ').trim();
}

export const normalizeQtySuffixes = internalMutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun !== false; // default to preview
    const products = await ctx.db.query('products').collect();

    const changes: Array<{ id: string; field: string; before: string; after: string }> = [];
    let patched = 0;

    for (const p of products) {
      const patch: Record<string, string> = {};
      for (const field of ['name', 'nameRu', 'nameEn'] as const) {
        const before = p[field] as string | undefined;
        const after = normalizeQty(before);
        if (after !== undefined && before !== undefined && after !== before) {
          patch[field] = after;
          if (changes.length < 60) changes.push({ id: String(p._id), field, before, after });
        }
      }
      if (Object.keys(patch).length > 0) {
        patched++;
        if (!dryRun) await ctx.db.patch(p._id, patch);
      }
    }

    return { dryRun, totalProducts: products.length, productsAffected: patched, sample: changes };
  },
});
