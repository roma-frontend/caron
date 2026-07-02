import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import { api } from './_generated/api';
import schema from './schema';
import type { Id } from './_generated/dataModel';

const modules = import.meta.glob('./**/*.ts');
type T = ReturnType<typeof convexTest>;

async function seedCategory(t: T): Promise<Id<'categories'>> {
  return await t.run(async (ctx) =>
    ctx.db.insert('categories', { name: 'Cat', slug: `cat-${Math.random().toString(36).slice(2)}`, order: 0, isActive: true, createdAt: Date.now() }) as Promise<Id<'categories'>>,
  );
}

async function seedProduct(
  t: T,
  categoryId: Id<'categories'>,
  opts: { price: number; stock: number; isActive?: boolean },
): Promise<Id<'products'>> {
  return await t.run(async (ctx) =>
    ctx.db.insert('products', {
      name: 'Widget', slug: `w-${Math.random().toString(36).slice(2)}`, description: 'd',
      price: opts.price, categoryId, images: [], stock: opts.stock,
      isActive: opts.isActive ?? true, createdAt: Date.now(), updatedAt: Date.now(),
    }) as Promise<Id<'products'>>,
  );
}

const REQUIRED_SETTINGS = {
  storeName: 'S', phone: '', email: '', address: '', whatsapp: '', telegram: '',
  instagram: '', facebook: '', deliveryYerevan: 0, deliveryRegions: 0,
  freeShippingThreshold: 0, announcementBar: '', workingHours: '',
};
async function seedSettings(t: T, overrides: Record<string, unknown> = {}) {
  await t.run(async (ctx) => { await ctx.db.insert('settings', { ...REQUIRED_SETTINGS, ...overrides }); });
}

async function seedUserWithLoyalty(t: T, points: number): Promise<{ token: string; userId: Id<'users'> }> {
  const token = `tok-${Math.random().toString(36).slice(2)}`;
  const userId = await t.run(async (ctx) => {
    const uid = await ctx.db.insert('users', { name: 'C', email: 'c@x.com', role: 'customer', isActive: true, createdAt: Date.now() }) as Id<'users'>;
    await ctx.db.insert('sessions', { userId: uid, token, expiresAt: Date.now() + 3_600_000, createdAt: Date.now() });
    await ctx.db.insert('loyaltyPoints', { userId: uid, email: 'c@x.com', points, totalEarned: points, createdAt: Date.now() });
    return uid;
  });
  return { token, userId };
}

/** Create an order and drain best-effort scheduled notifications. */
async function createOrder(t: T, args: Record<string, unknown>): Promise<Id<'orders'>> {
  const id = await t.mutation(api.orders.create, args as never) as Id<'orders'>;
  await t.finishInProgressScheduledFunctions();
  return id;
}

const baseItemArgs = (productId: Id<'products'>, clientPrice: number, qty: number) => ({
  customerName: 'John', customerEmail: 'john@x.com', customerPhone: '+37400', shippingAddress: 'addr',
  items: [{ productId, name: 'Widget', price: clientPrice, quantity: qty }],
  subtotal: clientPrice * qty, shipping: 0, total: clientPrice * qty,
});

describe('orders.create — price & stock', () => {
  it('recomputes subtotal from DB price, ignoring the client-sent price', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    const pid = await seedProduct(t, cat, { price: 1000, stock: 10 });
    // Client tries to pay 1 per unit; server must charge 1000.
    const orderId = await createOrder(t, { ...baseItemArgs(pid, 1, 2), pickup: true });
    const order = await t.run((ctx) => ctx.db.get(orderId));
    expect(order?.subtotal).toBe(2000);
    expect(order?.total).toBe(2000);
  });

  it('deducts stock and records a sale movement', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    const pid = await seedProduct(t, cat, { price: 500, stock: 10 });
    await createOrder(t, { ...baseItemArgs(pid, 500, 3), pickup: true });
    const { stock, movements } = await t.run(async (ctx) => ({
      stock: (await ctx.db.get(pid))?.stock,
      movements: await ctx.db.query('stockMovements').collect(),
    }));
    expect(stock).toBe(7);
    expect(movements).toHaveLength(1);
    expect(movements[0].type).toBe('sale');
    expect(movements[0].qty).toBe(-3);
  });

  it('rejects an order exceeding available stock', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    const pid = await seedProduct(t, cat, { price: 500, stock: 2 });
    await expect(createOrder(t, { ...baseItemArgs(pid, 500, 5), pickup: true })).rejects.toThrow();
  });

  it('rejects an inactive product', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    const pid = await seedProduct(t, cat, { price: 500, stock: 10, isActive: false });
    await expect(createOrder(t, { ...baseItemArgs(pid, 500, 1), pickup: true })).rejects.toThrow();
  });
});

