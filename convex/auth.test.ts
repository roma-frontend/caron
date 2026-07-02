import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import { api } from './_generated/api';
import schema from './schema';
import { hashPassword } from './auth';
import { sha256Hex } from './lib/totp';
import type { Id } from './_generated/dataModel';

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



describe('auth.login — failures, locking, inactive', () => {
  it('throws INVALID_CREDENTIALS for an unknown email', async () => {
    const t = convexTest(schema, modules);
    await expectErrorCode(
      t.mutation(api.auth.login, { email: 'nobody@example.com', password: 'whatever1' }),
      'INVALID_CREDENTIALS',
    );
  });

  it('rejects a login while the account is locked (TOO_MANY_ATTEMPTS)', async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.auth.register, { name: 'Lock', email: 'lock@example.com', password: 'sup3rsecret!' });
    // Pre-seed a locked attempt row (a throwing login rolls back its own writes,
    // so the lock is exercised by seeding the guard state directly).
    await t.run(async (ctx) => {
      await ctx.db.insert('authAttempts', { key: 'login:lock@example.com', failures: 5, lockedUntil: Date.now() + 60_000, updatedAt: Date.now() });
    });
    // Even the CORRECT password is rejected while locked.
    await expectErrorCode(
      t.mutation(api.auth.login, { email: 'lock@example.com', password: 'sup3rsecret!' }),
      'TOO_MANY_ATTEMPTS',
    );
  });

  it('allows login once an expired lock has passed and clears attempts', async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.auth.register, { name: 'Clr', email: 'clr@example.com', password: 'sup3rsecret!' });
    // A stale lock in the past must not block login, and a success clears it.
    await t.run(async (ctx) => {
      await ctx.db.insert('authAttempts', { key: 'login:clr@example.com', failures: 5, lockedUntil: Date.now() - 60_000, updatedAt: Date.now() });
    });
    const res = await t.mutation(api.auth.login, { email: 'clr@example.com', password: 'sup3rsecret!' });
    expect(res.sessionToken).toBeTruthy();
    const remaining = await t.run((ctx) => ctx.db.query('authAttempts').collect());
    expect(remaining).toHaveLength(0);
  });

  it('rejects an inactive customer with USER_INACTIVE', async () => {
    const t = convexTest(schema, modules);
    const passwordHash = await hashPassword('sup3rsecret!');
    await t.run(async (ctx) => {
      await ctx.db.insert('users', {
        name: 'Ghost', email: 'ghost@example.com', role: 'customer',
        passwordHash, isActive: false, createdAt: Date.now(),
      });
    });
    await expectErrorCode(
      t.mutation(api.auth.login, { email: 'ghost@example.com', password: 'sup3rsecret!' }),
      'USER_INACTIVE',
    );
  });

  it('rehashes a legacy SHA-256 password on successful login', async () => {
    const t = convexTest(schema, modules);
    const enc = new TextEncoder();
    const digest = await crypto.subtle.digest('SHA-256', enc.encode('legacyPass1'));
    const legacyHash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
    const uid = await t.run(async (ctx) =>
      ctx.db.insert('users', { name: 'Legacy', email: 'legacy@example.com', role: 'customer', passwordHash: legacyHash, isActive: true, createdAt: Date.now() }) as Promise<Id<'users'>>,
    );
    const res = await t.mutation(api.auth.login, { email: 'legacy@example.com', password: 'legacyPass1' });
    expect(res.sessionToken).toBeTruthy();
    const stored = await t.run((ctx) => ctx.db.get(uid));
    expect(stored?.passwordHash?.startsWith('pbkdf2-sha256$')).toBe(true);
  });
});

describe('auth.login — 2FA recovery code', () => {
  const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

  it('accepts a one-time recovery code and consumes it', async () => {
    const t = convexTest(schema, modules);
    const codeHash = await sha256Hex('abcd-12345');
    const passwordHash = await hashPassword('staffpass1');
    const uid = await t.run(async (ctx) =>
      ctx.db.insert('users', {
        name: 'Mgr', email: 'rec@example.com', role: 'manager', passwordHash, isActive: true, createdAt: Date.now(),
        twoFactorEnabled: true, twoFactorSecret: RFC_SECRET, twoFactorRecoveryCodes: [codeHash],
      }) as Promise<Id<'users'>>,
    );
    const res = await t.mutation(api.auth.login, { email: 'rec@example.com', password: 'staffpass1', totp: 'ABCD-12345' });
    expect(res.role).toBe('manager');
    const stored = await t.run((ctx) => ctx.db.get(uid));
    expect(stored?.twoFactorRecoveryCodes).toEqual([]);
  });
});

describe('auth.me / logout', () => {
  it('returns the user for a valid session and null after logout', async () => {
    const t = convexTest(schema, modules);
    const { sessionToken } = await t.mutation(api.auth.register, { name: 'Me', email: 'me@example.com', password: 'sup3rsecret!' });
    const me = await t.query(api.auth.me, { sessionToken });
    expect(me?.email).toBe('me@example.com');
    await t.mutation(api.auth.logout, { sessionToken });
    expect(await t.query(api.auth.me, { sessionToken })).toBeNull();
  });

  it('returns null for an expired session', async () => {
    const t = convexTest(schema, modules);
    const token = `tok-${Math.random().toString(36).slice(2)}`;
    await t.run(async (ctx) => {
      const uid = await ctx.db.insert('users', { name: 'Exp', email: 'exp@example.com', role: 'customer', isActive: true, createdAt: Date.now() }) as Id<'users'>;
      await ctx.db.insert('sessions', { userId: uid, token, expiresAt: Date.now() - 1000, createdAt: Date.now() });
    });
    expect(await t.query(api.auth.me, { sessionToken: token })).toBeNull();
  });

  it('returns null for an unknown token', async () => {
    const t = convexTest(schema, modules);
    expect(await t.query(api.auth.me, { sessionToken: 'does-not-exist' })).toBeNull();
  });
});

