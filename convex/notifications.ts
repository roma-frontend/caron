import { v } from 'convex/values';
import { action, internalAction } from './_generated/server';
import { api } from './_generated/api';

export const sendOrderNotification = internalAction({
  args: {
    orderNumber: v.string(),
    customerName: v.string(),
    customerPhone: v.string(),
    total: v.number(),
    itemsCount: v.number(),
  },

  handler: async (ctx, args) => {
    const settings = await ctx.runQuery(api.settings.get, {});

    const token = settings?.telegramBotToken;
    const chatId = settings?.telegramChatId;

    if (!token || !chatId) return;

    const text = [
      `📦 Նոր պատվեր!`,
      ``,
      `📝 Պատվերի համար՝ ${args.orderNumber}`,
      `👤 Հաճախորդ՝ ${args.customerName}`,
      `📞 Հեռախոս՝ ${args.customerPhone}`,
      `📦 Ապրանքների քանակ՝ ${args.itemsCount}`,
      `💰 Ընդհանուր գումար՝ ${args.total.toLocaleString()} ֏`,
    ].join('\n');

    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
        }),
      });
    } catch {}
  },
});

export const sendTest = action({
  args: { sessionToken: v.string() },
  handler: async (ctx, args): Promise<boolean> => {
    const caller = await ctx.runQuery(api.auth.me, { sessionToken: args.sessionToken });
    if (!caller || caller.role !== 'admin') throw new Error('Admin access required');

    const settings = await ctx.runQuery(api.settings.get, {});
    const token = settings?.telegramBotToken;
    const chatId = settings?.telegramChatId;
    if (!token || !chatId) throw new Error('Telegram կարգավորումներ չկան');
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: '✅ AutoParts — թեստային ծանուցում: բոտը աշխատում է:' }),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; description?: string } | null;
    if (!res.ok || !data?.ok) throw new Error(data?.description || `Telegram error (HTTP ${res.status})`);
    return true;
  },
});
