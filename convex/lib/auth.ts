import type { QueryCtx, MutationCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';

export interface AuthenticatedCaller {
  _id: Id<'users'>;
  role: 'admin' | 'customer';
  email: string;
  name: string;
}

export async function getAdminCaller(
  ctx: QueryCtx | MutationCtx,
  sessionToken: string,
): Promise<AuthenticatedCaller> {
  const user = await ctx.db
    .query('users')
    .withIndex('by_session_token', (q) => q.eq('sessionToken', sessionToken))
    .unique();

  if (!user || !user.isActive) throw new Error('Not authenticated');
  if (!user.sessionExpiry || user.sessionExpiry < Date.now()) throw new Error('Session expired');
  if (user.role !== 'admin') throw new Error('Admin access required');

  return { _id: user._id, role: user.role, email: user.email, name: user.name };
}

// Optional auth: returns user if valid session token found, null otherwise
export async function getAuthCaller(
  ctx: QueryCtx | MutationCtx,
  sessionToken?: string | null,
): Promise<AuthenticatedCaller | null> {
  if (!sessionToken) return null;
  const user = await ctx.db
    .query('users')
    .withIndex('by_session_token', (q) => q.eq('sessionToken', sessionToken))
    .unique();
  if (!user || !user.isActive) return null;
  if (!user.sessionExpiry || user.sessionExpiry < Date.now()) return null;
  return { _id: user._id, role: user.role, email: user.email, name: user.name };
}

export function requireAdmin(caller: AuthenticatedCaller | null): AuthenticatedCaller {
  if (!caller) throw new Error('Not authenticated');
  if (caller.role !== 'admin') throw new Error('Admin access required');
  return caller;
}
