'use client';

import { useEffect } from 'react';
import { useQuery } from 'convex/react';
import { useAuthStore } from '@/store/auth';
import { api } from '../../convex/_generated/api';

/**
 * Keeps the persisted auth store in sync with the live server profile.
 *
 * The store caches the user (name, role, customerType, discountPercent, …) at
 * login. When an admin changes those server-side (e.g. retail → wholesale), the
 * customer's cached session would otherwise stay stale until the next login —
 * showing the wrong type/badge and the wrong (retail) prices. `api.auth.me` is
 * reactive, so this reconciles the store the moment the user document changes.
 */
export function SessionSync() {
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const patchUser = useAuthStore((s) => s.patchUser);
  const logout = useAuthStore((s) => s.logout);
  const me = useQuery(api.auth.me, sessionToken ? { sessionToken } : 'skip');

  useEffect(() => {
    if (!sessionToken || me === undefined) return; // still loading
    if (me === null) { logout(); return; } // session invalid/expired or deactivated

    const current = useAuthStore.getState().user;
    if (!current) return;
    const next = {
      name: me.name,
      email: me.email,
      role: me.role,
      customerType: me.customerType,
      discountPercent: me.discountPercent,
      phone: me.phone,
      telegramUsername: me.telegramUsername,
    };
    const changed = (Object.keys(next) as Array<keyof typeof next>).some(
      (k) => current[k] !== next[k],
    );
    if (changed) patchUser(next);
  }, [me, sessionToken, patchUser, logout]);

  return null;
}
