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



/** Seed a staff user + session; superadmin bypasses all capability checks. */
async function staffSession(t: T, role: 'superadmin' | 'admin' | 'manager' = 'superadmin'): Promise<string> {
  const token = `stok-${Math.random().toString(36).slice(2)}`;
  await t.run(async (ctx) => {
    const uid = await ctx.db.insert('users', { name: role, email: `${role}-${Math.random().toString(36).slice(2)}@x.com`, role, isActive: true, createdAt: Date.now() }) as Id<'users'>;
    await ctx.db.insert('sessions', { userId: uid, token, expiresAt: Date.now() + 3_600_000, createdAt: Date.now() });
  });
  return token;
}

describe('orders.updateStatus — cancel / reopen / stock', () => {
  it('restocks and records a cancel movement when cancelled', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    const pid = await seedProduct(t, cat, { price: 1000, stock: 10 });
    const orderId = await createOrder(t, { ...baseItemArgs(pid, 1000, 3), pickup: true });
    const token = await staffSession(t);
    await t.mutation(api.orders.updateStatus, { sessionToken: token, id: orderId, status: 'cancelled', cancelReason: 'customer changed mind' });
    const { stock, movements, order } = await t.run(async (ctx) => ({
      stock: (await ctx.db.get(pid))?.stock,
      movements: await ctx.db.query('stockMovements').collect(),
      order: await ctx.db.get(orderId),
    }));
    expect(stock).toBe(10); // 7 after sale, back to 10 after cancel
    expect(order?.status).toBe('cancelled');
    expect(order?.cancelReason).toBe('customer changed mind');
    expect(movements.some((m) => m.type === 'cancel' && m.qty === 3)).toBe(true);
  });

  it('rejects cancellation without a reason', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    const pid = await seedProduct(t, cat, { price: 1000, stock: 10 });
    const orderId = await createOrder(t, { ...baseItemArgs(pid, 1000, 1), pickup: true });
    const token = await staffSession(t);
    await expect(t.mutation(api.orders.updateStatus, { sessionToken: token, id: orderId, status: 'cancelled' })).rejects.toThrow();
  });

  it('re-reserves stock when a cancelled order is re-opened', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    const pid = await seedProduct(t, cat, { price: 1000, stock: 10 });
    const orderId = await createOrder(t, { ...baseItemArgs(pid, 1000, 2), pickup: true });
    const token = await staffSession(t);
    await t.mutation(api.orders.updateStatus, { sessionToken: token, id: orderId, status: 'cancelled', cancelReason: 'x' });
    await t.mutation(api.orders.updateStatus, { sessionToken: token, id: orderId, status: 'confirmed' });
    const { stock, movements } = await t.run(async (ctx) => ({
      stock: (await ctx.db.get(pid))?.stock,
      movements: await ctx.db.query('stockMovements').collect(),
    }));
    expect(stock).toBe(8); // reserved again
    expect(movements.some((m) => m.type === 'reopen' && m.qty === -2)).toBe(true);
  });

  it('records a payment_changed event and updates paymentStatus', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    const pid = await seedProduct(t, cat, { price: 1000, stock: 10 });
    const orderId = await createOrder(t, { ...baseItemArgs(pid, 1000, 1), pickup: true });
    const token = await staffSession(t);
    await t.mutation(api.orders.updateStatus, { sessionToken: token, id: orderId, paymentStatus: 'paid' });
    const { order, events } = await t.run(async (ctx) => ({
      order: await ctx.db.get(orderId),
      events: await ctx.db.query('orderEvents').withIndex('by_order', (q) => q.eq('orderId', orderId)).collect(),
    }));
    expect(order?.paymentStatus).toBe('paid');
    expect(events.some((e) => e.type === 'payment_changed' && e.nextValue === 'paid')).toBe(true);
  });

  it('rejects without the orders capability', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    const pid = await seedProduct(t, cat, { price: 1000, stock: 10 });
    const orderId = await createOrder(t, { ...baseItemArgs(pid, 1000, 1), pickup: true });
    await expect(t.mutation(api.orders.updateStatus, { sessionToken: 'bogus', id: orderId, status: 'confirmed' })).rejects.toThrow();
  });
});

