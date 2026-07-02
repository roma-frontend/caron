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



async function makeSession(
  t: ReturnType<typeof convexTest>,
  role: string,
  email: string,
): Promise<{ token: string; userId: Id<'users'> }> {
  const token = `tok-${role}-${Math.random().toString(36).slice(2)}`;
  const userId = await t.run(async (ctx) => {
    const uid = await ctx.db.insert('users', { name: role, email, role: role as 'customer', isActive: true, createdAt: Date.now() }) as Id<'users'>;
    await ctx.db.insert('sessions', { userId: uid, token, expiresAt: Date.now() + 3_600_000, createdAt: Date.now() });
    return uid;
  });
  return { token, userId };
}

describe('access.setCapability — edge cases', () => {
  it('rejects an unknown capability', async () => {
    const t = convexTest(schema, modules);
    const superToken = await seedUserWithSession(t, 'superadmin', 'owner@x.com');
    await expect(
      t.mutation(api.access.setCapability, { sessionToken: superToken, role: 'admin', capability: 'nope', enabled: false }),
    ).rejects.toThrow();
  });

  it('updates an existing accessControl row (patch path) and writes an audit log', async () => {
    const t = convexTest(schema, modules);
    const superToken = await seedUserWithSession(t, 'superadmin', 'owner@x.com');
    await t.mutation(api.access.setCapability, { sessionToken: superToken, role: 'admin', capability: 'products', enabled: false });
    await t.finishInProgressScheduledFunctions();
    // Toggle back on — hits the patch branch on the existing row.
    await t.mutation(api.access.setCapability, { sessionToken: superToken, role: 'admin', capability: 'products', enabled: true });
    await t.finishInProgressScheduledFunctions();
    const rows = await t.run((ctx) => ctx.db.query('accessControl').collect());
    expect(rows).toHaveLength(1);
    expect(rows[0].enabled).toBe(true);
    const audits = await t.run((ctx) => ctx.db.query('auditLogs').collect());
    expect(audits.filter((a) => a.action === 'access.setCapability').length).toBe(2);
  });
});

describe('access.getMyCapabilities — role variants', () => {
  it('a manager sees its own disabled capabilities', async () => {
    const t = convexTest(schema, modules);
    const superToken = await seedUserWithSession(t, 'superadmin', 'owner@x.com');
    const mgrToken = await seedUserWithSession(t, 'manager', 'mgr@x.com');
    await t.mutation(api.access.setCapability, { sessionToken: superToken, role: 'manager', capability: 'orders', enabled: false });
    await t.finishInProgressScheduledFunctions();
    const caps = await t.query(api.access.getMyCapabilities, { sessionToken: mgrToken });
    expect(caps.isSuperadmin).toBe(false);
    expect(caps.disabled).toContain('orders');
  });

  it('throws for a customer (not staff)', async () => {
    const t = convexTest(schema, modules);
    const { token } = await makeSession(t, 'customer', 'cx@x.com');
    await expect(t.query(api.access.getMyCapabilities, { sessionToken: token })).rejects.toThrow();
  });
});

describe('access — superadmin-only queries', () => {
  it('getAccessMatrix rejects a non-superadmin', async () => {
    const t = convexTest(schema, modules);
    const adminToken = await seedUserWithSession(t, 'admin', 'admin@x.com');
    await expect(t.query(api.access.getAccessMatrix, { sessionToken: adminToken })).rejects.toThrow();
  });

  it('listStaff returns superadmins, admins and managers', async () => {
    const t = convexTest(schema, modules);
    const superToken = await seedUserWithSession(t, 'superadmin', 'owner@x.com');
    await seedUserWithSession(t, 'admin', 'a@x.com');
    await seedUserWithSession(t, 'manager', 'm@x.com');
    const staff = await t.query(api.access.listStaff, { sessionToken: superToken });
    const roles = staff.map((s) => s.role).sort();
    expect(roles).toEqual(['admin', 'manager', 'superadmin']);
  });

  it('getControlStats counts staff, restrictions and audit', async () => {
    const t = convexTest(schema, modules);
    const superToken = await seedUserWithSession(t, 'superadmin', 'owner@x.com');
    await seedUserWithSession(t, 'admin', 'a2@x.com');
    await t.mutation(api.access.setCapability, { sessionToken: superToken, role: 'admin', capability: 'products', enabled: false });
    await t.finishInProgressScheduledFunctions();
    const stats = await t.query(api.access.getControlStats, { sessionToken: superToken });
    expect(stats.superadmins).toBe(1);
    expect(stats.admins).toBe(1);
    expect(stats.activeRestrictions).toBe(1);
    expect(stats.auditLast24h).toBeGreaterThanOrEqual(1);
  });

  it('listAudit returns recent entries', async () => {
    const t = convexTest(schema, modules);
    const superToken = await seedUserWithSession(t, 'superadmin', 'owner@x.com');
    await t.mutation(api.access.setCapability, { sessionToken: superToken, role: 'admin', capability: 'products', enabled: false });
    await t.finishInProgressScheduledFunctions();
    const entries = await t.query(api.access.listAudit, { sessionToken: superToken });
    expect(entries.some((e) => e.action === 'access.setCapability')).toBe(true);
  });

  it('listAudit rejects a non-superadmin', async () => {
    const t = convexTest(schema, modules);
    const adminToken = await seedUserWithSession(t, 'admin', 'admin@x.com');
    await expect(t.query(api.access.listAudit, { sessionToken: adminToken })).rejects.toThrow();
  });
});

