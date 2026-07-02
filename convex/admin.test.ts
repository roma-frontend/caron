import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import { api } from './_generated/api';
import schema from './schema';
import type { Id } from './_generated/dataModel';

const modules = import.meta.glob('./**/*.ts');
type T = ReturnType<typeof convexTest>;
type Role = 'superadmin' | 'admin' | 'manager' | 'customer';

/** Seed a user with the given role + a session token. */
async function tokenFor(t: T, role: Role): Promise<string> {
  const token = `tok-${Math.random().toString(36).slice(2)}`;
  await t.run(async (ctx) => {
    const uid = (await ctx.db.insert('users', {
      name: `${role}-user`,
      email: `${role}-${Math.random().toString(36).slice(2)}@x.com`,
      role,
      isActive: true,
      createdAt: Date.now(),
    })) as Id<'users'>;
    await ctx.db.insert('sessions', {
      userId: uid,
      token,
      expiresAt: Date.now() + 3_600_000,
      createdAt: Date.now(),
    });
  });
  return token;
}

async function seedCategory(t: T): Promise<Id<'categories'>> {
  return await t.run(async (ctx) =>
    (await ctx.db.insert('categories', {
      name: 'Cat', slug: `cat-${Math.random().toString(36).slice(2)}`, order: 0, isActive: true, createdAt: Date.now(),
    })) as Id<'categories'>,
  );
}

async function seedProduct(t: T, categoryId: Id<'categories'>, p: Record<string, unknown> = {}): Promise<Id<'products'>> {
  return await t.run(async (ctx) =>
    (await ctx.db.insert('products', {
      name: 'Brake Pad', slug: `p-${Math.random().toString(36).slice(2)}`, description: 'd',
      price: 1000, categoryId, images: [], stock: 10, isActive: true,
      createdAt: Date.now(), updatedAt: Date.now(),
      ...p,
    })) as Id<'products'>,
  );
}

async function seedOrder(t: T, o: Record<string, unknown> = {}): Promise<Id<'orders'>> {
  return await t.run(async (ctx) =>
    (await ctx.db.insert('orders', {
      orderNumber: `ON-${Math.random().toString(36).slice(2)}`,
      customerName: 'John', customerEmail: 'j@x.com', customerPhone: '099', shippingAddress: 'addr',
      items: [], subtotal: 1000, shipping: 0, total: 1000,
      status: 'pending', paymentStatus: 'awaiting',
      createdAt: Date.now(), updatedAt: Date.now(),
      ...o,
    })) as Id<'orders'>,
  );
}

