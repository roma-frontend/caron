import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import { api } from './_generated/api';
import schema from './schema';
import type { Id } from './_generated/dataModel';

const modules = import.meta.glob('./**/*.ts');
type T = ReturnType<typeof convexTest>;

async function seedProduct(t: T): Promise<Id<'products'>> {
  return await t.run(async (ctx) => {
    const cat = await ctx.db.insert('categories', { name: 'C', slug: `c-${Math.random().toString(36).slice(2)}`, order: 0, isActive: true, createdAt: Date.now() });
    return ctx.db.insert('products', {
      name: 'P', slug: `p-${Math.random().toString(36).slice(2)}`, description: 'd', price: 1000,
      categoryId: cat, images: [], stock: 10, isActive: true, createdAt: Date.now(), updatedAt: Date.now(),
    }) as Promise<Id<'products'>>;
  });
}

async function seedOrder(t: T, pid: Id<'products'>, userId?: Id<'users'>): Promise<Id<'orders'>> {
  return await t.run(async (ctx) =>
    ctx.db.insert('orders', {
      orderNumber: `ORD-${Math.random().toString(36).slice(2).toUpperCase()}`,
      customerName: 'John', customerEmail: 'john@x.com', customerPhone: '+37400', shippingAddress: 'addr',
      items: [{ productId: pid, name: 'P', price: 1000, quantity: 1 }],
      subtotal: 1000, shipping: 0, total: 1000, status: 'delivered', paymentStatus: 'paid',
      userId, createdAt: Date.now(), updatedAt: Date.now(),
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

const returnArgs = (orderId: Id<'orders'>, pid: Id<'products'>) => ({
  orderId,
  type: 'return' as const,
  items: [{ productId: pid, name: 'P', quantity: 1 }],
  reason: 'defective',
});

describe('returns.create', () => {
  it('creates a pending request for a guest order', async () => {
    const t = convexTest(schema, modules);
    const pid = await seedProduct(t);
    const orderId = await seedOrder(t, pid);
    const id = await t.mutation(api.returns.create, returnArgs(orderId, pid));
    const req = await t.run((ctx) => ctx.db.get(id));
    expect(req?.status).toBe('pending');
    expect(req?.type).toBe('return');
    expect(req?.reason).toBe('defective');
  });

  it('rejects when no items or no reason', async () => {
    const t = convexTest(schema, modules);
    const pid = await seedProduct(t);
    const orderId = await seedOrder(t, pid);
    await expect(t.mutation(api.returns.create, { ...returnArgs(orderId, pid), items: [] })).rejects.toThrow();
    await expect(t.mutation(api.returns.create, { ...returnArgs(orderId, pid), reason: '   ' })).rejects.toThrow();
  });

  it('rejects a second open request for the same order', async () => {
    const t = convexTest(schema, modules);
    const pid = await seedProduct(t);
    const orderId = await seedOrder(t, pid);
    await t.mutation(api.returns.create, returnArgs(orderId, pid));
    await expect(t.mutation(api.returns.create, returnArgs(orderId, pid))).rejects.toThrow();
  });

  it('throws for a non-existent order', async () => {
    const t = convexTest(schema, modules);
    const pid = await seedProduct(t);
    const orderId = await seedOrder(t, pid);
    // delete the order, keep a valid-looking id
    await t.run((ctx) => ctx.db.delete(orderId));
    await expect(t.mutation(api.returns.create, returnArgs(orderId, pid))).rejects.toThrow();
  });
});

describe('returns.updateStatus', () => {
  it('lets an admin approve a request with a comment', async () => {
    const t = convexTest(schema, modules);
    const pid = await seedProduct(t);
    const orderId = await seedOrder(t, pid);
    const id = await t.mutation(api.returns.create, returnArgs(orderId, pid));
    const token = await superToken(t);
    await t.mutation(api.returns.updateStatus, { sessionToken: token, id, status: 'approved', adminComment: 'ok' });
    const req = await t.run((ctx) => ctx.db.get(id));
    expect(req?.status).toBe('approved');
    expect(req?.adminComment).toBe('ok');
  });

  it('supports reject and complete transitions', async () => {
    const t = convexTest(schema, modules);
    const pid = await seedProduct(t);
    const orderId = await seedOrder(t, pid);
    const id = await t.mutation(api.returns.create, returnArgs(orderId, pid));
    const token = await superToken(t);
    await t.mutation(api.returns.updateStatus, { sessionToken: token, id, status: 'rejected' });
    expect((await t.run((ctx) => ctx.db.get(id)))?.status).toBe('rejected');
    await t.mutation(api.returns.updateStatus, { sessionToken: token, id, status: 'completed' });
    expect((await t.run((ctx) => ctx.db.get(id)))?.status).toBe('completed');
  });

  it('requires the returns capability', async () => {
    const t = convexTest(schema, modules);
    const pid = await seedProduct(t);
    const orderId = await seedOrder(t, pid);
    const id = await t.mutation(api.returns.create, returnArgs(orderId, pid));
    await expect(t.mutation(api.returns.updateStatus, { sessionToken: 'bogus', id, status: 'approved' })).rejects.toThrow();
  });
});



/** Seed a customer user + session for ownership tests. */
async function customerSession(t: T, email = 'cust@x.com'): Promise<{ token: string; userId: Id<'users'> }> {
  const token = `ctok-${Math.random().toString(36).slice(2)}`;
  const userId = await t.run(async (ctx) => {
    const uid = await ctx.db.insert('users', { name: 'Cust', email, role: 'customer', isActive: true, createdAt: Date.now() }) as Id<'users'>;
    await ctx.db.insert('sessions', { userId: uid, token, expiresAt: Date.now() + 3_600_000, createdAt: Date.now() });
    return uid;
  });
  return { token, userId };
}

describe('returns.create — ownership & duplicates', () => {
  it('rejects a non-existent order', async () => {
    const t = convexTest(schema, modules);
    const pid = await seedProduct(t);
    const orderId = await seedOrder(t, pid);
    await t.run((ctx) => ctx.db.delete(orderId));
    await expect(t.mutation(api.returns.create, returnArgs(orderId, pid))).rejects.toThrow();
  });

  it('rejects a request from a different logged-in customer', async () => {
    const t = convexTest(schema, modules);
    const pid = await seedProduct(t);
    const owner = await customerSession(t, 'owner@x.com');
    const orderId = await seedOrder(t, pid, owner.userId);
    const other = await customerSession(t, 'other@x.com');
    await expect(
      t.mutation(api.returns.create, { ...returnArgs(orderId, pid), sessionToken: other.token }),
    ).rejects.toThrow();
  });

  it('lets the owning customer create a request', async () => {
    const t = convexTest(schema, modules);
    const pid = await seedProduct(t);
    const owner = await customerSession(t, 'own2@x.com');
    const orderId = await seedOrder(t, pid, owner.userId);
    const id = await t.mutation(api.returns.create, { ...returnArgs(orderId, pid), sessionToken: owner.token });
    const req = await t.run((ctx) => ctx.db.get(id));
    expect(req?.userId).toBe(owner.userId);
    expect(req?.status).toBe('pending');
  });

  it('stores an exchange request and normalises the telegram handle', async () => {
    const t = convexTest(schema, modules);
    const pid = await seedProduct(t);
    const orderId = await seedOrder(t, pid);
    const id = await t.mutation(api.returns.create, { ...returnArgs(orderId, pid), type: 'exchange', customerTelegram: '@handle' });
    const req = await t.run((ctx) => ctx.db.get(id));
    expect(req?.type).toBe('exchange');
    expect(req?.customerTelegram).toBe('handle');
  });

  it('allows a new request once the previous one is completed', async () => {
    const t = convexTest(schema, modules);
    const pid = await seedProduct(t);
    const orderId = await seedOrder(t, pid);
    const id = await t.mutation(api.returns.create, returnArgs(orderId, pid));
    const token = await superToken(t);
    await t.mutation(api.returns.updateStatus, { sessionToken: token, id, status: 'completed' });
    // completed is not an open state → a new request is allowed
    const id2 = await t.mutation(api.returns.create, returnArgs(orderId, pid));
    expect(id2).not.toBe(id);
  });
});

describe('returns.updateStatus — guards', () => {
  it('throws for a non-existent request', async () => {
    const t = convexTest(schema, modules);
    const pid = await seedProduct(t);
    const orderId = await seedOrder(t, pid);
    const id = await t.mutation(api.returns.create, returnArgs(orderId, pid));
    const token = await superToken(t);
    await t.run((ctx) => ctx.db.delete(id));
    await expect(t.mutation(api.returns.updateStatus, { sessionToken: token, id, status: 'approved' })).rejects.toThrow();
  });

  it('trims an empty admin comment to undefined', async () => {
    const t = convexTest(schema, modules);
    const pid = await seedProduct(t);
    const orderId = await seedOrder(t, pid);
    const id = await t.mutation(api.returns.create, returnArgs(orderId, pid));
    const token = await superToken(t);
    await t.mutation(api.returns.updateStatus, { sessionToken: token, id, status: 'approved', adminComment: '   ' });
    expect((await t.run((ctx) => ctx.db.get(id)))?.adminComment).toBeUndefined();
  });
});

describe('returns.listMine / listAll', () => {
  it('listMine returns only the caller requests, [] for guest', async () => {
    const t = convexTest(schema, modules);
    const pid = await seedProduct(t);
    const owner = await customerSession(t, 'lm@x.com');
    const orderId = await seedOrder(t, pid, owner.userId);
    await t.mutation(api.returns.create, { ...returnArgs(orderId, pid), sessionToken: owner.token });
    expect(await t.query(api.returns.listMine, { sessionToken: owner.token })).toHaveLength(1);
    expect(await t.query(api.returns.listMine, {})).toEqual([]);
  });

  it('listAll returns [] for a non-admin and enriched items for staff', async () => {
    const t = convexTest(schema, modules);
    const pid = await seedProduct(t);
    const orderId = await seedOrder(t, pid);
    await t.mutation(api.returns.create, returnArgs(orderId, pid));
    expect(await t.query(api.returns.listAll, { sessionToken: 'bogus' })).toEqual([]);
    const token = await superToken(t);
    const all = await t.query(api.returns.listAll, { sessionToken: token });
    expect(all).toHaveLength(1);
    expect(all[0].items[0]).toHaveProperty('image');
    // filter by status
    const pending = await t.query(api.returns.listAll, { sessionToken: token, status: 'pending' });
    expect(pending).toHaveLength(1);
  });
});
