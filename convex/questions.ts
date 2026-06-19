import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { getAuthCaller, getAdminCaller } from './lib/auth';

/** Public: approved questions (with answers) for a product. */
export const listByProduct = query({
  args: { productId: v.id('products') },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query('productQuestions')
      .withIndex('by_product', (q) => q.eq('productId', args.productId))
      .order('desc')
      .collect();
    return all.filter((q) => q.isApproved || q.answer);
  },
});

/** Customer asks a question about a product. */
export const ask = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    productId: v.id('products'),
    authorName: v.string(),
    question: v.string(),
  },
  handler: async (ctx, args) => {
    const text = args.question.trim();
    if (text.length < 3 || text.length > 500) throw new Error('Հարցը սխալ է');
    if (!args.authorName.trim() || args.authorName.length > 100) throw new Error('Սխալ անուն');
    const caller = await getAuthCaller(ctx, args.sessionToken);
    return await ctx.db.insert('productQuestions', {
      productId: args.productId,
      authorName: args.authorName.trim(),
      userId: caller?._id,
      question: text,
      isApproved: false,
      createdAt: Date.now(),
    });
  },
});

/** Admin: list all questions (newest first). */
export const listAll = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const caller = await getAuthCaller(ctx, args.sessionToken);
    if (!caller || caller.role !== 'admin') return [];
    const questions = await ctx.db.query('productQuestions').order('desc').take(300);
    // Attach product name for admin display.
    return await Promise.all(questions.map(async (q) => {
      const product = await ctx.db.get(q.productId);
      return { ...q, productName: product?.name ?? '—', productSlug: product?.slug };
    }));
  },
});

/** Admin: answer a question (publishes it). */
export const answer = mutation({
  args: { sessionToken: v.string(), id: v.id('productQuestions'), answer: v.string() },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    await ctx.db.patch(args.id, {
      answer: args.answer.trim() || undefined,
      answeredAt: Date.now(),
      isApproved: true,
    });
  },
});

/** Admin: approve/unapprove a question without answering. */
export const approve = mutation({
  args: { sessionToken: v.string(), id: v.id('productQuestions'), approved: v.boolean() },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    await ctx.db.patch(args.id, { isApproved: args.approved });
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), id: v.id('productQuestions') },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    await ctx.db.delete(args.id);
  },
});
