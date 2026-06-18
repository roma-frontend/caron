import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { getAdminCaller } from './lib/auth';
import { paginationOptsValidator } from 'convex/server';

export const list = query({
  args: {
    sessionToken: v.string(),
    search: v.optional(v.string()),
    customerType: v.optional(v.union(v.literal('retail'), v.literal('wholesale'))),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const caller = await getAdminCaller(ctx, args.sessionToken);
    let users = await ctx.db.query('users').withIndex('by_role', (q) => q.eq('role', 'customer')).order('desc').take(2000);
    if (args.search) {
      const q = args.search.toLowerCase();
      users = users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.phone && u.phone.includes(q)));
    }
    if (args.customerType) {
      users = users.filter((u) => u.customerType === args.customerType);
    }
    users = users.filter((u) => u._id !== caller._id);
    const total = users.length;
    const { numItems } = args.paginationOpts;
    const page = users.slice(0, numItems ?? 20);
    return { page, total, isDone: page.length >= total };
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
  },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    const { sessionToken: _, userId, ...patch } = args;
    await ctx.db.patch(userId, patch);
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
    await getAdminCaller(ctx, args.sessionToken);
    await ctx.db.delete(args.userId);
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

    const products = await ctx.db.query('products').withIndex('by_active', (q) => q.eq('isActive', true)).take(5000);
    return products.filter((p) => {
      const attrBrand = ((p.attributes ?? {}) as Record<string, unknown>).brand as string | undefined;
      const topBrand = p.brand as string | undefined;
      const brand = attrBrand ?? topBrand;
      return (
        p.isActive &&
        p.stock > 0 &&
        !inactiveCatIds.has(p.categoryId) &&
        typeof brand === 'string' &&
        brand.toLowerCase() === args.brand.toLowerCase()
      );
    }).slice(0, 200);
  },
});
