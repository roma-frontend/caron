import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import { api } from './_generated/api';
import schema from './schema';
import type { Id } from './_generated/dataModel';

const modules = import.meta.glob('./**/*.ts');
type T = ReturnType<typeof convexTest>;

async function seedProduct(t: T): Promise<Id<'products'>> {
  return await t.run(async (ctx) => {
    const cat = await ctx.db.insert('categories', { name: 'C', slug: `c-${Math.random().toString(36).slice(2)}`, order: 0, isActive: true, createdAt: Date.now() });
    return ctx.db.insert('products', {
      name: 'Widget', slug: `p-${Math.random().toString(36).slice(2)}`, description: 'd', price: 1000,
      categoryId: cat, images: [], stock: 10, isActive: true, createdAt: Date.now(), updatedAt: Date.now(),
    }) as Promise<Id<'products'>>;
  });
}

async function superToken(t: T): Promise<string> {
  const token = `tok-${Math.random().toString(36).slice(2)}`;
  await t.run(async (ctx) => {
    const uid = await ctx.db.insert('users', { name: 'O', email: 'o@x.com', role: 'superadmin', isActive: true, createdAt: Date.now() }) as Id<'users'>;
    await ctx.db.insert('sessions', { userId: uid, token, expiresAt: Date.now() + 3_600_000, createdAt: Date.now() });
  });
  return token;
}

async function adminToken(t: T): Promise<string> {
  const token = `tok-${Math.random().toString(36).slice(2)}`;
  await t.run(async (ctx) => {
    const uid = await ctx.db.insert('users', { name: 'A', email: `a-${Math.random().toString(36).slice(2)}@x.com`, role: 'admin', isActive: true, createdAt: Date.now() }) as Id<'users'>;
    await ctx.db.insert('sessions', { userId: uid, token, expiresAt: Date.now() + 3_600_000, createdAt: Date.now() });
  });
  return token;
}

async function customerToken(t: T): Promise<{ token: string; userId: Id<'users'> }> {
  const token = `tok-${Math.random().toString(36).slice(2)}`;
  const userId = await t.run(async (ctx) => {
    const uid = await ctx.db.insert('users', { name: 'Cust', email: `c-${Math.random().toString(36).slice(2)}@x.com`, role: 'customer', isActive: true, createdAt: Date.now() }) as Id<'users'>;
    await ctx.db.insert('sessions', { userId: uid, token, expiresAt: Date.now() + 3_600_000, createdAt: Date.now() });
    return uid;
  });
  return { token, userId };
}

const askArgs = (productId: Id<'products'>, over: Record<string, unknown> = {}) => ({
  productId, authorName: 'Karen', question: 'Is this in stock?', ...over,
});

describe('questions.ask', () => {
  it('creates an unapproved question for an anonymous author, trimming input', async () => {
    const t = convexTest(schema, modules);
    const pid = await seedProduct(t);
    const id = await t.mutation(api.questions.ask, askArgs(pid, { authorName: '  Karen  ', question: '  Does it fit?  ' }));
    const q = await t.run((ctx) => ctx.db.get(id));
    expect(q?.isApproved).toBe(false);
    expect(q?.authorName).toBe('Karen');
    expect(q?.question).toBe('Does it fit?');
    expect(q?.userId).toBeUndefined();
  });

  it('links the userId when a logged-in customer asks', async () => {
    const t = convexTest(schema, modules);
    const pid = await seedProduct(t);
    const { token, userId } = await customerToken(t);
    const id = await t.mutation(api.questions.ask, askArgs(pid, { sessionToken: token }));
    expect((await t.run((ctx) => ctx.db.get(id)))?.userId).toBe(userId);
  });

  it('rejects too-short / too-long questions and invalid author names', async () => {
    const t = convexTest(schema, modules);
    const pid = await seedProduct(t);
    await expect(t.mutation(api.questions.ask, askArgs(pid, { question: 'ab' }))).rejects.toThrow();
    await expect(t.mutation(api.questions.ask, askArgs(pid, { question: 'x'.repeat(501) }))).rejects.toThrow();
    await expect(t.mutation(api.questions.ask, askArgs(pid, { authorName: '   ' }))).rejects.toThrow();
    await expect(t.mutation(api.questions.ask, askArgs(pid, { authorName: 'x'.repeat(101) }))).rejects.toThrow();
  });
});

