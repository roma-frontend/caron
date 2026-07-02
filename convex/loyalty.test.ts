import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import { api } from './_generated/api';
import schema from './schema';
import type { Id } from './_generated/dataModel';

const modules = import.meta.glob('./**/*.ts');
type T = ReturnType<typeof convexTest>;

const REQUIRED_SETTINGS = {
  storeName: 'S', phone: '', email: '', address: '', whatsapp: '', telegram: '',
  instagram: '', facebook: '', deliveryYerevan: 0, deliveryRegions: 0,
  freeShippingThreshold: 0, announcementBar: '', workingHours: '',
};
async function seedSettings(t: T, overrides: Record<string, unknown> = {}) {
  await t.run(async (ctx) => { await ctx.db.insert('settings', { ...REQUIRED_SETTINGS, ...overrides }); });
}

/** Seed a customer + session. Optionally seed a loyalty record with points. */
async function seedCustomer(
  t: T,
  opts: { points?: number; email?: string } = {},
): Promise<{ token: string; userId: Id<'users'>; email: string }> {
  const token = `tok-${Math.random().toString(36).slice(2)}`;
  const email = opts.email ?? `c-${Math.random().toString(36).slice(2)}@x.com`;
  const userId = await t.run(async (ctx) => {
    const uid = (await ctx.db.insert('users', {
      name: 'C', email, role: 'customer', isActive: true, createdAt: Date.now(),
    })) as Id<'users'>;
    await ctx.db.insert('sessions', { userId: uid, token, expiresAt: Date.now() + 3_600_000, createdAt: Date.now() });
    if (typeof opts.points === 'number') {
      await ctx.db.insert('loyaltyPoints', {
        userId: uid, email, points: opts.points, totalEarned: opts.points, createdAt: Date.now(),
      });
    }
    return uid;
  });
  return { token, userId, email };
}

/** Seed a staff superadmin + session (for updateStatus which drives accrual). */
async function seedStaff(t: T): Promise<string> {
  const token = `stf-${Math.random().toString(36).slice(2)}`;
  await t.run(async (ctx) => {
    const uid = (await ctx.db.insert('users', {
      name: 'Admin', email: `a-${Math.random().toString(36).slice(2)}@x.com`,
      role: 'superadmin', isActive: true, createdAt: Date.now(),
    })) as Id<'users'>;
    await ctx.db.insert('sessions', { userId: uid, token, expiresAt: Date.now() + 3_600_000, createdAt: Date.now() });
  });
  return token;
}

async function seedProduct(t: T, price: number, stock = 100): Promise<Id<'products'>> {
  return await t.run(async (ctx) => {
    const cat = (await ctx.db.insert('categories', {
      name: 'Cat', slug: `cat-${Math.random().toString(36).slice(2)}`, order: 0, isActive: true, createdAt: Date.now(),
    })) as Id<'categories'>;
    return ctx.db.insert('products', {
      name: 'Widget', slug: `w-${Math.random().toString(36).slice(2)}`, description: 'd',
      price, categoryId: cat, images: [], stock, isActive: true,
      createdAt: Date.now(), updatedAt: Date.now(),
    }) as Promise<Id<'products'>>;
  });
}

const itemArgs = (productId: Id<'products'>, price: number, qty: number) => ({
  customerName: 'John', customerEmail: 'john@x.com', customerPhone: '+37400', shippingAddress: 'addr',
  items: [{ productId, name: 'Widget', price, quantity: qty }],
  subtotal: price * qty, shipping: 0, total: price * qty,
});

async function createOrder(t: T, args: Record<string, unknown>): Promise<Id<'orders'>> {
  const id = (await t.mutation(api.orders.create, args as never)) as Id<'orders'>;
  await t.finishInProgressScheduledFunctions();
  return id;
}

// ─── getBalance ──────────────────────────────────────────────────────────────

describe('loyalty.getBalance', () => {
  it('returns zeros with no session token', async () => {
    const t = convexTest(schema, modules);
    expect(await t.query(api.loyalty.getBalance, {})).toEqual({ points: 0, totalEarned: 0 });
  });

  it('returns zeros for an invalid session token', async () => {
    const t = convexTest(schema, modules);
    expect(await t.query(api.loyalty.getBalance, { sessionToken: 'bogus' })).toEqual({ points: 0, totalEarned: 0 });
  });

  it('returns zeros for an authenticated user with no loyalty record', async () => {
    const t = convexTest(schema, modules);
    const { token } = await seedCustomer(t);
    expect(await t.query(api.loyalty.getBalance, { sessionToken: token })).toEqual({ points: 0, totalEarned: 0 });
  });

  it('resolves the balance by userId', async () => {
    const t = convexTest(schema, modules);
    const { token } = await seedCustomer(t, { points: 450 });
    const bal = await t.query(api.loyalty.getBalance, { sessionToken: token });
    expect(bal).toEqual({ points: 450, totalEarned: 450 });
  });

  it('falls back to matching by email when there is no userId-linked record', async () => {
    const t = convexTest(schema, modules);
    const email = `guest-${Math.random().toString(36).slice(2)}@x.com`;
    // Points earned as a guest (no userId), then the user registers with the same email.
    await t.run(async (ctx) => {
      await ctx.db.insert('loyaltyPoints', { email, points: 120, totalEarned: 200, createdAt: Date.now() });
    });
    const { token } = await seedCustomer(t, { email });
    const bal = await t.query(api.loyalty.getBalance, { sessionToken: token });
    expect(bal).toEqual({ points: 120, totalEarned: 200 });
  });
});

