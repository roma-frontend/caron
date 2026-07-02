import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import { api } from './_generated/api';
import schema from './schema';
import type { Id } from './_generated/dataModel';

const modules = import.meta.glob('./**/*.ts');
type T = ReturnType<typeof convexTest>;

// ─── Seed helpers ──────────────────────────────────────────────
async function seedCategory(t: T, opts: Record<string, unknown> = {}): Promise<Id<'categories'>> {
  return await t.run(async (ctx) =>
    ctx.db.insert('categories', {
      name: 'Cat', slug: `cat-${Math.random().toString(36).slice(2)}`,
      order: 0, isActive: true, createdAt: Date.now(),
      ...opts,
    }) as Promise<Id<'categories'>>,
  );
}

async function seedProduct(
  t: T,
  categoryId: Id<'categories'>,
  opts: Record<string, unknown> = {},
): Promise<Id<'products'>> {
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
describe('products.list', () => {
  it('returns active products and excludes inactive ones', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    await seedProduct(t, cat, { name: 'Active', isActive: true });
    await seedProduct(t, cat, { name: 'Inactive', isActive: false });
    const rows = await t.query(api.products.list, {});
    const names = rows.map((p) => p.name);
    expect(names).toContain('Active');
    expect(names).not.toContain('Inactive');
  });

  it('filters by category', async () => {
    const t = convexTest(schema, modules);
    const catA = await seedCategory(t);
    const catB = await seedCategory(t);
    await seedProduct(t, catA, { name: 'InA' });
    await seedProduct(t, catB, { name: 'InB' });
    const rows = await t.query(api.products.list, { categoryId: catA });
    expect(rows.map((p) => p.name)).toEqual(['InA']);
  });

  it('filters by price range', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    await seedProduct(t, cat, { name: 'Cheap', price: 100 });
    await seedProduct(t, cat, { name: 'Mid', price: 500 });
    await seedProduct(t, cat, { name: 'Pricey', price: 2000 });
    const rows = await t.query(api.products.list, { minPrice: 200, maxPrice: 1000 });
    expect(rows.map((p) => p.name)).toEqual(['Mid']);
  });

  it('finds products by full-text name search', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    await seedProduct(t, cat, { name: 'Brake Pad Front' });
    await seedProduct(t, cat, { name: 'Oil Filter' });
    const rows = await t.query(api.products.list, { search: 'Brake' });
    expect(rows.some((p) => p.name === 'Brake Pad Front')).toBe(true);
  });

  it('finds a product by exact SKU', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    await seedProduct(t, cat, { name: 'BySku', sku: 'ABC-123' });
    const rows = await t.query(api.products.list, { search: 'ABC-123' });
    expect(rows.some((p) => p.name === 'BySku')).toBe(true);
  });
});

describe('products.listPaginated', () => {
  it('returns a paginated page of product cards', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    await seedProduct(t, cat, { name: 'P1' });
    await seedProduct(t, cat, { name: 'P2' });
    const res = await t.query(api.products.listPaginated, { paginationOpts: { numItems: 10, cursor: null } });
    expect(res.page.length).toBe(2);
    expect(res.page[0]).toHaveProperty('slug');
  });

  it('applies inStockOnly and onSale filters', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    await seedProduct(t, cat, { name: 'InStock', stock: 5 });
    await seedProduct(t, cat, { name: 'OutOfStock', stock: 0 });
    const inStock = await t.query(api.products.listPaginated, { inStockOnly: true, paginationOpts: { numItems: 50, cursor: null } });
    expect(inStock.page.map((p) => p.name)).toContain('InStock');
    expect(inStock.page.map((p) => p.name)).not.toContain('OutOfStock');

    await seedProduct(t, cat, { name: 'OnSale', price: 800, compareAtPrice: 1000 });
    const onSale = await t.query(api.products.listPaginated, { onSale: true, paginationOpts: { numItems: 50, cursor: null } });
    expect(onSale.page.map((p) => p.name)).toEqual(['OnSale']);
  });
});

