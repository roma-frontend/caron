import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import { api } from './_generated/api';
import schema from './schema';
import type { Id } from './_generated/dataModel';

const modules = import.meta.glob('./**/*.ts');
type T = ReturnType<typeof convexTest>;

async function seedCategory(t: T, opts: Record<string, unknown> = {}): Promise<Id<'categories'>> {
  return await t.run(async (ctx) =>
    ctx.db.insert('categories', {
      name: `Cat-${Math.random().toString(36).slice(2)}`, slug: `cat-${Math.random().toString(36).slice(2)}`,
      order: 0, isActive: true, createdAt: Date.now(),
      ...opts,
    }) as Promise<Id<'categories'>>,
  );
}

async function seedProduct(t: T, categoryId: Id<'categories'>, opts: Record<string, unknown> = {}): Promise<Id<'products'>> {
  return await t.run(async (ctx) =>
    ctx.db.insert('products', {
      name: 'Widget', slug: `w-${Math.random().toString(36).slice(2)}`, description: 'd',
      price: 1000, categoryId, images: [], stock: 10,
      isActive: true, createdAt: Date.now(), updatedAt: Date.now(),
      ...opts,
    }) as Promise<Id<'products'>>,
  );
}

async function superToken(t: T): Promise<string> {
  const token = `tok-${Math.random().toString(36).slice(2)}`;
  await t.run(async (ctx) => {
    const uid = await ctx.db.insert('users', { name: 'O', email: `o-${token}@x.com`, role: 'superadmin', isActive: true, createdAt: Date.now() }) as Id<'users'>;
    await ctx.db.insert('sessions', { userId: uid, token, expiresAt: Date.now() + 3_600_000, createdAt: Date.now() });
  });
  return token;
}

// ─── Public queries ────────────────────────────────────────────
describe('categories.list', () => {
  it('returns only active categories', async () => {
    const t = convexTest(schema, modules);
    await seedCategory(t, { name: 'Active', isActive: true });
    await seedCategory(t, { name: 'Inactive', isActive: false });
    const rows = await t.query(api.categories.list, {});
    const names = rows.map((c) => c.name);
    expect(names).toContain('Active');
    expect(names).not.toContain('Inactive');
  });
});

describe('categories.listAll', () => {
  it('returns active and inactive categories', async () => {
    const t = convexTest(schema, modules);
    await seedCategory(t, { name: 'A', isActive: true });
    await seedCategory(t, { name: 'B', isActive: false });
    const rows = await t.query(api.categories.listAll, {});
    expect(rows.length).toBe(2);
  });
});

describe('categories.getBySlug', () => {
  it('gets a category by slug', async () => {
    const t = convexTest(schema, modules);
    await seedCategory(t, { name: 'Slugged', slug: 'slugged' });
    const c = await t.query(api.categories.getBySlug, { slug: 'slugged' });
    expect(c?.name).toBe('Slugged');
  });

  it('returns null for an unknown slug', async () => {
    const t = convexTest(schema, modules);
    expect(await t.query(api.categories.getBySlug, { slug: 'nope' })).toBeNull();
  });
});

describe('categories.listWithCounts', () => {
  it('returns active product counts per category (fallback scan)', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t, { name: 'Counted' });
    await seedProduct(t, cat, { isActive: true });
    await seedProduct(t, cat, { isActive: true });
    await seedProduct(t, cat, { isActive: false });
    const rows = await t.query(api.categories.listWithCounts, {});
    const target = rows.find((c) => c._id === cat);
    expect(target?.count).toBe(2);
  });
});

