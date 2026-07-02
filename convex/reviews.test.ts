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

async function superToken(t: T): Promise<string> {
  const token = `tok-${Math.random().toString(36).slice(2)}`;
  await t.run(async (ctx) => {
    const uid = await ctx.db.insert('users', { name: 'O', email: 'o@x.com', role: 'superadmin', isActive: true, createdAt: Date.now() }) as Id<'users'>;
    await ctx.db.insert('sessions', { userId: uid, token, expiresAt: Date.now() + 3_600_000, createdAt: Date.now() });
  });
  return token;
}

async function adminToken(t: T): Promise<string> {
  const token = `tok-${Math.random().toString(36).slice(2)}`;
  await t.run(async (ctx) => {
    const uid = await ctx.db.insert('users', { name: 'A', email: `a-${Math.random().toString(36).slice(2)}@x.com`, role: 'admin', isActive: true, createdAt: Date.now() }) as Id<'users'>;
    await ctx.db.insert('sessions', { userId: uid, token, expiresAt: Date.now() + 3_600_000, createdAt: Date.now() });
  });
  return token;
}

async function customerToken(t: T): Promise<{ token: string; userId: Id<'users'>; email: string }> {
  const token = `tok-${Math.random().toString(36).slice(2)}`;
  const email = `c-${Math.random().toString(36).slice(2)}@x.com`;
  const userId = await t.run(async (ctx) => {
    const uid = await ctx.db.insert('users', { name: 'Cust', email, role: 'customer', isActive: true, createdAt: Date.now() }) as Id<'users'>;
    await ctx.db.insert('sessions', { userId: uid, token, expiresAt: Date.now() + 3_600_000, createdAt: Date.now() });
    return uid;
  });
  return { token, userId, email };
}

async function seedOrderFor(t: T, userId: Id<'users'>, pid: Id<'products'>): Promise<void> {
  await t.run(async (ctx) => {
    await ctx.db.insert('orders', {
      orderNumber: `ORD-${Math.random().toString(36).slice(2).toUpperCase()}`,
      customerName: 'John', customerEmail: 'john@x.com', customerPhone: '+37400', shippingAddress: 'addr',
      items: [{ productId: pid, name: 'P', price: 1000, quantity: 1 }],
      subtotal: 1000, shipping: 0, total: 1000, status: 'delivered', paymentStatus: 'paid',
      userId, createdAt: Date.now(), updatedAt: Date.now(),
    });
  });
}

const reviewArgs = (productId: Id<'products'>, over: Record<string, unknown> = {}) => ({
  productId, authorName: 'Anna', rating: 5, text: 'Great', ...over,
});

describe('reviews.create', () => {
  it('creates an unapproved, unverified review for an anonymous author', async () => {
    const t = convexTest(schema, modules);
    const pid = await seedProduct(t);
    const id = await t.mutation(api.reviews.create, reviewArgs(pid));
    const rev = await t.run((ctx) => ctx.db.get(id));
    expect(rev?.isApproved).toBe(false);
    expect(rev?.verified).toBe(false);
    expect(rev?.rating).toBe(5);
    expect(rev?.helpfulCount).toBe(0);
  });

  it('marks the review verified when the author has an order with the product', async () => {
    const t = convexTest(schema, modules);
    const pid = await seedProduct(t);
    const { token, userId } = await customerToken(t);
    await seedOrderFor(t, userId, pid);
    const id = await t.mutation(api.reviews.create, reviewArgs(pid, { sessionToken: token }));
    const rev = await t.run((ctx) => ctx.db.get(id));
    expect(rev?.verified).toBe(true);
    expect(rev?.reviewerUserId).toBe(userId);
  });

  it('rejects invalid ratings (non-integer / out of range)', async () => {
    const t = convexTest(schema, modules);
    const pid = await seedProduct(t);
    await expect(t.mutation(api.reviews.create, reviewArgs(pid, { rating: 0 }))).rejects.toThrow();
    await expect(t.mutation(api.reviews.create, reviewArgs(pid, { rating: 6 }))).rejects.toThrow();
    await expect(t.mutation(api.reviews.create, reviewArgs(pid, { rating: 3.5 }))).rejects.toThrow();
  });

  it('rejects an empty author name and text over 1000 chars and too many photos', async () => {
    const t = convexTest(schema, modules);
    const pid = await seedProduct(t);
    await expect(t.mutation(api.reviews.create, reviewArgs(pid, { authorName: '   ' }))).rejects.toThrow();
    await expect(t.mutation(api.reviews.create, reviewArgs(pid, { text: 'x'.repeat(1001) }))).rejects.toThrow();
    await expect(t.mutation(api.reviews.create, reviewArgs(pid, { photos: ['a', 'b', 'c', 'd', 'e', 'f'] }))).rejects.toThrow();
  });
});

