import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import { api } from './_generated/api';
import schema from './schema';
import type { Id } from './_generated/dataModel';

const modules = import.meta.glob('./**/*.ts');
type T = ReturnType<typeof convexTest>;

async function seedProduct(t: T, stock: number): Promise<Id<'products'>> {
  return await t.run(async (ctx) => {
    const cat = await ctx.db.insert('categories', { name: 'C', slug: `c-${Math.random().toString(36).slice(2)}`, order: 0, isActive: true, createdAt: Date.now() });
    return ctx.db.insert('products', {
      name: 'P', slug: `p-${Math.random().toString(36).slice(2)}`, description: 'd', price: 1000,
      categoryId: cat, images: [], stock, isActive: true, createdAt: Date.now(), updatedAt: Date.now(),
    }) as Promise<Id<'products'>>;
  });
}

async function seedOrder(
  t: T, pid: Id<'products'>,
  opts: { status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'; qty: number; total?: number; userId?: Id<'users'>; loyaltyAwarded?: boolean; loyaltyPointsAwarded?: number },
): Promise<Id<'orders'>> {
  return await t.run(async (ctx) =>
    ctx.db.insert('orders', {
      orderNumber: `ORD-${Math.random().toString(36).slice(2).toUpperCase()}`,
      customerName: 'John', customerEmail: 'john@x.com', customerPhone: '+37400', shippingAddress: 'addr',
      items: [{ productId: pid, name: 'P', price: 1000, quantity: opts.qty }],
      subtotal: 1000 * opts.qty, shipping: 0, total: opts.total ?? 1000 * opts.qty,
      status: opts.status, paymentStatus: 'paid', userId: opts.userId,
      loyaltyAwarded: opts.loyaltyAwarded, loyaltyPointsAwarded: opts.loyaltyPointsAwarded,
      createdAt: Date.now(), updatedAt: Date.now(),
    }) as Promise<Id<'orders'>>,
  );
}

async function superToken(t: T): Promise<string> {
  const token = `tok-${Math.random().toString(36).slice(2)}`;
  await t.run(async (ctx) => {
    const uid = await ctx.db.insert('users', { name: 'O', email: 'o@x.com', role: 'superadmin', isActive: true, createdAt: Date.now() }) as Id<'users'>;
    await ctx.db.insert('sessions', { userId: uid, token, expiresAt: Date.now() + 3_600_000, createdAt: Date.now() });
  });
  return token;
}

async function movementsFor(t: T, pid: Id<'products'>) {
  const all = await t.run((ctx) => ctx.db.query('stockMovements').collect());
  return all.filter((m) => m.productId === pid);
}

describe('orders.updateStatus — stock', () => {
  it('restocks and logs a cancel movement when cancelling', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    const pid = await seedProduct(t, 5);
    const orderId = await seedOrder(t, pid, { status: 'pending', qty: 3 });
    await t.mutation(api.orders.updateStatus, { sessionToken: token, id: orderId, status: 'cancelled', cancelReason: 'out of stock' });
    expect((await t.run((ctx) => ctx.db.get(pid)))?.stock).toBe(8);
    const m = await movementsFor(t, pid);
    expect(m.find((x) => x.type === 'cancel')?.qty).toBe(3);
    expect((await t.run((ctx) => ctx.db.get(orderId)))?.cancelReason).toBe('out of stock');
  });

  it('requires a cancel reason', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    const pid = await seedProduct(t, 5);
    const orderId = await seedOrder(t, pid, { status: 'pending', qty: 3 });
    await expect(t.mutation(api.orders.updateStatus, { sessionToken: token, id: orderId, status: 'cancelled' })).rejects.toThrow();
  });

  it('reserves stock again when reopening a cancelled order', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    const pid = await seedProduct(t, 5);
    const orderId = await seedOrder(t, pid, { status: 'cancelled', qty: 3 });
    await t.mutation(api.orders.updateStatus, { sessionToken: token, id: orderId, status: 'confirmed' });
    expect((await t.run((ctx) => ctx.db.get(pid)))?.stock).toBe(2);
    const m = await movementsFor(t, pid);
    expect(m.find((x) => x.type === 'reopen')?.qty).toBe(-3);
  });

  it('refuses to reopen when stock is insufficient', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    const pid = await seedProduct(t, 1);
    const orderId = await seedOrder(t, pid, { status: 'cancelled', qty: 3 });
    await expect(t.mutation(api.orders.updateStatus, { sessionToken: token, id: orderId, status: 'confirmed' })).rejects.toThrow();
  });

  it('requires the orders capability', async () => {
    const t = convexTest(schema, modules);
    const pid = await seedProduct(t, 5);
    const orderId = await seedOrder(t, pid, { status: 'pending', qty: 1 });
    await expect(t.mutation(api.orders.updateStatus, { sessionToken: 'bogus', id: orderId, status: 'confirmed' })).rejects.toThrow();
  });
});

