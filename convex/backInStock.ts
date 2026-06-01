import { v } from 'convex/values';
import { query, mutation, action } from './_generated/server';
import { api } from './_generated/api';
import { getAdminCaller } from './lib/auth';

export const subscribe = mutation({
  args: { productId: v.id('products'), contact: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query('backInStock').withIndex('by_product', (q) => q.eq('productId', args.productId)).collect();
    if (existing.some((r) => r.contact === args.contact && !r.notified)) return null;
    return await ctx.db.insert('backInStock', { productId: args.productId, contact: args.contact, notified: false, createdAt: Date.now() });
  },
});

export const notifySubscribers = action({
  args: { productId: v.id('products'), productName: v.string() },
  handler: async (ctx, args) => {
    const settings = await ctx.runQuery(api.settings.get, {});
    const token = settings?.telegramBotToken;
    const chatId = settings?.telegramChatId;
    if (!token || !chatId) return;

    const subscribers = await ctx.runQuery(api.backInStock.listByProduct, { productId: args.productId });
    const text = [
      `<b>✅ Ապրանքը վերականգնվել է</b>`,
      ``,
      `━━━━━━━━━━━━━━━━━━`,
      `<b>${args.productName}</b>`,
      `🌐 <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://caron.am'}/products/${args.productId}">Դիտել ապրանքը</a>`,
      `━━━━━━━━━━━━━━━━━━`,
    ].join('\n');

    for (const sub of subscribers) {
      try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
        });
      } catch {}
      await ctx.runMutation(api.backInStock.markNotified, { id: sub._id });
    }
  },
});

export const list = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    return await ctx.db.query('backInStock').order('desc').take(200);
  },
});

export const listByProduct = query({
  args: { productId: v.id('products') },
  handler: async (ctx, args) => {
    return await ctx.db.query('backInStock').withIndex('by_product', (q) => q.eq('productId', args.productId)).filter((q) => q.eq(q.field('notified'), false)).collect();
  },
});

export const markNotified = mutation({
  args: { id: v.id('backInStock') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { notified: true });
  },
});