describe('products.getById / getBySlug', () => {
  it('gets a product by id', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    const id = await seedProduct(t, cat, { name: 'ById' });
    const p = await t.query(api.products.getById, { id });
    expect(p?.name).toBe('ById');
  });

  it('gets an active product by slug', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    await seedProduct(t, cat, { name: 'BySlug', slug: 'by-slug' });
    const p = await t.query(api.products.getBySlug, { slug: 'by-slug' });
    expect(p?.name).toBe('BySlug');
  });

  it('returns null for an inactive product by slug', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    await seedProduct(t, cat, { name: 'Hidden', slug: 'hidden', isActive: false });
    expect(await t.query(api.products.getBySlug, { slug: 'hidden' })).toBeNull();
  });

  it('returns null when the product category is inactive', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t, { isActive: false });
    await seedProduct(t, cat, { name: 'Orphan', slug: 'orphan' });
    expect(await t.query(api.products.getBySlug, { slug: 'orphan' })).toBeNull();
  });
});

describe('products.getFeatured / getBrands', () => {
  it('returns featured in-stock products', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    await seedProduct(t, cat, { name: 'Feat', isFeatured: true, stock: 3 });
    const rows = await t.query(api.products.getFeatured, {});
    expect(rows.some((p) => p.name === 'Feat')).toBe(true);
  });

  it('collects distinct brands from active products (fallback scan)', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    await seedProduct(t, cat, { name: 'A', brand: 'Bosch' });
    await seedProduct(t, cat, { name: 'B', brand: 'Mann' });
    const brands = await t.query(api.products.getBrands, {});
    expect(brands).toContain('Bosch');
    expect(brands).toContain('Mann');
  });
});

describe('products.searchByOem', () => {
  it('finds a product via its OEM index (built on create)', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    const token = await superToken(t);
    await t.mutation(api.products.create, {
      sessionToken: token, name: 'OemProd', slug: 'oem-prod', description: 'd',
      price: 500, categoryId: cat, images: [], stock: 1, isActive: true,
      oemNumbers: [{ manufacturer: 'Bosch', code: '0986-AB/12' }],
    });
    const rows = await t.query(api.products.searchByOem, { oem: '0986ab12' });
    expect(rows.some((p) => p.name === 'OemProd')).toBe(true);
  });

  it('returns empty for a blank term', async () => {
    const t = convexTest(schema, modules);
    expect(await t.query(api.products.searchByOem, { oem: '   ' })).toEqual([]);
  });
});

describe('products.getVariantGroup', () => {
  it('returns active products in a variant group ordered by variantOrder', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    await seedProduct(t, cat, { name: 'V2', variantGroup: 'grp', variantOrder: 2 });
    await seedProduct(t, cat, { name: 'V1', variantGroup: 'grp', variantOrder: 1 });
    const rows = await t.query(api.products.getVariantGroup, { variantGroup: 'grp' });
    expect(rows.map((p) => p.name)).toEqual(['V1', 'V2']);
  });
});

// ─── Admin mutations ───────────────────────────────────────────
describe('products.create', () => {
  it('creates a product and auto-generates a SKU', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    const token = await superToken(t);
    const id = await t.mutation(api.products.create, {
      sessionToken: token, name: 'New', slug: 'new', description: 'd',
      price: 300, categoryId: cat, images: [], stock: 5, isActive: true,
    });
    const p = await t.run((ctx) => ctx.db.get(id));
    expect(p?.name).toBe('New');
    expect(p?.sku).toBeTruthy();
    // wholesalePrice defaults to price
    expect(p?.wholesalePrice).toBe(300);
  });

  it('rejects a duplicate SKU', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    const token = await superToken(t);
    await t.mutation(api.products.create, {
      sessionToken: token, name: 'A', slug: 'a', description: 'd',
      price: 1, categoryId: cat, images: [], stock: 1, isActive: true, sku: 'DUP',
    });
    await expect(t.mutation(api.products.create, {
      sessionToken: token, name: 'B', slug: 'b', description: 'd',
      price: 1, categoryId: cat, images: [], stock: 1, isActive: true, sku: 'DUP',
    })).rejects.toThrow();
  });

  it('requires the products capability (no session → throws)', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    await expect(t.mutation(api.products.create, {
      sessionToken: 'bogus', name: 'X', slug: 'x', description: 'd',
      price: 1, categoryId: cat, images: [], stock: 1, isActive: true,
    })).rejects.toThrow();
  });
});

