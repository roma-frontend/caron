import { v } from 'convex/values';
import { query } from './_generated/server';
import { getAdminCaller } from './lib/auth';

/**
 * Unified "Needs attention" inbox — aggregates the actionable queues scattered
 * across the panel into a single set of counts + small previews, so staff can
 * see at a glance what requires action without touring every section.
 */
export const getInbox = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);

    const [pendingOrders, awaitingPayment, pendingReturns, pendingReviews, questions, lowStock] = await Promise.all([
      ctx.db.query('orders').withIndex('by_status', (q) => q.eq('status', 'pending')).take(500),
      ctx.db.query('orders').withIndex('by_payment_status', (q) => q.eq('paymentStatus', 'awaiting')).take(500),
      ctx.db.query('returnRequests').withIndex('by_status', (q) => q.eq('status', 'pending')).take(500),
      ctx.db.query('reviews').withIndex('by_approved', (q) => q.eq('isApproved', false)).take(500),
      ctx.db.query('productQuestions').take(2000),
      ctx.db.query('products').withIndex('by_active', (q) => q.eq('isActive', true)).take(5000),
    ]);

    const unansweredQuestions = questions.filter((q) => !q.answer);
    const zeroStock = lowStock.filter((p) => p.stock <= 0);

    return {
      counts: {
        pendingOrders: pendingOrders.length,
        awaitingPayment: awaitingPayment.length,
        pendingReturns: pendingReturns.length,
        pendingReviews: pendingReviews.length,
        unansweredQuestions: unansweredQuestions.length,
        zeroStock: zeroStock.length,
      },
      previews: {
        orders: pendingOrders
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, 5)
          .map((o) => ({ id: o._id, orderNumber: o.orderNumber, customerName: o.customerName, total: o.total, createdAt: o.createdAt })),
        returns: pendingReturns
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, 5)
          .map((r) => ({ id: r._id, orderNumber: r.orderNumber, type: r.type, createdAt: r.createdAt })),
        questions: unansweredQuestions
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, 5)
          .map((q) => ({ id: q._id, authorName: q.authorName, question: q.question, createdAt: q.createdAt })),
      },
    };
  },
});

/** Parse a stored cart JSON into a bounded summary. */
function summarizeCart(cartJson: string | undefined): { itemCount: number; total: number } | null {
  if (!cartJson) return null;
  try {
    const items = JSON.parse(cartJson) as Array<{ price?: number; quantity?: number }>;
    if (!Array.isArray(items) || items.length === 0) return null;
    let itemCount = 0;
    let total = 0;
    for (const it of items) {
      const q = Number(it.quantity) || 0;
      const p = Number(it.price) || 0;
      itemCount += q;
      total += q * p;
    }
    if (itemCount === 0) return null;
    return { itemCount, total };
  } catch {
    return null;
  }
}

/**
 * Customers who left items in their cart without checking out. Uses the
 * server-persisted `cartJson` on the user record. Sorted by cart value so the
 * highest-value recovery opportunities surface first.
 */
export const getAbandonedCarts = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    const customers = await ctx.db.query('users').withIndex('by_role', (q) => q.eq('role', 'customer')).take(5000);

    const rows = [];
    for (const u of customers) {
      const summary = summarizeCart(u.cartJson);
      if (!summary) continue;
      const isTelegram = u.email?.endsWith('@telegram.local');
      rows.push({
        userId: u._id,
        name: u.name,
        email: isTelegram ? undefined : u.email,
        phone: u.phone,
        telegramUsername: u.telegramUsername,
        itemCount: summary.itemCount,
        total: summary.total,
      });
    }
    rows.sort((a, b) => b.total - a.total);
    return { count: rows.length, totalValue: rows.reduce((s, r) => s + r.total, 0), rows: rows.slice(0, 100) };
  },
});
