import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import { api } from './_generated/api';
import schema from './schema';
import type { Id } from './_generated/dataModel';

const modules = import.meta.glob('./**/*.ts');
type T = ReturnType<typeof convexTest>;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

async function seedPromotion(t: T, p: Record<string, unknown> = {}): Promise<Id<'promotions'>> {
  const now = Date.now();
  return await t.run(async (ctx) =>
    ctx.db.insert('promotions', {
      title: 'Promo',
      isActive: true,
      startDate: now - DAY,
      endDate: now + DAY,
      createdAt: now,
      ...p,
    }) as Promise<Id<'promotions'>>,
  );
}

async function tokenForRole(t: T, role: 'superadmin' | 'admin' | 'manager' | 'customer'): Promise<string> {
  const token = `tok-${role}-${Math.random().toString(36).slice(2)}`;
  await t.run(async (ctx) => {
    const uid = (await ctx.db.insert('users', {
      name: role,
      email: `${role}-${Math.random().toString(36).slice(2)}@x.com`,
      role,
      isActive: true,
      createdAt: Date.now(),
    })) as Id<'users'>;
    await ctx.db.insert('sessions', { userId: uid, token, expiresAt: Date.now() + HOUR, createdAt: Date.now() });
  });
  return token;
}

async function superToken(t: T): Promise<string> {
  return tokenForRole(t, 'superadmin');
}

describe('promotions.list', () => {
  it('returns all promotions, newest first', async () => {
    const t = convexTest(schema, modules);
    await seedPromotion(t, { title: 'First' });
    await seedPromotion(t, { title: 'Second' });
    const list = await t.query(api.promotions.list, {});
    expect(list).toHaveLength(2);
    // .order('desc') → most recently inserted first.
    expect(list[0].title).toBe('Second');
  });

  it('returns an empty array when there are no promotions', async () => {
    const t = convexTest(schema, modules);
    expect(await t.query(api.promotions.list, {})).toEqual([]);
  });

  it('includes inactive and expired promotions (no filtering)', async () => {
    const t = convexTest(schema, modules);
    await seedPromotion(t, { title: 'Inactive', isActive: false });
    await seedPromotion(t, { title: 'Expired', endDate: Date.now() - DAY, startDate: Date.now() - 2 * DAY });
    const list = await t.query(api.promotions.list, {});
    expect(list).toHaveLength(2);
  });
});

describe('promotions.active', () => {
  it('returns only active promotions inside their date window', async () => {
    const t = convexTest(schema, modules);
    const now = Date.now();
    await seedPromotion(t, { title: 'Live' });
    await seedPromotion(t, { title: 'Disabled', isActive: false });
    await seedPromotion(t, { title: 'NotStarted', startDate: now + DAY, endDate: now + 2 * DAY });
    await seedPromotion(t, { title: 'Ended', startDate: now - 2 * DAY, endDate: now - DAY });
    const active = await t.query(api.promotions.active, {});
    expect(active).toHaveLength(1);
    expect(active[0].title).toBe('Live');
  });

  it('treats window boundaries inclusively', async () => {
    const t = convexTest(schema, modules);
    const now = Date.now();
    // startDate exactly now, endDate far ahead → active (start <= now).
    await seedPromotion(t, { title: 'BoundaryStart', startDate: now, endDate: now + DAY });
    const active = await t.query(api.promotions.active, {});
    expect(active.map((p) => p.title)).toContain('BoundaryStart');
  });

  it('returns an empty array when nothing is active', async () => {
    const t = convexTest(schema, modules);
    await seedPromotion(t, { isActive: false });
    expect(await t.query(api.promotions.active, {})).toEqual([]);
  });
});

