import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import { api } from './_generated/api';
import schema from './schema';
import type { Id } from './_generated/dataModel';

const modules = import.meta.glob('./**/*.ts');
type T = ReturnType<typeof convexTest>;
type Role = 'superadmin' | 'admin' | 'manager' | 'customer';

/** Seed a user with the given role + a session token, return the token & id. */
async function seedUserWithToken(
  t: T,
  role: Role,
  extra: Record<string, unknown> = {},
): Promise<{ token: string; userId: Id<'users'> }> {
  const token = `tok-${Math.random().toString(36).slice(2)}`;
  const userId = await t.run(async (ctx) => {
    const uid = (await ctx.db.insert('users', {
      name: `${role}-user`,
      email: `${role}-${Math.random().toString(36).slice(2)}@x.com`,
      role,
      isActive: true,
      createdAt: Date.now(),
      ...extra,
    })) as Id<'users'>;
    await ctx.db.insert('sessions', {
      userId: uid,
      token,
      expiresAt: Date.now() + 3_600_000,
      createdAt: Date.now(),
    });
    return uid;
  });
  return { token, userId };
}

async function seedPlainCustomer(t: T, extra: Record<string, unknown> = {}): Promise<Id<'users'>> {
  return await t.run(async (ctx) =>
    (await ctx.db.insert('users', {
      name: 'Cust',
      email: `c-${Math.random().toString(36).slice(2)}@x.com`,
      role: 'customer',
      customerType: 'retail',
      isActive: true,
      createdAt: Date.now(),
      ...extra,
    })) as Id<'users'>,
  );
}

// ─── register ─────────────────────────────────────────────────
describe('customers.register', () => {
  it('creates a customer with a session token and lowercased email', async () => {
    const t = convexTest(schema, modules);
    const res = await t.mutation(api.customers.register, {
      name: 'Ann', email: 'Ann@Example.COM', password: 'whatever',
    });
    expect(res.role).toBe('customer');
    expect(res.sessionToken).toBeTruthy();
    expect(res.email).toBe('ann@example.com');
    const user = await t.run((ctx) => ctx.db.get(res.userId));
    expect(user?.customerType).toBe('retail');
    expect(user?.isActive).toBe(true);
  });

  it('rejects a duplicate email (case-insensitive)', async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.customers.register, { name: 'A', email: 'dup@x.com', password: 'p' });
    await expect(
      t.mutation(api.customers.register, { name: 'B', email: 'DUP@x.com', password: 'p' }),
    ).rejects.toThrow();
  });
});

// ─── createUser (super-admin) ─────────────────────────────────
describe('customers.createUser', () => {
  it('lets a super-admin create a retail customer', async () => {
    const t = convexTest(schema, modules);
    const { token } = await seedUserWithToken(t, 'superadmin');
    const { userId } = await t.mutation(api.customers.createUser, {
      sessionToken: token, name: 'New Cust', email: 'new@x.com', password: 'password1', role: 'customer',
    });
    const u = await t.run((ctx) => ctx.db.get(userId));
    expect(u?.role).toBe('customer');
    expect(u?.customerType).toBe('retail');
    expect(u?.passwordHash).toBeTruthy();
  });

  it('drops customerType/discount for admin accounts', async () => {
    const t = convexTest(schema, modules);
    const { token } = await seedUserWithToken(t, 'superadmin');
    const { userId } = await t.mutation(api.customers.createUser, {
      sessionToken: token, name: 'Admin X', email: 'adm@x.com', password: 'password1',
      role: 'admin', customerType: 'wholesale', discountPercent: 10,
    });
    const u = await t.run((ctx) => ctx.db.get(userId));
    expect(u?.customerType).toBeUndefined();
    expect(u?.discountPercent).toBeUndefined();
  });

  it('rejects a non-super-admin caller (admin cannot create users)', async () => {
    const t = convexTest(schema, modules);
    const { token } = await seedUserWithToken(t, 'admin');
    await expect(
      t.mutation(api.customers.createUser, {
        sessionToken: token, name: 'X', email: 'x@x.com', password: 'password1', role: 'customer',
      }),
    ).rejects.toThrow();
  });

  it('rejects an unauthenticated caller', async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.customers.createUser, {
        sessionToken: 'bogus', name: 'X', email: 'x@x.com', password: 'password1', role: 'customer',
      }),
    ).rejects.toThrow();
  });

  it('validates email, name and password length', async () => {
    const t = convexTest(schema, modules);
    const { token } = await seedUserWithToken(t, 'superadmin');
    await expect(t.mutation(api.customers.createUser, {
      sessionToken: token, name: 'X', email: 'not-an-email', password: 'password1', role: 'customer',
    })).rejects.toThrow();
    await expect(t.mutation(api.customers.createUser, {
      sessionToken: token, name: '', email: 'ok@x.com', password: 'password1', role: 'customer',
    })).rejects.toThrow();
    await expect(t.mutation(api.customers.createUser, {
      sessionToken: token, name: 'Ok', email: 'ok@x.com', password: 'short', role: 'customer',
    })).rejects.toThrow();
  });

  it('rejects a duplicate email', async () => {
    const t = convexTest(schema, modules);
    const { token } = await seedUserWithToken(t, 'superadmin');
    await t.mutation(api.customers.createUser, {
      sessionToken: token, name: 'A', email: 'dupe@x.com', password: 'password1', role: 'customer',
    });
    await expect(t.mutation(api.customers.createUser, {
      sessionToken: token, name: 'B', email: 'DUPE@x.com', password: 'password1', role: 'customer',
    })).rejects.toThrow();
  });
});

