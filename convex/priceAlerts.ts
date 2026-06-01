import { v } from 'convex/values';
import { query, mutation, action } from './_generated/server';
import { api } from './_generated/api';

export const subscribe = mutation({
  args: { productId: v.id('products'), email: v.string(), priceAtSubscribe: v.number() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query('priceAlerts').withIndex('by_product', (q) => q.eq('productId', args.productId)).collect();
    if (existing.some((r) => r.email === args.email && !r.notified)) return null;
    return await ctx.db.insert('priceAlerts', {
      productId: args.productId, email: args.email,
      priceAtSubscribe: args.priceAtSubscribe, notified: false, createdAt: Date.now(),
    });
  },
});

export const listByProduct = query({
  args: { productId: v.id('products') },
  handler: async (ctx, args) => {
    return await ctx.db.query('priceAlerts').withIndex('by_product', (q) => q.eq('productId', args.productId)).filter((q) => q.eq(q.field('notified'), false)).collect();
  },
});

export const markNotified = mutation({
  args: { id: v.id('priceAlerts') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { notified: true });
  },
});

export const checkAndNotify = action({
  args: { productId: v.id('products'), newPrice: v.number() },
  handler: async (ctx, args) => {
    const settings = await ctx.runQuery(api.settings.get, {});
    const token = settings?.telegramBotToken;
    const chatId = settings?.telegramChatId;
    if (!token || !chatId) return;

    const subscribers = await ctx.runQuery(api.priceAlerts.listByProduct, { productId: args.productId });

    for (const sub of subscribers) {
      if (args.newPrice < sub.priceAtSubscribe) {
        const drop = sub.priceAtSubscribe - args.newPrice;
        const text = [
          `<b>📉 Գինը նվազել է</b>`,
          ``,
          `━━━━━━━━━━━━━━━━━━`,
          `<b>Հին գին՝</b> ${sub.priceAtSubscribe.toLocaleString()} ֏`,
          `<b>Նոր գին՝</b> ${args.newPrice.toLocaleString()} ֏`,
          `<b>Տարբերություն՝</b> -${drop.toLocaleString()} ֏ (-${Math.round(drop / sub.priceAtSubscribe * 100)}%)`,
          `<a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://caron.am'}/products/${args.productId}">🛒 Դիտել ապրանքը</a>`,
          `━━━━━━━━━━━━━━━━━━`,
        ].join('\n');
        try {
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
          });
        } catch {}
      }
      await ctx.runMutation(api.priceAlerts.markNotified, { id: sub._id });
    }
  },
});