describe('access — session management', () => {
  it('listSessions lists active sessions with masked tokens', async () => {
    const t = convexTest(schema, modules);
    const superToken = await seedUserWithSession(t, 'superadmin', 'owner@x.com');
    const target = await makeSession(t, 'customer', 'target@x.com');
    const rows = await t.query(api.access.listSessions, { sessionToken: superToken, userId: target.userId });
    expect(rows).toHaveLength(1);
    expect(rows[0].tokenTail).toHaveLength(6);
    expect((rows[0] as Record<string, unknown>).token).toBeUndefined();
  });

  it('revokeAllSessions deletes every session of a user', async () => {
    const t = convexTest(schema, modules);
    const superToken = await seedUserWithSession(t, 'superadmin', 'owner@x.com');
    const target = await makeSession(t, 'customer', 'rv@x.com');
    const res = await t.mutation(api.access.revokeAllSessions, { sessionToken: superToken, userId: target.userId });
    await t.finishInProgressScheduledFunctions();
    expect(res.revoked).toBe(1);
    const remaining = await t.run(async (ctx) => ctx.db.query('sessions').withIndex('by_user', (q) => q.eq('userId', target.userId)).collect());
    expect(remaining).toHaveLength(0);
  });

  it('listAllSessions returns active sessions across users', async () => {
    const t = convexTest(schema, modules);
    const superToken = await seedUserWithSession(t, 'superadmin', 'owner@x.com');
    await makeSession(t, 'customer', 'u1@x.com');
    const all = await t.query(api.access.listAllSessions, { sessionToken: superToken });
    expect(all.length).toBeGreaterThanOrEqual(2);
    expect(all[0]).toHaveProperty('tokenTail');
  });

  it('revokeSession removes a single session and is idempotent for unknown ids', async () => {
    const t = convexTest(schema, modules);
    const superToken = await seedUserWithSession(t, 'superadmin', 'owner@x.com');
    const target = await makeSession(t, 'customer', 'rs@x.com');
    const sid = await t.run(async (ctx) => (await ctx.db.query('sessions').withIndex('by_user', (q) => q.eq('userId', target.userId)).first())!._id);
    await t.mutation(api.access.revokeSession, { sessionToken: superToken, sessionId: sid });
    await t.finishInProgressScheduledFunctions();
    expect(await t.run((ctx) => ctx.db.get(sid))).toBeNull();
    // Second revoke of the now-deleted id is a no-op.
    const res = await t.mutation(api.access.revokeSession, { sessionToken: superToken, sessionId: sid });
    expect(res).toEqual({ ok: true });
  });
});

describe('access.startImpersonation', () => {
  it('issues a session for a normal target user', async () => {
    const t = convexTest(schema, modules);
    const superToken = await seedUserWithSession(t, 'superadmin', 'owner@x.com');
    const target = await makeSession(t, 'customer', 'imp@x.com');
    const res = await t.mutation(api.access.startImpersonation, { sessionToken: superToken, targetUserId: target.userId });
    await t.finishInProgressScheduledFunctions();
    expect(res.sessionToken).toBeTruthy();
    expect(res.user.id).toBe(target.userId);
    const who = await t.query(api.auth.me, { sessionToken: res.sessionToken });
    expect(who?.email).toBe('imp@x.com');
  });

  it('refuses to impersonate a superadmin', async () => {
    const t = convexTest(schema, modules);
    const superToken = await seedUserWithSession(t, 'superadmin', 'owner@x.com');
    const other = await seedUserWithSession(t, 'superadmin', 'owner2@x.com');
    const otherId = await t.run(async (ctx) => (await ctx.db.query('users').withIndex('by_email', (q) => q.eq('email', 'owner2@x.com')).unique())!._id);
    void other;
    await expect(t.mutation(api.access.startImpersonation, { sessionToken: superToken, targetUserId: otherId })).rejects.toThrow();
  });

  it('throws for a missing target user', async () => {
    const t = convexTest(schema, modules);
    const superToken = await seedUserWithSession(t, 'superadmin', 'owner@x.com');
    const tmp = await makeSession(t, 'customer', 'tmp@x.com');
    await t.run((ctx) => ctx.db.delete(tmp.userId));
    await expect(t.mutation(api.access.startImpersonation, { sessionToken: superToken, targetUserId: tmp.userId })).rejects.toThrow();
  });
});
