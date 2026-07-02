import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import { api } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

describe('newsletter.subscribe', () => {
  it('adds a new subscriber (lowercased & trimmed) and returns success', async () => {
    const t = convexTest(schema, modules);
    const res = await t.mutation(api.newsletter.subscribe, { email: '  New@Example.COM  ' });
    expect(res).toEqual({ success: true });
    const row = await t.run((ctx) =>
      ctx.db.query('newsletterSubscribers').withIndex('by_email', (q) => q.eq('email', 'new@example.com')).first(),
    );
    expect(row).not.toBeNull();
    expect(row?.email).toBe('new@example.com');
  });

  it('reports alreadySubscribed on a duplicate (case-insensitive) email', async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.newsletter.subscribe, { email: 'dup@x.com' });
    const res = await t.mutation(api.newsletter.subscribe, { email: 'DUP@X.COM' });
    expect(res).toEqual({ alreadySubscribed: true });
    const all = await t.run((ctx) => ctx.db.query('newsletterSubscribers').collect());
    expect(all.length).toBe(1);
  });
});
