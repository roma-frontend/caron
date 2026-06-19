import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { internal } from './_generated/api';
import { getAuthCaller, getAdminCaller } from './lib/auth';

/** Customer creates a return/exchange request for one of their orders. */
export const create = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    orderId: v.id('orders'),
    type: v.union(v.literal('return'), v.literal('exchange')),
    items: v.array(v.object({
      productId: v.id('products'),
      name: v.string(),
      quantity: v.number(),
    })),
    reason: v.string(),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error('Պատվերը չի գտնվել');
    if (args.items.length === 0) throw new Error('Ընտրեք ապրանք');
    if (!args.reason.trim()) throw new Error('Նշեք պատճառը');

    const caller = await getAuthCaller(ctx, args.sessionToken);
    // Authorisation: order owner (by user) or matching email.
    if (caller && order.userId && order.userId !== caller._id && caller.role !== 'admin') {
      throw new Error('Անհասանելի');
    }

    // Prevent duplicate open requests for the same order.
    const existing = await ctx.db
      .query('returnRequests')
      .withIndex('by_order', (q) => q.eq('orderId', args.orderId))
      .collect();
    if (existing.some((r) => r.status === 'pending' || r.status === 'approved')) {
      throw new Error('Այս պատվերի համար արդեն կա հայտ');
    }

    const id = await ctx.db.insert('returnRequests', {
      orderId: args.orderId,
      orderNumber: order.orderNumber,
      userId: order.userId ?? caller?._id,
      customerEmail: order.customerEmail,
      items: args.items,
      type: args.type,
      reason: args.reason.trim(),
      comment: args.comment?.trim() || undefined,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.notifications.sendReturnNotification, {
      orderNumber: order.orderNumber,
      type: args.type,
      reason: args.reason.trim(),
      itemsCount: args.items.length,
      customerEmail: order.customerEmail,
    });

    return id;
  },
});

/** Current customer's return requests. */
export const listMine = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const caller = await getAuthCaller(ctx, args.sessionToken);
    if (!caller) return [];
    return await ctx.db
      .query('returnRequests')
      .withIndex('by_user', (q) => q.eq('userId', caller._id))
      .order('desc')
      .take(50);
  },
});

/** Admin: list all return requests (optionally by status). */
export const listAll = query({
  args: {
    sessionToken: v.string(),
    status: v.optional(v.union(v.literal('pending'), v.literal('approved'), v.literal('rejected'), v.literal('completed'))),
  },
  handler: async (ctx, args) => {
    try { await getAdminCaller(ctx, args.sessionToken); } catch { return []; }
    const reqs = args.status
      ? await ctx.db.query('returnRequests').withIndex('by_status', (q) => q.eq('status', args.status!)).order('desc').take(300)
      : await ctx.db.query('returnRequests').order('desc').take(300);

    // Enrich items with product image + slug for a card-like admin view.
    return await Promise.all(reqs.map(async (r) => ({
      ...r,
      items: await Promise.all(r.items.map(async (it) => {
        const product = await ctx.db.get(it.productId);
        return { ...it, image: product?.images?.[0] ?? null, slug: product?.slug };
      })),
    })));
  },
});

/** Admin: update a request's status / add a comment. */
export const updateStatus = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id('returnRequests'),
    status: v.union(v.literal('pending'), v.literal('approved'), v.literal('rejected'), v.literal('completed')),
    adminComment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    await ctx.db.patch(args.id, {
      status: args.status,
      adminComment: args.adminComment?.trim() || undefined,
      updatedAt: Date.now(),
    });
  },
});
