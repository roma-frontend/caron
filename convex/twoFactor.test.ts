import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import { api } from './_generated/api';
import schema from './schema';
import type { Id } from './_generated/dataModel';
import { sha256Hex } from './lib/totp';

const modules = import.meta.glob('./**/*.ts');
type T = ReturnType<typeof convexTest>;

// RFC 6238 SHA-1 vector secret; at T=59s the valid code is 287082.
const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

/** Seed a staff user + session and return the session token. */
async function staffToken(t: T, patch: Record<string, unknown> = {}): Promise<{ token: string; uid: Id<'users'> }> {
  const token = `tok-${Math.random().toString(36).slice(2)}`;
  const uid = await t.run(async (ctx) => {
    const id = (await ctx.db.insert('users', {
      name: 'Manager', email: 'mgr@example.com', role: 'manager', isActive: true, createdAt: Date.now(),
      ...patch,
    })) as Id<'users'>;
    await ctx.db.insert('sessions', { userId: id, token, expiresAt: Date.now() + 3_600_000, createdAt: Date.now() });
    return id;
  });
  return { token, uid };
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

/** Run fn with Date.now frozen to 59_000 (RFC vector time for code 287082). */
async function atRfcTime<R>(fn: () => Promise<R>): Promise<R> {
  const orig = Date.now;
  Date.now = () => 59_000;
  try {
    return await fn();
  } finally {
    Date.now = orig;
  }
}

describe('twoFactor.status', () => {
  it('reports disabled state for a fresh staff account', async () => {
    const t = convexTest(schema, modules);
    const { token } = await staffToken(t);
    const s = await t.query(api.twoFactor.status, { sessionToken: token });
    expect(s).toEqual({ enabled: false, pending: false, recoveryRemaining: 0 });
  });

  it('reports pending when a secret exists but 2FA is not enabled', async () => {
    const t = convexTest(schema, modules);
    const { token } = await staffToken(t, { twoFactorSecret: RFC_SECRET, twoFactorEnabled: false });
    const s = await t.query(api.twoFactor.status, { sessionToken: token });
    expect(s.pending).toBe(true);
    expect(s.enabled).toBe(false);
  });

  it('reports enabled + remaining recovery codes', async () => {
    const t = convexTest(schema, modules);
    const { token } = await staffToken(t, {
      twoFactorSecret: RFC_SECRET, twoFactorEnabled: true, twoFactorRecoveryCodes: ['a', 'b', 'c'],
    });
    const s = await t.query(api.twoFactor.status, { sessionToken: token });
    expect(s).toEqual({ enabled: true, pending: false, recoveryRemaining: 3 });
  });

  it('rejects a non-staff / unauthenticated caller', async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.twoFactor.status, { sessionToken: 'bogus' })).rejects.toThrow();
  });
});

describe('twoFactor.startSetup', () => {
  it('generates a pending secret + otpauth URI', async () => {
    const t = convexTest(schema, modules);
    const { token, uid } = await staffToken(t);
    const res = await t.mutation(api.twoFactor.startSetup, { sessionToken: token });
    expect(res.secret).toMatch(/^[A-Z2-7]+$/);
    expect(res.uri.startsWith('otpauth://totp/')).toBe(true);
    const user = await t.run((ctx) => ctx.db.get(uid));
    expect(user?.twoFactorSecret).toBe(res.secret);
    expect(user?.twoFactorEnabled).toBe(false);
  });

  it('rejects starting setup when already enabled', async () => {
    const t = convexTest(schema, modules);
    const { token } = await staffToken(t, { twoFactorEnabled: true, twoFactorSecret: RFC_SECRET });
    await expectErrorCode(t.mutation(api.twoFactor.startSetup, { sessionToken: token }), 'ALREADY_ENABLED');
  });
});

