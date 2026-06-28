import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { buildSystemPrompt, type UserContext } from '@/lib/aiAssistant';
import { checkRateLimit } from '@/lib/ratelimit';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

// Store context (settings/categories/promotions) changes rarely, but the chat
// rebuilt it on EVERY message — 3 Convex queries per turn. Cache it in module
// memory for a few minutes to cut Convex calls/bandwidth. Survives across warm
// invocations of the same serverless instance; a cold start rebuilds it once.
// Admin/live data (getAdminContext) is intentionally NOT cached.
let _storeCtxCache: { value: string; expires: number } | null = null;
const STORE_CTX_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getStoreContext(client: ConvexHttpClient): Promise<string> {
  const now = Date.now();
  if (_storeCtxCache && _storeCtxCache.expires > now) return _storeCtxCache.value;
  try {
    const [settings, categories, promotions] = await Promise.all([
      client.query(api.settings.getPublic, {}),
      client.query(api.categories.list, {}),
      client.query(api.promotions.active, {}),
    ]);
    if (!settings) return '';

    const cats = categories?.map((c: Record<string, unknown>) => c.name).join(', ') || '';
    const promos = promotions?.slice(0, 5).map((p: Record<string, unknown>) =>
      `• ${p.title}${p.discountPercent ? ` (-${p.discountPercent}%)` : ''}`
    ).join('\n') || 'Այս պահին գործող ակցիաներ չկան';

    const ctx = `
─── STORE SETTINGS (live data) ───

STORE INFO:
- Name: ${settings.storeName || 'Caron'}
- Phone: ${settings.phone || ''}
- Email: ${settings.email || ''}
- Address: ${settings.address || ''}
- Working hours: ${settings.workingHours || ''}
- WhatsApp: ${settings.whatsapp || ''}
- Telegram: ${settings.telegram || ''}
- Instagram: ${settings.instagram || ''}

DELIVERY PRICING:
- Yerevan: ${settings.deliveryYerevan?.toLocaleString() || '?'} AMD (${settings.deliveryEstimateYerevan || '1-3 days'})
- Regions: ${settings.deliveryRegions?.toLocaleString() || '?'} AMD (${settings.deliveryEstimateRegions || '3-5 days'})
- Free shipping above: ${settings.freeShippingThreshold?.toLocaleString() || '?'} AMD
- Pickup: ${settings.enablePickup ? `Yes — ${settings.pickupAddress || 'address in settings'}` : 'No'}

PAYMENT:
- Methods: ${settings.paymentMethods?.join(', ') || 'Cash, Card, Idram, EasyPay, Bank Transfer'}
- Bank: ${settings.bankName || ''} ${settings.bankAccount || ''}
- Card: ${settings.cardNumber || ''}

CATEGORIES (${categories?.length || 0}):
${cats}

ACTIVE PROMOTIONS:
${promos}

FEATURES ENABLED:
- Car selector: ${settings.enableCarSelector ? 'Yes' : 'No'}
- VIN decoder: ${settings.enableVinDecoder ? 'Yes' : 'No'}
- OEM search: ${settings.enableOemSearch ? 'Yes' : 'No'}
- Reviews: ${settings.enableReviews ? 'Yes' : 'No'}
- Loyalty program: ${settings.enableLoyalty ? `Yes (${settings.loyaltyPercent || 0}% cashback)` : 'No'}
- Registration: ${settings.enableRegistration ? 'Yes' : 'No'}
- Quick Buy: ${settings.enableQuickBuy ? 'Yes' : 'No'}
- Back-in-stock alerts: ${settings.enableBackInStock ? 'Yes' : 'No'}
- Price alerts: ${settings.enablePriceAlert ? 'Yes' : 'No'}
${settings.minOrderAmount ? `- Min order: ${settings.minOrderAmount.toLocaleString()} AMD` : ''}
${settings.defaultWarranty ? `- Default warranty: ${settings.defaultWarranty}` : ''}
`;
    _storeCtxCache = { value: ctx, expires: now + STORE_CTX_TTL_MS };
    return ctx;
  } catch {
    // Serve stale cache on transient Convex errors, if we have one.
    return _storeCtxCache?.value ?? '';
  }
}

