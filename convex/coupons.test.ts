import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import { api } from './_generated/api';
import schema from './schema';
import type { Id } from './_generated/dataModel';

const modules = import.meta.glob('./**/*.ts');
type T = ReturnType<typeof convexTest>;

async function seedCoupon(t: T, c: Record<string, unknown>): Promise<Id<'coupons'>> {
  return await t.run(async (ctx) =>
    ctx.db.insert('coupons', {
      code: 'SAVE', type: 'percent', value: 10, isActive: true, usedCount: 0, createdAt: Date.now(),
      ...c,
    }) as Promise<Id<'coupons'>>,
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

describe('coupons.validate', () => {
  it('computes a percent discount', async () => {
    const t = convexTest(schema, modules);
    await seedCoupon(t, { code: 'SAVE10', type: 'percent', value: 10 });
    const r = await t.query(api.coupons.validate, { code: 'SAVE10', orderTotal: 2000 });
    expect(r?.discount).toBe(200);
  });

  it('computes a fixed discount capped at the order total', async () => {
    const t = convexTest(schema, modules);
    await seedCoupon(t, { code: 'MINUS500', type: 'fixed', value: 500 });
    expect((await t.query(api.coupons.validate, { code: 'MINUS500', orderTotal: 2000 }))?.discount).toBe(500);
    // fixed value larger than the total is capped
    expect((await t.query(api.coupons.validate, { code: 'MINUS500', orderTotal: 300 }))?.discount).toBe(300);
  });

  it('is case-insensitive on the code', async () => {
    const t = convexTest(schema, modules);
    await seedCoupon(t, { code: 'SUMMER', type: 'percent', value: 20 });
    expect(await t.query(api.coupons.validate, { code: 'summer', orderTotal: 1000 })).not.toBeNull();
  });

  it('returns null for inactive / expired / not-yet-started coupons', async () => {
    const t = convexTest(schema, modules);
    await seedCoupon(t, { code: 'OFF', isActive: false });
    await seedCoupon(t, { code: 'OLD', expiresAt: Date.now() - 1000 });
    await seedCoupon(t, { code: 'SOON', startsAt: Date.now() + 100000 });
    expect(await t.query(api.coupons.validate, { code: 'OFF', orderTotal: 1000 })).toBeNull();
    expect(await t.query(api.coupons.validate, { code: 'OLD', orderTotal: 1000 })).toBeNull();
    expect(await t.query(api.coupons.validate, { code: 'SOON', orderTotal: 1000 })).toBeNull();
  });

  it('respects maxUses and minOrderAmount', async () => {
    const t = convexTest(schema, modules);
    await seedCoupon(t, { code: 'USED', maxUses: 5, usedCount: 5 });
    await seedCoupon(t, { code: 'BIG', minOrderAmount: 5000 });
    expect(await t.query(api.coupons.validate, { code: 'USED', orderTotal: 1000 })).toBeNull();
    expect(await t.query(api.coupons.validate, { code: 'BIG', orderTotal: 4999 })).toBeNull();
    expect(await t.query(api.coupons.validate, { code: 'BIG', orderTotal: 5000 })).not.toBeNull();
  });

  it('returns null for an unknown code', async () => {
    const t = convexTest(schema, modules);
    expect(await t.query(api.coupons.validate, { code: 'NOPE', orderTotal: 1000 })).toBeNull();
  });
});

describe('coupons.apply', () => {
  it('increments usedCount', async () => {
    const t = convexTest(schema, modules);
    const id = await seedCoupon(t, { code: 'INC', usedCount: 2 });
    await t.mutation(api.coupons.apply, { code: 'inc' });
    const used = await t.run(async (ctx) => (await ctx.db.get(id))?.usedCount);
    expect(used).toBe(3);
  });

  it('throws for an unknown code', async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(api.coupons.apply, { code: 'GHOST' })).rejects.toThrow();
  });
});

describe('coupons.create', () => {
  it('stores the code uppercased with usedCount 0', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    const id = await t.mutation(api.coupons.create, { sessionToken: token, code: 'newyear', type: 'percent', value: 15, isActive: true });
    const c = await t.run((ctx) => ctx.db.get(id));
    expect(c?.code).toBe('NEWYEAR');
    expect(c?.usedCount).toBe(0);
  });

  it('rejects a percent value over 100 and negative values', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    await expect(t.mutation(api.coupons.create, { sessionToken: token, code: 'X', type: 'percent', value: 150, isActive: true })).rejects.toThrow();
    await expect(t.mutation(api.coupons.create, { sessionToken: token, code: 'Y', type: 'fixed', value: -5, isActive: true })).rejects.toThrow();
  });

  it('requires the promotions capability', async () => {
    const t = convexTest(schema, modules);
    // No session → not authenticated → should throw.
    await expect(t.mutation(api.coupons.create, { sessionToken: 'bogus', code: 'Z', type: 'fixed', value: 100, isActive: true })).rejects.toThrow();
  });
});
