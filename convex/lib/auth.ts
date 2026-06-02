import type { QueryCtx, MutationCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';

export interface AuthenticatedCaller {
  _id: Id<'users'>;
  role: 'admin' | 'customer';
  email: string;
  name: string;
}

async function getSessionUser(
  ctx: QueryCtx | MutationCtx,
  sessionToken: string,
): Promise<{ _id: Id<'users'>; role: 'admin' | 'customer'; email: string; name: string } | null> {
  const session = await ctx.db
    .query('sessions')
    .withIndex('by_token', (q) => q.eq('token', sessionToken))
    .unique();
  if (!session || session.expiresAt < Date.now()) return null;
  const user = await ctx.db.get(session.userId);
  if (!user || !user.isActive) return null;
  return { _id: user._id, role: user.role as 'admin' | 'customer', email: user.email, name: user.name };
}

export async function getAdminCaller(
  ctx: QueryCtx | MutationCtx,
  sessionToken: string,
): Promise<AuthenticatedCaller> {
  const caller = await getSessionUser(ctx, sessionToken);
  if (!caller) throw new Error('Not authenticated');
  if (caller.role !== 'admin') throw new Error('Admin access required');
  return caller;
}

// Optional auth: returns user if valid session token found, null otherwise
export async function getAuthCaller(
  ctx: QueryCtx | MutationCtx,
  sessionToken?: string | null,
): Promise<AuthenticatedCaller | null> {
  if (!sessionToken) return null;
  return getSessionUser(ctx, sessionToken);
}

export function requireAdmin(caller: AuthenticatedCaller | null): AuthenticatedCaller {
  if (!caller) throw new Error('Not authenticated');
  if (caller.role !== 'admin') throw new Error('Admin access required');
  return caller;
}
