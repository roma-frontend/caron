import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import { api } from './_generated/api';
import schema from './schema';
import { hashPassword } from './auth';

// Load all Convex modules for the in-memory test backend.
const modules = import.meta.glob('./**/*.ts');

describe('auth.login', () => {
  it('registers then logs in with correct credentials', async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.auth.register, { name: 'Test', email: 'user@example.com', password: 'sup3rsecret!' });
    const res = await t.mutation(api.auth.login, { email: 'user@example.com', password: 'sup3rsecret!' });
    expect(res.role).toBe('customer');
    expect(res.sessionToken).toBeTruthy();
  });

  it('rejects a wrong password', async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.auth.register, { name: 'Test', email: 'user@example.com', password: 'sup3rsecret!' });
    await expect(
      t.mutation(api.auth.login, { email: 'user@example.com', password: 'WRONG' }),
    ).rejects.toThrow();
  });

  it('is case-insensitive on email', async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.auth.register, { name: 'Test', email: 'User@Example.com', password: 'sup3rsecret!' });
    const res = await t.mutation(api.auth.login, { email: 'user@example.com', password: 'sup3rsecret!' });
    expect(res.sessionToken).toBeTruthy();
  });
});

// convex-test serializes ConvexError.data as a JSON string; the browser client
// delivers it as an object. Handle both so the assertion is robust.
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

describe('auth.login with 2FA', () => {
  // RFC 6238 SHA-1 vector secret; at T=59s the valid code is 287082.
  const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

  async function seedStaffWith2FA() {
    const t = convexTest(schema, modules);
    const passwordHash = await hashPassword('staffpass1');
    await t.run(async (ctx) => {
      await ctx.db.insert('users', {
        name: 'Manager', email: 'mgr@example.com', role: 'manager',
        passwordHash, isActive: true, createdAt: Date.now(),
        twoFactorEnabled: true, twoFactorSecret: RFC_SECRET, twoFactorRecoveryCodes: [],
      });
    });
    return t;
  }

  it('requires a TOTP code when 2FA is enabled', async () => {
    const t = await seedStaffWith2FA();
    await expectErrorCode(
      t.mutation(api.auth.login, { email: 'mgr@example.com', password: 'staffpass1' }),
      'TOTP_REQUIRED',
    );
  });

  it('rejects an invalid TOTP code', async () => {
    const t = await seedStaffWith2FA();
    const orig = Date.now;
    Date.now = () => 59_000;
    try {
      await expectErrorCode(
        t.mutation(api.auth.login, { email: 'mgr@example.com', password: 'staffpass1', totp: '000000' }),
        'TOTP_INVALID',
      );
    } finally { Date.now = orig; }
  });

  it('logs in with a valid TOTP code', async () => {
    const t = await seedStaffWith2FA();
    const orig = Date.now;
    Date.now = () => 59_000;
    try {
      const res = await t.mutation(api.auth.login, { email: 'mgr@example.com', password: 'staffpass1', totp: '287082' });
      expect(res.role).toBe('manager');
      expect(res.sessionToken).toBeTruthy();
    } finally { Date.now = orig; }
  });
});
