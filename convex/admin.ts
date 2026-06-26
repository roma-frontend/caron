import { v } from 'convex/values';
import { query } from './_generated/server';
import { getAuthCaller } from './lib/auth';

const DEFAULT_LOW_STOCK_THRESHOLD = 5;

/**
 * Admin "needs attention" summary for the profile dropdown / mini-dashboard.
 * Returns live counts the admin should act on. Auth-guarded; returns null for
 * non-admins so the UI can hide the block gracefully (instead of throwing).
 *
 * All scans are bounded with `.take(...)` so a growing store never turns this
 * always-subscribed query into an unbounded read.
 */
export const dashboardCounts = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const caller = await getAuthCaller(ctx, args.sessionToken);
    if (!caller || caller.role !== 'admin') return null;

    // Pending orders (indexed)
    const pendingOrders = (
      await ctx.db
        .query('orders')
        .withIndex('by_status', (q) => q.eq('status', 'pending'))
        .take(500)
    ).length;

    // Pending return / exchange requests (indexed)
    const pendingReturns = (
      await ctx.db
        .query('returnRequests')
        .withIndex('by_status', (q) => q.eq('status', 'pending'))
        .take(500)
    ).length;

    // Unanswered product questions (approved index not helpful here → recent scan)
    const recentQuestions = await ctx.db.query('productQuestions').order('desc').take(500);
    const unansweredQuestions = recentQuestions.filter((q) => !q.answer || !q.answer.trim()).length;

    // Reviews awaiting moderation (indexed by approval flag)
    const pendingReviews = (
      await ctx.db
        .query('reviews')
        .withIndex('by_approved', (q) => q.eq('isApproved', false))
        .take(500)
    ).length;

    // Low / out of stock among active products
    const settings = await ctx.db.query('settings').first();
    const threshold = settings?.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD;
    const activeProducts = await ctx.db
      .query('products')
      .withIndex('by_active', (q) => q.eq('isActive', true))
      .take(5000);
    let lowStock = 0;
    let outOfStock = 0;
    for (const p of activeProducts) {
      if (p.stock <= 0) outOfStock++;
      else if (p.stock <= threshold) lowStock++;
    }

    return {
      pendingOrders,
      pendingReturns,
      unansweredQuestions,
      pendingReviews,
      lowStock,
      outOfStock,
      lowStockThreshold: threshold,
    };
  },
});

type CommandHit = { id: string; title: string; subtitle: string; href: string };

/**
 * Global command-palette search across products, orders and customers.
 * Admin-only. Each bucket is capped so the payload stays small. Designed for
 * the Cmd/Ctrl+K palette in the admin shell.
 */
export const commandSearch = query({
  args: { sessionToken: v.string(), query: v.string() },
  handler: async (ctx, args) => {
    const caller = await getAuthCaller(ctx, args.sessionToken);
    if (!caller || caller.role !== 'admin') {
      return { products: [], orders: [], customers: [] };
    }

    const term = args.query.trim().toLowerCase();
    if (term.length < 2) return { products: [], orders: [], customers: [] };

    // ── Products: full-text on name + SKU / OEM fallback ──────────────
    const byName = await ctx.db
      .query('products')
      .withSearchIndex('search_products', (q) => q.search('name', args.query))
      .take(8);
    const productMap = new Map<string, CommandHit>();
    for (const p of byName) {
      productMap.set(p._id, {
        id: p._id,
        title: p.name,
        subtitle: [p.sku ? `SKU ${p.sku}` : null, `${p.stock} հատ`].filter(Boolean).join(' · '),
        href: `/admin/products/${p._id}/edit`,
      });
    }
    if (productMap.size < 6) {
      // Secondary scan for SKU / OEM matches the search index can't cover.
      const scan = await ctx.db.query('products').withIndex('by_active', (q) => q.eq('isActive', true)).take(800);
      for (const p of scan) {
        if (productMap.size >= 8) break;
        if (productMap.has(p._id)) continue;
        const skuMatch = p.sku?.toLowerCase().includes(term);
        const oemMatch = p.oemNumbers?.some((o) => {
          const code = typeof o === 'string' ? o : o.code;
          return code.toLowerCase().includes(term);
        });
        if (skuMatch || oemMatch) {
          productMap.set(p._id, {
            id: p._id,
            title: p.name,
            subtitle: [p.sku ? `SKU ${p.sku}` : null, `${p.stock} հատ`].filter(Boolean).join(' · '),
            href: `/admin/products/${p._id}/edit`,
          });
        }
      }
    }

    // ── Orders: by order number or customer name / phone ──────────────
    const recentOrders = await ctx.db.query('orders').order('desc').take(500);
    const orders: CommandHit[] = recentOrders
      .filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(term) ||
          o.customerName.toLowerCase().includes(term) ||
          o.customerPhone.toLowerCase().includes(term) ||
          o.customerEmail.toLowerCase().includes(term),
      )
      .slice(0, 6)
      .map((o) => ({
        id: o._id,
        title: `#${o.orderNumber}`,
        subtitle: `${o.customerName} · ${Math.round(o.total)} ֏`,
        href: `/admin/orders?q=${encodeURIComponent(o.orderNumber)}`,
      }));

    // ── Customers: name / email / phone ───────────────────────────────
    const customerUsers = await ctx.db
      .query('users')
      .withIndex('by_role', (q) => q.eq('role', 'customer'))
      .order('desc')
      .take(2000);
    const customers: CommandHit[] = customerUsers
      .filter(
        (u) =>
          u.name.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term) ||
          (u.phone ?? '').toLowerCase().includes(term),
      )
      .slice(0, 6)
      .map((u) => ({
        id: u._id,
        title: u.name,
        subtitle: u.email,
        href: `/admin/customers?q=${encodeURIComponent(u.email)}`,
      }));

    return { products: Array.from(productMap.values()).slice(0, 6), orders, customers };
  },
});

