import { v } from 'convex/values';
import { action, internalAction } from './_generated/server';
import { api, internal } from './_generated/api';

function fmt(n: number): string {
  return n.toLocaleString('hy-AM');
}

export const sendOrderNotification = internalAction({
  args: {
    orderNumber: v.string(),
    customerName: v.string(),
    customerPhone: v.string(),
    total: v.number(),
    itemsCount: v.number(),
  },

  handler: async (ctx, args) => {
    const settings = await ctx.runQuery(internal.settings.getSecret, {});
    const token = settings?.telegramBotToken;
    const chatId = settings?.telegramChatId;
    if (!token || !chatId) return;

    const text = [
      `<b>🛒 Նոր պատվեր</b>`,
      ``,
      `━━━━━━━━━━━━━━━━━━`,
      `<b>📝 Պատվերի համար՝</b> <code>${args.orderNumber}</code>`,
      `<b>👤 Անուն՝</b> ${args.customerName}`,
      `<b>📞 Հեռախոս՝</b> ${args.customerPhone}`,
      `<b>📦 Ապրանքների քանակ՝</b> ${args.itemsCount} հատ`,
      `<b>💰 Ընդհանուր գումար՝</b> <b>${fmt(args.total)} ֏</b>`,
      `━━━━━━━━━━━━━━━━━━`,
      ``,
      `<a href="https://caron.am/admin/orders">📋 Դիտել բոլոր պատվերները</a>`,
    ].join('\n');

    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
      });
    } catch {}
  },
});

export const sendTest = action({
  args: { sessionToken: v.string() },
  handler: async (ctx, args): Promise<boolean> => {
    const caller = await ctx.runQuery(api.auth.me, { sessionToken: args.sessionToken });
    if (!caller || caller.role !== 'admin') throw new Error('Admin access required');

    const settings = await ctx.runQuery(internal.settings.getSecret, {});
    const token = settings?.telegramBotToken;
    const chatId = settings?.telegramChatId;
    if (!token || !chatId) throw new Error('Telegram կարգավորումներ չկան');
    const testHtml = [
      `<b>✅ Caron — Թեստային հաղորդագրություն</b>`,
      ``,
      `━━━━━━━━━━━━━━━━━━`,
      `<b>Բոտը աշխատում է՝</b> ✅`,
      `<b>🕐 Ժամը՝</b> ${new Date().toLocaleString('hy-AM')}`,
      `━━━━━━━━━━━━━━━━━━`,
      ``,
      `<i>Շնորհակալություն, որ ընտրել եք մեզ</i> 🚗`,
    ].join('\n');
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: testHtml, parse_mode: 'HTML' }),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; description?: string } | null;
    if (!res.ok || !data?.ok) throw new Error(data?.description || `Telegram error (HTTP ${res.status})`);
    return true;
  },
});

export const sendDailyReport = action({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.runQuery(internal.settings.getSecret, {});
    const token = settings?.telegramBotToken;
    const chatId = settings?.telegramChatId;
    if (!token || !chatId) return;
    const orders = await ctx.runQuery(api.orders.listAdmin, { sessionToken: '__internal__' }).catch(() => [] as Array<Record<string, unknown>>);
    const today = orders.filter((o: Record<string, unknown>) => Number(o.createdAt) > Date.now() - 86400000);
    const revenue = today.reduce((s: number, o: Record<string, unknown>) => s + Number(o.total), 0);
    const text = [
      `<b>📊 Օրվա հաշվետվություն</b>`,
      ``,
      `━━━━━━━━━━━━━━━━━━`,
      `<b>📦 Պատվերներ այսօր՝</b> ${today.length}`,
      `<b>💰 Եկամուտ՝</b> ${fmt(revenue)} ֏`,
      `<b>🕐 Ամսաթիվ՝</b> ${new Date().toLocaleDateString('hy-AM')}`,
      `━━━━━━━━━━━━━━━━━━`,
      `<a href="https://caron.am/admin/orders">📋 Դիտել բոլոր պատվերները</a>`,
    ].join('\n');
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    });
  },
});

export const sendLowStockAlert = action({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.runQuery(internal.settings.getSecret, {});
    const token = settings?.telegramBotToken;
    const chatId = settings?.telegramChatId;
    const threshold = settings?.lowStockThreshold ?? 5;
    if (!token || !chatId) return;
    // Note: simplified check — in production would query products with stock <= threshold
    const text = [
      `<b>⚠️ Ցածր պաշարի մասին ծանուցում</b>`,
      ``,
      `━━━━━━━━━━━━━━━━━━`,
      `<b>Շեմ՝</b> ${threshold} հատ`,
      `<a href="https://caron.am/admin/products">📋 Դիտել ապրանքները</a>`,
      `━━━━━━━━━━━━━━━━━━`,
    ].join('\n');
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    });
  },
});