describe('reviews.getByProduct / getStats', () => {
  it('returns only approved reviews and aggregates rating stats', async () => {
    const t = convexTest(schema, modules);
    const pid = await seedProduct(t);
    const token = await superToken(t);
    const r1 = await t.mutation(api.reviews.create, reviewArgs(pid, { rating: 4 }));
    const r2 = await t.mutation(api.reviews.create, reviewArgs(pid, { rating: 2 }));
    await t.mutation(api.reviews.create, reviewArgs(pid, { rating: 5 })); // stays unapproved
    await t.mutation(api.reviews.approve, { sessionToken: token, id: r1, approved: true });
    await t.mutation(api.reviews.approve, { sessionToken: token, id: r2, approved: true });

    const list = await t.query(api.reviews.getByProduct, { productId: pid });
    expect(list.length).toBe(2);

    const stats = await t.query(api.reviews.getStats, { productId: pid });
    expect(stats.count).toBe(2);
    expect(stats.avg).toBe(3); // (4+2)/2
    expect(stats.dist[3]).toBe(1); // one 4-star
    expect(stats.dist[1]).toBe(1); // one 2-star

    const withStats = await t.query(api.reviews.getByProductWithStats, { productId: pid });
    expect(withStats.stats.count).toBe(2);
    expect(withStats.reviews.length).toBe(2);
  });

  it('returns zeroed stats when there are no approved reviews', async () => {
    const t = convexTest(schema, modules);
    const pid = await seedProduct(t);
    await t.mutation(api.reviews.create, reviewArgs(pid));
    const stats = await t.query(api.reviews.getStats, { productId: pid });
    expect(stats).toEqual({ avg: 0, count: 0, dist: [0, 0, 0, 0, 0] });
  });
});

describe('reviews.markHelpful', () => {
  it('increments the helpful counter', async () => {
    const t = convexTest(schema, modules);
    const pid = await seedProduct(t);
    const id = await t.mutation(api.reviews.create, reviewArgs(pid));
    await t.mutation(api.reviews.markHelpful, { id });
    await t.mutation(api.reviews.markHelpful, { id });
    expect((await t.run((ctx) => ctx.db.get(id)))?.helpfulCount).toBe(2);
  });
});

describe('reviews.listAll', () => {
  it('returns reviews for an admin caller', async () => {
    const t = convexTest(schema, modules);
    const pid = await seedProduct(t);
    await t.mutation(api.reviews.create, reviewArgs(pid));
    const token = await adminToken(t);
    const all = await t.query(api.reviews.listAll, { sessionToken: token });
    expect(all.length).toBe(1);
  });

  it('returns an empty list for a non-admin / bogus session', async () => {
    const t = convexTest(schema, modules);
    const pid = await seedProduct(t);
    await t.mutation(api.reviews.create, reviewArgs(pid));
    expect(await t.query(api.reviews.listAll, { sessionToken: 'bogus' })).toEqual([]);
    const { token } = await customerToken(t);
    expect(await t.query(api.reviews.listAll, { sessionToken: token })).toEqual([]);
  });
});