describe('orders.create — shipping', () => {
  it('is free for pickup regardless of settings', async () => {
    const t = convexTest(schema, modules);
    await seedSettings(t, { deliveryYerevan: 800 });
    const cat = await seedCategory(t);
    const pid = await seedProduct(t, cat, { price: 1000, stock: 10 });
    const orderId = await createOrder(t, { ...baseItemArgs(pid, 1000, 1), pickup: true });
    const order = await t.run((ctx) => ctx.db.get(orderId));
    expect(order?.shipping).toBe(0);
    expect(order?.total).toBe(1000);
  });

  it('applies the per-group base price from settings when not pickup', async () => {
    const t = convexTest(schema, modules);
    await seedSettings(t, { deliveryYerevan: 800 });
    const cat = await seedCategory(t);
    const pid = await seedProduct(t, cat, { price: 1000, stock: 10 });
    const orderId = await createOrder(t, { ...baseItemArgs(pid, 1000, 1) }); // no pickup
    const order = await t.run((ctx) => ctx.db.get(orderId));
    expect(order?.shipping).toBe(800);
    expect(order?.total).toBe(1800);
  });

  it('waives shipping above the free-shipping threshold', async () => {
    const t = convexTest(schema, modules);
    await seedSettings(t, { deliveryYerevan: 800, freeShippingThreshold: 1000 });
    const cat = await seedCategory(t);
    const pid = await seedProduct(t, cat, { price: 1000, stock: 10 });
    const orderId = await createOrder(t, { ...baseItemArgs(pid, 1000, 1) });
    const order = await t.run((ctx) => ctx.db.get(orderId));
    expect(order?.shipping).toBe(0);
    expect(order?.total).toBe(1000);
  });
});

describe('orders.create — loyalty redemption', () => {
  it('spends points (capped at balance) and reduces the total', async () => {
    const t = convexTest(schema, modules);
    await seedSettings(t, { enableLoyalty: true });
    const cat = await seedCategory(t);
    const pid = await seedProduct(t, cat, { price: 1000, stock: 10 });
    const { token, userId } = await seedUserWithLoyalty(t, 500);
    const orderId = await createOrder(t, { ...baseItemArgs(pid, 1000, 1), pickup: true, sessionToken: token, pointsToSpend: 300 });
    const order = await t.run((ctx) => ctx.db.get(orderId));
    expect(order?.pointsSpent).toBe(300);
    expect(order?.total).toBe(700);
    const balance = await t.run(async (ctx) => (await ctx.db.query('loyaltyPoints').withIndex('by_user', (q) => q.eq('userId', userId)).first())?.points);
    expect(balance).toBe(200);
  });

  it('caps points spent at the available balance', async () => {
    const t = convexTest(schema, modules);
    await seedSettings(t, { enableLoyalty: true });
    const cat = await seedCategory(t);
    const pid = await seedProduct(t, cat, { price: 5000, stock: 10 });
    const { token } = await seedUserWithLoyalty(t, 500);
    const orderId = await createOrder(t, { ...baseItemArgs(pid, 5000, 1), pickup: true, sessionToken: token, pointsToSpend: 99999 });
    const order = await t.run((ctx) => ctx.db.get(orderId));
    expect(order?.pointsSpent).toBe(500);
    expect(order?.total).toBe(4500);
  });

  it('ignores points for a guest checkout', async () => {
    const t = convexTest(schema, modules);
    await seedSettings(t, { enableLoyalty: true });
    const cat = await seedCategory(t);
    const pid = await seedProduct(t, cat, { price: 1000, stock: 10 });
    const orderId = await createOrder(t, { ...baseItemArgs(pid, 1000, 1), pickup: true, pointsToSpend: 300 });
    const order = await t.run((ctx) => ctx.db.get(orderId));
    expect(order?.pointsSpent).toBeUndefined();
    expect(order?.total).toBe(1000);
  });

  it('ignores points when loyalty is disabled in settings', async () => {
    const t = convexTest(schema, modules);
    await seedSettings(t, { enableLoyalty: false });
    const cat = await seedCategory(t);
    const pid = await seedProduct(t, cat, { price: 1000, stock: 10 });
    const { token } = await seedUserWithLoyalty(t, 500);
    const orderId = await createOrder(t, { ...baseItemArgs(pid, 1000, 1), pickup: true, sessionToken: token, pointsToSpend: 300 });
    const order = await t.run((ctx) => ctx.db.get(orderId));
    expect(order?.pointsSpent).toBeUndefined();
    expect(order?.total).toBe(1000);
  });
});