// ─── Admin mutations ───────────────────────────────────────────
describe('categories.create', () => {
  it('creates a category and its default filter definition', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    const id = await t.mutation(api.categories.create, {
      sessionToken: token, name: 'Brakes', slug: 'brakes', order: 1, isActive: true,
    });
    const c = await t.run((ctx) => ctx.db.get(id));
    expect(c?.name).toBe('Brakes');
    const defs = await t.run((ctx) => ctx.db.query('filterDefinitions').withIndex('by_category', (q) => q.eq('categoryId', id)).collect());
    expect(defs.length).toBe(1);
  });

  it('rejects a duplicate name', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    await t.mutation(api.categories.create, { sessionToken: token, name: 'Dup', slug: 'dup-1', order: 0, isActive: true });
    await expect(t.mutation(api.categories.create, { sessionToken: token, name: 'dup', slug: 'dup-2', order: 0, isActive: true })).rejects.toThrow();
  });

  it('rejects a duplicate slug', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    await t.mutation(api.categories.create, { sessionToken: token, name: 'One', slug: 'shared', order: 0, isActive: true });
    await expect(t.mutation(api.categories.create, { sessionToken: token, name: 'Two', slug: 'shared', order: 0, isActive: true })).rejects.toThrow();
  });

  it('requires the categories capability', async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(api.categories.create, { sessionToken: 'bogus', name: 'X', slug: 'x', order: 0, isActive: true })).rejects.toThrow();
  });
});

describe('categories.update', () => {
  it('updates fields on an existing category', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    const id = await seedCategory(t, { name: 'Old', slug: 'old' });
    await t.mutation(api.categories.update, { sessionToken: token, id, name: 'Renamed' });
    const c = await t.run((ctx) => ctx.db.get(id));
    expect(c?.name).toBe('Renamed');
  });

  it('rejects renaming to a name owned by another category', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    await seedCategory(t, { name: 'Taken', slug: 'taken' });
    const id = await seedCategory(t, { name: 'Mine', slug: 'mine' });
    await expect(t.mutation(api.categories.update, { sessionToken: token, id, name: 'Taken' })).rejects.toThrow();
  });

  it('throws for a missing category', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    const id = await seedCategory(t);
    await t.run(async (ctx) => { await ctx.db.delete(id); });
    await expect(t.mutation(api.categories.update, { sessionToken: token, id, name: 'X' })).rejects.toThrow();
  });
});

describe('categories.mergeCategories', () => {
  it('moves products from source to target and deactivates source', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    const source = await seedCategory(t, { name: 'Src', slug: 'src' });
    const target = await seedCategory(t, { name: 'Tgt', slug: 'tgt' });
    const p = await seedProduct(t, source);

    const res = await t.mutation(api.categories.mergeCategories, { sessionToken: token, sourceId: source, targetId: target });
    expect(res.movedProducts).toBe(1);

    const moved = await t.run((ctx) => ctx.db.get(p));
    expect(moved?.categoryId).toBe(target);
    const src = await t.run((ctx) => ctx.db.get(source));
    expect(src?.isActive).toBe(false);
  });

  it('rejects merging a category into itself', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    const c = await seedCategory(t);
    await expect(t.mutation(api.categories.mergeCategories, { sessionToken: token, sourceId: c, targetId: c })).rejects.toThrow();
  });
});

describe('categories soft-delete / trash / restore', () => {
  it('moves a category to trash on remove and restores it', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    const id = await seedCategory(t, { name: 'ToTrash', slug: 'to-trash' });

    await t.mutation(api.categories.remove, { sessionToken: token, id });
    expect(await t.run((ctx) => ctx.db.get(id))).toBeNull();

    const trash = await t.query(api.categories.listTrash, { sessionToken: token });
    expect(trash.length).toBe(1);
    expect(trash[0].name).toBe('ToTrash');

    const { categoryId } = await t.mutation(api.categories.restoreCategory, { sessionToken: token, trashId: trash[0]._id });
    const restored = await t.run((ctx) => ctx.db.get(categoryId));
    expect(restored?.name).toBe('ToTrash');
    expect(await t.query(api.categories.listTrash, { sessionToken: token })).toEqual([]);
  });

  it('permanently deletes a trashed category', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    const id = await seedCategory(t, { name: 'PermGone', slug: 'perm-gone' });
    await t.mutation(api.categories.remove, { sessionToken: token, id });
    const trash = await t.query(api.categories.listTrash, { sessionToken: token });
    await t.mutation(api.categories.permanentDeleteCategory, { sessionToken: token, trashId: trash[0]._id });
    expect(await t.query(api.categories.listTrash, { sessionToken: token })).toEqual([]);
  });
});