describe('reviews.approve', () => {
  it('approves a review and updates the product rating aggregate', async () => {
    const t = convexTest(schema, modules);
    const pid = await seedProduct(t);
    const id = await t.mutation(api.reviews.create, reviewArgs(pid, { rating: 4 }));
    const token = await superToken(t);
    await t.mutation(api.reviews.approve, { sessionToken: token, id, approved: true });
    const rev = await t.run((ctx) => ctx.db.get(id));
    expect(rev?.isApproved).toBe(true);
    const prod = await t.run((ctx) => ctx.db.get(pid));
    expect(prod?.rating).toBe(4);
    expect(prod?.reviewCount).toBe(1);
  });

  it('can un-approve (reject) a review, dropping it from the aggregate', async () => {
    const t = convexTest(schema, modules);
    const pid = await seedProduct(t);
    const id = await t.mutation(api.reviews.create, reviewArgs(pid, { rating: 5 }));
    const token = await superToken(t);
    await t.mutation(api.reviews.approve, { sessionToken: token, id, approved: true });
    await t.mutation(api.reviews.approve, { sessionToken: token, id, approved: false });
    expect((await t.run((ctx) => ctx.db.get(id)))?.isApproved).toBe(false);
    const prod = await t.run((ctx) => ctx.db.get(pid));
    expect(prod?.rating).toBe(0);
    expect(prod?.reviewCount).toBe(0);
  });

  it('awards loyalty points on first approval when loyalty is enabled', async () => {
    const t = convexTest(schema, modules);
    const pid = await seedProduct(t);
    const { token: custTok, userId, email } = await customerToken(t);
    await t.run(async (ctx) => {
      await ctx.db.insert('settings', {
        storeName: 'S', phone: '', email: '', address: '', whatsapp: '', telegram: '', instagram: '', facebook: '',
        deliveryYerevan: 0, deliveryRegions: 0, freeShippingThreshold: 0, announcementBar: '', workingHours: '',
        enableLoyalty: true, loyaltyReviewPoints: 20, loyaltyReviewPhotoBonus: 30,
      });
    });
    const id = await t.mutation(api.reviews.create, reviewArgs(pid, { sessionToken: custTok, photos: ['p1'] }));
    const admin = await superToken(t);
    await t.mutation(api.reviews.approve, { sessionToken: admin, id, approved: true });
    const rev = await t.run((ctx) => ctx.db.get(id));
    expect(rev?.pointsAwarded).toBe(true);
    const loyalty = await t.run(async (ctx) =>
      ctx.db.query('loyaltyPoints').withIndex('by_user', (q) => q.eq('userId', userId)).first());
    expect(loyalty?.points).toBe(50); // 20 base + 30 photo bonus
    expect(email).toBeTruthy();
  });

  it('requires the reviews capability', async () => {
    const t = convexTest(schema, modules);
    const pid = await seedProduct(t);
    const id = await t.mutation(api.reviews.create, reviewArgs(pid));
    await expect(t.mutation(api.reviews.approve, { sessionToken: 'bogus', id, approved: true })).rejects.toThrow();
  });
});

describe('reviews.remove', () => {
  it('deletes a review and recomputes the product rating', async () => {
    const t = convexTest(schema, modules);
    const pid = await seedProduct(t);
    const id = await t.mutation(api.reviews.create, reviewArgs(pid, { rating: 5 }));
    const token = await superToken(t);
    await t.mutation(api.reviews.approve, { sessionToken: token, id, approved: true });
    await t.mutation(api.reviews.remove, { sessionToken: token, id });
    expect(await t.run((ctx) => ctx.db.get(id))).toBeNull();
    const prod = await t.run((ctx) => ctx.db.get(pid));
    expect(prod?.reviewCount).toBe(0);
  });

  it('requires the reviews capability', async () => {
    const t = convexTest(schema, modules);
    const pid = await seedProduct(t);
    const id = await t.mutation(api.reviews.create, reviewArgs(pid));
    await expect(t.mutation(api.reviews.remove, { sessionToken: 'bogus', id })).rejects.toThrow();
  });
});
