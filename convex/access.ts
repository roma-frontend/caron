import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { getAdminCaller, getSuperAdminCaller, isSuperadmin, logAudit } from './lib/auth';

/**
 * Canonical list of restrictable admin-panel sections. The superadmin can
 * disable any of these per role (admin / manager). Absence of an accessControl
 * row means enabled — so the default state keeps the current behaviour.
 *
 * `nav` sections map 1:1 to admin routes; `action` capabilities are
 * cross-cutting privileged operations.
 */
export const CAPABILITIES = [
  // Navigable sections (href = /admin/<key>, '' = dashboard root)
  { key: 'products', kind: 'nav' },
  { key: 'categories', kind: 'nav' },
  { key: 'brands', kind: 'nav' },
  { key: 'filters', kind: 'nav' },
  { key: 'orders', kind: 'nav' },
  { key: 'returns', kind: 'nav' },
  { key: 'customers', kind: 'nav' },
  { key: 'stock', kind: 'nav' },
  { key: 'analytics', kind: 'nav' },
  { key: 'promotions', kind: 'nav' },
  { key: 'reviews', kind: 'nav' },
  { key: 'qa', kind: 'nav' },
  { key: 'pages', kind: 'nav' },
  { key: 'delivery', kind: 'nav' },
  { key: 'settings', kind: 'nav' },
  // Cross-cutting privileged actions
  { key: 'action.delete', kind: 'action' },
  { key: 'action.export', kind: 'action' },
  { key: 'action.priceEdit', kind: 'action' },
  { key: 'action.bulk', kind: 'action' },
] as const;

/** Full matrix for the superadmin control dashboard. */
export const getAccessMatrix = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    await getSuperAdminCaller(ctx, args.sessionToken);
    const rows = await ctx.db.query('accessControl').take(1000);
    // role -> capability -> enabled
    const matrix: Record<string, Record<string, boolean>> = { admin: {}, manager: {} };
    for (const cap of CAPABILITIES) {
      matrix.admin[cap.key] = true;
      matrix.manager[cap.key] = true;
    }
    for (const r of rows) {
      if (matrix[r.role]) matrix[r.role][r.capability] = r.enabled;
    }
    return { matrix, capabilities: CAPABILITIES.map((c) => ({ ...c })) };
  },
});

/** Toggle one capability for one role (superadmin only). */
export const setCapability = mutation({
  args: {
    sessionToken: v.string(),
    role: v.union(v.literal('admin'), v.literal('manager')),
    capability: v.string(),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const caller = await getSuperAdminCaller(ctx, args.sessionToken);
    if (!CAPABILITIES.some((c) => c.key === args.capability)) throw new Error('Unknown capability');

    const existing = await ctx.db
      .query('accessControl')
      .withIndex('by_role_capability', (q) => q.eq('role', args.role).eq('capability', args.capability))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { enabled: args.enabled, updatedBy: caller._id, updatedAt: Date.now() });
    } else {
      await ctx.db.insert('accessControl', {
        role: args.role,
        capability: args.capability,
        enabled: args.enabled,
        updatedBy: caller._id,
        updatedAt: Date.now(),
      });
    }
    await logAudit(ctx, caller, 'access.setCapability',
      `${args.enabled ? 'Enabled' : 'Disabled'} "${args.capability}" for ${args.role}`,
      { targetType: 'accessControl', targetId: `${args.role}:${args.capability}`, meta: { role: args.role, capability: args.capability, enabled: args.enabled } });
    return { ok: true };
  },
});

/**
 * Capabilities disabled for the CURRENT caller's role. Superadmin (and admins
 * are NOT exempt — the superadmin may restrict admins) → superadmin gets an
 * empty set (unrestricted), everyone else gets their role's disabled set.
 */
export const getMyCapabilities = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const caller = await getAdminCaller(ctx, args.sessionToken);
    if (isSuperadmin(caller)) {
      return { role: caller.role, isSuperadmin: true, disabled: [] as string[] };
    }
    const role = caller.role;
    if (role !== 'admin' && role !== 'manager') {
      return { role, isSuperadmin: false, disabled: [] as string[] };
    }
    const rows = await ctx.db.query('accessControl').withIndex('by_role', (q) => q.eq('role', role)).take(1000);
    const disabled = rows.filter((r) => !r.enabled).map((r) => r.capability);
    return { role, isSuperadmin: false, disabled };
  },
});

/** Recent audit-log entries (superadmin only). */
export const listAudit = query({
  args: { sessionToken: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await getSuperAdminCaller(ctx, args.sessionToken);
    const entries = await ctx.db.query('auditLogs').withIndex('by_created').order('desc').take(args.limit ?? 100);
    return entries;
  },
});

/** High-level control-dashboard stats (superadmin only). */
export const getControlStats = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    await getSuperAdminCaller(ctx, args.sessionToken);
    const [superadmins, admins, managers, restrictions] = await Promise.all([
      ctx.db.query('users').withIndex('by_role', (q) => q.eq('role', 'superadmin')).take(100),
      ctx.db.query('users').withIndex('by_role', (q) => q.eq('role', 'admin')).take(1000),
      ctx.db.query('users').withIndex('by_role', (q) => q.eq('role', 'manager')).take(1000),
      ctx.db.query('accessControl').take(1000),
    ]);
    const activeRestrictions = restrictions.filter((r) => !r.enabled).length;
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentAudit = await ctx.db.query('auditLogs').withIndex('by_created', (q) => q.gte('createdAt', dayAgo)).take(2000);
    return {
      superadmins: superadmins.length,
      admins: admins.length,
      managers: managers.length,
      activeRestrictions,
      auditLast24h: recentAudit.length,
    };
  },
});

/** Staff overview list (superadmin only): superadmins, admins, managers. */
export const listStaff = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    await getSuperAdminCaller(ctx, args.sessionToken);
    const groups = await Promise.all(
      (['superadmin', 'admin', 'manager'] as const).map((r) =>
        ctx.db.query('users').withIndex('by_role', (q) => q.eq('role', r)).order('desc').take(500),
      ),
    );
    return groups.flat().map((u) => ({
      _id: u._id, name: u.name, email: u.email, role: u.role, isActive: u.isActive, createdAt: u.createdAt,
    }));
  },
});
