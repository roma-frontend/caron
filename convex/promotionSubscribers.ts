import { v } from 'convex/values';
import { query, internalQuery, mutation, internalAction } from './_generated/server';
import { api, internal } from './_generated/api';

export const subscribe = mutation({
  args: { contact: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query('promotionSubscribers').withIndex('by_contact', (q) => q.eq('contact', args.contact)).first();
    if (existing && !existing.notified) return existing._id;
    if (existing) return existing._id;
    return await ctx.db.insert('promotionSubscribers', { contact: args.contact, notified: false, createdAt: Date.now() });
  },
});

export const unsubscribe = mutation({
  args: { contact: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query('promotionSubscribers').withIndex('by_contact', (q) => q.eq('contact', args.contact)).first();
    if (existing) await ctx.db.delete(existing._id);
  },
});

export const isSubscribed = query({
  args: { contact: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query('promotionSubscribers').withIndex('by_contact', (q) => q.eq('contact', args.contact)).first();
    return !!existing;
  },
});

export const list = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('promotionSubscribers').order('desc').take(500);
  },
});

export const notifySubscribers = internalAction({
  args: {
    promotionId: v.id('promotions'),
    promotionTitle: v.string(),
    newProductIds: v.array(v.id('products')),
  },
  handler: async (ctx, args) => {
    const settings = await ctx.runQuery(internal.settings.getSecret, {});
    const token = settings?.telegramBotToken;
    if (!token) return;

    const subscribers = await ctx.runQuery(internal.promotionSubscribers.list, {}).catch(() => []);
    if (subscribers.length === 0) return;

    const products = await Promise.all(
      args.newProductIds.map((id) => ctx.runQuery(api.products.getById, { id })),
    );
    const productLinks = products
      .filter(Boolean)
      .map((p) => `• <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://caron.group'}/products/${(p as Record<string, unknown>).slug}"><b>${(p as Record<string, unknown>).name}</b></a>`)
      .join('\n');

    const text = [
      `<b>🎉 Նոր ապրանքներ ակցիայում</b>`,
      ``,
      `━━━━━━━━━━━━━━━━━━`,
      `<b>${args.promotionTitle}</b>`,
      ``,
      productLinks,
      ``,
      `━━━━━━━━━━━━━━━━━━`,
      `<a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://caron.group'}/promotions/${args.promotionId}">🔗 Դիտել ակցիան</a>`,
      ``,
      `<i>Դուք ստանում եք այս նամակը, քանի որ բաժանորդագրվել եք ակցիաների թարմացումներին:</i>`,
    ].join('\n');

    let botUsername = '';
    try {
      const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const meData = (await meRes.json()) as { ok: boolean; result?: { username: string } };
      if (meData.ok && meData.result) botUsername = meData.result.username;
    } catch {}

    for (const sub of subscribers) {
      let chatId = (sub as Record<string, unknown>).contact as string;
      chatId = chatId.replace('@', '');

      if (!/^\d+$/.test(chatId)) {
        try {
          const upRes = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
          const upData = (await upRes.json()) as {
            ok: boolean;
            result?: Array<{ message?: { chat?: { id: number; username?: string } } }>;
          };
          if (upData.ok && upData.result) {
            const match = upData.result.find(
              (u) => u.message?.chat?.username?.toLowerCase() === chatId.toLowerCase(),
            );
            if (match?.message?.chat?.id) chatId = String(match.message.chat.id);
          }
        } catch {}
      }

      try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
        });
      } catch {}
    }
  },
});