describe('auth.changePassword', () => {
  it('changes the password when the current one is correct', async () => {
    const t = convexTest(schema, modules);
    const { sessionToken } = await t.mutation(api.auth.register, { name: 'Cp', email: 'cp@example.com', password: 'sup3rsecret!' });
    await t.mutation(api.auth.changePassword, { sessionToken, currentPassword: 'sup3rsecret!', newPassword: 'brandnew12' });
    // Old password no longer works, new one does.
    await expect(t.mutation(api.auth.login, { email: 'cp@example.com', password: 'sup3rsecret!' })).rejects.toThrow();
    const res = await t.mutation(api.auth.login, { email: 'cp@example.com', password: 'brandnew12' });
    expect(res.sessionToken).toBeTruthy();
  });

  it('rejects a wrong current password', async () => {
    const t = convexTest(schema, modules);
    const { sessionToken } = await t.mutation(api.auth.register, { name: 'Cp2', email: 'cp2@example.com', password: 'sup3rsecret!' });
    await expect(t.mutation(api.auth.changePassword, { sessionToken, currentPassword: 'WRONG', newPassword: 'brandnew12' })).rejects.toThrow();
  });

  it('rejects a too-short new password', async () => {
    const t = convexTest(schema, modules);
    const { sessionToken } = await t.mutation(api.auth.register, { name: 'Cp3', email: 'cp3@example.com', password: 'sup3rsecret!' });
    await expect(t.mutation(api.auth.changePassword, { sessionToken, currentPassword: 'sup3rsecret!', newPassword: 'short' })).rejects.toThrow();
  });

  it('rejects an invalid session', async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(api.auth.changePassword, { sessionToken: 'bogus', currentPassword: 'x', newPassword: 'brandnew12' })).rejects.toThrow();
  });
});

describe('auth.register — validation & referrals', () => {
  it('rejects an invalid email', async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(api.auth.register, { name: 'X', email: 'not-an-email', password: 'sup3rsecret!' })).rejects.toThrow();
  });

  it('rejects a too-short password', async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(api.auth.register, { name: 'X', email: 'ok@example.com', password: 'short' })).rejects.toThrow();
  });

  it('rejects an empty name', async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(api.auth.register, { name: '   ', email: 'ok2@example.com', password: 'sup3rsecret!' })).rejects.toThrow();
  });

  it('rejects a duplicate email', async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.auth.register, { name: 'A', email: 'dup@example.com', password: 'sup3rsecret!' });
    await expect(t.mutation(api.auth.register, { name: 'B', email: 'dup@example.com', password: 'sup3rsecret!' })).rejects.toThrow();
  });

  it('links a referrer when a valid referral code is supplied', async () => {
    const t = convexTest(schema, modules);
    const referrer = await t.mutation(api.auth.register, { name: 'Ref', email: 'ref@example.com', password: 'sup3rsecret!' });
    const code = await t.run(async (ctx) => (await ctx.db.get(referrer.userId as Id<'users'>))?.referralCode);
    expect(code).toBeTruthy();
    const referred = await t.mutation(api.auth.register, { name: 'New', email: 'new@example.com', password: 'sup3rsecret!', referralCode: code! });
    const referredDoc = await t.run((ctx) => ctx.db.get(referred.userId as Id<'users'>));
    expect(referredDoc?.referredBy).toBe(referrer.userId);
  });

  it('ignores an unknown referral code but still registers', async () => {
    const t = convexTest(schema, modules);
    const res = await t.mutation(api.auth.register, { name: 'N', email: 'noref@example.com', password: 'sup3rsecret!', referralCode: 'ZZZZZZ' });
    const doc = await t.run((ctx) => ctx.db.get(res.userId as Id<'users'>));
    expect(doc?.referredBy).toBeUndefined();
    expect(doc?.referralCode).toBeTruthy();
  });
});

describe('auth.ensureReferralCode', () => {
  it('returns a code and the referral count for the caller', async () => {
    const t = convexTest(schema, modules);
    const referrer = await t.mutation(api.auth.register, { name: 'R', email: 'r1@example.com', password: 'sup3rsecret!' });
    const code = await t.run(async (ctx) => (await ctx.db.get(referrer.userId as Id<'users'>))?.referralCode);
    await t.mutation(api.auth.register, { name: 'C1', email: 'c1@example.com', password: 'sup3rsecret!', referralCode: code! });
    const out = await t.mutation(api.auth.ensureReferralCode, { sessionToken: referrer.sessionToken });
    expect(out?.code).toBe(code);
    expect(out?.referredCount).toBe(1);
  });

  it('returns null for an invalid session', async () => {
    const t = convexTest(schema, modules);
    expect(await t.mutation(api.auth.ensureReferralCode, { sessionToken: 'bogus' })).toBeNull();
  });
});
