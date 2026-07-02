import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import { api } from './_generated/api';
import schema from './schema';
import type { Id } from './_generated/dataModel';

const modules = import.meta.glob('./**/*.ts');

async function seedUserWithSession(
  t: ReturnType<typeof convexTest>,
  role: 'superadmin' | 'admin' | 'manager',
  email: string,
): Promise<string> {
  const token = `tok-${role}-${Math.random().toString(36).slice(2)}`;
  await t.run(async (ctx) => {
    const userId = await ctx.db.insert('users', {
      name: role, email, role, isActive: true, createdAt: Date.now(),
    }) as Id<'users'>;
    await ctx.db.insert('sessions', { userId, token, expiresAt: Date.now() + 3_600_000, createdAt: Date.now() });
  });
  return token;
}

describe('access control matrix', () => {
  it('superadmin can disable a capability for admin and it is reflected', async () => {
    const t = convexTest(schema, modules);
    const superToken = await seedUserWithSession(t, 'superadmin', 'owner@x.com');

    await t.mutation(api.access.setCapability, {
      sessionToken: superToken, role: 'admin', capability: 'products', enabled: false,
    });
    await t.finishInProgressScheduledFunctions();

    const matrix = await t.query(api.access.getAccessMatrix, { sessionToken: superToken });
    expect(matrix.matrix.admin.products).toBe(false);
    expect(matrix.matrix.manager.products).toBe(true);
  });

  it('an admin sees the disabled capability via getMyCapabilities', async () => {
    const t = convexTest(schema, modules);
    const superToken = await seedUserWithSession(t, 'superadmin', 'owner@x.com');
    const adminToken = await seedUserWithSession(t, 'admin', 'admin@x.com');

    await t.mutation(api.access.setCapability, {
      sessionToken: superToken, role: 'admin', capability: 'products', enabled: false,
    });
    await t.finishInProgressScheduledFunctions();

    const caps = await t.query(api.access.getMyCapabilities, { sessionToken: adminToken });
    expect(caps.isSuperadmin).toBe(false);
    expect(caps.disabled).toContain('products');
  });

  it('superadmin always reports isSuperadmin with no restrictions', async () => {
    const t = convexTest(schema, modules);
    const superToken = await seedUserWithSession(t, 'superadmin', 'owner@x.com');
    const caps = await t.query(api.access.getMyCapabilities, { sessionToken: superToken });
    expect(caps.isSuperadmin).toBe(true);
    expect(caps.disabled).toEqual([]);
  });

  it('a non-superadmin cannot change the access matrix', async () => {
    const t = convexTest(schema, modules);
    const adminToken = await seedUserWithSession(t, 'admin', 'admin@x.com');
    await expect(
      t.mutation(api.access.setCapability, { sessionToken: adminToken, role: 'manager', capability: 'products', enabled: false }),
    ).rejects.toThrow();
  });
});