// ─── updateCustomer ───────────────────────────────────────────
describe('customers.updateCustomer', () => {
  it('lets an admin update price tier, customerType and discountPercent', async () => {
    const t = convexTest(schema, modules);
    const { token } = await seedUserWithToken(t, 'admin');
    const target = await seedPlainCustomer(t);
    await t.mutation(api.customers.updateCustomer, {
      sessionToken: token, userId: target, customerType: 'wholesale', discountPercent: 15, name: 'Renamed',
    });
    const u = await t.run((ctx) => ctx.db.get(target));
    expect(u?.customerType).toBe('wholesale');
    expect(u?.discountPercent).toBe(15);
    expect(u?.name).toBe('Renamed');
  });

  it('lets a manager update a customer (default customers capability)', async () => {
    const t = convexTest(schema, modules);
    const { token } = await seedUserWithToken(t, 'manager');
    const target = await seedPlainCustomer(t);
    await t.mutation(api.customers.updateCustomer, {
      sessionToken: token, userId: target, isActive: false,
    });
    const u = await t.run((ctx) => ctx.db.get(target));
    expect(u?.isActive).toBe(false);
  });

  it('blocks a manager from altering a staff (admin) account', async () => {
    const t = convexTest(schema, modules);
    const { token } = await seedUserWithToken(t, 'manager');
    const { userId: staffId } = await seedUserWithToken(t, 'admin');
    await expect(t.mutation(api.customers.updateCustomer, {
      sessionToken: token, userId: staffId, isActive: false,
    })).rejects.toThrow();
  });

  it('requires super-admin for a role change', async () => {
    const t = convexTest(schema, modules);
    const { token } = await seedUserWithToken(t, 'admin');
    const target = await seedPlainCustomer(t);
    await expect(t.mutation(api.customers.updateCustomer, {
      sessionToken: token, userId: target, role: 'manager',
    })).rejects.toThrow();
  });

  it('lets a super-admin change a role and clears tier when promoting to admin', async () => {
    const t = convexTest(schema, modules);
    const { token } = await seedUserWithToken(t, 'superadmin');
    const target = await seedPlainCustomer(t, { customerType: 'wholesale', discountPercent: 5 });
    await t.mutation(api.customers.updateCustomer, {
      sessionToken: token, userId: target, role: 'admin',
    });
    const u = await t.run((ctx) => ctx.db.get(target));
    expect(u?.role).toBe('admin');
    expect(u?.customerType).toBeUndefined();
    expect(u?.discountPercent).toBeUndefined();
  });

  it('lets a super-admin reset a password (hashed, min length enforced)', async () => {
    const t = convexTest(schema, modules);
    const { token } = await seedUserWithToken(t, 'superadmin');
    const target = await seedPlainCustomer(t);
    await expect(t.mutation(api.customers.updateCustomer, {
      sessionToken: token, userId: target, newPassword: 'short',
    })).rejects.toThrow();
    await t.mutation(api.customers.updateCustomer, {
      sessionToken: token, userId: target, newPassword: 'longenough1',
    });
    const u = await t.run((ctx) => ctx.db.get(target));
    expect(u?.passwordHash).toMatch(/^pbkdf2-sha256\$/);
  });

  it('prevents a super-admin from demoting their own account', async () => {
    const t = convexTest(schema, modules);
    const { token, userId } = await seedUserWithToken(t, 'superadmin');
    await expect(t.mutation(api.customers.updateCustomer, {
      sessionToken: token, userId, role: 'customer',
    })).rejects.toThrow();
  });

  it('throws for a missing target user', async () => {
    const t = convexTest(schema, modules);
    const { token } = await seedUserWithToken(t, 'admin');
    const ghost = await seedPlainCustomer(t);
    await t.run((ctx) => ctx.db.delete(ghost));
    await expect(t.mutation(api.customers.updateCustomer, {
      sessionToken: token, userId: ghost, name: 'X',
    })).rejects.toThrow();
  });

  it('rejects a customer trying to act as admin', async () => {
    const t = convexTest(schema, modules);
    const { token } = await seedUserWithToken(t, 'customer');
    const target = await seedPlainCustomer(t);
    await expect(t.mutation(api.customers.updateCustomer, {
      sessionToken: token, userId: target, customerType: 'wholesale',
    })).rejects.toThrow();
  });
});

