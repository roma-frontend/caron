import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { getAdminCaller, getSuperAdminCaller, logAudit } from './lib/auth';
import { hashPassword } from './auth';
import { paginationOptsValidator } from 'convex/server';

export const list = query({
  args: {
    sessionToken: v.string(),
    search: v.optional(v.string()),
    customerType: v.optional(v.union(v.literal('retail'), v.literal('wholesale'))),
    role: v.optional(v.union(v.literal('customer'), v.literal('manager'), v.literal('admin'), v.literal('staff'))),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const caller = await getAdminCaller(ctx, args.sessionToken);

    // Fetch the requested role set. `staff` = managers + admins; default view
    // (no role filter) shows customers + staff together so the admin can manage
    // everyone from one screen.
    const roleGroups: Array<'customer' | 'manager' | 'admin'> =
      args.role === 'customer' ? ['customer']
        : args.role === 'manager' ? ['manager']
        : args.role === 'admin' ? ['admin']
        : args.role === 'staff' ? ['manager', 'admin']
        : ['customer', 'manager', 'admin'];

    let users = (
      await Promise.all(
        roleGroups.map((r) =>
          ctx.db.query('users').withIndex('by_role', (q) => q.eq('role', r)).order('desc').take(2000),
        ),
      )
    ).flat();

    if (args.search) {
      const q = args.search.toLowerCase();
      users = users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.phone && u.phone.includes(q)));
    }
    if (args.customerType) {
      users = users.filter((u) => u.customerType === args.customerType);
    }
    users = users.filter((u) => u._id !== caller._id);
    users.sort((a, b) => b.createdAt - a.createdAt);
    const total = users.length;
    const { numItems } = args.paginationOpts;
    const page = users.slice(0, numItems ?? 20);

    // Enrich the visible page with order stats (LTV, order count, last order).
    // Computed only for the page (~20 rows) to keep the query cheap. Aggregated
    // by userId; guest orders without a linked account are not counted.
    const pageWithStats = await Promise.all(
      page.map(async (u) => {
        const userOrders = await ctx.db.query('orders').withIndex('by_user', (q) => q.eq('userId', u._id)).take(1000);
        const active = userOrders.filter((o) => o.status !== 'cancelled');
        const ltv = active.reduce((s, o) => s + o.total, 0);
        const lastOrderAt = userOrders.reduce((m, o) => Math.max(m, o.createdAt), 0);
        return { ...u, ltv, orderCount: userOrders.length, lastOrderAt: lastOrderAt || undefined };
      }),
    );
    return { page: pageWithStats, total, isDone: page.length >= total, callerRole: caller.role };
  },
});

/**
 * Admin-created account (customer or staff). Restricted to super-admin because
 * it can mint privileged (manager/admin) accounts. Lets the admin onboard a
 * teammate or a customer without leaving the panel or using the public signup.
 */
export const createUser = mutation({
  args: {
    sessionToken: v.string(),
    name: v.string(),
    email: v.string(),
    password: v.string(),
    role: v.union(v.literal('customer'), v.literal('manager'), v.literal('admin')),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    customerType: v.optional(v.union(v.literal('retail'), v.literal('wholesale'))),
    discountPercent: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const caller = await getSuperAdminCaller(ctx, args.sessionToken);

    const email = args.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Սխալ էլ․ հասցե');
    if (!args.name.trim() || args.name.length > 100) throw new Error('Սխալ անուն');
    if (args.password.length < 8) throw new Error('Գաղտնաբառը պետք է լինի առնվազն 8 նիշ');

    const existing = await ctx.db.query('users').withIndex('by_email', (q) => q.eq('email', email)).unique();
    if (existing) throw new Error('Այս էլ․ հասցեն արդեն գրանցված է');

    const passwordHash = await hashPassword(args.password);
    const userId = await ctx.db.insert('users', {
      name: args.name.trim(),
      email,
      phone: args.phone,
      address: args.address,
      role: args.role,
      passwordHash,
      // customerType/discount apply to customers AND managers (managers place
      // orders on behalf of customers at retail/wholesale pricing); not admins.
      customerType: args.role === 'admin' ? undefined : (args.customerType ?? 'retail'),
      discountPercent: args.role === 'admin' ? undefined : args.discountPercent,
      isActive: args.isActive ?? true,
      createdAt: Date.now(),
    });
    await logAudit(ctx, caller, 'user.create', `Created ${args.role} "${args.name.trim()}" (${email})`,
      { targetType: 'user', targetId: userId, meta: { role: args.role } });
    return { userId };
  },
});

