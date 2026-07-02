import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import { api } from './_generated/api';
import schema from './schema';
import type { Id } from './_generated/dataModel';

const modules = import.meta.glob('./**/*.ts');
type T = ReturnType<typeof convexTest>;

/** The minimal required set of fields for a `settings` document. */
function seedSettingsDoc(overrides: Record<string, unknown> = {}) {
  return {
    storeName: 'Seeded Store',
    phone: '+374 10 000 000',
    email: 'seed@caron.group',
    address: 'Երևան',
    whatsapp: '',
    telegram: '',
    instagram: '',
    facebook: '',
    deliveryYerevan: 1000,
    deliveryRegions: 2000,
    freeShippingThreshold: 20000,
    announcementBar: 'hello',
    workingHours: '10:00 - 19:00',
    ...overrides,
  };
}

async function seedSettings(t: T, overrides: Record<string, unknown> = {}): Promise<Id<'settings'>> {
  const doc = seedSettingsDoc(overrides);
  return await t.run(async (ctx) => ctx.db.insert('settings', doc) as Promise<Id<'settings'>>);
}

/** Seed a user of the given role + a valid session; return the session token. */
async function tokenForRole(t: T, role: 'superadmin' | 'admin' | 'manager' | 'customer'): Promise<string> {
  const token = `tok-${role}-${Math.random().toString(36).slice(2)}`;
  await t.run(async (ctx) => {
    const uid = (await ctx.db.insert('users', {
      name: role,
      email: `${role}-${Math.random().toString(36).slice(2)}@x.com`,
      role,
      isActive: true,
      createdAt: Date.now(),
    })) as Id<'users'>;
    await ctx.db.insert('sessions', { userId: uid, token, expiresAt: Date.now() + 3_600_000, createdAt: Date.now() });
  });
  return token;
}

async function superToken(t: T): Promise<string> {
  return tokenForRole(t, 'superadmin');
}

describe('settings.get', () => {
  it('returns the stored settings document to an authorized admin', async () => {
    const t = convexTest(schema, modules);
    await seedSettings(t, { storeName: 'Caron Live' });
    const token = await superToken(t);
    const s = await t.query(api.settings.get, { sessionToken: token });
    expect(s?.storeName).toBe('Caron Live');
  });

  it('returns sensible defaults when no settings document exists', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    const s = await t.query(api.settings.get, { sessionToken: token });
    // Falls back to the hard-coded defaults in the handler.
    expect(s?.storeName).toBe('Caron Armenia');
    expect(s?.deliveryYerevan).toBe(1000);
    expect(s?.freeShippingThreshold).toBe(20000);
  });

  it('rejects a request with no valid session', async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.settings.get, { sessionToken: 'bogus' })).rejects.toThrow(/Not authenticated/);
  });

  it('rejects a customer (non-staff) session', async () => {
    const t = convexTest(schema, modules);
    const token = await tokenForRole(t, 'customer');
    await expect(t.query(api.settings.get, { sessionToken: token })).rejects.toThrow(/Admin access required/);
  });

  it('allows an admin whose "settings" capability is not disabled', async () => {
    const t = convexTest(schema, modules);
    await seedSettings(t, { storeName: 'AdminView' });
    const token = await tokenForRole(t, 'admin');
    const s = await t.query(api.settings.get, { sessionToken: token });
    expect(s?.storeName).toBe('AdminView');
  });

  it('rejects an admin whose "settings" capability is disabled in the access matrix', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      ctx.db.insert('accessControl', { role: 'admin', capability: 'settings', enabled: false, updatedAt: Date.now() });
    });
    const token = await tokenForRole(t, 'admin');
    await expect(t.query(api.settings.get, { sessionToken: token })).rejects.toThrow(/Access denied/);
  });
});

describe('settings.getPublic', () => {
  it('returns null when there are no settings', async () => {
    const t = convexTest(schema, modules);
    expect(await t.query(api.settings.getPublic, {})).toBeNull();
  });

  it('omits the telegram secrets from the public payload', async () => {
    const t = convexTest(schema, modules);
    await seedSettings(t, { telegramBotToken: 'SECRET_TOKEN', telegramChatId: 'SECRET_CHAT', storeName: 'Pub' });
    const pub = (await t.query(api.settings.getPublic, {})) as Record<string, unknown> | null;
    expect(pub?.storeName).toBe('Pub');
    expect(pub).not.toHaveProperty('telegramBotToken');
    expect(pub).not.toHaveProperty('telegramChatId');
  });
});

describe('settings.save', () => {
  it('creates a settings document when none exists', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    await t.mutation(api.settings.save, { sessionToken: token, storeName: 'Fresh Store', deliveryYerevan: 1500 });
    const s = await t.run((ctx) => ctx.db.query('settings').first());
    expect(s?.storeName).toBe('Fresh Store');
    expect(s?.deliveryYerevan).toBe(1500);
    // Defaults applied for un-passed fields.
    expect(s?.freeShippingThreshold).toBe(20000);
  });

  it('patches the existing settings document instead of creating a second one', async () => {
    const t = convexTest(schema, modules);
    await seedSettings(t, { storeName: 'Original' });
    const token = await superToken(t);
    await t.mutation(api.settings.save, { sessionToken: token, storeName: 'Updated', announcementBar: 'sale!' });
    const rows = await t.run((ctx) => ctx.db.query('settings').collect());
    expect(rows).toHaveLength(1);
    expect(rows[0].storeName).toBe('Updated');
    expect(rows[0].announcementBar).toBe('sale!');
  });

  it('writes an audit log entry on save', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    await t.mutation(api.settings.save, { sessionToken: token, storeName: 'Audited' });
    const logs = await t.run((ctx) => ctx.db.query('auditLogs').collect());
    expect(logs.some((l) => l.action === 'settings.update')).toBe(true);
  });

  it('rejects an unauthenticated save', async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(api.settings.save, { sessionToken: 'bogus', storeName: 'X' })).rejects.toThrow(/Not authenticated/);
  });

  it('rejects a customer save', async () => {
    const t = convexTest(schema, modules);
    const token = await tokenForRole(t, 'customer');
    await expect(t.mutation(api.settings.save, { sessionToken: token, storeName: 'X' })).rejects.toThrow(/Admin access required/);
  });

  it('rejects an admin whose "settings" capability is disabled', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      ctx.db.insert('accessControl', { role: 'admin', capability: 'settings', enabled: false, updatedAt: Date.now() });
    });
    const token = await tokenForRole(t, 'admin');
    await expect(t.mutation(api.settings.save, { sessionToken: token, storeName: 'X' })).rejects.toThrow(/Access denied/);
  });
});
