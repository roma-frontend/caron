import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import type { MutationCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { internal } from './_generated/api';
import { getAdminCaller, getAuthCaller } from './lib/auth';

/**
 * Add (or subtract, when negative) loyalty points for a customer.
 * Resolves the loyalty record by userId first, then by email; creates one
 * if none exists. `points` is clamped so the balance never goes negative and
 * `totalEarned` only ever grows.
 */
async function adjustLoyalty(
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
      if (product) {
        const stockBefore = product.stock;
        const stockAfter = product.stock - item.quantity;
        await ctx.db.patch(item.productId, { stock: stockAfter });
        await ctx.db.insert('stockMovements', {
          productId: item.productId,
          type: 'sale',
          qty: -item.quantity,
          stockBefore,
          stockAfter,
          orderId: undefined,
          createdAt: now,
        });
      }
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

    await ctx.db.insert('orderEvents', {
      orderId,
      type: 'created',
      nextValue: 'սպասվում է',
      createdAt: now,
    });

    return orderId;
  },
});

export const validateCart = mutation({
  args: {
    items: v.array(
      v.object({
        productId: v.id('products'),
        quantity: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const normalizedItems: Array<{
      id: string;
      name: string;
      price: number;
      image: string | null;
      quantity: number;
      maxStock: number;
      qtyStep: number;
    }> = [];

    const issues: string[] = [];
    let changed = false;

    for (const input of args.items) {
      const product = await ctx.db.get(input.productId);
      if (!product || !product.isActive) {
        changed = true;
        issues.push('Որոշ ապրանքներ այլևս հասանելի չեն');
        continue;
      }

      if (product.stock <= 0) {
        changed = true;
        issues.push(`Ապրանքը սպառված է: ${product.name}`);
        continue;
      }

      const step = Math.max(1, product.qtyStep ?? 1);
      const requested = Math.max(step, Math.floor(input.quantity));
      const maxByStock = Math.max(0, Math.floor(product.stock / step) * step);
      const clamped = Math.min(requested, maxByStock > 0 ? maxByStock : product.stock);

      const finalQty = Math.max(step, clamped);
      if (finalQty !== input.quantity) {
        changed = true;
        issues.push(`Քանակը թարմացվեց ըստ պահեստի: ${product.name}`);
      }

      normalizedItems.push({
        id: product._id,
        name: product.name,
        price: product.price,
        image: product.images?.[0] ?? null,
        quantity: finalQty,
        maxStock: product.stock,
        qtyStep: step,
      });
    }

    const subtotal = normalizedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    if (normalizedItems.length !== args.items.length) changed = true;

    return {
      changed,
      items: normalizedItems,
      subtotal,
      issues,
    };
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
      items: order.items,
      subtotal: order.subtotal,
      shipping: order.shipping,
      total: order.total,
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
    cancelReason: v.optional(v.string()),
    cancelComment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await getAdminCaller(ctx, args.sessionToken);
    const { id, status, paymentStatus, cancelReason, cancelComment } = args;

    const order = await ctx.db.get(id);
    if (!order) throw new Error('Պատվերը չի գտնվել');

    const prevStatus = order.status;
    const nextStatus = args.status ?? prevStatus;

    // Loyalty accrual: award when an order is delivered, reverse if it is later
    // cancelled. Gated by store settings; tracked on the order to prevent
    // double-awarding.
    const loyaltyPatch: { loyaltyAwarded?: boolean; loyaltyPointsAwarded?: number } = {};
    if (nextStatus !== prevStatus) {
      const storeSettings = await ctx.db.query('settings').first();
      const loyaltyEnabled = !!storeSettings?.enableLoyalty;
      const loyaltyPercent = storeSettings?.loyaltyPercent ?? 0;

      if (nextStatus === 'delivered' && !order.loyaltyAwarded && loyaltyEnabled && loyaltyPercent > 0) {
        const pts = Math.round(order.total * loyaltyPercent / 100);
        if (pts > 0) {
          await adjustLoyalty(ctx, { userId: order.userId, email: order.customerEmail, points: pts });
          loyaltyPatch.loyaltyAwarded = true;
          loyaltyPatch.loyaltyPointsAwarded = pts;
        }
      } else if (nextStatus === 'cancelled' && order.loyaltyAwarded && (order.loyaltyPointsAwarded ?? 0) > 0) {
        await adjustLoyalty(ctx, { userId: order.userId, email: order.customerEmail, points: -(order.loyaltyPointsAwarded ?? 0) });
        loyaltyPatch.loyaltyAwarded = false;
        loyaltyPatch.loyaltyPointsAwarded = 0;
      }
    }

    if (nextStatus !== prevStatus) {
      // Cancelled -> restore stock back to catalog
      if (nextStatus === 'cancelled' && prevStatus !== 'cancelled') {
        if (!cancelReason?.trim()) {
          throw new Error('Խնդրում ենք նշել չեղարկման պատճառը');
        }

        for (const item of order.items) {
          const product = await ctx.db.get(item.productId);
          if (!product) continue;
          const stockBefore = product.stock;
          const stockAfter = product.stock + item.quantity;
          await ctx.db.patch(item.productId, { stock: stockAfter, updatedAt: Date.now() });
          await ctx.db.insert('stockMovements', {
            productId: item.productId,
            type: 'cancel',
            qty: item.quantity,
            stockBefore,
            stockAfter,
            orderId: id,
            adminName: admin?.name ?? admin?.email ?? undefined,
            createdAt: Date.now(),
          });
        }
      }

      // Re-open cancelled order -> reserve stock again
      if (prevStatus === 'cancelled' && nextStatus !== 'cancelled') {
        for (const item of order.items) {
          const product = await ctx.db.get(item.productId);
          if (!product || !product.isActive) {
            throw new Error(`Ապրանքը չի գտնվել կամ ակտիվ չէ: ${item.name}`);
          }
          if (product.stock < item.quantity) {
            throw new Error(`Ապրանքը պահեստում բավական չէ: ${product.name}`);
          }
        }

        for (const item of order.items) {
          const product = await ctx.db.get(item.productId);
          if (!product) continue;
          const stockBefore = product.stock;
          const stockAfter = product.stock - item.quantity;
          await ctx.db.patch(item.productId, { stock: stockAfter, updatedAt: Date.now() });
          await ctx.db.insert('stockMovements', {
            productId: item.productId,
            type: 'reopen',
            qty: -item.quantity,
            stockBefore,
            stockAfter,
            orderId: id,
            adminName: admin?.name ?? admin?.email ?? undefined,
            createdAt: Date.now(),
          });
        }
      }
    }

    const patch: {
      status?: NonNullable<typeof status>;
      paymentStatus?: NonNullable<typeof paymentStatus>;
      cancelReason?: string;
      cancelComment?: string;
      loyaltyAwarded?: boolean;
      loyaltyPointsAwarded?: number;
      updatedAt: number;
    } = { updatedAt: Date.now(), ...loyaltyPatch };
    const currentPaymentStatus = order.paymentStatus as NonNullable<typeof paymentStatus> | undefined;
    if (status !== undefined) patch.status = status;
    if (nextStatus === 'cancelled' && cancelReason !== undefined) patch.cancelReason = cancelReason.trim();
    if (nextStatus === 'cancelled' && cancelComment !== undefined) patch.cancelComment = cancelComment.trim();
    if (paymentStatus !== undefined) patch.paymentStatus = paymentStatus;
    else if (currentPaymentStatus === undefined) patch.paymentStatus = 'awaiting';

    await ctx.db.patch(id, patch);

    const now = Date.now();
    const adminName = admin?.name ?? admin?.email;

    if (status !== undefined && status !== prevStatus) {
      const eventType = status === 'cancelled'
        ? 'cancelled'
        : prevStatus === 'cancelled'
          ? 'reopened'
          : 'status_changed';
      await ctx.db.insert('orderEvents', {
        orderId: id,
        type: eventType,
        prevValue: prevStatus,
        nextValue: status,
        comment: cancelComment?.trim() || undefined,
        adminName: adminName ?? undefined,
        createdAt: now,
      });
    }

    if (paymentStatus !== undefined && paymentStatus !== order.paymentStatus) {
      await ctx.db.insert('orderEvents', {
        orderId: id,
        type: 'payment_changed',
        prevValue: order.paymentStatus,
        nextValue: paymentStatus,
        adminName: adminName ?? undefined,
        createdAt: now,
      });
    }
  },
});

export const getOrderEvents = query({
  args: { sessionToken: v.string(), orderId: v.id('orders') },
  handler: async (ctx, args) => {
    try { await getAdminCaller(ctx, args.sessionToken); } catch { return []; }
    return await ctx.db
      .query('orderEvents')
      .withIndex('by_order', (q) => q.eq('orderId', args.orderId))
      .order('desc')
      .take(100);
  },
});