export const updateCustomer = mutation({
  args: {
    sessionToken: v.string(),
    userId: v.id('users'),
    customerType: v.optional(v.union(v.literal('retail'), v.literal('wholesale'))),
    discountPercent: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    // Sensitive changes — require super-admin (guarded below).
    role: v.optional(v.union(v.literal('customer'), v.literal('manager'), v.literal('admin'))),
    newPassword: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { sessionToken, userId, role, newPassword, ...rest } = args;
    const wantsPrivilegedChange = role !== undefined || newPassword !== undefined;
    const caller = wantsPrivilegedChange
      ? await getSuperAdminCaller(ctx, sessionToken)
      : await getAdminCaller(ctx, sessionToken);

    const target = await ctx.db.get(userId);
    if (!target) throw new Error('Օգտագործողը չի գտնվել');

    // Modifying a staff account (admin/manager) is a super-admin-only action,
    // so a manager cannot block, rename, or otherwise alter another staffer.
    if ((target.role === 'admin' || target.role === 'manager') && caller.role !== 'admin' && caller.role !== 'superadmin') {
      throw new Error('Super-admin access required');
    }

    const patch: Record<string, unknown> = { ...rest };

    if (role !== undefined) {
      // Don't let an admin demote themselves (avoid locking themselves out).
      if (userId === caller._id && role !== 'admin') throw new Error('Cannot change your own role');
      patch.role = role;
      // customerType/discount apply to customers AND managers; drop only when
      // promoting to admin. Default managers/customers to retail if unset.
      if (role === 'admin') { patch.customerType = undefined; patch.discountPercent = undefined; }
      else if (target.customerType === undefined && rest.customerType === undefined) { patch.customerType = 'retail'; }
    }

    if (newPassword !== undefined) {
      if (newPassword.length < 8) throw new Error('Գաղտնաբառը պետք է լինի առնվազն 8 նիշ');
      patch.passwordHash = await hashPassword(newPassword);
    }

    await ctx.db.patch(userId, patch);

    if (role !== undefined && role !== target.role) {
      await logAudit(ctx, caller, 'user.roleChange', `Changed role of "${target.name}" ${target.role} → ${role}`,
        { targetType: 'user', targetId: userId, meta: { from: target.role, to: role } });
    }
    if (newPassword !== undefined) {
      await logAudit(ctx, caller, 'user.passwordReset', `Reset password for "${target.name}"`,
        { targetType: 'user', targetId: userId });
    }
  },
});

export const register = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query('users').withIndex('by_email', (q) => q.eq('email', args.email.toLowerCase())).unique();
    if (existing) throw new Error('Email already registered');
    const id = await ctx.db.insert('users', {
      name: args.name,
      email: args.email.toLowerCase(),
      phone: args.phone,
      role: 'customer',
      customerType: 'retail',
      isActive: true,
      createdAt: Date.now(),
    });
    const sessionToken = crypto.randomUUID();
    const sessionExpiry = Date.now() + 30 * 24 * 60 * 60 * 1000;
    await ctx.db.patch(id, { sessionToken, sessionExpiry });
    return { userId: id, sessionToken, name: args.name, email: args.email.toLowerCase(), role: 'customer' as const };
  },
});

export const deleteCustomer = mutation({
  args: { sessionToken: v.string(), userId: v.id('users') },
  handler: async (ctx, args) => {
    const caller = await getAdminCaller(ctx, args.sessionToken);
    if (args.userId === caller._id) throw new Error('Cannot delete your own account');
    const target = await ctx.db.get(args.userId);
    // Deleting staff (admins/managers) is a super-admin-only action.
    if (target && (target.role === 'admin' || target.role === 'manager')) {
      await getSuperAdminCaller(ctx, args.sessionToken);
    }
    await ctx.db.delete(args.userId);
    await logAudit(ctx, caller, 'user.delete', `Deleted ${target?.role ?? 'user'} "${target?.name ?? args.userId}"`,
      { targetType: 'user', targetId: args.userId });
  },
});

export const getByBrand = query({
  args: { brand: v.string() },
  handler: async (ctx, args) => {
    const inactiveCats = await ctx.db
      .query('categories')
      .withIndex('by_active', (q) => q.eq('isActive', false))
      .take(200);
    const inactiveCatIds = new Set(inactiveCats.map((c) => c._id));

    // Brand can be stored as the top-level `brand` field, as `attributes.brand`,
    // or as `attributes[<brandFilterDefinitionId>]` (bulk-imported products).
    const brandDefs = await ctx.db
      .query('filterDefinitions')
      .filter((q) => q.eq(q.field('slug'), 'brand'))
      .take(500);
    const brandKeys = new Set<string>(['brand']);
    for (const d of brandDefs) brandKeys.add(d._id as string);
    const targetLower = args.brand.toLowerCase();
    const matchesBrand = (val: unknown): boolean => {
      if (typeof val === 'string') return val.toLowerCase() === targetLower;
      if (Array.isArray(val)) return val.some((v) => typeof v === 'string' && v.toLowerCase() === targetLower);
      return false;
    };

    const products = await ctx.db.query('products').withIndex('by_active', (q) => q.eq('isActive', true)).take(5000);
    return products.filter((p) => {
      if (!p.isActive || p.stock <= 0 || inactiveCatIds.has(p.categoryId)) return false;
      if (matchesBrand(p.brand)) return true;
      const attrs = (p.attributes ?? {}) as Record<string, unknown>;
      for (const key of brandKeys) if (matchesBrand(attrs[key])) return true;
      return false;
    }).slice(0, 200);
  },
});