describe('admin.dashboardCounts', () => {
  it('returns null for a non-admin caller (customer / manager / superadmin)', async () => {
    const t = convexTest(schema, modules);
    // Handler explicitly requires role === 'admin'.
    expect(await t.query(api.admin.dashboardCounts, { sessionToken: await tokenFor(t, 'customer') })).toBeNull();
    expect(await t.query(api.admin.dashboardCounts, { sessionToken: await tokenFor(t, 'manager') })).toBeNull();
    expect(await t.query(api.admin.dashboardCounts, { sessionToken: await tokenFor(t, 'superadmin') })).toBeNull();
    expect(await t.query(api.admin.dashboardCounts, { sessionToken: 'bogus' })).toBeNull();
  });

  it('aggregates pending orders, returns, reviews, questions and stock levels', async () => {
    const t = convexTest(schema, modules);
    const token = await tokenFor(t, 'admin');
    const cat = await seedCategory(t);

    // Orders: 2 pending, 1 confirmed
    await seedOrder(t, { status: 'pending' });
    await seedOrder(t, { status: 'pending' });
    await seedOrder(t, { status: 'confirmed' });

    // Return requests: 1 pending, 1 approved
    await t.run(async (ctx) => {
      const oid = (await ctx.db.insert('orders', {
        orderNumber: 'R1', customerName: 'C', customerEmail: 'c@x.com', customerPhone: '1', shippingAddress: 'a',
        items: [], subtotal: 0, shipping: 0, total: 0, status: 'delivered', paymentStatus: 'paid',
        createdAt: Date.now(), updatedAt: Date.now(),
      })) as Id<'orders'>;
      await ctx.db.insert('returnRequests', {
        orderId: oid, orderNumber: 'R1', customerEmail: 'c@x.com', items: [], type: 'return',
        reason: 'broken', status: 'pending', createdAt: Date.now(), updatedAt: Date.now(),
      });
      await ctx.db.insert('returnRequests', {
        orderId: oid, orderNumber: 'R2', customerEmail: 'c@x.com', items: [], type: 'exchange',
        reason: 'wrong', status: 'approved', createdAt: Date.now(), updatedAt: Date.now(),
      });
    });

    // Reviews: 1 approved, 1 pending
    const prod = await seedProduct(t, cat);
    await t.run(async (ctx) => {
      await ctx.db.insert('reviews', { productId: prod, authorName: 'A', rating: 5, isApproved: true, createdAt: Date.now() });
      await ctx.db.insert('reviews', { productId: prod, authorName: 'B', rating: 3, isApproved: false, createdAt: Date.now() });
    });

    // Questions: 1 answered, 1 unanswered
    await t.run(async (ctx) => {
      await ctx.db.insert('productQuestions', { productId: prod, authorName: 'A', question: 'q1', answer: 'a', isApproved: true, createdAt: Date.now() });
      await ctx.db.insert('productQuestions', { productId: prod, authorName: 'B', question: 'q2', isApproved: false, createdAt: Date.now() });
    });

    // Stock: one out of stock, one low, one healthy (threshold default 5)
    await seedProduct(t, cat, { stock: 0 });
    await seedProduct(t, cat, { stock: 3 });
    await seedProduct(t, cat, { stock: 50 });

    const r = await t.query(api.admin.dashboardCounts, { sessionToken: token });
    expect(r).not.toBeNull();
    expect(r?.pendingOrders).toBe(2);
    expect(r?.pendingReturns).toBe(1);
    expect(r?.pendingReviews).toBe(1);
    expect(r?.unansweredQuestions).toBe(1);
    expect(r?.outOfStock).toBe(1);
    expect(r?.lowStock).toBe(1);
    expect(r?.lowStockThreshold).toBe(5);
  });

  it('honours a custom lowStockThreshold from settings', async () => {
    const t = convexTest(schema, modules);
    const token = await tokenFor(t, 'admin');
    const cat = await seedCategory(t);
    await t.run(async (ctx) => {
      await ctx.db.insert('settings', {
        storeName: 'S', phone: '', email: '', address: '', whatsapp: '', telegram: '', instagram: '',
        facebook: '', deliveryYerevan: 0, deliveryRegions: 0, freeShippingThreshold: 0,
        announcementBar: '', workingHours: '', lowStockThreshold: 10,
      });
    });
    await seedProduct(t, cat, { stock: 8 }); // low under threshold 10
    const r = await t.query(api.admin.dashboardCounts, { sessionToken: token });
    expect(r?.lowStockThreshold).toBe(10);
    expect(r?.lowStock).toBe(1);
  });
});

