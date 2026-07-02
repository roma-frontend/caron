import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import { api, internal } from './_generated/api';
import schema from './schema';
import type { Id } from './_generated/dataModel';

const modules = import.meta.glob('./**/*.ts');
type T = ReturnType<typeof convexTest>;
type Role = 'superadmin' | 'admin' | 'manager' | 'customer';

async function tokenFor(t: T, role: Role): Promise<string> {
  const token = `tok-${Math.random().toString(36).slice(2)}`;
  await t.run(async (ctx) => {
    const uid = (await ctx.db.insert('users', {
      name: `${role}-u`, email: `${role}-${Math.random().toString(36).slice(2)}@x.com`,
      role, isActive: true, createdAt: Date.now(),
    })) as Id<'users'>;
    await ctx.db.insert('sessions', { userId: uid, token, expiresAt: Date.now() + 3_600_000, createdAt: Date.now() });
  });
  return token;
}

async function seedProduct(t: T): Promise<Id<'products'>> {
  return await t.run(async (ctx) => {
    const cat = (await ctx.db.insert('categories', {
      name: 'C', slug: `c-${Math.random().toString(36).slice(2)}`, order: 0, isActive: true, createdAt: Date.now(),
    })) as Id<'categories'>;
    return (await ctx.db.insert('products', {
      name: 'P', slug: `p-${Math.random().toString(36).slice(2)}`, description: 'd', price: 1000,
      categoryId: cat, images: [], stock: 0, isActive: true, createdAt: Date.now(), updatedAt: Date.now(),
    })) as Id<'products'>;
  });
}

describe('backInStock.subscribe', () => {
  it('inserts a request with notified=false', async () => {
    const t = convexTest(schema, modules);
    const productId = await seedProduct(t);
    const id = await t.mutation(api.backInStock.subscribe, { productId, contact: '@user' });
    expect(id).not.toBeNull();
    const row = await t.run((ctx) => ctx.db.get(id as Id<'backInStock'>));
    expect(row?.notified).toBe(false);
    expect(row?.contact).toBe('@user');
  });

  it('de-duplicates an active request for the same contact', async () => {
    const t = convexTest(schema, modules);
    const productId = await seedProduct(t);
    await t.mutation(api.backInStock.subscribe, { productId, contact: 'dup@x.com' });
    const second = await t.mutation(api.backInStock.subscribe, { productId, contact: 'dup@x.com' });
    expect(second).toBeNull();
    const all = await t.run((ctx) =>
      ctx.db.query('backInStock').withIndex('by_product', (q) => q.eq('productId', productId)).collect(),
    );
    expect(all.length).toBe(1);
  });

  it('allows re-subscription after being notified', async () => {
    const t = convexTest(schema, modules);
    const productId = await seedProduct(t);
    const first = await t.mutation(api.backInStock.subscribe, { productId, contact: 're@x.com' });
    await t.mutation(internal.backInStock.markNotified, { id: first as Id<'backInStock'> });
    const again = await t.mutation(api.backInStock.subscribe, { productId, contact: 're@x.com' });
    expect(again).not.toBeNull();
  });
});

describe('backInStock.list', () => {
  it('returns requests for a staff caller (admin)', async () => {
    const t = convexTest(schema, modules);
    const productId = await seedProduct(t);
    await t.mutation(api.backInStock.subscribe, { productId, contact: 'a@x.com' });
    await t.mutation(api.backInStock.subscribe, { productId, contact: 'b@x.com' });
    const rows = await t.query(api.backInStock.list, { sessionToken: await tokenFor(t, 'admin') });
    expect(rows.length).toBe(2);
  });

  it('allows a manager and superadmin too', async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.backInStock.list, { sessionToken: await tokenFor(t, 'manager') })).resolves.toBeDefined();
    await expect(t.query(api.backInStock.list, { sessionToken: await tokenFor(t, 'superadmin') })).resolves.toBeDefined();
  });

  it('rejects a customer and an unauthenticated caller', async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.backInStock.list, { sessionToken: await tokenFor(t, 'customer') })).rejects.toThrow();
    await expect(t.query(api.backInStock.list, { sessionToken: 'bogus' })).rejects.toThrow();
  });
});

describe('backInStock.listByProduct / markNotified (internal)', () => {
  it('lists only un-notified requests and markNotified excludes them', async () => {
    const t = convexTest(schema, modules);
    const productId = await seedProduct(t);
    const a = await t.mutation(api.backInStock.subscribe, { productId, contact: 'one@x.com' });
    await t.mutation(api.backInStock.subscribe, { productId, contact: 'two@x.com' });
    await t.mutation(internal.backInStock.markNotified, { id: a as Id<'backInStock'> });
    const pending = await t.query(internal.backInStock.listByProduct, { productId });
    expect(pending.length).toBe(1);
    expect(pending[0]?.contact).toBe('two@x.com');
  });
});