describe('orders.updateStatus — loyalty accrual', () => {
  async function seedLoyaltyUser(t: T): Promise<Id<'users'>> {
    return await t.run((ctx) => ctx.db.insert('users', { name: 'B', email: 'buyer@x.com', role: 'customer', isActive: true, createdAt: Date.now() }) as Promise<Id<'users'>>);
  }
  const REQUIRED_SETTINGS = {
    storeName: 'S', phone: '', email: '', address: '', whatsapp: '', telegram: '', instagram: '', facebook: '',
    deliveryYerevan: 0, deliveryRegions: 0, freeShippingThreshold: 0, announcementBar: '', workingHours: '',
  };

  it('awards points when an order is delivered', async () => {
    const t = convexTest(schema, modules);
    await t.run((ctx) => ctx.db.insert('settings', { ...REQUIRED_SETTINGS, enableLoyalty: true, loyaltyPercent: 5 }));
    const token = await superToken(t);
    const buyer = await seedLoyaltyUser(t);
    const pid = await seedProduct(t, 10);
    const orderId = await seedOrder(t, pid, { status: 'processing', qty: 2, total: 10000, userId: buyer });
    await t.mutation(api.orders.updateStatus, { sessionToken: token, id: orderId, status: 'delivered' });
    const order = await t.run((ctx) => ctx.db.get(orderId));
    expect(order?.loyaltyAwarded).toBe(true);
    expect(order?.loyaltyPointsAwarded).toBe(500); // 5% of 10000
    const bal = await t.run(async (ctx) => (await ctx.db.query('loyaltyPoints').withIndex('by_user', (q) => q.eq('userId', buyer)).first())?.points);
    expect(bal).toBe(500);
  });

  it('reverses awarded points when a delivered order is cancelled', async () => {
    const t = convexTest(schema, modules);
    await t.run((ctx) => ctx.db.insert('settings', { ...REQUIRED_SETTINGS, enableLoyalty: true, loyaltyPercent: 5 }));
    const token = await superToken(t);
    const buyer = await seedLoyaltyUser(t);
    await t.run((ctx) => ctx.db.insert('loyaltyPoints', { userId: buyer, email: 'buyer@x.com', points: 500, totalEarned: 500, createdAt: Date.now() }));
    const pid = await seedProduct(t, 10);
    const orderId = await seedOrder(t, pid, { status: 'delivered', qty: 1, total: 10000, userId: buyer, loyaltyAwarded: true, loyaltyPointsAwarded: 500 });
    await t.mutation(api.orders.updateStatus, { sessionToken: token, id: orderId, status: 'cancelled', cancelReason: 'return' });
    const order = await t.run((ctx) => ctx.db.get(orderId));
    expect(order?.loyaltyAwarded).toBe(false);
    const bal = await t.run(async (ctx) => (await ctx.db.query('loyaltyPoints').withIndex('by_user', (q) => q.eq('userId', buyer)).first())?.points);
    expect(bal).toBe(0);
  });
});

describe('orders.bulkAction', () => {
  it('applies a status to multiple orders and reports the count', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    const pid = await seedProduct(t, 10);
    const o1 = await seedOrder(t, pid, { status: 'pending', qty: 1 });
    const o2 = await seedOrder(t, pid, { status: 'pending', qty: 1 });
    const res = await t.mutation(api.orders.bulkAction, { sessionToken: token, ids: [o1, o2], status: 'confirmed' });
    expect(res).toEqual({ updated: 2, failed: 0 });
    expect((await t.run((ctx) => ctx.db.get(o1)))?.status).toBe('confirmed');
    expect((await t.run((ctx) => ctx.db.get(o2)))?.status).toBe('confirmed');
  });

  it('requires the orders + action.bulk capabilities', async () => {
    const t = convexTest(schema, modules);
    const pid = await seedProduct(t, 10);
    const o1 = await seedOrder(t, pid, { status: 'pending', qty: 1 });
    await expect(t.mutation(api.orders.bulkAction, { sessionToken: 'bogus', ids: [o1], status: 'confirmed' })).rejects.toThrow();
  });
});
