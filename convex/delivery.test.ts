import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import { api } from './_generated/api';
import schema from './schema';
import type { Id } from './_generated/dataModel';

const modules = import.meta.glob('./**/*.ts');
type T = ReturnType<typeof convexTest>;

// A fixed timestamp used wherever weekday/date matters, so rule matching is
// deterministic. 2024-06-04T12:00:00Z is a Tuesday in Asia/Yerevan (UTC+4).
const FIXED_AT = Date.UTC(2024, 5, 4, 12, 0, 0);

async function superToken(t: T): Promise<string> {
  const token = `tok-${Math.random().toString(36).slice(2)}`;
  await t.run(async (ctx) => {
    const uid = (await ctx.db.insert('users', {
      name: 'O', email: `o-${Math.random().toString(36).slice(2)}@x.com`,
      role: 'superadmin', isActive: true, createdAt: Date.now(),
    })) as Id<'users'>;
    await ctx.db.insert('sessions', { userId: uid, token, expiresAt: Date.now() + 3_600_000, createdAt: Date.now() });
  });
  return token;
}

async function seedZone(t: T, z: Record<string, unknown> = {}): Promise<Id<'deliveryZones'>> {
  return await t.run(async (ctx) =>
    ctx.db.insert('deliveryZones', {
      group: 'yerevan', name: 'Center', schedule: '', order: 0, isActive: true, ...z,
    }) as Promise<Id<'deliveryZones'>>,
  );
}

async function seedRule(t: T, r: Record<string, unknown> = {}): Promise<Id<'deliveryRules'>> {
  return await t.run(async (ctx) =>
    ctx.db.insert('deliveryRules', {
      name: 'rule', isActive: true, priority: 1, effectType: 'free', createdAt: Date.now(), ...r,
    }) as Promise<Id<'deliveryRules'>>,
  );
}

const REQUIRED_SETTINGS = {
  storeName: 'S', phone: '', email: '', address: '', whatsapp: '', telegram: '',
  instagram: '', facebook: '', deliveryYerevan: 0, deliveryRegions: 0,
  freeShippingThreshold: 0, announcementBar: '', workingHours: '',
};
async function seedSettings(t: T, overrides: Record<string, unknown> = {}) {
  await t.run(async (ctx) => { await ctx.db.insert('settings', { ...REQUIRED_SETTINGS, ...overrides }); });
}

describe('delivery.list (public)', () => {
  it('returns only active zones, sorted by order', async () => {
    const t = convexTest(schema, modules);
    await seedZone(t, { name: 'B', order: 2, isActive: true });
    await seedZone(t, { name: 'A', order: 1, isActive: true });
    await seedZone(t, { name: 'Hidden', order: 0, isActive: false });
    const zones = await t.query(api.delivery.list, {});
    expect(zones.map((z) => z.name)).toEqual(['A', 'B']);
  });

  it('returns an empty array when there are no zones', async () => {
    const t = convexTest(schema, modules);
    expect(await t.query(api.delivery.list, {})).toEqual([]);
  });
});

describe('delivery.listAdmin', () => {
  it('returns every zone (including inactive) sorted by order', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    await seedZone(t, { name: 'Second', order: 1 });
    await seedZone(t, { name: 'First', order: 0, isActive: false });
    const zones = await t.query(api.delivery.listAdmin, { sessionToken: token });
    expect(zones.map((z) => z.name)).toEqual(['First', 'Second']);
  });

  it('rejects an unauthenticated caller', async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.delivery.listAdmin, { sessionToken: 'bogus' })).rejects.toThrow();
  });
});

describe('delivery.upsert', () => {
  it('creates a new zone appended to the end of the ordering', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    await seedZone(t, { order: 5 });
    const id = await t.mutation(api.delivery.upsert, {
      sessionToken: token, group: 'yerevan', name: 'New', schedule: 'sched', price: 900,
    });
    const zone = await t.run((ctx) => ctx.db.get(id));
    expect(zone?.name).toBe('New');
    expect(zone?.order).toBe(6); // maxOrder(5) + 1
    expect(zone?.price).toBe(900);
    expect(zone?.isActive).toBe(true);
  });

  it('honours an explicit order on create', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    const id = await t.mutation(api.delivery.upsert, {
      sessionToken: token, group: 'region', name: 'Explicit', schedule: '', order: 3,
    });
    expect((await t.run((ctx) => ctx.db.get(id)))?.order).toBe(3);
  });

  it('updates an existing zone (including reordering)', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    const id = await seedZone(t, { name: 'Old', order: 0, price: 500 });
    await t.mutation(api.delivery.upsert, {
      sessionToken: token, id, group: 'region', name: 'Updated', schedule: 'new',
      order: 9, isActive: false, price: 1200, freeThreshold: 8000,
    });
    const zone = await t.run((ctx) => ctx.db.get(id));
    expect(zone?.name).toBe('Updated');
    expect(zone?.group).toBe('region');
    expect(zone?.order).toBe(9);
    expect(zone?.isActive).toBe(false);
    expect(zone?.price).toBe(1200);
    expect(zone?.freeThreshold).toBe(8000);
  });

  it('rejects an unauthenticated caller', async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(api.delivery.upsert, {
      sessionToken: 'bogus', group: 'yerevan', name: 'X', schedule: '',
    })).rejects.toThrow();
  });
});

