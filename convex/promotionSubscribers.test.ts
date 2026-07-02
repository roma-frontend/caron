import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import { api, internal } from './_generated/api';
import schema from './schema';
import type { Id } from './_generated/dataModel';

const modules = import.meta.glob('./**/*.ts');

describe('promotionSubscribers.subscribe', () => {
  it('inserts a new subscriber with notified=false', async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.promotionSubscribers.subscribe, { contact: '@promo' });
    const row = await t.run((ctx) => ctx.db.get(id as Id<'promotionSubscribers'>));
    expect(row?.contact).toBe('@promo');
    expect(row?.notified).toBe(false);
  });

  it('is idempotent — returns the existing id and does not duplicate', async () => {
    const t = convexTest(schema, modules);
    const first = await t.mutation(api.promotionSubscribers.subscribe, { contact: 'dup@x.com' });
    const second = await t.mutation(api.promotionSubscribers.subscribe, { contact: 'dup@x.com' });
    expect(second).toBe(first);
    const all = await t.run((ctx) => ctx.db.query('promotionSubscribers').collect());
    expect(all.length).toBe(1);
  });
});

describe('promotionSubscribers.isSubscribed', () => {
  it('reflects subscription state', async () => {
    const t = convexTest(schema, modules);
    expect(await t.query(api.promotionSubscribers.isSubscribed, { contact: 'nope@x.com' })).toBe(false);
    await t.mutation(api.promotionSubscribers.subscribe, { contact: 'yes@x.com' });
    expect(await t.query(api.promotionSubscribers.isSubscribed, { contact: 'yes@x.com' })).toBe(true);
  });
});

describe('promotionSubscribers.unsubscribe', () => {
  it('removes the subscriber', async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.promotionSubscribers.subscribe, { contact: 'bye@x.com' });
    await t.mutation(api.promotionSubscribers.unsubscribe, { contact: 'bye@x.com' });
    expect(await t.query(api.promotionSubscribers.isSubscribed, { contact: 'bye@x.com' })).toBe(false);
  });

  it('is a no-op for an unknown contact', async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(api.promotionSubscribers.unsubscribe, { contact: 'ghost@x.com' })).resolves.toBeNull();
  });
});

describe('promotionSubscribers.list (internal)', () => {
  it('returns all subscribers newest-first', async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.promotionSubscribers.subscribe, { contact: 'a@x.com' });
    await t.mutation(api.promotionSubscribers.subscribe, { contact: 'b@x.com' });
    const rows = await t.query(internal.promotionSubscribers.list, {});
    expect(rows.length).toBe(2);
  });
});
