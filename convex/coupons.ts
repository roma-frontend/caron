import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { getAdminCaller, getAuthCaller } from './lib/auth';

export const list = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const caller = await getAuthCaller(ctx, args.sessionToken);
    if (!caller || caller.role !== 'admin') return [];
    return await ctx.db.query('coupons').order('desc').take(100);
  },
});

export const create = mutation({
  args: {
    sessionToken: v.string(),
    code: v.string(),
    type: v.union(v.literal('percent'), v.literal('fixed')),
    value: v.number(),
    minOrderAmount: v.optional(v.number()),
    maxUses: v.optional(v.number()),
    isActive: v.boolean(),
    startsAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    if (!Number.isFinite(args.value) || args.value < 0) {
      throw new Error('Invalid coupon value');
    }
    if (args.type === 'percent' && args.value > 100) {
      throw new Error('Percent coupon cannot exceed 100');
    }
    if (args.maxUses !== undefined && (!Number.isInteger(args.maxUses) || args.maxUses < 0)) {
      throw new Error('Invalid maxUses');
    }
    if (args.minOrderAmount !== undefined && (!Number.isFinite(args.minOrderAmount) || args.minOrderAmount < 0)) {
      throw new Error('Invalid minOrderAmount');
    }
    const { sessionToken: _, ...data } = args;
    return await ctx.db.insert('coupons', { ...data, code: data.code.toUpperCase(), usedCount: 0, createdAt: Date.now() });
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), id: v.id('coupons') },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    await ctx.db.delete(args.id);
  },
});

export const validate = query({
  args: { code: v.string(), orderTotal: v.number() },
  handler: async (ctx, args) => {
    const coupon = await ctx.db.query('coupons').withIndex('by_code', (q) => q.eq('code', args.code.toUpperCase())).first();
    if (!coupon || !coupon.isActive) return null;
    if (coupon.expiresAt && coupon.expiresAt < Date.now()) return null;
    if (coupon.startsAt && coupon.startsAt > Date.now()) return null;
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) return null;
    if (coupon.minOrderAmount && args.orderTotal < coupon.minOrderAmount) return null;
    const discount = coupon.type === 'percent' ? Math.round(args.orderTotal * coupon.value / 100) : coupon.value;
    return { code: coupon.code, type: coupon.type, value: coupon.value, discount: Math.min(discount, args.orderTotal) };
  },
});

export const apply = mutation({
  args: { sessionToken: v.optional(v.string()), code: v.string() },
  handler: async (ctx, args) => {
    const coupon = await ctx.db.query('coupons').withIndex('by_code', (q) => q.eq('code', args.code.toUpperCase())).first();
    if (!coupon) throw new Error('Կուպոն չի գտնվել');
    await ctx.db.patch(coupon._id, { usedCount: coupon.usedCount + 1 });
  },
});