describe('orders.create — delivery zones & rules', () => {
  async function seedZone(t: T, z: Record<string, unknown>): Promise<Id<'deliveryZones'>> {
    return await t.run(async (ctx) =>
      ctx.db.insert('deliveryZones', {
        group: 'yerevan', name: 'Center', schedule: '', order: 0, isActive: true, ...z,
      }) as Promise<Id<'deliveryZones'>>,
    );
  }
  async function seedRule(t: T, r: Record<string, unknown>): Promise<Id<'deliveryRules'>> {
    return await t.run(async (ctx) =>
      ctx.db.insert('deliveryRules', {
        name: 'rule', isActive: true, priority: 1, effectType: 'free', createdAt: Date.now(), ...r,
      }) as Promise<Id<'deliveryRules'>>,
    );
  }

  it('charges the zone base price', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    const pid = await seedProduct(t, cat, { price: 1000, stock: 10 });
    const zone = await seedZone(t, { price: 700 });
    const orderId = await createOrder(t, { ...baseItemArgs(pid, 1000, 1), deliveryZoneId: zone });
    const order = await t.run((ctx) => ctx.db.get(orderId));
    expect(order?.shipping).toBe(700);
    expect(order?.total).toBe(1700);
    expect(order?.deliveryGroup).toBe('yerevan');
  });

  it('applies the per-zone free-shipping threshold', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    const pid = await seedProduct(t, cat, { price: 1000, stock: 10 });
    const zone = await seedZone(t, { price: 700, freeThreshold: 1000 });
    const orderId = await createOrder(t, { ...baseItemArgs(pid, 1000, 2), deliveryZoneId: zone }); // subtotal 2000 >= 1000
    const order = await t.run((ctx) => ctx.db.get(orderId));
    expect(order?.shipping).toBe(0);
  });

  it('an active "free" rule overrides the zone price and is recorded', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    const pid = await seedProduct(t, cat, { price: 1000, stock: 10 });
    const zone = await seedZone(t, { price: 700 });
    await seedRule(t, { name: 'freeYerevan', effectType: 'free', group: 'yerevan', priority: 1 });
    const orderId = await createOrder(t, { ...baseItemArgs(pid, 1000, 1), deliveryZoneId: zone });
    const order = await t.run((ctx) => ctx.db.get(orderId));
    expect(order?.shipping).toBe(0);
    expect(order?.deliveryRuleApplied).toBe('freeYerevan');
  });

  it('a fixed rule sets an explicit shipping price', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    const pid = await seedProduct(t, cat, { price: 1000, stock: 10 });
    const zone = await seedZone(t, { price: 700 });
    await seedRule(t, { name: 'flat300', effectType: 'fixed', effectValue: 300, priority: 1 });
    const orderId = await createOrder(t, { ...baseItemArgs(pid, 1000, 1), deliveryZoneId: zone });
    expect((await t.run((ctx) => ctx.db.get(orderId)))?.shipping).toBe(300);
  });

  it('a percent rule reduces the zone base price', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    const pid = await seedProduct(t, cat, { price: 1000, stock: 10 });
    const zone = await seedZone(t, { price: 1000 });
    await seedRule(t, { name: '30off', effectType: 'percent', effectValue: 30, priority: 1 });
    const oid = await createOrder(t, { ...baseItemArgs(pid, 1000, 1), deliveryZoneId: zone });
    expect((await t.run((ctx) => ctx.db.get(oid)))?.shipping).toBe(700);
  });

  it('ignores a rule whose minOrderTotal is not met', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    const pid = await seedProduct(t, cat, { price: 1000, stock: 10 });
    const zone = await seedZone(t, { price: 700 });
    await seedRule(t, { name: 'freeBig', effectType: 'free', minOrderTotal: 5000, priority: 1 });
    // subtotal 1000 < 5000 → rule skipped → base price stands
    const oid = await createOrder(t, { ...baseItemArgs(pid, 1000, 1), deliveryZoneId: zone });
    expect((await t.run((ctx) => ctx.db.get(oid)))?.shipping).toBe(700);
  });
});
