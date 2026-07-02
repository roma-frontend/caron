import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import { api } from './_generated/api';
import schema from './schema';
import type { Id } from './_generated/dataModel';

const modules = import.meta.glob('./**/*.ts');
type T = ReturnType<typeof convexTest>;

async function seedBrand(t: T, b: Record<string, unknown>): Promise<Id<'brands'>> {
  return await t.run(async (ctx) =>
    ctx.db.insert('brands', {
      name: 'Bosch', slug: 'bosch', order: 0, isActive: true,
      createdAt: Date.now(), updatedAt: Date.now(),
      ...b,
    }) as Promise<Id<'brands'>>,
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

describe('brands.list / listAll', () => {
  it('returns only active brands, sorted by order then name', async () => {
    const t = convexTest(schema, modules);
    await seedBrand(t, { name: 'Zeta', slug: 'zeta', order: 2, isActive: true });
    await seedBrand(t, { name: 'Alpha', slug: 'alpha', order: 1, isActive: true });
    await seedBrand(t, { name: 'Beta', slug: 'beta', order: 1, isActive: true });
    await seedBrand(t, { name: 'Hidden', slug: 'hidden', order: 0, isActive: false });

    const r = await t.query(api.brands.list, {});
    expect(r.map((b) => b.name)).toEqual(['Alpha', 'Beta', 'Zeta']);
  });

  it('listAll includes inactive brands', async () => {
    const t = convexTest(schema, modules);
    await seedBrand(t, { name: 'Active', slug: 'active', isActive: true });
    await seedBrand(t, { name: 'Inactive', slug: 'inactive', isActive: false });
    const r = await t.query(api.brands.listAll, {});
    expect(r.length).toBe(2);
  });
});

describe('brands.create', () => {
  it('creates a brand with a slug and incremented order', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    await seedBrand(t, { name: 'First', slug: 'first', order: 5 });
    const id = await t.mutation(api.brands.create, { sessionToken: token, name: '  Mann Filter  ' });
    const b = await t.run((ctx) => ctx.db.get(id));
    expect(b?.name).toBe('Mann Filter');
    expect(b?.slug).toBe('mann-filter');
    expect(b?.order).toBe(6);
    expect(b?.isActive).toBe(true);
  });

  it('generates a unique slug when the base slug is taken', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    await seedBrand(t, { name: 'Something', slug: 'valeo' });
    const id = await t.mutation(api.brands.create, { sessionToken: token, name: 'Valeo' });
    const b = await t.run((ctx) => ctx.db.get(id));
    expect(b?.slug).toBe('valeo-2');
  });

  it('rejects a duplicate name (case-insensitive)', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    await seedBrand(t, { name: 'NGK', slug: 'ngk' });
    await expect(t.mutation(api.brands.create, { sessionToken: token, name: 'ngk' })).rejects.toThrow();
  });

  it('rejects an empty name', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    await expect(t.mutation(api.brands.create, { sessionToken: token, name: '   ' })).rejects.toThrow();
  });

  it('requires authentication', async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(api.brands.create, { sessionToken: 'bogus', name: 'X' })).rejects.toThrow();
  });
});

describe('brands.update', () => {
  it('renames a brand', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    const id = await seedBrand(t, { name: 'Old', slug: 'old' });
    await t.mutation(api.brands.update, { sessionToken: token, id, name: 'New', isActive: false });
    const b = await t.run((ctx) => ctx.db.get(id));
    expect(b?.name).toBe('New');
    expect(b?.isActive).toBe(false);
  });

  it('rejects renaming to a duplicate name', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    await seedBrand(t, { name: 'Taken', slug: 'taken' });
    const id = await seedBrand(t, { name: 'Mine', slug: 'mine' });
    await expect(t.mutation(api.brands.update, { sessionToken: token, id, name: 'taken' })).rejects.toThrow();
  });

  it('rejects an empty renamed name', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    const id = await seedBrand(t, { name: 'Keep', slug: 'keep' });
    await expect(t.mutation(api.brands.update, { sessionToken: token, id, name: '  ' })).rejects.toThrow();
  });

  it('throws for a missing brand', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    const id = await seedBrand(t, { name: 'Gone', slug: 'gone' });
    await t.run((ctx) => ctx.db.delete(id));
    await expect(t.mutation(api.brands.update, { sessionToken: token, id, name: 'X' })).rejects.toThrow();
  });

  it('requires authentication', async () => {
    const t = convexTest(schema, modules);
    const id = await seedBrand(t, {});
    await expect(t.mutation(api.brands.update, { sessionToken: 'bogus', id, name: 'X' })).rejects.toThrow();
  });
});

describe('brands.remove', () => {
  it('deletes a brand', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    const id = await seedBrand(t, {});
    await t.mutation(api.brands.remove, { sessionToken: token, id });
    expect(await t.run((ctx) => ctx.db.get(id))).toBeNull();
  });

  it('requires authentication', async () => {
    const t = convexTest(schema, modules);
    const id = await seedBrand(t, {});
    await expect(t.mutation(api.brands.remove, { sessionToken: 'bogus', id })).rejects.toThrow();
  });
});

describe('brands.reorder', () => {
  it('updates the order of multiple brands', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    const a = await seedBrand(t, { name: 'A', slug: 'a', order: 0 });
    const b = await seedBrand(t, { name: 'B', slug: 'b', order: 1 });
    await t.mutation(api.brands.reorder, { sessionToken: token, items: [
      { id: a, order: 10 },
      { id: b, order: 5 },
    ] });
    const orders = await t.run(async (ctx) => ({
      a: (await ctx.db.get(a))?.order,
      b: (await ctx.db.get(b))?.order,
    }));
    expect(orders).toEqual({ a: 10, b: 5 });
  });

  it('requires authentication', async () => {
    const t = convexTest(schema, modules);
    const id = await seedBrand(t, {});
    await expect(t.mutation(api.brands.reorder, { sessionToken: 'bogus', items: [{ id, order: 1 }] })).rejects.toThrow();
  });
});
