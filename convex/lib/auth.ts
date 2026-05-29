import type { QueryCtx, MutationCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';

export interface AuthenticatedCaller {
  _id: Id<'users'>;
  role: 'admin' | 'customer';
  email: string;
  name: string;
}

export async function getAuthCaller(
  ctx: QueryCtx | MutationCtx,
): Promise<AuthenticatedCaller | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.email) return null;

  const user = await ctx.db
    .query('users')
    .withIndex('by_email', (q) => q.eq('email', identity.email!.toLowerCase()))
    .unique();

  if (!user || !user.isActive) return null;

  return {
    _id: user._id,
    role: user.role,
    email: user.email,
    name: user.name,
  };
}

export function requireAdmin(caller: AuthenticatedCaller | null): AuthenticatedCaller {
  if (!caller) throw new Error('Not authenticated');
  if (caller.role !== 'admin') throw new Error('Admin access required');
  return caller;
}
