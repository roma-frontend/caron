import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import { api } from './_generated/api';
import schema from './schema';
import type { Id } from './_generated/dataModel';

const modules = import.meta.glob('./**/*.ts');
type T = ReturnType<typeof convexTest>;

async function staffToken(t: T): Promise<string> {
  const token = `tok-${Math.random().toString(36).slice(2)}`;
  await t.run(async (ctx) => {
    const uid = (await ctx.db.insert('users', {
      name: 'Admin', email: 'a@example.com', role: 'admin', isActive: true, createdAt: Date.now(),
    })) as Id<'users'>;
    await ctx.db.insert('sessions', { userId: uid, token, expiresAt: Date.now() + 3_600_000, createdAt: Date.now() });
  });
  return token;
}

async function seedPage(t: T, patch: Record<string, unknown> = {}): Promise<Id<'pages'>> {
  const now = Date.now();
  return await t.run(async (ctx) =>
    (await ctx.db.insert('pages', {
      title: 'About', slug: 'about', content: 'Hi', isPublished: true, createdAt: now, updatedAt: now, ...patch,
    })) as Id<'pages'>,
  );
}

describe('pages.list / pages.getBySlug', () => {
  it('lists all pages', async () => {
    const t = convexTest(schema, modules);
    await seedPage(t, { slug: 'about' });
    await seedPage(t, { slug: 'terms', title: 'Terms' });
    const list = await t.query(api.pages.list, {});
    expect(list).toHaveLength(2);
  });

  it('fetches a page by slug and returns null for a missing slug', async () => {
    const t = convexTest(schema, modules);
    await seedPage(t, { slug: 'privacy', title: 'Privacy' });
    const p = await t.query(api.pages.getBySlug, { slug: 'privacy' });
    expect(p?.title).toBe('Privacy');
    expect(await t.query(api.pages.getBySlug, { slug: 'nope' })).toBeNull();
  });
});

describe('pages.save', () => {
  it('creates a new page (staff) and stores timestamps', async () => {
    const t = convexTest(schema, modules);
    const token = await staffToken(t);
    const id = await t.mutation(api.pages.save, {
      sessionToken: token, title: 'Delivery', slug: 'delivery', content: 'Body', isPublished: true,
    });
    await t.finishInProgressScheduledFunctions();
    const page = await t.run((ctx) => ctx.db.get(id));
    expect(page?.slug).toBe('delivery');
    expect(page?.createdAt).toBeGreaterThan(0);
    expect(page?.updatedAt).toBeGreaterThan(0);
  });

  it('updates an existing page in place', async () => {
    const t = convexTest(schema, modules);
    const token = await staffToken(t);
    const id = await seedPage(t, { slug: 'about', content: 'Old' });
    const returned = await t.mutation(api.pages.save, {
      sessionToken: token, id, title: 'About Us', slug: 'about', content: 'New', isPublished: false,
    });
    await t.finishInProgressScheduledFunctions();
    expect(returned).toBe(id);
    const page = await t.run((ctx) => ctx.db.get(id));
    expect(page?.title).toBe('About Us');
    expect(page?.content).toBe('New');
    expect(page?.isPublished).toBe(false);
  });

  it('requires the pages capability / authentication', async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.pages.save, { sessionToken: 'bogus', title: 'X', slug: 'x', content: 'c', isPublished: true }),
    ).rejects.toThrow();
  });
});

describe('pages.remove', () => {
  it('deletes a page (staff)', async () => {
    const t = convexTest(schema, modules);
    const token = await staffToken(t);
    const id = await seedPage(t, { slug: 'gone' });
    await t.mutation(api.pages.remove, { sessionToken: token, id });
    expect(await t.run((ctx) => ctx.db.get(id))).toBeNull();
  });

  it('rejects an unauthenticated caller', async () => {
    const t = convexTest(schema, modules);
    const id = await seedPage(t);
    await expect(t.mutation(api.pages.remove, { sessionToken: 'bogus', id })).rejects.toThrow();
  });
});