describe('orders.updateStatus — loyalty accrual', () => {
  it('awards loyalty points when an order is delivered and reverses on cancel', async () => {
    const t = convexTest(schema, modules);
    await seedSettings(t, { enableLoyalty: true, loyaltyPercent: 10 });
    const cat = await seedCategory(t);
    const pid = await seedProduct(t, cat, { price: 1000, stock: 10 });
    const { token, userId } = await seedUserWithLoyalty(t, 0);
    const orderId = await createOrder(t, { ...baseItemArgs(pid, 1000, 1), pickup: true, sessionToken: token });
    const admin = await staffSession(t);
    await t.mutation(api.orders.updateStatus, { sessionToken: admin, id: orderId, status: 'delivered' });
    const awarded = await t.run(async (ctx) => (await ctx.db.query('loyaltyPoints').withIndex('by_user', (q) => q.eq('userId', userId)).first())?.points ?? 0);
    expect(awarded).toBeGreaterThan(0);
    // Cancelling a delivered order reverses the awarded points.
    await t.mutation(api.orders.updateStatus, { sessionToken: admin, id: orderId, status: 'cancelled', cancelReason: 'return' });
    const after = await t.run(async (ctx) => (await ctx.db.query('loyaltyPoints').withIndex('by_user', (q) => q.eq('userId', userId)).first())?.points ?? 0);
    expect(after).toBe(0);
  });
});

describe('orders.bulkAction', () => {
  it('updates many orders and skips failures', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    const pid = await seedProduct(t, cat, { price: 1000, stock: 100 });
    const o1 = await createOrder(t, { ...baseItemArgs(pid, 1000, 1), pickup: true });
    const o2 = await createOrder(t, { ...baseItemArgs(pid, 1000, 1), pickup: true });
    const token = await staffSession(t);
    const res = await t.mutation(api.orders.bulkAction, { sessionToken: token, ids: [o1, o2], status: 'confirmed' });
    expect(res.updated).toBe(2);
    expect(res.failed).toBe(0);
    const statuses = await t.run(async (ctx) => [(await ctx.db.get(o1))?.status, (await ctx.db.get(o2))?.status]);
    expect(statuses).toEqual(['confirmed', 'confirmed']);
  });

  it('returns 0 for an empty selection', async () => {
    const t = convexTest(schema, modules);
    const token = await staffSession(t);
    const res = await t.mutation(api.orders.bulkAction, { sessionToken: token, ids: [], status: 'confirmed' });
    expect(res).toEqual({ updated: 0, failed: 0 });
  });

  it('requires a cancel reason for bulk cancellation', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    const pid = await seedProduct(t, cat, { price: 1000, stock: 10 });
    const o1 = await createOrder(t, { ...baseItemArgs(pid, 1000, 1), pickup: true });
    const token = await staffSession(t);
    await expect(t.mutation(api.orders.bulkAction, { sessionToken: token, ids: [o1], status: 'cancelled' })).rejects.toThrow();
  });
});

describe('orders.validateCart', () => {
  it('flags unavailable and out-of-stock items', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    const inactive = await seedProduct(t, cat, { price: 1000, stock: 10, isActive: false });
    const empty = await seedProduct(t, cat, { price: 1000, stock: 0 });
    const res = await t.mutation(api.orders.validateCart, { items: [{ productId: inactive, quantity: 1 }, { productId: empty, quantity: 1 }] });
    expect(res.changed).toBe(true);
    expect(res.items).toHaveLength(0);
    expect(res.issues.length).toBeGreaterThanOrEqual(2);
  });

  it('clamps quantity to available stock', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    const pid = await seedProduct(t, cat, { price: 1000, stock: 3 });
    const res = await t.mutation(api.orders.validateCart, { items: [{ productId: pid, quantity: 10 }] });
    expect(res.items[0].quantity).toBe(3);
    expect(res.changed).toBe(true);
    expect(res.subtotal).toBe(3000);
  });
});