describe('delivery.remove', () => {
  it('deletes a zone', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    const id = await seedZone(t);
    await t.mutation(api.delivery.remove, { sessionToken: token, id });
    expect(await t.run((ctx) => ctx.db.get(id))).toBeNull();
  });

  it('rejects an unauthenticated caller', async () => {
    const t = convexTest(schema, modules);
    const id = await seedZone(t);
    await expect(t.mutation(api.delivery.remove, { sessionToken: 'bogus', id })).rejects.toThrow();
  });
});

describe('delivery.seed', () => {
  it('seeds the standard locations once and is idempotent', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    const first = await t.mutation(api.delivery.seed, { sessionToken: token });
    expect(first).toBe('seeded-21');
    const second = await t.mutation(api.delivery.seed, { sessionToken: token });
    expect(second).toBe('already-seeded');
    const count = await t.run(async (ctx) => (await ctx.db.query('deliveryZones').collect()).length);
    expect(count).toBe(21);
  });
});

describe('delivery.rulesList / rulesListAdmin', () => {
  it('public list returns active rules sorted by priority', async () => {
    const t = convexTest(schema, modules);
    await seedRule(t, { name: 'low', priority: 5 });
    await seedRule(t, { name: 'high', priority: 1 });
    await seedRule(t, { name: 'off', priority: 0, isActive: false });
    const rules = await t.query(api.delivery.rulesList, {});
    expect(rules.map((r) => r.name)).toEqual(['high', 'low']);
  });

  it('admin list includes inactive rules and requires auth', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    await seedRule(t, { name: 'a', priority: 1 });
    await seedRule(t, { name: 'b', priority: 2, isActive: false });
    const rules = await t.query(api.delivery.rulesListAdmin, { sessionToken: token });
    expect(rules.map((r) => r.name)).toEqual(['a', 'b']);
    await expect(t.query(api.delivery.rulesListAdmin, { sessionToken: 'bogus' })).rejects.toThrow();
  });
});

describe('delivery.ruleUpsert / ruleRemove', () => {
  it('creates a rule with defaults applied', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    const id = await t.mutation(api.delivery.ruleUpsert, {
      sessionToken: token, name: 'freebie', effectType: 'free',
    });
    const rule = await t.run((ctx) => ctx.db.get(id));
    expect(rule?.name).toBe('freebie');
    expect(rule?.isActive).toBe(true);
    expect(rule?.priority).toBe(0);
    expect(rule?.effectType).toBe('free');
  });

  it('updates an existing rule', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    const id = await seedRule(t, { name: 'old', effectType: 'free', priority: 1 });
    await t.mutation(api.delivery.ruleUpsert, {
      sessionToken: token, id, name: 'flat', effectType: 'fixed', effectValue: 400,
      priority: 3, isActive: false, minOrderTotal: 2000,
    });
    const rule = await t.run((ctx) => ctx.db.get(id));
    expect(rule?.name).toBe('flat');
    expect(rule?.effectType).toBe('fixed');
    expect(rule?.effectValue).toBe(400);
    expect(rule?.priority).toBe(3);
    expect(rule?.isActive).toBe(false);
    expect(rule?.minOrderTotal).toBe(2000);
  });

  it('deletes a rule', async () => {
    const t = convexTest(schema, modules);
    const token = await superToken(t);
    const id = await seedRule(t);
    await t.mutation(api.delivery.ruleRemove, { sessionToken: token, id });
    expect(await t.run((ctx) => ctx.db.get(id))).toBeNull();
  });

  it('rejects unauthenticated callers on rule mutations', async () => {
    const t = convexTest(schema, modules);
    const id = await seedRule(t);
    await expect(t.mutation(api.delivery.ruleUpsert, { sessionToken: 'bogus', name: 'x', effectType: 'free' })).rejects.toThrow();
    await expect(t.mutation(api.delivery.ruleRemove, { sessionToken: 'bogus', id })).rejects.toThrow();
  });
});

