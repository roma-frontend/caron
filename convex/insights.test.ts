import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import { api, internal } from './_generated/api';
import schema from './schema';
import type { Id } from './_generated/dataModel';

const modules = import.meta.glob('./**/*.ts');
type T = ReturnType<typeof convexTest>;

async function staffToken(t: T): Promise<string> {
  const token = `tok-${Math.random().toString(36).slice(2)}`;
  await t.run(async (ctx) => {
    const uid = (await ctx.db.insert('users', {
      name: 'Admin', email: 'a@example.com', role: 'admin', isActive: true, createdAt: Date.now(),
    })) as Id<'users'>;
    await ctx.db.insert('sessions', { userId: uid, token, expiresAt: Date.now() + 3_600_000, createdAt: Date.now() });
  });
  return token;
}

async function seedCategory(t: T): Promise<Id<'categories'>> {
  return await t.run(async (ctx) =>
    (await ctx.db.insert('categories', {
      name: 'Parts', slug: 'parts', order: 0, isActive: true, createdAt: Date.now(),
    })) as Id<'categories'>,
  );
}

async function seedProduct(t: T, categoryId: Id<'categories'>, patch: Record<string, unknown> = {}): Promise<Id<'products'>> {
  const now = Date.now();
  return await t.run(async (ctx) =>
    (await ctx.db.insert('products', {
      name: 'Widget', slug: `widget-${Math.random().toString(36).slice(2)}`, description: 'd',
      price: 1000, categoryId, images: [], stock: 10, isActive: true, createdAt: now, updatedAt: now, ...patch,
    })) as Id<'products'>,
  );
}

async function seedOrder(t: T, productId: Id<'products'>, patch: Record<string, unknown> = {}): Promise<Id<'orders'>> {
  const now = Date.now();
  return await t.run(async (ctx) =>
    (await ctx.db.insert('orders', {
      orderNumber: `ORD-${Math.random().toString(36).slice(2)}`,
      customerName: 'Cust', customerEmail: 'c@x.com', customerPhone: '+37400', shippingAddress: 'Yerevan',
      items: [{ productId, name: 'Widget', price: 1000, quantity: 2 }],
      subtotal: 2000, shipping: 0, total: 2000,
      status: 'pending', paymentStatus: 'awaiting', createdAt: now, updatedAt: now, ...patch,
    })) as Id<'orders'>,
  );
}

describe('insights.getInbox', () => {
  it('aggregates all actionable queues into counts + previews', async () => {
    const t = convexTest(schema, modules);
    const token = await staffToken(t);
    const cat = await seedCategory(t);
    const prod = await seedProduct(t, cat);
    const zeroProd = await seedProduct(t, cat, { stock: 0 });

    // 2 pending orders, 1 confirmed (ignored)
    await seedOrder(t, prod, { status: 'pending', paymentStatus: 'awaiting' });
    await seedOrder(t, prod, { status: 'pending', paymentStatus: 'paid' });
    await seedOrder(t, prod, { status: 'confirmed', paymentStatus: 'paid' });

    // return request pending
    const ord = await seedOrder(t, prod, { status: 'delivered', paymentStatus: 'paid' });
    await t.run((ctx) =>
      ctx.db.insert('returnRequests', {
        orderId: ord, orderNumber: 'ORD-R', customerEmail: 'c@x.com',
        items: [{ productId: prod, name: 'Widget', quantity: 1 }],
        type: 'return', reason: 'broken', status: 'pending', createdAt: Date.now(), updatedAt: Date.now(),
      }),
    );

    // unapproved review + unanswered question
    await t.run((ctx) => ctx.db.insert('reviews', { productId: prod, authorName: 'R', rating: 5, isApproved: false, createdAt: Date.now() }));
    await t.run((ctx) => ctx.db.insert('productQuestions', { productId: prod, authorName: 'Q', question: 'Fits?', isApproved: true, createdAt: Date.now() }));
    await t.run((ctx) => ctx.db.insert('productQuestions', { productId: prod, authorName: 'Q2', question: 'Done?', answer: 'Yes', isApproved: true, createdAt: Date.now() }));

    const r = await t.query(api.insights.getInbox, { sessionToken: token });
    expect(r.counts.pendingOrders).toBe(2);
    expect(r.counts.awaitingPayment).toBe(1); // only the first pending order is awaiting
    expect(r.counts.pendingReturns).toBe(1);
    expect(r.counts.pendingReviews).toBe(1);
    expect(r.counts.unansweredQuestions).toBe(1);
    expect(r.counts.zeroStock).toBe(1);
    expect(r.previews.orders.length).toBe(2);
    expect(r.previews.returns.length).toBe(1);
    expect(r.previews.questions.length).toBe(1);
    // zeroProd is the only zero-stock active product
    expect(zeroProd).toBeTruthy();
  });

  it('rejects a non-staff caller', async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.insights.getInbox, { sessionToken: 'bogus' })).rejects.toThrow();
  });
});