// ─── Redemption (spend points at checkout) reflected in getBalance ────────────

describe('loyalty redemption via checkout', () => {
  it('spending points reduces the reported balance', async () => {
    const t = convexTest(schema, modules);
    await seedSettings(t, { enableLoyalty: true });
    const pid = await seedProduct(t, 1000);
    const { token } = await seedCustomer(t, { points: 500 });
    await createOrder(t, { ...itemArgs(pid, 1000, 1), pickup: true, sessionToken: token, pointsToSpend: 300 });
    const bal = await t.query(api.loyalty.getBalance, { sessionToken: token });
    expect(bal.points).toBe(200);       // 500 - 300 spent
    expect(bal.totalEarned).toBe(500);  // totalEarned never decreases
  });

  it('does not spend points when loyalty is disabled', async () => {
    const t = convexTest(schema, modules);
    await seedSettings(t, { enableLoyalty: false });
    const pid = await seedProduct(t, 1000);
    const { token } = await seedCustomer(t, { points: 500 });
    await createOrder(t, { ...itemArgs(pid, 1000, 1), pickup: true, sessionToken: token, pointsToSpend: 300 });
    expect((await t.query(api.loyalty.getBalance, { sessionToken: token })).points).toBe(500);
  });
});

// ─── Accrual (earn on delivery) reflected in getBalance ───────────────────────

describe('loyalty accrual via delivered orders', () => {
  it('awards a flat percent on delivery', async () => {
    const t = convexTest(schema, modules);
    await seedSettings(t, { enableLoyalty: true, loyaltyPercent: 5 });
    const staff = await seedStaff(t);
    const pid = await seedProduct(t, 1000);
    const { token } = await seedCustomer(t);
    const orderId = await createOrder(t, { ...itemArgs(pid, 1000, 2), pickup: true, sessionToken: token });
    await t.mutation(api.orders.updateStatus, { sessionToken: staff, id: orderId, status: 'delivered' });
    // 5% of order total (2000) = 100 points.
    expect((await t.query(api.loyalty.getBalance, { sessionToken: token })).points).toBe(100);
  });

  it('applies the highest matching tier (RANGE model) by total quantity', async () => {
    const t = convexTest(schema, modules);
    await seedSettings(t, {
      enableLoyalty: true, loyaltyPercent: 0,
      loyaltyTiers: [{ minQty: 10, percent: 3 }, { minQty: 50, percent: 5 }],
    });
    const staff = await seedStaff(t);
    const pid = await seedProduct(t, 1000);
    const { token } = await seedCustomer(t);
    // qty 10 → tier 3% of total 10000 = 300 points.
    const orderId = await createOrder(t, { ...itemArgs(pid, 1000, 10), pickup: true, sessionToken: token });
    await t.mutation(api.orders.updateStatus, { sessionToken: staff, id: orderId, status: 'delivered' });
    expect((await t.query(api.loyalty.getBalance, { sessionToken: token })).points).toBe(300);
  });

  it('does not award twice when re-delivered', async () => {
    const t = convexTest(schema, modules);
    await seedSettings(t, { enableLoyalty: true, loyaltyPercent: 10 });
    const staff = await seedStaff(t);
    const pid = await seedProduct(t, 1000);
    const { token } = await seedCustomer(t);
    const orderId = await createOrder(t, { ...itemArgs(pid, 1000, 1), pickup: true, sessionToken: token });
    await t.mutation(api.orders.updateStatus, { sessionToken: staff, id: orderId, status: 'delivered' });
    await t.mutation(api.orders.updateStatus, { sessionToken: staff, id: orderId, status: 'shipped' });
    await t.mutation(api.orders.updateStatus, { sessionToken: staff, id: orderId, status: 'delivered' });
    expect((await t.query(api.loyalty.getBalance, { sessionToken: token })).points).toBe(100); // 10% of 1000, once
  });

  it('reverses the awarded points if the order is later cancelled', async () => {
    const t = convexTest(schema, modules);
    await seedSettings(t, { enableLoyalty: true, loyaltyPercent: 10 });
    const staff = await seedStaff(t);
    const pid = await seedProduct(t, 1000);
    const { token } = await seedCustomer(t);
    const orderId = await createOrder(t, { ...itemArgs(pid, 1000, 1), pickup: true, sessionToken: token });
    await t.mutation(api.orders.updateStatus, { sessionToken: staff, id: orderId, status: 'delivered' });
    expect((await t.query(api.loyalty.getBalance, { sessionToken: token })).points).toBe(100);
    await t.mutation(api.orders.updateStatus, {
      sessionToken: staff, id: orderId, status: 'cancelled', cancelReason: 'oops',
    });
    // Balance clawed back to 0; totalEarned only ever grows so it stays at 100.
    const bal = await t.query(api.loyalty.getBalance, { sessionToken: token });
    expect(bal.points).toBe(0);
    expect(bal.totalEarned).toBe(100);
  });

  it('does not award when loyalty is disabled', async () => {
    const t = convexTest(schema, modules);
    await seedSettings(t, { enableLoyalty: false, loyaltyPercent: 10 });
    const staff = await seedStaff(t);
    const pid = await seedProduct(t, 1000);
    const { token } = await seedCustomer(t);
    const orderId = await createOrder(t, { ...itemArgs(pid, 1000, 1), pickup: true, sessionToken: token });
    await t.mutation(api.orders.updateStatus, { sessionToken: staff, id: orderId, status: 'delivered' });
    expect((await t.query(api.loyalty.getBalance, { sessionToken: token })).points).toBe(0);
  });
});