describe('products.update', () => {
  it('updates price and stock, logging a stock movement', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    const token = await superToken(t);
    const id = await seedProduct(t, cat, { name: 'Upd', price: 100, stock: 10 });
    await t.mutation(api.products.update, { sessionToken: token, id, price: 250, stock: 4 });
    const p = await t.run((ctx) => ctx.db.get(id));
    expect(p?.price).toBe(250);
    expect(p?.stock).toBe(4);
    const moves = await t.run((ctx) => ctx.db.query('stockMovements').collect());
    expect(moves.length).toBe(1);
    expect(moves[0].stockAfter).toBe(4);
  });

  it('rejects updating to an existing SKU owned by another product', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    const token = await superToken(t);
    await seedProduct(t, cat, { name: 'Owner', sku: 'TAKEN' });
    const id = await seedProduct(t, cat, { name: 'Other', sku: 'FREE' });
    await expect(t.mutation(api.products.update, { sessionToken: token, id, sku: 'TAKEN' })).rejects.toThrow();
  });

  it('requires authorization', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    const id = await seedProduct(t, cat);
    await expect(t.mutation(api.products.update, { sessionToken: 'bogus', id, price: 5 })).rejects.toThrow();
  });
});

describe('products soft-delete / trash / restore', () => {
  it('moves a product to trash on remove and restores it', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    const token = await superToken(t);
    const id = await seedProduct(t, cat, { name: 'Trashee' });

    await t.mutation(api.products.remove, { sessionToken: token, id });
    expect(await t.run((ctx) => ctx.db.get(id))).toBeNull();

    const trash = await t.query(api.products.listTrash, { sessionToken: token });
    expect(trash.length).toBe(1);
    expect(trash[0].name).toBe('Trashee');

    const { productId } = await t.mutation(api.products.restoreProduct, { sessionToken: token, trashId: trash[0]._id });
    const restored = await t.run((ctx) => ctx.db.get(productId));
    expect(restored?.name).toBe('Trashee');
    expect(await t.query(api.products.listTrash, { sessionToken: token })).toEqual([]);
  });

  it('permanently deletes a trashed product', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    const token = await superToken(t);
    const id = await seedProduct(t, cat, { name: 'Gone' });
    await t.mutation(api.products.remove, { sessionToken: token, id });
    const trash = await t.query(api.products.listTrash, { sessionToken: token });
    await t.mutation(api.products.permanentDeleteProduct, { sessionToken: token, trashId: trash[0]._id });
    expect(await t.query(api.products.listTrash, { sessionToken: token })).toEqual([]);
  });
});

describe('products.bulkAction', () => {
  it('deactivates many products at once', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    const token = await superToken(t);
    const a = await seedProduct(t, cat, { isActive: true });
    const b = await seedProduct(t, cat, { isActive: true });
    const res = await t.mutation(api.products.bulkAction, { sessionToken: token, ids: [a, b], op: 'deactivate' });
    expect(res.affected).toBe(2);
    const docs = await t.run((ctx) => Promise.all([ctx.db.get(a), ctx.db.get(b)]));
    expect(docs.every((d) => d?.isActive === false)).toBe(true);
  });

  it('sets a discount on selected products', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    const token = await superToken(t);
    const a = await seedProduct(t, cat);
    const res = await t.mutation(api.products.bulkAction, { sessionToken: token, ids: [a], op: 'setDiscount', discount: 15 });
    expect(res.affected).toBe(1);
    const doc = await t.run((ctx) => ctx.db.get(a));
    expect(doc?.retailDiscount).toBe(15);
  });
});

describe('products.findDuplicateSlugs / dedupeSlugs', () => {
  it('detects and resolves duplicate slugs', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    const token = await superToken(t);
    await seedProduct(t, cat, { name: 'Dup1', slug: 'same', sku: 'S1' });
    await seedProduct(t, cat, { name: 'Dup2', slug: 'same', sku: 'S2' });

    const found = await t.query(api.products.findDuplicateSlugs, { sessionToken: token });
    expect(found.totalDuplicateSlugs).toBe(1);

    const res = await t.mutation(api.products.dedupeSlugs, { sessionToken: token });
    expect(res.renamed).toBe(1);

    const after = await t.query(api.products.findDuplicateSlugs, { sessionToken: token });
    expect(after.totalDuplicateSlugs).toBe(0);
  });
});
