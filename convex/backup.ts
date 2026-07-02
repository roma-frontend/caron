import { v } from 'convex/values';
import { mutation } from './_generated/server';
import { getSuperAdminCaller, logAudit } from './lib/auth';

const CAP = 20000;

/**
 * In-panel data snapshot (superadmin only). Reads the key business tables into
 * a single JSON object for download. Secrets are stripped from user records
 * (password hashes, 2FA secrets/recovery codes, session tokens) so the export
 * is safe to store. This is a point-in-time export for backup/inspection — it
 * is NOT a restore mechanism (use `npx convex import` for that).
 */
export const exportSnapshot = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const caller = await getSuperAdminCaller(ctx, args.sessionToken);

    const [
      products, categories, brands, filterDefinitions, orders, usersRaw, settings,
      promotions, coupons, pages, reviews, productQuestions, returnRequests,
    ] = await Promise.all([
      ctx.db.query('products').take(CAP),
      ctx.db.query('categories').take(CAP),
      ctx.db.query('brands').take(CAP),
      ctx.db.query('filterDefinitions').take(CAP),
      ctx.db.query('orders').take(CAP),
      ctx.db.query('users').take(CAP),
      ctx.db.query('settings').take(10),
      ctx.db.query('promotions').take(CAP),
      ctx.db.query('coupons').take(CAP),
      ctx.db.query('pages').take(CAP),
      ctx.db.query('reviews').take(CAP),
      ctx.db.query('productQuestions').take(CAP),
      ctx.db.query('returnRequests').take(CAP),
    ]);

    // Strip anything sensitive from user records.
    const users = usersRaw.map((u) => {
      const { passwordHash, twoFactorSecret, twoFactorRecoveryCodes, sessionToken, ...safe } = u;
      void passwordHash; void twoFactorSecret; void twoFactorRecoveryCodes; void sessionToken;
      return safe;
    });

    const tables = {
      products, categories, brands, filterDefinitions, orders, users, settings,
      promotions, coupons, pages, reviews, productQuestions, returnRequests,
    };
    const counts = Object.fromEntries(Object.entries(tables).map(([k, v]) => [k, (v as unknown[]).length]));

    await logAudit(ctx, caller, 'data.export', `Exported data snapshot (${Object.values(counts).reduce((s, n) => s + (n as number), 0)} records)`,
      { targetType: 'backup', meta: { counts } });

    return { generatedAt: Date.now(), version: 1, counts, tables };
  },
});
