import type { QueryCtx, MutationCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { internal } from '../_generated/api';

/** Audit actions that trigger a real-time Telegram security alert to the owner. */
const CRITICAL_AUDIT_ACTIONS = new Set<string>([
  'access.setCapability',
  'user.delete',
  'user.roleChange',
  'user.impersonate',
  'session.revokeAll',
  'product.emptyTrash',
  'order.bulkAction',
  'category.purge',
]);

/** Role hierarchy, highest privilege first. */
export const ROLE_HIERARCHY = ['superadmin', 'admin', 'manager', 'customer'] as const;
export type Role = (typeof ROLE_HIERARCHY)[number];

/** Bootstrap superadmin Telegram usernames (comma-separated in env
 *  `SUPERADMIN_TELEGRAM`, without '@'). Defaults to the owner handle so the
 *  owner can sign in via Telegram and be recognised as superadmin. */
function bootstrapSuperadminTelegrams(): string[] {
  const raw = process.env.SUPERADMIN_TELEGRAM ?? 'i_amVip';
  return raw.split(',').map((s) => s.trim().replace(/^@/, '').toLowerCase()).filter(Boolean);
}

/** Is this Telegram username designated as a bootstrap superadmin? */
export function isSuperadminTelegram(username: string | undefined | null): boolean {
  if (!username) return false;
  return bootstrapSuperadminTelegrams().includes(username.replace(/^@/, '').toLowerCase());
}

/**
 * Runtime superadmin check. Source of truth is the DB `role`. The only bootstrap
 * path is the owner's Telegram handle (env `SUPERADMIN_TELEGRAM`, default
 * `i_amVip`) — the email ADMIN_EMAIL account is a regular admin, not superadmin.
 */
export function isSuperadmin(user: { role?: string; email?: string; telegramUsername?: string } | null | undefined): boolean {
  if (!user) return false;
  if (user.role === 'superadmin') return true;
  return isSuperadminTelegram(user.telegramUsername);
}

export interface AuthenticatedCaller {
  _id: Id<'users'>;
  role: Role;
  email: string;
  name: string;
}

async function getSessionUser(
  ctx: QueryCtx | MutationCtx,
  sessionToken: string,
): Promise<{ _id: Id<'users'>; role: Role; email: string; name: string } | null> {
  // Try sessions table first
  const session = await ctx.db
    .query('sessions')
    .withIndex('by_token', (q) => q.eq('token', sessionToken))
    .unique();
  if (session) {
    if (session.expiresAt < Date.now()) return null;
    const user = await ctx.db.get(session.userId);
    if (!user || !user.isActive) return null;
    return { _id: user._id, role: user.role as Role, email: user.email, name: user.name };
  }
  // Fallback: check old sessionToken on user document (migration)
  const user = await ctx.db
    .query('users')
    .withIndex('by_session_token', (q) => q.eq('sessionToken', sessionToken))
    .unique();
  if (!user || !user.isActive || !user.sessionExpiry || user.sessionExpiry < Date.now()) return null;
  // Migrate to sessions table (only from mutation context)
  if (isMutationCtx(ctx)) {
    await ctx.db.insert('sessions', { userId: user._id, token: sessionToken, expiresAt: user.sessionExpiry, createdAt: Date.now() });
  }
  return { _id: user._id, role: user.role as Role, email: user.email, name: user.name };
}

function isMutationCtx(ctx: QueryCtx | MutationCtx): ctx is MutationCtx {
  return 'insert' in ctx.db;
}

/**
 * Staff gate: allows `superadmin`, `admin` and `manager` roles — the general
 * admin-panel operations. Fine-grained restriction of what admins/managers can
 * do is layered on top via the access-control matrix.
 */
export async function getAdminCaller(
  ctx: QueryCtx | MutationCtx,
  sessionToken: string,
): Promise<AuthenticatedCaller> {
  const caller = await getSessionUser(ctx, sessionToken);
  if (!caller) throw new Error('Not authenticated');
  if (caller.role !== 'superadmin' && caller.role !== 'admin' && caller.role !== 'manager') {
    throw new Error('Admin access required');
  }
  return caller;
}

/**
 * Super-admin gate: strictly the owner (`superadmin` role, or the bootstrap
 * ADMIN_EMAIL before the role is assigned). Reserved for full-control actions:
 * staff/user management, role changes, access-control matrix, security.
 */
export async function getSuperAdminCaller(
  ctx: QueryCtx | MutationCtx,
  sessionToken: string,
): Promise<AuthenticatedCaller> {
  const caller = await getSessionUser(ctx, sessionToken);
  if (!caller) throw new Error('Not authenticated');
  if (!isSuperadmin(caller)) throw new Error('Super-admin access required');
  return caller;
}

/** Alias kept for readability at call sites. */
export const getSuperadminCaller = getSuperAdminCaller;

/**
 * Staff gate + access-matrix enforcement in one call. Verifies the caller may
 * use the given capability (nav section like 'products', or an action like
 * 'action.delete'). Superadmin bypasses all restrictions. For admin/manager the
 * `accessControl` matrix is consulted — a row with `enabled: false` blocks it.
 * Absence of a row = allowed (default). Use this in section mutations so the UI
 * restrictions are actually enforced server-side.
 */
export async function requireCapability(
  ctx: QueryCtx | MutationCtx,
  sessionToken: string,
  capability: string,
): Promise<AuthenticatedCaller> {
  const caller = await getAdminCaller(ctx, sessionToken);
  if (caller.role === 'superadmin') return caller;
  if (caller.role !== 'admin' && caller.role !== 'manager') return caller;
  const row = await ctx.db
    .query('accessControl')
    .withIndex('by_role_capability', (q) => q.eq('role', caller.role as 'admin' | 'manager').eq('capability', capability))
    .first();
  if (row && !row.enabled) {
    throw new Error(`Access denied: "${capability}" is disabled for ${caller.role}`);
  }
  return caller;
}

/**
 * Append an entry to the audit log. Best-effort: callers pass the already
 * resolved caller so we avoid an extra lookup. Only usable in mutation context.
 */
export async function logAudit(
  ctx: MutationCtx,
  caller: { _id: Id<'users'>; role: string; name: string } | null,
  action: string,
  summary: string,
  opts?: { targetType?: string; targetId?: string; meta?: Record<string, unknown> },
): Promise<void> {
  await ctx.db.insert('auditLogs', {
    actorId: caller?._id,
    actorName: caller?.name ?? 'system',
    actorRole: caller?.role ?? 'system',
    action,
    targetType: opts?.targetType,
    targetId: opts?.targetId,
    summary,
    meta: opts?.meta ? JSON.stringify(opts.meta) : undefined,
    createdAt: Date.now(),
  });
  // Fire a real-time Telegram alert for critical security events (best-effort).
  // Skipped under tests (VITEST) — we don't dispatch external side-effects there.
  if (CRITICAL_AUDIT_ACTIONS.has(action) && !process.env.VITEST) {
    await ctx.scheduler.runAfter(0, internal.notifications.sendCriticalAlert, {
      action,
      summary,
      actorName: caller?.name ?? 'system',
    });
  }
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
  if (caller.role !== 'superadmin' && caller.role !== 'admin' && caller.role !== 'manager') throw new Error('Admin access required');
  return caller;
}

export function requireSuperAdmin(caller: AuthenticatedCaller | null): AuthenticatedCaller {
  if (!caller) throw new Error('Not authenticated');
  if (!isSuperadmin(caller)) throw new Error('Super-admin access required');
  return caller;
}
