import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import { api } from './_generated/api';
import schema from './schema';
import type { Id } from './_generated/dataModel';

const modules = import.meta.glob('./**/*.ts');
type T = ReturnType<typeof convexTest>;

async function customerToken(t: T): Promise<{ token: string; uid: Id<'users'> }> {
  const token = `tok-${Math.random().toString(36).slice(2)}`;
  const uid = await t.run(async (ctx) => {
    const id = (await ctx.db.insert('users', {
      name: 'Buyer', email: 'b@example.com', role: 'customer', isActive: true, createdAt: Date.now(),
    })) as Id<'users'>;
    await ctx.db.insert('sessions', { userId: id, token, expiresAt: Date.now() + 3_600_000, createdAt: Date.now() });
    return id;
  });
  return { token, uid };
}

describe('cart.get / cart.save', () => {
  it('returns null when the user has no saved cart', async () => {
    const t = convexTest(schema, modules);
    const { token } = await customerToken(t);
    expect(await t.query(api.cart.get, { sessionToken: token })).toBeNull();
  });

  it('persists a cart per user and reads it back', async () => {
    const t = convexTest(schema, modules);
    const { token, uid } = await customerToken(t);
    const cartJson = JSON.stringify([{ productId: 'p1', quantity: 2, price: 500 }]);
    await t.mutation(api.cart.save, { sessionToken: token, cartJson });
    expect(await t.query(api.cart.get, { sessionToken: token })).toBe(cartJson);
    const user = await t.run((ctx) => ctx.db.get(uid));
    expect(user?.cartJson).toBe(cartJson);
  });

  it('overwrites a previously saved cart', async () => {
    const t = convexTest(schema, modules);
    const { token } = await customerToken(t);
    await t.mutation(api.cart.save, { sessionToken: token, cartJson: '[{"a":1}]' });
    await t.mutation(api.cart.save, { sessionToken: token, cartJson: '[{"b":2}]' });
    expect(await t.query(api.cart.get, { sessionToken: token })).toBe('[{"b":2}]');
  });

  it('keeps carts isolated between users', async () => {
    const t = convexTest(schema, modules);
    const a = await customerToken(t);
    const b = await customerToken(t);
    await t.mutation(api.cart.save, { sessionToken: a.token, cartJson: 'A' });
    await t.mutation(api.cart.save, { sessionToken: b.token, cartJson: 'B' });
    expect(await t.query(api.cart.get, { sessionToken: a.token })).toBe('A');
    expect(await t.query(api.cart.get, { sessionToken: b.token })).toBe('B');
  });

  it('save is a silent no-op for an unauthenticated caller', async () => {
    const t = convexTest(schema, modules);
    // Should not throw even with a bogus token.
    await expect(t.mutation(api.cart.save, { sessionToken: 'bogus', cartJson: 'X' })).resolves.toBeNull();
  });

  it('get returns null for an unauthenticated caller', async () => {
    const t = convexTest(schema, modules);
    expect(await t.query(api.cart.get, { sessionToken: 'bogus' })).toBeNull();
  });
});