describe('questions.listByProduct', () => {
  it('returns only approved or answered questions', async () => {
    const t = convexTest(schema, modules);
    const pid = await seedProduct(t);
    const token = await superToken(t);
    const qApproved = await t.mutation(api.questions.ask, askArgs(pid, { question: 'Approved one?' }));
    const qAnswered = await t.mutation(api.questions.ask, askArgs(pid, { question: 'Answered one?' }));
    await t.mutation(api.questions.ask, askArgs(pid, { question: 'Pending hidden?' }));
    await t.mutation(api.questions.approve, { sessionToken: token, id: qApproved, approved: true });
    await t.mutation(api.questions.answer, { sessionToken: token, id: qAnswered, answer: 'Yes it is' });

    const list = await t.query(api.questions.listByProduct, { productId: pid });
    expect(list.length).toBe(2);
    expect(list.every((q) => q.isApproved || q.answer)).toBe(true);
  });
});

describe('questions.listAll', () => {
  it('returns questions with product name for an admin', async () => {
    const t = convexTest(schema, modules);
    const pid = await seedProduct(t);
    await t.mutation(api.questions.ask, askArgs(pid));
    const token = await adminToken(t);
    const all = await t.query(api.questions.listAll, { sessionToken: token });
    expect(all.length).toBe(1);
    expect(all[0].productName).toBe('Widget');
  });

  it('returns an empty list for a non-admin / bogus session', async () => {
    const t = convexTest(schema, modules);
    const pid = await seedProduct(t);
    await t.mutation(api.questions.ask, askArgs(pid));
    expect(await t.query(api.questions.listAll, { sessionToken: 'bogus' })).toEqual([]);
    const { token } = await customerToken(t);
    expect(await t.query(api.questions.listAll, { sessionToken: token })).toEqual([]);
  });
});

describe('questions.answer', () => {
  it('publishes the question with the trimmed answer and a timestamp', async () => {
    const t = convexTest(schema, modules);
    const pid = await seedProduct(t);
    const id = await t.mutation(api.questions.ask, askArgs(pid));
    const token = await superToken(t);
    await t.mutation(api.questions.answer, { sessionToken: token, id, answer: '  Yes, available  ' });
    const q = await t.run((ctx) => ctx.db.get(id));
    expect(q?.answer).toBe('Yes, available');
    expect(q?.isApproved).toBe(true);
    expect(typeof q?.answeredAt).toBe('number');
  });

  it('stores undefined answer when the text is blank but still approves', async () => {
    const t = convexTest(schema, modules);
    const pid = await seedProduct(t);
    const id = await t.mutation(api.questions.ask, askArgs(pid));
    const token = await superToken(t);
    await t.mutation(api.questions.answer, { sessionToken: token, id, answer: '   ' });
    const q = await t.run((ctx) => ctx.db.get(id));
    expect(q?.answer).toBeUndefined();
    expect(q?.isApproved).toBe(true);
  });

  it('requires the qa capability', async () => {
    const t = convexTest(schema, modules);
    const pid = await seedProduct(t);
    const id = await t.mutation(api.questions.ask, askArgs(pid));
    await expect(t.mutation(api.questions.answer, { sessionToken: 'bogus', id, answer: 'Hi' })).rejects.toThrow();
  });
});

describe('questions.approve', () => {
  it('toggles approval without answering', async () => {
    const t = convexTest(schema, modules);
    const pid = await seedProduct(t);
    const id = await t.mutation(api.questions.ask, askArgs(pid));
    const token = await superToken(t);
    await t.mutation(api.questions.approve, { sessionToken: token, id, approved: true });
    expect((await t.run((ctx) => ctx.db.get(id)))?.isApproved).toBe(true);
    await t.mutation(api.questions.approve, { sessionToken: token, id, approved: false });
    expect((await t.run((ctx) => ctx.db.get(id)))?.isApproved).toBe(false);
  });

  it('requires the qa capability', async () => {
    const t = convexTest(schema, modules);
    const pid = await seedProduct(t);
    const id = await t.mutation(api.questions.ask, askArgs(pid));
    await expect(t.mutation(api.questions.approve, { sessionToken: 'bogus', id, approved: true })).rejects.toThrow();
  });
});

describe('questions.remove', () => {
  it('deletes a question for an authorized admin', async () => {
    const t = convexTest(schema, modules);
    const pid = await seedProduct(t);
    const id = await t.mutation(api.questions.ask, askArgs(pid));
    const token = await superToken(t);
    await t.mutation(api.questions.remove, { sessionToken: token, id });
    expect(await t.run((ctx) => ctx.db.get(id))).toBeNull();
  });

  it('requires the qa capability', async () => {
    const t = convexTest(schema, modules);
    const pid = await seedProduct(t);
    const id = await t.mutation(api.questions.ask, askArgs(pid));
    await expect(t.mutation(api.questions.remove, { sessionToken: 'bogus', id })).rejects.toThrow();
  });
});