describe('insights.getAbandonedCarts', () => {
  it('summarizes customer carts sorted by value', async () => {
    const t = convexTest(schema, modules);
    const token = await staffToken(t);
    await t.run(async (ctx) => {
      await ctx.db.insert('users', {
        name: 'Small', email: 's@x.com', role: 'customer', isActive: true, createdAt: Date.now(),
        cartJson: JSON.stringify([{ price: 100, quantity: 1 }]),
      });
      await ctx.db.insert('users', {
        name: 'Big', email: 'b@x.com', role: 'customer', isActive: true, createdAt: Date.now(),
        cartJson: JSON.stringify([{ price: 1000, quantity: 3 }]),
      });
      // empty / no cart → excluded
      await ctx.db.insert('users', { name: 'None', email: 'n@x.com', role: 'customer', isActive: true, createdAt: Date.now() });
      await ctx.db.insert('users', {
        name: 'Empty', email: 'e@x.com', role: 'customer', isActive: true, createdAt: Date.now(), cartJson: '[]',
      });
    });

    const r = await t.query(api.insights.getAbandonedCarts, { sessionToken: token });
    expect(r.count).toBe(2);
    expect(r.totalValue).toBe(100 + 3000);
    // highest value first
    expect(r.rows[0].name).toBe('Big');
    expect(r.rows[0].total).toBe(3000);
    expect(r.rows[1].total).toBe(100);
  });

  it('hides telegram.local emails from the summary', async () => {
    const t = convexTest(schema, modules);
    const token = await staffToken(t);
    await t.run((ctx) =>
      ctx.db.insert('users', {
        name: 'Tg', email: 'x@telegram.local', role: 'customer', isActive: true, createdAt: Date.now(),
        cartJson: JSON.stringify([{ price: 500, quantity: 1 }]),
      }),
    );
    const r = await t.query(api.insights.getAbandonedCarts, { sessionToken: token });
    expect(r.count).toBe(1);
    expect(r.rows[0].email).toBeUndefined();
  });
});

describe('insights.dailyDigestData', () => {
  it('aggregates today\'s orders, stock and top product', async () => {
    const t = convexTest(schema, modules);
    const cat = await seedCategory(t);
    const prod = await seedProduct(t, cat, { stock: 3 }); // low stock (1..5)
    await seedProduct(t, cat, { stock: 0 }); // zero stock

    await seedOrder(t, prod, { status: 'pending', paymentStatus: 'awaiting', total: 2000 });
    await seedOrder(t, prod, { status: 'delivered', paymentStatus: 'paid', total: 5000 });

    const r = await t.query(internal.insights.dailyDigestData, {});
    expect(r.ordersToday).toBe(2);
    expect(r.revenueToday).toBe(7000);
    expect(r.pendingOrders).toBe(1);
    expect(r.awaitingPayment).toBe(1);
    expect(r.lowStock).toBe(1);
    expect(r.zeroStock).toBe(1);
    expect(r.topProduct).toEqual({ name: 'Widget', qty: 4 });
  });
});
