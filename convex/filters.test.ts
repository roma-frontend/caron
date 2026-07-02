import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import { api } from './_generated/api';
import schema from './schema';
import type { Id } from './_generated/dataModel';

const modules = import.meta.glob('./**/*.ts');
type T = ReturnType<typeof convexTest>;

async function seedCategory(t: T, c: Record<string, unknown> = {}): Promise<Id<'categories'>> {
  return await t.run(async (ctx) =>
    ctx.db.insert('categories', {
      name: 'Filters', slug: `cat-${Math.random().toString(36).slice(2)}`,
      order: 0, isActive: true, createdAt: Date.now(),
      ...c,
    }) as Promise<Id<'categories'>>,
  );
}

async function seedFilter(t: T, categoryId: Id<'categories'>, f: Record<string, unknown> = {}): Promise<Id<'filterDefinitions'>> {
  return await t.run(async (ctx) =>
    ctx.db.insert('filterDefinitions', {
      categoryId, name: 'Color', slug: 'color', type: 'select', options: ['Red', 'Blue'], order: 0,
      ...f,
    }) as Promise<Id<'filterDefinitions'>>,
  );
}

async function superToken(t: T): Promise<string> {
  const token = `tok-${Math.random().toString(36).slice(2)}`;
  await t.run(async (ctx) => {
    const uid = await ctx.db.insert('users', { name: 'O', email: `o${Math.random()}@x.com`, role: 'superadmin', isActive: true, createdAt: Date.now() }) as Id<'users'>;
    await ctx.db.insert('sessions', { userId: uid, token, expiresAt: Date.now() + 3_600_000, createdAt: Date.now() });
  });
  return token;
}

describe('filters.getByCategory / listAll', () => {
  it('returns filters for a given category only', async () => {
    const t = convexTest(schema, modules);
    const cat1 = await seedCategory(t);
    const cat2 = await seedCategory(t);
    await seedFilter(t, cat1, { name: 'Size', slug: 'size' });
    await seedFilter(t, cat2, { name: 'Weight', slug: 'weight' });

    const r = await t.query(api.filters.getByCategory, { categoryId: cat1 });
    expect(r.length).toBe(1);
    expect(r[0].slug).toBe('size');
  });

  it('listAll returns every filter definition', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    await seedFilter(t, cat, { slug: 'a', order: 0 });
    await seedFilter(t, cat, { slug: 'b', order: 1 });
    const r = await t.query(api.filters.listAll, {});
    expect(r.length).toBe(2);
  });
});

describe('filters.create', () => {
  it('creates a filter definition', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    const cat = await seedCategory(t);
    const id = await t.mutation(api.filters.create, {
      sessionToken: token, categoryId: cat, name: 'Material', slug: 'material',
      type: 'multiselect', options: ['Steel', 'Alu'], order: 3,
    });
    await t.finishInProgressScheduledFunctions();
    const f = await t.run((ctx) => ctx.db.get(id));
    expect(f?.name).toBe('Material');
    expect(f?.slug).toBe('material');
    expect(f?.type).toBe('multiselect');
    expect(f?.order).toBe(3);
  });

  it('requires authentication', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    await expect(t.mutation(api.filters.create, {
      sessionToken: 'bogus', categoryId: cat, name: 'X', slug: 'x', type: 'select', order: 0,
    })).rejects.toThrow();
  });
});

describe('filters.update', () => {
  it('updates the name and order', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    const cat = await seedCategory(t);
    const id = await seedFilter(t, cat);
    await t.mutation(api.filters.update, { sessionToken: token, id, name: 'Colour', order: 9 });
    await t.finishInProgressScheduledFunctions();
    const f = await t.run((ctx) => ctx.db.get(id));
    expect(f?.name).toBe('Colour');
    expect(f?.order).toBe(9);
  });

  it('rejects changing the slug', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    const cat = await seedCategory(t);
    const id = await seedFilter(t, cat);
    await expect(t.mutation(api.filters.update, { sessionToken: token, id, slug: 'newslug' })).rejects.toThrow();
  });

  it('throws for a missing filter', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    const cat = await seedCategory(t);
    const id = await seedFilter(t, cat);
    await t.run((ctx) => ctx.db.delete(id));
    await expect(t.mutation(api.filters.update, { sessionToken: token, id, name: 'X' })).rejects.toThrow();
  });

  it('remaps product attribute values to canonical options', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    const cat = await seedCategory(t);
    const id = await seedFilter(t, cat, { slug: 'color', options: ['Red', 'Blue'] });
    const pid = await t.run(async (ctx) =>
      ctx.db.insert('products', {
        name: 'P', slug: 'p', description: 'd', price: 100, categoryId: cat,
        images: [], stock: 1, isActive: true, createdAt: Date.now(), updatedAt: Date.now(),
        attributes: { [id]: 'red' },
      }) as Promise<Id<'products'>>,
    );
    await t.mutation(api.filters.update, { sessionToken: token, id, options: ['Red', 'Green'] });
    await t.finishInProgressScheduledFunctions();
    const attrs = await t.run(async (ctx) => (await ctx.db.get(pid))?.attributes);
    expect(attrs[id]).toBe('Red');
  });

  it('requires authentication', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    const id = await seedFilter(t, cat);
    await expect(t.mutation(api.filters.update, { sessionToken: 'bogus', id, name: 'X' })).rejects.toThrow();
  });
});

describe('filters.remove', () => {
  it('deletes a filter', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    const cat = await seedCategory(t);
    const id = await seedFilter(t, cat);
    await t.mutation(api.filters.remove, { sessionToken: token, id });
    expect(await t.run((ctx) => ctx.db.get(id))).toBeNull();
  });

  it('requires authentication', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    const id = await seedFilter(t, cat);
    await expect(t.mutation(api.filters.remove, { sessionToken: 'bogus', id })).rejects.toThrow();
  });
});

describe('filters.reorder', () => {
  it('updates the order of filters', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    const cat = await seedCategory(t);
    const a = await seedFilter(t, cat, { slug: 'a', order: 0 });
    const b = await seedFilter(t, cat, { slug: 'b', order: 1 });
    await t.mutation(api.filters.reorder, { sessionToken: token, items: [
      { id: a, order: 7 }, { id: b, order: 3 },
    ] });
    const orders = await t.run(async (ctx) => ({
      a: (await ctx.db.get(a))?.order,
      b: (await ctx.db.get(b))?.order,
    }));
    expect(orders).toEqual({ a: 7, b: 3 });
  });

  it('requires authentication', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    const id = await seedFilter(t, cat);
    await expect(t.mutation(api.filters.reorder, { sessionToken: 'bogus', items: [{ id, order: 1 }] })).rejects.toThrow();
  });
});

describe('filters.migrateTesak', () => {
  it("adds a 'type' filter to categories missing one", async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    const cat = await seedCategory(t);
    const msg = await t.mutation(api.filters.migrateTesak, { sessionToken: token });
    expect(typeof msg).toBe('string');
    const defs = await t.query(api.filters.getByCategory, { categoryId: cat });
    expect(defs.some((f) => f.slug === 'type')).toBe(true);
  });

  it('requires authentication', async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(api.filters.migrateTesak, { sessionToken: 'bogus' })).rejects.toThrow();
  });
});