describe('orders read queries', () => {
  it('getByOrderNumber returns a public subset', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    const pid = await seedProduct(t, cat, { price: 1000, stock: 10 });
    const orderId = await createOrder(t, { ...baseItemArgs(pid, 1000, 1), pickup: true });
    const orderNumber = await t.run(async (ctx) => (await ctx.db.get(orderId))?.orderNumber);
    const pub = await t.query(api.orders.getByOrderNumber, { orderNumber: orderNumber! });
    expect(pub?.orderNumber).toBe(orderNumber);
    expect(pub?.total).toBe(1000);
    // PII fields must not be present in the public subset.
    expect((pub as Record<string, unknown>).customerName).toBeUndefined();
  });

  it('getByOrderNumber returns null for unknown number', async () => {
    const t = convexTest(schema, modules);
    expect(await t.query(api.orders.getByOrderNumber, { orderNumber: 'ORD-NOPE' })).toBeNull();
  });

  it('getById returns full order to owner, subset to anonymous', async () => {
    const t = convexTest(schema, modules);
    await seedSettings(t, {});
    const cat = await seedCategory(t);
    const pid = await seedProduct(t, cat, { price: 1000, stock: 10 });
    const { token } = await seedUserWithLoyalty(t, 0);
    const orderId = await createOrder(t, { ...baseItemArgs(pid, 1000, 1), pickup: true, sessionToken: token });
    const full = await t.query(api.orders.getById, { id: orderId, sessionToken: token });
    expect((full as Record<string, unknown>)?.customerName).toBe('John');
    const anon = await t.query(api.orders.getById, { id: orderId });
    expect((anon as Record<string, unknown>)?.customerName).toBeUndefined();
    expect((anon as Record<string, unknown>)?.total).toBe(1000);
  });

  it('listByUser / myOrders return the caller orders and empty for guests', async () => {
    const t = convexTest(schema, modules);
    await seedSettings(t, {});
    const cat = await seedCategory(t);
    const pid = await seedProduct(t, cat, { price: 1000, stock: 10 });
    const { token } = await seedUserWithLoyalty(t, 0);
    await createOrder(t, { ...baseItemArgs(pid, 1000, 1), pickup: true, sessionToken: token });
    expect(await t.query(api.orders.listByUser, { sessionToken: token })).toHaveLength(1);
    expect(await t.query(api.orders.myOrders, { sessionToken: token })).toHaveLength(1);
    expect(await t.query(api.orders.myOrders, {})).toHaveLength(0);
  });

  it('listAdmin returns [] for a non-admin and orders for staff', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    const pid = await seedProduct(t, cat, { price: 1000, stock: 10 });
    await createOrder(t, { ...baseItemArgs(pid, 1000, 1), pickup: true });
    expect(await t.query(api.orders.listAdmin, { sessionToken: 'bogus' })).toEqual([]);
    const token = await staffSession(t);
    expect((await t.query(api.orders.listAdmin, { sessionToken: token })).length).toBeGreaterThanOrEqual(1);
    // filtered by status
    const pending = await t.query(api.orders.listAdmin, { sessionToken: token, status: 'pending' });
    expect(pending.length).toBeGreaterThanOrEqual(1);
  });

  it('getOrderEvents returns [] for non-admin and events for staff', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    const pid = await seedProduct(t, cat, { price: 1000, stock: 10 });
    const orderId = await createOrder(t, { ...baseItemArgs(pid, 1000, 1), pickup: true });
    expect(await t.query(api.orders.getOrderEvents, { sessionToken: 'bogus', orderId })).toEqual([]);
    const token = await staffSession(t);
    const events = await t.query(api.orders.getOrderEvents, { sessionToken: token, orderId });
    expect(events.some((e) => e.type === 'created')).toBe(true);
  });

  it('getForInvoice enriches items with sku and returns null for unknown', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    const pid = await seedProduct(t, cat, { price: 1000, stock: 10 });
    const orderId = await createOrder(t, { ...baseItemArgs(pid, 1000, 1), pickup: true });
    const token = await staffSession(t);
    const inv = await t.query(api.orders.getForInvoice, { sessionToken: token, id: orderId });
    expect(inv?.items[0]).toHaveProperty('sku');
    expect(await t.query(api.orders.getForInvoice, { sessionToken: 'bogus', id: orderId })).toBeNull();
  });
});
