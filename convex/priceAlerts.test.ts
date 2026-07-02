import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import { api, internal } from './_generated/api';
import schema from './schema';
import type { Id } from './_generated/dataModel';

const modules = import.meta.glob('./**/*.ts');
type T = ReturnType<typeof convexTest>;

async function seedProduct(t: T): Promise<Id<'products'>> {
  return await t.run(async (ctx) => {
    const cat = (await ctx.db.insert('categories', {
      name: 'C', slug: `c-${Math.random().toString(36).slice(2)}`, order: 0, isActive: true, createdAt: Date.now(),
    })) as Id<'categories'>;
    return (await ctx.db.insert('products', {
      name: 'P', slug: `p-${Math.random().toString(36).slice(2)}`, description: 'd', price: 1000,
      categoryId: cat, images: [], stock: 5, isActive: true, createdAt: Date.now(), updatedAt: Date.now(),
    })) as Id<'products'>;
  });
}

describe('priceAlerts.subscribe', () => {
  it('inserts a new alert with notified=false', async () => {
    const t = convexTest(schema, modules);
    const productId = await seedProduct(t);
    const id = await t.mutation(api.priceAlerts.subscribe, { productId, email: 'a@x.com', priceAtSubscribe: 1000 });
    expect(id).not.toBeNull();
    const row = await t.run((ctx) => ctx.db.get(id as Id<'priceAlerts'>));
    expect(row?.notified).toBe(false);
    expect(row?.priceAtSubscribe).toBe(1000);
  });

  it('de-duplicates an active (un-notified) subscription for the same email', async () => {
    const t = convexTest(schema, modules);
    const productId = await seedProduct(t);
    await t.mutation(api.priceAlerts.subscribe, { productId, email: 'dup@x.com', priceAtSubscribe: 1000 });
    const second = await t.mutation(api.priceAlerts.subscribe, { productId, email: 'dup@x.com', priceAtSubscribe: 900 });
    expect(second).toBeNull();
    const all = await t.run((ctx) =>
      ctx.db.query('priceAlerts').withIndex('by_product', (q) => q.eq('productId', productId)).collect(),
    );
    expect(all.length).toBe(1);
  });

  it('allows a fresh subscription once the previous one was notified', async () => {
    const t = convexTest(schema, modules);
    const productId = await seedProduct(t);
    const first = await t.mutation(api.priceAlerts.subscribe, { productId, email: 're@x.com', priceAtSubscribe: 1000 });
    await t.mutation(internal.priceAlerts.markNotified, { id: first as Id<'priceAlerts'> });
    const again = await t.mutation(api.priceAlerts.subscribe, { productId, email: 're@x.com', priceAtSubscribe: 800 });
    expect(again).not.toBeNull();
  });
});

describe('priceAlerts.listByProduct (internal)', () => {
  it('returns only un-notified alerts for the product', async () => {
    const t = convexTest(schema, modules);
    const productId = await seedProduct(t);
    const a = await t.mutation(api.priceAlerts.subscribe, { productId, email: 'one@x.com', priceAtSubscribe: 1000 });
    await t.mutation(api.priceAlerts.subscribe, { productId, email: 'two@x.com', priceAtSubscribe: 1000 });
    await t.mutation(internal.priceAlerts.markNotified, { id: a as Id<'priceAlerts'> });

    const pending = await t.query(internal.priceAlerts.listByProduct, { productId });
    expect(pending.length).toBe(1);
    expect(pending[0]?.email).toBe('two@x.com');
  });
});

describe('priceAlerts.markNotified (internal)', () => {
  it('flips notified to true', async () => {
    const t = convexTest(schema, modules);
    const productId = await seedProduct(t);
    const id = await t.mutation(api.priceAlerts.subscribe, { productId, email: 'm@x.com', priceAtSubscribe: 1000 });
    await t.mutation(internal.priceAlerts.markNotified, { id: id as Id<'priceAlerts'> });
    const row = await t.run((ctx) => ctx.db.get(id as Id<'priceAlerts'>));
    expect(row?.notified).toBe(true);
  });
});