// ─── list ─────────────────────────────────────────────────────
describe('customers.list', () => {
  it('returns customers for an admin, excluding the caller', async () => {
    const t = convexTest(schema, modules);
    const { token } = await seedUserWithToken(t, 'admin');
    await seedPlainCustomer(t, { name: 'Alice' });
    await seedPlainCustomer(t, { name: 'Bob' });
    const res = await t.query(api.customers.list, {
      sessionToken: token, paginationOpts: { numItems: 20, cursor: null },
    });
    expect(res.total).toBeGreaterThanOrEqual(2);
    expect(res.page.every((u) => u.role !== undefined)).toBe(true);
    expect(res.callerRole).toBe('admin');
  });

  it('filters by customerType', async () => {
    const t = convexTest(schema, modules);
    const { token } = await seedUserWithToken(t, 'admin');
    await seedPlainCustomer(t, { customerType: 'wholesale', name: 'W' });
    await seedPlainCustomer(t, { customerType: 'retail', name: 'R' });
    const res = await t.query(api.customers.list, {
      sessionToken: token, customerType: 'wholesale', paginationOpts: { numItems: 20, cursor: null },
    });
    expect(res.page.every((u) => u.customerType === 'wholesale')).toBe(true);
    expect(res.total).toBe(1);
  });

  it('filters by search term (name/email/phone)', async () => {
    const t = convexTest(schema, modules);
    const { token } = await seedUserWithToken(t, 'admin');
    await seedPlainCustomer(t, { name: 'Unique Zorro', email: 'zorro@x.com' });
    await seedPlainCustomer(t, { name: 'Other', email: 'other@x.com' });
    const res = await t.query(api.customers.list, {
      sessionToken: token, search: 'zorro', paginationOpts: { numItems: 20, cursor: null },
    });
    expect(res.total).toBe(1);
    expect(res.page[0]?.name).toBe('Unique Zorro');
  });

  it('computes LTV and orderCount from non-cancelled orders', async () => {
    const t = convexTest(schema, modules);
    const { token } = await seedUserWithToken(t, 'admin');
    const cust = await seedPlainCustomer(t, { name: 'Buyer' });
    await t.run(async (ctx) => {
      const base = {
        orderNumber: 'A1', userId: cust, customerName: 'Buyer', customerEmail: 'b@x.com',
        customerPhone: '1', shippingAddress: 'addr', items: [], subtotal: 0, shipping: 0,
        paymentStatus: 'paid' as const, createdAt: Date.now(), updatedAt: Date.now(),
      };
      await ctx.db.insert('orders', { ...base, total: 1000, status: 'delivered' });
      await ctx.db.insert('orders', { ...base, orderNumber: 'A2', total: 500, status: 'cancelled' });
    });
    const res = await t.query(api.customers.list, {
      sessionToken: token, search: 'Buyer', paginationOpts: { numItems: 20, cursor: null },
    });
    const row = res.page.find((u) => u.name === 'Buyer');
    expect(row?.ltv).toBe(1000);
    expect(row?.orderCount).toBe(2);
  });

  it('rejects a non-admin caller', async () => {
    const t = convexTest(schema, modules);
    const { token } = await seedUserWithToken(t, 'customer');
    await expect(t.query(api.customers.list, {
      sessionToken: token, paginationOpts: { numItems: 20, cursor: null },
    })).rejects.toThrow();
  });
});
