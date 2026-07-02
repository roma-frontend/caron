import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import { api } from './_generated/api';
import schema from './schema';
import type { Id } from './_generated/dataModel';

const modules = import.meta.glob('./**/*.ts');
type T = ReturnType<typeof convexTest>;

/** Mirror of the module-private hashing (SHA-256 hex) so tests can craft tokens. */
async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function seedUser(t: T, patch: Record<string, unknown> = {}): Promise<Id<'users'>> {
  return await t.run(async (ctx) =>
    (await ctx.db.insert('users', {
      name: 'Cust', email: 'c@example.com', role: 'customer', isActive: true,
      passwordHash: 'old-hash', createdAt: Date.now(), ...patch,
    })) as Id<'users'>,
  );
}

async function resetRowsFor(t: T, userId: Id<'users'>) {
  return await t.run(async (ctx) => {
    const rows = await ctx.db.query('passwordResets').collect();
    return rows.filter((r) => r.userId === userId);
  });
}

async function expectErrorCode(promise: Promise<unknown>, code: string) {
  try {
    await promise;
    throw new Error(`expected error with code ${code}, but it resolved`);
  } catch (e) {
    const d = (e as { data?: unknown }).data;
    const parsed = typeof d === 'string' ? JSON.parse(d) : d;
    expect((parsed as { code?: string })?.code).toBe(code);
  }
}

describe('passwordReset.requestPasswordReset', () => {
  it('stores a single-use token for an active user', async () => {
    const t = convexTest(schema, modules);
    const uid = await seedUser(t);
    const res = await t.action(api.passwordReset.requestPasswordReset, { email: 'c@example.com' });
    expect(res).toEqual({ ok: true });
    const rows = await resetRowsFor(t, uid);
    expect(rows).toHaveLength(1);
    expect(rows[0].tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(rows[0].expiresAt).toBeGreaterThan(Date.now());
    expect(rows[0].usedAt).toBeUndefined();
  });

  it('invalidates a previously issued token (one live token per user)', async () => {
    const t = convexTest(schema, modules);
    const uid = await seedUser(t);
    await t.action(api.passwordReset.requestPasswordReset, { email: 'c@example.com' });
    const first = (await resetRowsFor(t, uid))[0].tokenHash;
    await t.action(api.passwordReset.requestPasswordReset, { email: 'c@example.com' });
    const rows = await resetRowsFor(t, uid);
    expect(rows).toHaveLength(1);
    expect(rows[0].tokenHash).not.toBe(first);
  });

  it('does not enumerate accounts: unknown email resolves without a token', async () => {
    const t = convexTest(schema, modules);
    const res = await t.action(api.passwordReset.requestPasswordReset, { email: 'nobody@example.com' });
    expect(res).toEqual({ ok: true });
    const all = await t.run((ctx) => ctx.db.query('passwordResets').collect());
    expect(all).toHaveLength(0);
  });

  it('ignores telegram.local addresses and inactive accounts', async () => {
    const t = convexTest(schema, modules);
    await seedUser(t, { email: 'someone@telegram.local' });
    await seedUser(t, { email: 'inactive@example.com', isActive: false });
    await t.action(api.passwordReset.requestPasswordReset, { email: 'someone@telegram.local' });
    await t.action(api.passwordReset.requestPasswordReset, { email: 'inactive@example.com' });
    const all = await t.run((ctx) => ctx.db.query('passwordResets').collect());
    expect(all).toHaveLength(0);
  });

  it('normalizes email casing / whitespace', async () => {
    const t = convexTest(schema, modules);
    const uid = await seedUser(t);
    await t.action(api.passwordReset.requestPasswordReset, { email: '  C@Example.com  ' });
    expect(await resetRowsFor(t, uid)).toHaveLength(1);
  });
});

describe('passwordReset.resetPassword', () => {
  async function seedToken(t: T, raw: string, opts: { expiresAt?: number; usedAt?: number } = {}) {
    const uid = await seedUser(t);
    const tokenHash = await sha256Hex(raw);
    await t.run((ctx) =>
      ctx.db.insert('passwordResets', {
        userId: uid, tokenHash, expiresAt: opts.expiresAt ?? Date.now() + 60_000,
        usedAt: opts.usedAt, createdAt: Date.now(),
      }),
    );
    return uid;
  }

  it('consumes a valid token, changes the password and revokes sessions', async () => {
    const t = convexTest(schema, modules);
    const uid = await seedToken(t, 'raw-token-123');
    await t.run((ctx) => ctx.db.insert('sessions', { userId: uid, token: 's1', expiresAt: Date.now() + 1e6, createdAt: Date.now() }));

    const res = await t.mutation(api.passwordReset.resetPassword, { token: 'raw-token-123', newPassword: 'brandnewpass' });
    expect(res).toEqual({ ok: true });

    const user = await t.run((ctx) => ctx.db.get(uid));
    expect(user?.passwordHash).not.toBe('old-hash');
    const sessions = await t.run((ctx) => ctx.db.query('sessions').withIndex('by_user', (q) => q.eq('userId', uid)).collect());
    expect(sessions).toHaveLength(0);
    const rows = await resetRowsFor(t, uid);
    expect(rows[0].usedAt).toBeGreaterThan(0);
  });

  it('rejects a re-used (single-use) token', async () => {
    const t = convexTest(schema, modules);
    await seedToken(t, 'once-only');
    await t.mutation(api.passwordReset.resetPassword, { token: 'once-only', newPassword: 'brandnewpass' });
    await expectErrorCode(
      t.mutation(api.passwordReset.resetPassword, { token: 'once-only', newPassword: 'anotherpass1' }),
      'INVALID_TOKEN',
    );
  });

  it('rejects an expired token', async () => {
    const t = convexTest(schema, modules);
    await seedToken(t, 'stale', { expiresAt: Date.now() - 1000 });
    await expectErrorCode(
      t.mutation(api.passwordReset.resetPassword, { token: 'stale', newPassword: 'brandnewpass' }),
      'INVALID_TOKEN',
    );
  });

  it('rejects an unknown token', async () => {
    const t = convexTest(schema, modules);
    await expectErrorCode(
      t.mutation(api.passwordReset.resetPassword, { token: 'ghost', newPassword: 'brandnewpass' }),
      'INVALID_TOKEN',
    );
  });

  it('rejects a weak password before touching the token', async () => {
    const t = convexTest(schema, modules);
    await expectErrorCode(
      t.mutation(api.passwordReset.resetPassword, { token: 'whatever', newPassword: 'short' }),
      'WEAK_PASSWORD',
    );
  });
});