describe('promotions.create', () => {
  it('creates a promotion for an authorized admin', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    const now = Date.now();
    const id = await t.mutation(api.promotions.create, {
      sessionToken: token,
      title: 'New Year Sale',
      startDate: now,
      endDate: now + 7 * DAY,
      isActive: true,
      discountPercent: 25,
    });
    const p = await t.run((ctx) => ctx.db.get(id));
    expect(p?.title).toBe('New Year Sale');
    expect(p?.discountPercent).toBe(25);
    expect(p?.createdAt).toBeGreaterThan(0);
  });

  it('derives imageUrl from the first image when images are provided', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    const now = Date.now();
    const id = await t.mutation(api.promotions.create, {
      sessionToken: token,
      title: 'With Images',
      images: ['https://cdn/a.jpg', 'https://cdn/b.jpg'],
      startDate: now,
      endDate: now + DAY,
      isActive: true,
    });
    const p = await t.run((ctx) => ctx.db.get(id));
    expect(p?.imageUrl).toBe('https://cdn/a.jpg');
  });

  it('rejects an unauthenticated caller', async () => {
    const t = convexTest(schema, modules);
    const now = Date.now();
    await expect(
      t.mutation(api.promotions.create, { sessionToken: 'bogus', title: 'X', startDate: now, endDate: now + DAY, isActive: true }),
    ).rejects.toThrow(/Not authenticated/);
  });

  it('rejects a customer caller', async () => {
    const t = convexTest(schema, modules);
    const token = await tokenForRole(t, 'customer');
    const now = Date.now();
    await expect(
      t.mutation(api.promotions.create, { sessionToken: token, title: 'X', startDate: now, endDate: now + DAY, isActive: true }),
    ).rejects.toThrow(/Admin access required/);
  });

  it('rejects an admin whose "promotions" capability is disabled', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      ctx.db.insert('accessControl', { role: 'admin', capability: 'promotions', enabled: false, updatedAt: Date.now() });
    });
    const token = await tokenForRole(t, 'admin');
    const now = Date.now();
    await expect(
      t.mutation(api.promotions.create, { sessionToken: token, title: 'X', startDate: now, endDate: now + DAY, isActive: true }),
    ).rejects.toThrow(/Access denied/);
  });
});

describe('promotions.update', () => {
  it('patches provided fields for an authorized admin', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    const id = await seedPromotion(t, { title: 'Old', isActive: true });
    await t.mutation(api.promotions.update, { sessionToken: token, id, title: 'Renamed', isActive: false });
    const p = await t.run((ctx) => ctx.db.get(id));
    expect(p?.title).toBe('Renamed');
    expect(p?.isActive).toBe(false);
  });

  it('sets imageUrl to the first of new images and clears it when empty', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    const id = await seedPromotion(t, { imageUrl: 'old.jpg' });
    await t.mutation(api.promotions.update, { sessionToken: token, id, images: ['first.jpg', 'second.jpg'] });
    let p = await t.run((ctx) => ctx.db.get(id));
    expect(p?.imageUrl).toBe('first.jpg');

    await t.mutation(api.promotions.update, { sessionToken: token, id, images: [] });
    p = await t.run((ctx) => ctx.db.get(id));
    expect(p?.imageUrl).toBeUndefined();
  });

  it('persists productIds when supplied', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    const id = await seedPromotion(t);
    // Insert a couple of products to reference.
    const productIds = await t.run(async (ctx) => {
      const catId = (await ctx.db.insert('categories', { name: 'C', slug: 'c', isActive: true, createdAt: Date.now(), order: 0 })) as Id<'categories'>;
      const p1 = (await ctx.db.insert('products', baseProduct(catId, 'p1'))) as Id<'products'>;
      const p2 = (await ctx.db.insert('products', baseProduct(catId, 'p2'))) as Id<'products'>;
      return [p1, p2];
    });
    await t.mutation(api.promotions.update, { sessionToken: token, id, productIds });
    const p = await t.run((ctx) => ctx.db.get(id));
    expect(p?.productIds).toHaveLength(2);
  });

  it('rejects an unauthorized update', async () => {
    const t = convexTest(schema, modules);
    const id = await seedPromotion(t);
    await expect(t.mutation(api.promotions.update, { sessionToken: 'bogus', id, title: 'X' })).rejects.toThrow(/Not authenticated/);
  });
});

describe('promotions.remove', () => {
  it('deletes a promotion for an authorized admin', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    const id = await seedPromotion(t);
    await t.mutation(api.promotions.remove, { sessionToken: token, id });
    const p = await t.run((ctx) => ctx.db.get(id));
    expect(p).toBeNull();
  });

  it('rejects an unauthorized remove', async () => {
    const t = convexTest(schema, modules);
    const id = await seedPromotion(t);
    const token = await tokenForRole(t, 'customer');
    await expect(t.mutation(api.promotions.remove, { sessionToken: token, id })).rejects.toThrow(/Admin access required/);
    // Still present.
    const p = await t.run((ctx) => ctx.db.get(id));
    expect(p).not.toBeNull();
  });
});

/** Minimal product doc — only the fields required by the schema for the update test. */
function baseProduct(categoryId: Id<'categories'>, slug: string) {
  return {
    name: slug,
    slug,
    description: 'desc',
    categoryId,
    price: 1000,
    images: [],
    stock: 10,
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
