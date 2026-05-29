import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { internal } from './_generated/api';
import { getAuthCaller, requireAdmin } from './lib/auth';

export const create = mutation({
  args: {
    customerName: v.string(),
    customerEmail: v.string(),
    customerPhone: v.string(),
    shippingAddress: v.string(),
    items: v.array(
      v.object({
        productId: v.id('products'),
        name: v.string(),
        price: v.number(),
        quantity: v.number(),
        imageUrl: v.optional(v.string()),
      }),
    ),
    subtotal: v.number(),
    shipping: v.number(),
    total: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await getAuthCaller(ctx);
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
    const now = Date.now();

    const orderId = await ctx.db.insert('orders', {
      ...args,
      orderNumber,
      userId: caller?._id,
      status: 'pending',
      paymentStatus: 'awaiting',
      createdAt: now,
      updatedAt: now,
    });

    // Send Telegram notification
    await ctx.scheduler.runAfter(0, internal.notifications.sendOrderNotification, {
      orderNumber,
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      total: args.total,
      itemsCount: args.items.length,
    });

    return orderId;
  },
});

export const listAdmin = query({
  args: { status: v.optional(v.union(v.literal('pending'), v.literal('confirmed'), v.literal('processing'), v.literal('shipped'), v.literal('delivered'), v.literal('cancelled'))) },
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query('orders')
        .withIndex('by_status', (q) => q.eq('status', args.status!))
        .order('desc')
        .take(100);
    }
    return await ctx.db.query('orders').order('desc').take(100);
  },
});

export const getByOrderNumber = query({
  args: { orderNumber: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('orders')
      .withIndex('by_order_number', (q) => q.eq('orderNumber', args.orderNumber))
      .unique();
  },
});

export const getById = query({
  args: { id: v.id('orders') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const myOrders = query({
  args: {},
  handler: async (ctx) => {
    const caller = await getAuthCaller(ctx);
    if (!caller) return [];
    return await ctx.db
      .query('orders')
      .withIndex('by_user', (q) => q.eq('userId', caller._id))
      .order('desc')
      .take(50);
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id('orders'),
    status: v.optional(v.union(v.literal('pending'), v.literal('confirmed'), v.literal('processing'), v.literal('shipped'), v.literal('delivered'), v.literal('cancelled'))),
    paymentStatus: v.optional(v.union(v.literal('awaiting'), v.literal('paid'), v.literal('refunded'))),
  },
  handler: async (ctx, args) => {
    const { id, ...patch } = args;
    await ctx.db.patch(id, { ...patch, updatedAt: Date.now() });
  },
});
