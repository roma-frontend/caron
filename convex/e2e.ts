import { internalMutation } from './_generated/server';
import { hashPassword } from './auth';

/**
 * E2E staging seed. Creates (idempotently) two throw-away accounts, a product
 * and one returnable order so the mutating Playwright specs (customer return,
 * admin status change) have deterministic data to act on.
 *
 * SAFETY: refuses to run against the production deployment. It is an
 * internalMutation (never callable from the client) and is meant to be invoked
 * with `npx convex run e2e:seed` against the *dev* deployment only.
 *
 * Re-running is safe: it resets the order's payment status and clears any open
 * return request for the seeded order so the specs stay repeatable.
 */
const CUSTOMER_EMAIL = 'e2e-customer@caron.test';
const ADMIN_EMAIL = 'e2e-admin@caron.test';
const PASSWORD = 'E2ePass123!';
const ORDER_NUMBER = 'E2E-0001';
const PRODUCT_SLUG = 'e2e-widget';
const CATEGORY_SLUG = 'e2e-category';

export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Hard stop unless we're on the known dev deployment. Allow-listing dev
    // (rather than only denying prod) keeps the seed safe even if the system
    // CONVEX_CLOUD_URL var were ever missing — it refuses everywhere else.
    const url = process.env.CONVEX_CLOUD_URL ?? '';
    if (!url.includes('marvelous-starfish')) {
      throw new Error(`Refusing to seed E2E data: not the dev deployment (url=${url || 'unknown'})`);
    }

    const now = Date.now();

    // ── Users ────────────────────────────────────────────────────
    const passwordHash = await hashPassword(PASSWORD);

    const upsertUser = async (email: string, name: string, role: 'customer' | 'admin') => {
      const existing = await ctx.db
        .query('users')
        .withIndex('by_email', (q) => q.eq('email', email))
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, { passwordHash, isActive: true, role, name });
        return existing._id;
      }
      return ctx.db.insert('users', { email, name, passwordHash, role, isActive: true, createdAt: now });
    };

    const customerId = await upsertUser(CUSTOMER_EMAIL, 'E2E Customer', 'customer');
    await upsertUser(ADMIN_EMAIL, 'E2E Admin', 'admin');

    // ── Category + Product ───────────────────────────────────────
    let category = await ctx.db
      .query('categories')
      .withIndex('by_slug', (q) => q.eq('slug', CATEGORY_SLUG))
      .first();
    if (!category) {
      const catId = await ctx.db.insert('categories', {
        name: 'E2E Category', slug: CATEGORY_SLUG, order: 999, isActive: true, createdAt: now,
      });
      category = await ctx.db.get(catId);
    }

    let product = await ctx.db
      .query('products')
      .withIndex('by_slug', (q) => q.eq('slug', PRODUCT_SLUG))
      .first();
    if (!product) {
      const prodId = await ctx.db.insert('products', {
        name: 'E2E Widget', slug: PRODUCT_SLUG, description: 'Seeded product for E2E tests',
        price: 5000, categoryId: category!._id, images: [], stock: 100, isActive: true,
        createdAt: now, updatedAt: now,
      });
      product = await ctx.db.get(prodId);
    }

    // ── Returnable order owned by the customer ───────────────────
    const orderItems = [{ productId: product!._id, name: product!.name, price: product!.price, quantity: 1 }];
    let order = await ctx.db
      .query('orders')
      .withIndex('by_order_number', (q) => q.eq('orderNumber', ORDER_NUMBER))
      .first();
    if (!order) {
      const orderId = await ctx.db.insert('orders', {
        orderNumber: ORDER_NUMBER,
        userId: customerId,
        customerName: 'E2E Customer',
        customerEmail: CUSTOMER_EMAIL,
        customerPhone: '+37411000000',
        shippingAddress: 'E2E Street 1, Yerevan',
        items: orderItems,
        subtotal: 5000, shipping: 0, total: 5000,
        status: 'delivered', paymentStatus: 'awaiting',
        createdAt: now, updatedAt: now,
      });
      order = await ctx.db.get(orderId);
    } else {
      // Reset to a deterministic starting state for repeatable runs.
      await ctx.db.patch(order._id, {
        userId: customerId, items: orderItems, status: 'delivered',
        paymentStatus: 'awaiting', updatedAt: now,
      });
    }

    // ── Clear any open return request so the return spec can re-run ─
    const requests = await ctx.db
      .query('returnRequests')
      .withIndex('by_order', (q) => q.eq('orderId', order!._id))
      .collect();
    for (const r of requests) {
      if (r.status === 'pending' || r.status === 'approved') await ctx.db.delete(r._id);
    }

    return { customerEmail: CUSTOMER_EMAIL, adminEmail: ADMIN_EMAIL, orderNumber: ORDER_NUMBER };
  },
});