describe('delivery.quoteDelivery', () => {
  it('uses the zone base price when no rule/threshold applies', async () => {
    const t = convexTest(schema, modules);
    const zone = await seedZone(t, { price: 700 });
    const q = await t.query(api.delivery.quoteDelivery, { zoneId: zone, subtotal: 500, at: FIXED_AT });
    expect(q.base).toBe(700);
    expect(q.price).toBe(700);
    expect(q.free).toBe(false);
    expect(q.appliedRuleName).toBeNull();
  });

  it('falls back to the per-group settings price when the zone has no price', async () => {
    const t = convexTest(schema, modules);
    await seedSettings(t, { deliveryYerevan: 550, deliveryRegions: 1500 });
    const q = await t.query(api.delivery.quoteDelivery, { group: 'region', subtotal: 100, at: FIXED_AT });
    expect(q.base).toBe(1500);
    expect(q.price).toBe(1500);
  });

  it('waives shipping at the per-zone free threshold', async () => {
    const t = convexTest(schema, modules);
    const zone = await seedZone(t, { price: 700, freeThreshold: 1000 });
    const q = await t.query(api.delivery.quoteDelivery, { zoneId: zone, subtotal: 1000, at: FIXED_AT });
    expect(q.price).toBe(0);
    expect(q.free).toBe(true);
  });

  it('applies a "free" rule and reports its name', async () => {
    const t = convexTest(schema, modules);
    const zone = await seedZone(t, { price: 700 });
    await seedRule(t, { name: 'freeYerevan', effectType: 'free', group: 'yerevan', priority: 1 });
    const q = await t.query(api.delivery.quoteDelivery, { zoneId: zone, subtotal: 500, at: FIXED_AT });
    expect(q.price).toBe(0);
    expect(q.free).toBe(true);
    expect(q.appliedRuleName).toBe('freeYerevan');
  });

  it('applies a "fixed" rule', async () => {
    const t = convexTest(schema, modules);
    const zone = await seedZone(t, { price: 700 });
    await seedRule(t, { name: 'flat300', effectType: 'fixed', effectValue: 300, priority: 1 });
    const q = await t.query(api.delivery.quoteDelivery, { zoneId: zone, subtotal: 500, at: FIXED_AT });
    expect(q.price).toBe(300);
    expect(q.appliedRuleName).toBe('flat300');
  });

  it('applies a "percent" rule off the base price', async () => {
    const t = convexTest(schema, modules);
    const zone = await seedZone(t, { price: 1000 });
    await seedRule(t, { name: '30off', effectType: 'percent', effectValue: 30, priority: 1 });
    const q = await t.query(api.delivery.quoteDelivery, { zoneId: zone, subtotal: 500, at: FIXED_AT });
    expect(q.price).toBe(700);
    expect(q.appliedRuleName).toBe('30off');
  });

  it('evaluates rules by priority (lowest first wins)', async () => {
    const t = convexTest(schema, modules);
    const zone = await seedZone(t, { price: 700 });
    await seedRule(t, { name: 'winner', effectType: 'fixed', effectValue: 100, priority: 1 });
    await seedRule(t, { name: 'loser', effectType: 'free', priority: 5 });
    const q = await t.query(api.delivery.quoteDelivery, { zoneId: zone, subtotal: 500, at: FIXED_AT });
    expect(q.appliedRuleName).toBe('winner');
    expect(q.price).toBe(100);
  });

  it('skips a rule whose minOrderTotal is not met', async () => {
    const t = convexTest(schema, modules);
    const zone = await seedZone(t, { price: 700 });
    await seedRule(t, { name: 'bigOnly', effectType: 'free', minOrderTotal: 5000, priority: 1 });
    const q = await t.query(api.delivery.quoteDelivery, { zoneId: zone, subtotal: 1000, at: FIXED_AT });
    expect(q.price).toBe(700);
    expect(q.appliedRuleName).toBeNull();
  });

  it('returns a localized rule note', async () => {
    const t = convexTest(schema, modules);
    const zone = await seedZone(t, { price: 700 });
    await seedRule(t, { name: 'noted', effectType: 'free', priority: 1, note: 'Անվճar', noteRu: 'Бесплатно', noteEn: 'Free' });
    const ru = await t.query(api.delivery.quoteDelivery, { zoneId: zone, subtotal: 500, at: FIXED_AT, lang: 'ru' });
    expect(ru.appliedRuleNote).toBe('Бесплатно');
    const en = await t.query(api.delivery.quoteDelivery, { zoneId: zone, subtotal: 500, at: FIXED_AT, lang: 'en' });
    expect(en.appliedRuleNote).toBe('Free');
  });

  it('ignores an inactive rule', async () => {
    const t = convexTest(schema, modules);
    const zone = await seedZone(t, { price: 700 });
    await seedRule(t, { name: 'disabled', effectType: 'free', isActive: false, priority: 1 });
    const q = await t.query(api.delivery.quoteDelivery, { zoneId: zone, subtotal: 500, at: FIXED_AT });
    expect(q.price).toBe(700);
    expect(q.appliedRuleName).toBeNull();
  });
});