describe('admin.commandSearch', () => {
  it('returns empty buckets for a non-admin', async () => {
    const t = convexTest(schema, modules);
    const r = await t.query(api.admin.commandSearch, { sessionToken: await tokenFor(t, 'customer'), query: 'brake' });
    expect(r).toEqual({ products: [], orders: [], customers: [] });
  });

  it('returns empty buckets for a term shorter than 2 chars', async () => {
    const t = convexTest(schema, modules);
    const token = await tokenFor(t, 'admin');
    const r = await t.query(api.admin.commandSearch, { sessionToken: token, query: 'a' });
    expect(r).toEqual({ products: [], orders: [], customers: [] });
  });

  it('finds products by name, orders by number and customers by email', async () => {
    const t = convexTest(schema, modules);
    const token = await tokenFor(t, 'admin');
    const cat = await seedCategory(t);
    await seedProduct(t, cat, { name: 'Zephyr Widget', sku: 'ZW-1' });
    await seedOrder(t, { orderNumber: 'ORD-777', customerName: 'Zed', total: 500 });
    await t.run(async (ctx) => {
      await ctx.db.insert('users', {
        name: 'Zoe Customer', email: 'zoe@example.com', role: 'customer', isActive: true, createdAt: Date.now(),
      });
    });

    const byProduct = await t.query(api.admin.commandSearch, { sessionToken: token, query: 'Zephyr' });
    expect(byProduct.products.some((p) => p.title === 'Zephyr Widget')).toBe(true);

    const byOrder = await t.query(api.admin.commandSearch, { sessionToken: token, query: 'ORD-777' });
    expect(byOrder.orders.some((o) => o.title === '#ORD-777')).toBe(true);

    const byCustomer = await t.query(api.admin.commandSearch, { sessionToken: token, query: 'zoe@example' });
    expect(byCustomer.customers.some((c) => c.subtitle === 'zoe@example.com')).toBe(true);
  });

  it('matches a product by SKU via the secondary scan', async () => {
    const t = convexTest(schema, modules);
    const token = await tokenFor(t, 'admin');
    const cat = await seedCategory(t);
    await seedProduct(t, cat, { name: 'Unrelated Name', sku: 'XYZ-999' });
    const r = await t.query(api.admin.commandSearch, { sessionToken: token, query: 'xyz-999' });
    expect(r.products.some((p) => p.title === 'Unrelated Name')).toBe(true);
  });
});

describe('admin.recentActivity', () => {
  it('returns an empty array for a non-admin', async () => {
    const t = convexTest(schema, modules);
    expect(await t.query(api.admin.recentActivity, { sessionToken: await tokenFor(t, 'customer') })).toEqual([]);
    expect(await t.query(api.admin.recentActivity, { sessionToken: 'bogus' })).toEqual([]);
  });

  it('merges pending orders, returns, reviews and questions into a time-sorted feed', async () => {
    const t = convexTest(schema, modules);
    const token = await tokenFor(t, 'admin');
    const cat = await seedCategory(t);
    const prod = await seedProduct(t, cat);

    await seedOrder(t, { orderNumber: 'AA-1', status: 'pending', createdAt: 1000 });
    await t.run(async (ctx) => {
      const oid = (await ctx.db.insert('orders', {
        orderNumber: 'AA-2', customerName: 'C', customerEmail: 'c@x.com', customerPhone: '1', shippingAddress: 'a',
        items: [], subtotal: 0, shipping: 0, total: 0, status: 'delivered', paymentStatus: 'paid',
        createdAt: 2000, updatedAt: 2000,
      })) as Id<'orders'>;
      await ctx.db.insert('returnRequests', {
        orderId: oid, orderNumber: 'AA-2', customerEmail: 'c@x.com', items: [], type: 'return',
        reason: 'broken', status: 'pending', createdAt: 5000, updatedAt: 5000,
      });
      await ctx.db.insert('reviews', { productId: prod, authorName: 'Rev', rating: 4, text: 'good', isApproved: false, createdAt: 3000 });
      await ctx.db.insert('productQuestions', { productId: prod, authorName: 'Ask', question: 'why?', isApproved: false, createdAt: 4000 });
    });

    const feed = await t.query(api.admin.recentActivity, { sessionToken: token });
    const kinds = feed.map((i) => i.kind);
    expect(kinds).toContain('order');
    expect(kinds).toContain('return');
    expect(kinds).toContain('review');
    expect(kinds).toContain('question');
    // Sorted descending by createdAt.
    for (let i = 1; i < feed.length; i++) {
      expect(feed[i - 1]!.createdAt).toBeGreaterThanOrEqual(feed[i]!.createdAt);
    }
  });
});