type ActivityItem = {
  id: string;
  kind: 'order' | 'return' | 'exchange' | 'review' | 'question';
  ref: string;
  meta: string;
  href: string;
  createdAt: number;
};

/**
 * Unified activity feed for the header notification bell. Merges the most
 * recent actionable events (new orders, return requests, reviews awaiting
 * moderation, unanswered questions) into one time-sorted stream. Admin-only.
 *
 * Returns *structured* items (kind + ref + meta) rather than pre-built titles
 * so the client can localise the wording. "Unread" state is tracked
 * client-side (last-seen timestamp), so this stays a pure read with no write
 * side-effects.
 */
export const recentActivity = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const caller = await getAuthCaller(ctx, args.sessionToken);
    if (!caller || caller.role !== 'admin') return [];

    const items: ActivityItem[] = [];

    // New (pending) orders
    const orders = await ctx.db
      .query('orders')
      .withIndex('by_status', (q) => q.eq('status', 'pending'))
      .order('desc')
      .take(15);
    for (const o of orders) {
      items.push({
        id: `order-${o._id}`,
        kind: 'order',
        ref: o.orderNumber,
        meta: `${o.customerName} · ${Math.round(o.total)} ֏`,
        href: `/admin/orders?q=${encodeURIComponent(o.orderNumber)}`,
        createdAt: o.createdAt,
      });
    }

    // Pending return / exchange requests
    const returns = await ctx.db
      .query('returnRequests')
      .withIndex('by_status', (q) => q.eq('status', 'pending'))
      .order('desc')
      .take(15);
    for (const r of returns) {
      items.push({
        id: `return-${r._id}`,
        kind: r.type === 'exchange' ? 'exchange' : 'return',
        ref: r.orderNumber,
        meta: r.reason,
        href: '/admin/returns',
        createdAt: r.createdAt,
      });
    }

    // Reviews awaiting moderation
    const reviews = await ctx.db
      .query('reviews')
      .withIndex('by_approved', (q) => q.eq('isApproved', false))
      .order('desc')
      .take(15);
    for (const rv of reviews) {
      items.push({
        id: `review-${rv._id}`,
        kind: 'review',
        ref: '★'.repeat(Math.max(1, Math.min(5, Math.round(rv.rating)))),
        meta: rv.authorName + (rv.text ? ` — ${rv.text.slice(0, 50)}` : ''),
        href: '/admin/reviews',
        createdAt: rv.createdAt,
      });
    }

    // Unanswered product questions
    const questions = await ctx.db.query('productQuestions').order('desc').take(40);
    for (const q of questions.filter((x) => !x.answer || !x.answer.trim()).slice(0, 15)) {
      items.push({
        id: `question-${q._id}`,
        kind: 'question',
        ref: '',
        meta: `${q.authorName} — ${q.question.slice(0, 50)}`,
        href: '/admin/qa',
        createdAt: q.createdAt,
      });
    }

    items.sort((a, b) => b.createdAt - a.createdAt);
    return items.slice(0, 30);
  },
});