export const sendReceiptToCustomer = action({
  args: {
    orderId: v.id('orders'),
    telegramUser: v.string(),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const s = await ctx.runQuery(internal.settings.getSecret, {});
    const settings = s as Record<string, unknown> | null | undefined;
    const token = settings?.telegramBotToken as string | undefined;
    if (!token) return { ok: false, error: 'Telegram bot not configured' };

    let botUsername = '';
    try {
      const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const meData = (await meRes.json()) as { ok: boolean; result?: { username: string } };
      if (meData.ok && meData.result) botUsername = meData.result.username;
    } catch {}

    const order = await ctx.runQuery(api.orders.getById, { id: args.orderId, sessionToken: args.sessionToken });
    if (!order) return { ok: false, error: 'Order not found', botUsername };

    const o = order as unknown as Record<string, unknown>;
    let chatId = args.telegramUser.replace('@', '');

    // Try to resolve @username → numeric chat_id via getUpdates
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

    const items = (o.items as Array<Record<string, unknown>>) || [];
    const itemsList = items
      .map(
        (item, i) =>
          `${i + 1}. <b>${String(item.name)}</b>\n` +
          `   ${Number(item.quantity)} × ${fmt(Number(item.price))} ֏ = <b>${fmt(Number(item.price) * Number(item.quantity))} ֏</b>`,
      )
      .join('\n\n');

    const logo = (settings?.logoUrl as string) || '🛒';
    const storeName = (settings?.storeName as string) || 'Caron Armenia';
    const phone = (settings?.phone as string) || '';
    const address = (settings?.address as string) || '';

    const text = [
      `<b>${logo} ${storeName}</b>`,
      ``,
      `━━━━━━━━━━━━━━━━━━`,
      `<b>✅ Պատվերը հաստատված է</b>`,
      `<b>📝 Պատվեր՝</b> <code>${String(o.orderNumber)}</code>`,
      `<b>📅 Ամսաթիվ՝</b> ${new Date(Number(o.createdAt)).toLocaleString('hy-AM', { timeZone: 'Asia/Yerevan' })}`,
      ``,
      `━━ 🧾 <b>Ապրանքներ</b> ━━━━━━━━━`,
      ``,
      itemsList,
      ``,
      `━━━━━━━━━━━━━━━━━━`,
      `<b>📦 Ենթագումար՝</b> ${fmt(Number(o.subtotal))} ֏`,
      `<b>🚚 Առաքում՝</b> ${Number(o.shipping) === 0 ? 'Անվճար' : `${fmt(Number(o.shipping))} ֏`}`,
      `<b>💰 Ընդհանուր՝</b> <b>${fmt(Number(o.total))} ֏</b>`,
      ``,
      `━━ 📍 <b>Առաքում</b> ━━━━━━━━━`,
      `<b>👤 Անուն՝</b> ${String(o.customerName)}`,
      `<b>📞 Հեռ․՝</b> ${String(o.customerPhone)}`,
      `<b>📍 Հասցե՝</b> ${String(o.shippingAddress)}`,
      ...(o.notes ? [`<b>📝 Նշում՝</b> ${String(o.notes)}`] : []),
      ``,
      `━━ 📞 <b>Կոնտակտ</b> ━━━━━━━━`,
      ...(phone ? [`<b>📞</b> ${phone}`] : []),
      ...(address ? [`<b>📍</b> ${address}`] : []),
      ``,
      `<i>Շնորհակալություն գնման համար</i> 🚗💨`,
    ].join('\n');

    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; description?: string } | null;
      if (!res.ok || !data?.ok) return { ok: false, error: data?.description || `HTTP ${res.status}`, botUsername };
      return { ok: true, botUsername };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },
});

export const sendCartRecovery = action({
  args: { sessionToken: v.string(), cartItems: v.number(), cartTotal: v.number() },
  handler: async (ctx, args) => {
    const settings = await ctx.runQuery(internal.settings.getSecret, {});
    const token = settings?.telegramBotToken;
    const chatId = settings?.telegramChatId;
    if (!token || !chatId) return;
    const text = [
      `<b>🛒 Լքված զամբյուղ</b>`,
      ``,
      `━━━━━━━━━━━━━━━━━━`,
      `<b>📦 Ապրանքներ՝</b> ${args.cartItems} հատ`,
      `<b>💰 Գումար՝</b> ${fmt(args.cartTotal)} ֏`,
      `<a href="https://caron.am/cart">🛒 Վերադառնալ զամբյուղ</a>`,
      `━━━━━━━━━━━━━━━━━━`,
    ].join('\n');
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    });
  },
});