describe('twoFactor.enable', () => {
  it('enables 2FA with a valid code and returns recovery codes', async () => {
    const t = convexTest(schema, modules);
    const { token, uid } = await staffToken(t, { twoFactorSecret: RFC_SECRET, twoFactorEnabled: false });
    const res = await atRfcTime(() => t.mutation(api.twoFactor.enable, { sessionToken: token, code: '287082' }));
    expect(Array.isArray(res.recoveryCodes)).toBe(true);
    expect(res.recoveryCodes.length).toBeGreaterThan(0);
    for (const c of res.recoveryCodes) expect(c).toMatch(/^[a-z2-7]{5}-[a-z2-7]{5}$/);
    const user = await t.run((ctx) => ctx.db.get(uid));
    expect(user?.twoFactorEnabled).toBe(true);
    // Only hashes are persisted, never the plaintext recovery codes.
    expect(user?.twoFactorRecoveryCodes?.length).toBe(res.recoveryCodes.length);
    expect(user?.twoFactorRecoveryCodes).not.toContain(res.recoveryCodes[0]);
  });

  it('rejects an invalid code', async () => {
    const t = convexTest(schema, modules);
    const { token } = await staffToken(t, { twoFactorSecret: RFC_SECRET, twoFactorEnabled: false });
    await atRfcTime(() =>
      expectErrorCode(t.mutation(api.twoFactor.enable, { sessionToken: token, code: '000000' }), 'INVALID_CODE'),
    );
  });

  it('rejects when there is no pending setup', async () => {
    const t = convexTest(schema, modules);
    const { token } = await staffToken(t);
    await expectErrorCode(t.mutation(api.twoFactor.enable, { sessionToken: token, code: '287082' }), 'NO_PENDING_SETUP');
  });

  it('rejects when 2FA is already enabled', async () => {
    const t = convexTest(schema, modules);
    const { token } = await staffToken(t, { twoFactorSecret: RFC_SECRET, twoFactorEnabled: true });
    await expectErrorCode(t.mutation(api.twoFactor.enable, { sessionToken: token, code: '287082' }), 'ALREADY_ENABLED');
  });
});

describe('twoFactor.disable', () => {
  it('disables with a valid TOTP code and clears the secret', async () => {
    const t = convexTest(schema, modules);
    const { token, uid } = await staffToken(t, {
      twoFactorSecret: RFC_SECRET, twoFactorEnabled: true, twoFactorRecoveryCodes: [],
    });
    const res = await atRfcTime(() => t.mutation(api.twoFactor.disable, { sessionToken: token, code: '287082' }));
    expect(res.ok).toBe(true);
    const user = await t.run((ctx) => ctx.db.get(uid));
    expect(user?.twoFactorEnabled).toBe(false);
    expect(user?.twoFactorSecret).toBeUndefined();
  });

  it('disables with a valid recovery code', async () => {
    const t = convexTest(schema, modules);
    const recovery = 'abcde-fghij';
    const hash = await sha256Hex(recovery);
    const { token, uid } = await staffToken(t, {
      twoFactorSecret: RFC_SECRET, twoFactorEnabled: true, twoFactorRecoveryCodes: [hash],
    });
    // Wrong TOTP but valid recovery code → still disables.
    const res = await t.mutation(api.twoFactor.disable, { sessionToken: token, code: 'ABCDE-FGHIJ' });
    expect(res.ok).toBe(true);
    const user = await t.run((ctx) => ctx.db.get(uid));
    expect(user?.twoFactorEnabled).toBe(false);
  });

  it('rejects an invalid code', async () => {
    const t = convexTest(schema, modules);
    const { token } = await staffToken(t, {
      twoFactorSecret: RFC_SECRET, twoFactorEnabled: true, twoFactorRecoveryCodes: [],
    });
    await atRfcTime(() =>
      expectErrorCode(t.mutation(api.twoFactor.disable, { sessionToken: token, code: '000000' }), 'INVALID_CODE'),
    );
  });

  it('is a no-op when 2FA is not enabled', async () => {
    const t = convexTest(schema, modules);
    const { token } = await staffToken(t);
    const res = await t.mutation(api.twoFactor.disable, { sessionToken: token, code: 'whatever' });
    expect(res.ok).toBe(true);
  });
});
