import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { internal } from './_generated/api';
import { getAdminCaller, getAuthCaller } from './lib/auth';

export const create = mutation({
  args: {
    sessionToken: v.optional(v.string()),
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
    paymentMethod: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await getAuthCaller(ctx, args.sessionToken);

    // Server-side price validation — recompute from DB
    let serverSubtotal = 0;
    for (const item of args.items) {
      const product = await ctx.db.get(item.productId);
      if (!product || !product.isActive) {
        throw new Error(`Ապրանքը հասանելի չէ: ${item.name}`);
      }
      if (product.stock < item.quantity) {
        throw new Error(`Անբավարար պաշար: ${product.name}`);
      }
      serverSubtotal += product.price * item.quantity;
    }

    // Server-side shipping validation against store settings — never trust
    // the client-provided shipping amount.
    if (!Number.isFinite(args.shipping) || args.shipping < 0) {
      throw new Error('Առաքման սխալ արժեք');
    }
    const settings = await ctx.db.query('settings').first();
    const freeThreshold = settings?.freeShippingThreshold ?? 0;
    let serverShipping = args.shipping;
    if (freeThreshold > 0 && serverSubtotal >= freeThreshold) {
      // Free shipping unlocked — force 0 regardless of client input.
      serverShipping = 0;
    } else {
      // Otherwise the only acceptable values are pickup (0) or a configured zone price.
      const allowed = new Set<number>([0]);
      if (typeof settings?.deliveryYerevan === 'number') allowed.add(settings.deliveryYerevan);
      if (typeof settings?.deliveryRegions === 'number') allowed.add(settings.deliveryRegions);
      if (!allowed.has(args.shipping)) {
        throw new Error('Առաքման արժեքն անվավեր է. խնդրում ենք թարմացնել էջը');
      }
    }

    const serverTotal = serverSubtotal + serverShipping;

    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
    const now = Date.now();

    // Deduct stock
    for (const item of args.items) {
      const product = await ctx.db.get(item.productId);
      if (product) await ctx.db.patch(item.productId, { stock: product.stock - item.quantity });
    }

    const orderId = await ctx.db.insert('orders', {
      ...args,
      subtotal: serverSubtotal,
      shipping: serverShipping,
      total: serverTotal,
      orderNumber,
      userId: caller?._id,
      status: 'pending',
      paymentStatus: 'awaiting',
      createdAt: now,
      updatedAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.notifications.sendOrderNotification, {
      orderNumber,
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      total: serverTotal,
      itemsCount: args.items.length,
    });

    return orderId;
  },
});

export const listAdmin = query({
  args: {
    sessionToken: v.string(),
    status: v.optional(
      v.union(
        v.literal('pending'), v.literal('confirmed'), v.literal('processing'),
        v.literal('shipped'), v.literal('delivered'), v.literal('cancelled'),
      ),
    ),
  },
  handler: async (ctx, args) => {
    try { await getAdminCaller(ctx, args.sessionToken); } catch { return []; }

    if (args.status) {
      return await ctx.db
        .query('orders')
        .withIndex('by_status', (q) => q.eq('status', args.status!))
        .order('desc')
        .take(500);
    }
    return await ctx.db.query('orders').order('desc').take(500);
  },
});

export const getByOrderNumber = query({
  args: { orderNumber: v.string() },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query('orders')
      .withIndex('by_order_number', (q) => q.eq('orderNumber', args.orderNumber))
      .unique();
    if (!order) return null;
    // Return safe subset for public access (no full PII)
    return {
      _id: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      total: order.total,
      createdAt: order.createdAt,
      items: order.items,
    };
  },
});

export const listByUser = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const caller = await getAuthCaller(ctx, args.sessionToken);
    if (!caller) return [];
    return await ctx.db.query('orders').withIndex('by_user', (q) => q.eq('userId', caller._id)).order('desc').take(50);
  },
});

export const getById = query({
  args: { id: v.id('orders'), sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.id);
    if (!order) return null;
    // Allow owner or admin
    const caller = await getAuthCaller(ctx, args.sessionToken);
    if (caller?.role === 'admin') return order;
    if (caller && order.userId === caller._id) return order;
    // Unauthenticated: return invoice subset only
    return {
      _id: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
      shippingAddress: order.shippingAddress,
      items: order.items,
      subtotal: order.subtotal,
      shipping: order.shipping,
      total: order.total,
      notes: order.notes,
      createdAt: order.createdAt,
    };
  },
});

export const myOrders = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const caller = await getAuthCaller(ctx, args.sessionToken);
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
    sessionToken: v.string(),
    id: v.id('orders'),
    status: v.optional(
      v.union(
        v.literal('pending'), v.literal('confirmed'), v.literal('processing'),
        v.literal('shipped'), v.literal('delivered'), v.literal('cancelled'),
      ),
    ),
    paymentStatus: v.optional(
      v.union(v.literal('awaiting'), v.literal('paid'), v.literal('refunded')),
    ),
  },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    const { id, sessionToken: _, ...patch } = args;
    await ctx.db.patch(id, { ...patch, updatedAt: Date.now() });
  },
});