async function getAdminContext(client: ConvexHttpClient, token: string): Promise<string> {
  try {
    const [orders, products] = await Promise.all([
      client.query(api.orders.listAdmin, { sessionToken: token }),
      client.query(api.products.listAll),
    ]);

    const now = Date.now();
    const DAY = 86400000;
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const today = orders.filter((o: Record<string, unknown>) => (o.createdAt as number) >= todayStart);
    const week = orders.filter((o: Record<string, unknown>) => (o.createdAt as number) >= now - 7 * DAY);
    const month = orders.filter((o: Record<string, unknown>) => (o.createdAt as number) >= now - 30 * DAY);

    const paidMonth = month.filter((o: Record<string, unknown>) => o.paymentStatus === 'paid' && o.status !== 'cancelled');
    const revenueMonth = paidMonth.reduce((s: number, o: Record<string, unknown>) => s + (o.total as number), 0);
    const paidToday = today.filter((o: Record<string, unknown>) => o.paymentStatus === 'paid' && o.status !== 'cancelled');
    const revenueToday = paidToday.reduce((s: number, o: Record<string, unknown>) => s + (o.total as number), 0);

    const pending = orders.filter((o: Record<string, unknown>) => o.status === 'pending');
    const cancelled = month.filter((o: Record<string, unknown>) => o.status === 'cancelled');

    const lowStock = products.filter((p: Record<string, unknown>) => (p.isActive as boolean) && (p.stock as number) > 0 && (p.stock as number) <= 5);
    const outOfStock = products.filter((p: Record<string, unknown>) => (p.isActive as boolean) && (p.stock as number) === 0);

    // Top sold products this month
    const salesMap = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const o of paidMonth) {
      for (const item of (o as Record<string, unknown>).items as Array<{ productId: string; name: string; quantity: number; price: number }>) {
        const prev = salesMap.get(item.productId) ?? { name: item.name, qty: 0, revenue: 0 };
        prev.qty += item.quantity;
        prev.revenue += item.price * item.quantity;
        salesMap.set(item.productId, prev);
      }
    }
    const topSold = [...salesMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    // Cost & profit
    const productMap = new Map(products.map((p: Record<string, unknown>) => [p._id as string, p]));
    let totalCost = 0;
    for (const o of paidMonth) {
      for (const item of (o as Record<string, unknown>).items as Array<{ productId: string; quantity: number }>) {
        const prod = productMap.get(item.productId) as Record<string, unknown> | undefined;
        totalCost += ((prod?.costPrice as number) ?? 0) * item.quantity;
      }
    }
    const profit = revenueMonth - totalCost;
    const margin = revenueMonth > 0 ? ((profit / revenueMonth) * 100).toFixed(1) : '0';

    return `
─── REAL-TIME ADMIN DATA (use this to answer questions) ───

TODAY:
- Orders today: ${today.length}
- Revenue today: ${revenueToday.toLocaleString()} AMD
- Paid orders today: ${paidToday.length}

THIS MONTH (30 days):
- Total orders: ${month.length}
- Paid orders: ${paidMonth.length}
- Revenue: ${revenueMonth.toLocaleString()} AMD
- Cost of goods sold: ${totalCost.toLocaleString()} AMD
- Gross profit: ${profit.toLocaleString()} AMD
- Margin: ${margin}%
- Cancelled: ${cancelled.length}

PENDING NOW:
- Orders waiting: ${pending.length}

STOCK ALERTS:
- Low stock (1-5): ${lowStock.length} products${lowStock.length > 0 ? '\n  ' + lowStock.slice(0, 8).map((p: Record<string, unknown>) => `${p.name} (${p.stock})`).join(', ') : ''}
- Out of stock: ${outOfStock.length} products${outOfStock.length > 0 ? '\n  ' + outOfStock.slice(0, 8).map((p: Record<string, unknown>) => `${String(p.name)}`).join(', ') : ''}

TOP SELLING (30 days):
${topSold.map((p, i) => `${i + 1}. ${p.name} — ${p.qty} pcs, ${p.revenue.toLocaleString()} AMD`).join('\n')}

TOTAL PRODUCTS: ${products.length}

LINKS FOR DETAILED VIEW:
- Orders dashboard: /admin/orders
- Stock movements: /admin/stock
- Analytics (filter by category/brand): /admin/analytics
- Products list: /admin/products
- Settings: /admin/settings
`;
  } catch {
    return '';
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown';
  const { allowed, reset } = await checkRateLimit(`ai-chat:${ip}`);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(reset) } });
  }

  try {
    const { message, history } = await req.json() as {
      message: string;
      history?: { role: 'user' | 'assistant'; content: string }[];
    };

    if (!message) {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 });
    }

    if (typeof message !== 'string' || message.length > 2000) {
      return NextResponse.json({ error: 'Message too long' }, { status: 400 });
    }

    const token = req.cookies.get('auth-token')?.value;
    let user: UserContext = { name: 'Guest', email: '', role: 'guest' };
    let adminData = '';
    let storeData = '';

    const client = process.env.NEXT_PUBLIC_CONVEX_URL
      ? new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL)
      : null;

    if (client) {
      storeData = await getStoreContext(client);

      if (token) {
        const me = await client.query(api.auth.me, { sessionToken: token }).catch(() => null);
        if (me) {
          user = {
            name: me.name,
            email: me.email,
            role: me.role === 'admin' ? 'admin' : 'customer',
          };
          if (me.role === 'admin') {
            adminData = await getAdminContext(client, token);
          }
        }
      }
    }

    const systemPrompt = buildSystemPrompt(user) + storeData + adminData;

    const messages = [
      ...(history || []).slice(-10).filter((m) => typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant')).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content.slice(0, 2000),
      })),
      { role: 'user' as const, content: message },
    ];

    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      system: systemPrompt,
      messages,
    });

    return NextResponse.json({ reply: text });
  } catch (error) {
    console.error('[AI Chat]', error);
    return NextResponse.json(
      { error: 'AI service unavailable' },
      { status: 500 },
    );
  }
}
