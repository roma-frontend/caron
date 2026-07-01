import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import type { MutationCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { internal } from './_generated/api';
import { getAdminCaller, getAuthCaller, requireCapability, logAudit } from './lib/auth';
import { resolveCashback } from './lib/loyalty';
import { computeDeliveryQuote, type RuleLike, type ZoneLike } from './lib/delivery';

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
    pointsToSpend: v.optional(v.number()),
    deliveryZoneId: v.optional(v.id('deliveryZones')),
    pickup: v.optional(v.boolean()),
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

    // Server-side shipping validation — recompute authoritatively from the
    // delivery zone + active rules; never trust the client-provided amount.
    if (!Number.isFinite(args.shipping) || args.shipping < 0) {
      throw new Error('Առաքման սխալ արժեք');
    }
    const settings = await ctx.db.query('settings').first();
    let serverShipping = 0;
    let deliveryGroup: 'yerevan' | 'region' | undefined;
    let deliveryRuleApplied: string | undefined;
    if (!args.pickup) {
      const zone = args.deliveryZoneId ? await ctx.db.get(args.deliveryZoneId) : null;
      const rules = (await ctx.db.query('deliveryRules').collect()).filter((r) => r.isActive);
      const quote = computeDeliveryQuote({
        zone: zone as ZoneLike | null,
        group: (zone as { group?: 'yerevan' | 'region' } | null)?.group,
        subtotal: serverSubtotal,
        at: Date.now(),
        settings: settings ?? undefined,
        rules: rules as unknown as RuleLike[],
      });
      serverShipping = quote.price;
      deliveryGroup = (zone as { group?: 'yerevan' | 'region' } | null)?.group;
      deliveryRuleApplied = quote.appliedRule?.name;
    }

    const serverTotal = serverSubtotal + serverShipping;

    // Redeem loyalty points (1 point = 1 AMD). Only for an authenticated caller,
    // capped at their balance and at the order total. Gated by store settings.
    let pointsSpent = 0;
    if (args.pointsToSpend && args.pointsToSpend > 0 && caller && settings?.enableLoyalty) {
      let rec = await ctx.db.query('loyaltyPoints').withIndex('by_user', (q) => q.eq('userId', caller._id)).first();
      if (!rec) rec = await ctx.db.query('loyaltyPoints').withIndex('by_email', (q) => q.eq('email', caller.email)).first();
      const balance = rec?.points ?? 0;
      pointsSpent = Math.max(0, Math.min(Math.floor(args.pointsToSpend), balance, serverTotal));
      if (pointsSpent > 0) {
        await adjustLoyalty(ctx, { userId: caller._id, email: caller.email, points: -pointsSpent });
      }
    }
    const finalTotal = serverTotal - pointsSpent;

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

    const { sessionToken: _st, pointsToSpend: _pts, pickup: _pickup, ...orderData } = args;
    const orderId = await ctx.db.insert('orders', {
      ...orderData,
      subtotal: serverSubtotal,
      shipping: serverShipping,
      total: finalTotal,
      deliveryGroup,
      deliveryRuleApplied,
      pointsSpent: pointsSpent > 0 ? pointsSpent : undefined,
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
      total: finalTotal,
      itemsCount: args.items.length,
    });

    // Branded confirmation email to the customer (best-effort; no-ops without
    // RESEND_API_KEY or for Telegram placeholder emails).
    await ctx.scheduler.runAfter(0, internal.email.sendOrderConfirmation, {
      to: args.customerEmail,
      orderNumber,
      customerName: args.customerName,
      items: args.items.map((i) => ({ name: i.name, price: i.price, quantity: i.quantity })),
      subtotal: serverSubtotal,
      shipping: serverShipping,
      total: finalTotal,
      shippingAddress: args.shippingAddress,
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

export const getForInvoice = query({
  args: { sessionToken: v.string(), id: v.id('orders') },
  handler: async (ctx, args) => {
    try { await getAdminCaller(ctx, args.sessionToken); } catch { return null; }
    const order = await ctx.db.get(args.id);
    if (!order) return null;
    // Enrich each line item with the product's article (SKU, falling back to
    // the ATG code) by looking up the product snapshot. Items store only a
    // productId reference, so this works for historical orders too.
    const items = await Promise.all(
      order.items.map(async (it) => {
        const product = await ctx.db.get(it.productId);
        return {
          ...it,
          sku: product?.sku ?? product?.atgCode ?? '',
        };
      }),
    );
    return { ...order, items };
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
    const admin = await requireCapability(ctx, args.sessionToken, 'orders');
    await applyOrderStatusChange(ctx, admin, args);
  },
});

type OrderStatusChange = {
  id: Id<'orders'>;
  status?: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus?: 'awaiting' | 'paid' | 'refunded';
  cancelReason?: string;
  cancelComment?: string;
};

/**
 * Core order status/payment transition with all side-effects (stock
 * restock/reserve, loyalty & referral accrual/reversal, order events, web
 * push). Shared by the single `updateStatus` mutation and `bulkAction` so both
 * paths behave identically.
 */
async function applyOrderStatusChange(
  ctx: MutationCtx,
  admin: Awaited<ReturnType<typeof requireCapability>>,
  p: OrderStatusChange,
  skipAudit = false,
) {
    const { id, status, paymentStatus, cancelReason, cancelComment } = p;

    const order = await ctx.db.get(id);
    if (!order) throw new Error('Պատվերը չի գտնվել');

    const prevStatus = order.status;
    const nextStatus = status ?? prevStatus;

    // Loyalty accrual: award when an order is delivered, reverse if it is later
    // cancelled. Gated by store settings; tracked on the order to prevent
    // double-awarding.
    const loyaltyPatch: { loyaltyAwarded?: boolean; loyaltyPointsAwarded?: number } = {};
    if (nextStatus !== prevStatus) {
      const storeSettings = await ctx.db.query('settings').first();
      const loyaltyEnabled = !!storeSettings?.enableLoyalty;
      const loyaltyPercent = storeSettings?.loyaltyPercent ?? 0;

      if (nextStatus === 'delivered' && !order.loyaltyAwarded && loyaltyEnabled) {
        const totalQty = order.items.reduce((sum, it) => sum + it.quantity, 0);
        const pts = resolveCashback(totalQty, order.total, storeSettings?.loyaltyTiers, loyaltyPercent).points;
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

      // Referral reward: when a referred customer's first order is delivered,
      // both the referrer and the new customer earn bonus points (once).
      if (nextStatus === 'delivered' && order.userId && loyaltyEnabled) {
        const buyer = await ctx.db.get(order.userId);
        if (buyer && buyer.referredBy && !buyer.referralRewarded) {
          const REFERRAL_REWARD = storeSettings?.referralReward ?? 100;
          await adjustLoyalty(ctx, { userId: buyer._id, email: buyer.email, points: REFERRAL_REWARD });
          const referrer = await ctx.db.get(buyer.referredBy);
          if (referrer) await adjustLoyalty(ctx, { userId: referrer._id, email: referrer.email, points: REFERRAL_REWARD });
          await ctx.db.patch(buyer._id, { referralRewarded: true });
        }
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

    if ((status !== undefined && status !== prevStatus) || (paymentStatus !== undefined && paymentStatus !== order.paymentStatus)) {
      if (!skipAudit) await logAudit(ctx, admin, 'order.updateStatus',
        `Order #${order.orderNumber}: ${prevStatus}→${nextStatus}${paymentStatus ? `, payment ${paymentStatus}` : ''}`,
        { targetType: 'order', targetId: id, meta: { prevStatus, nextStatus, paymentStatus } });
    }

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

      // Web push to the order owner about the new status.
      if (order.userId) {
        const statusLabels: Record<string, string> = {
          pending: 'սպասում է', confirmed: 'հաստատվեց', processing: 'մշակվում է',
          shipped: 'ուղարկվեց', delivered: 'առաքվեց', cancelled: 'չեղարկվեց',
        };
        await ctx.scheduler.runAfter(0, internal.pushNode.sendToUser, {
          userId: order.userId,
          title: `Պատվեր ${order.orderNumber}`,
          body: `Ձեր պատվերի կարգավիճակը՝ ${statusLabels[status] ?? status}`,
          url: '/orders',
        });
      }
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
}

/** Bulk order status / payment update over a selection (superadmin control:
 * audit-logged once, capability-gated by `orders` + `action.bulk`). Individual
 * order failures (e.g. insufficient stock on reopen) are skipped so one bad
 * order doesn't abort the whole batch. */
export const bulkAction = mutation({
  args: {
    sessionToken: v.string(),
    ids: v.array(v.id('orders')),
    status: v.optional(
      v.union(
        v.literal('pending'), v.literal('confirmed'), v.literal('processing'),
        v.literal('shipped'), v.literal('delivered'), v.literal('cancelled'),
      ),
    ),
    paymentStatus: v.optional(v.union(v.literal('awaiting'), v.literal('paid'), v.literal('refunded'))),
    cancelReason: v.optional(v.string()),
    cancelComment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireCapability(ctx, args.sessionToken, 'orders');
    await requireCapability(ctx, args.sessionToken, 'action.bulk');
    if (args.ids.length === 0) return { updated: 0, failed: 0 };
    if (args.ids.length > 200) throw new Error('Չափից շատ պատվերներ ընտրված են (առավելագույնը՝ 200)');
    if (args.status === 'cancelled' && !args.cancelReason?.trim()) {
      throw new Error('Խնդրում ենք նշել չեղարկման պատճառը');
    }
    let updated = 0;
    let failed = 0;
    for (const id of args.ids) {
      try {
        await applyOrderStatusChange(ctx, admin, {
          id,
          status: args.status,
          paymentStatus: args.paymentStatus,
          cancelReason: args.cancelReason,
          cancelComment: args.cancelComment,
        }, true);
        updated++;
      } catch {
        failed++;
      }
    }
    await logAudit(ctx, admin, 'order.bulkAction',
      `Bulk update on ${updated} order(s)${args.status ? ` → ${args.status}` : ''}${args.paymentStatus ? `, payment ${args.paymentStatus}` : ''}`,
      { targetType: 'order', meta: { count: updated, failed, status: args.status, paymentStatus: args.paymentStatus } });
    return { updated, failed };
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
