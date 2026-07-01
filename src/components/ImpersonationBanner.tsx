'use client';

import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';
import { UserCog, X } from 'lucide-react';

/**
 * Sticky banner shown while a superadmin is impersonating another user
 * ("view as"). Lets them exit and restore their own session in one click.
 */
export function ImpersonationBanner() {
  const impersonator = useAuthStore((s) => s.impersonator);
  const user = useAuthStore((s) => s.user);
  const stop = useAuthStore((s) => s.stopImpersonation);
  const router = useRouter();

  if (!impersonator) return null;

  return (
    <div className="sticky top-0 z-[200] flex items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-black shadow-md">
      <UserCog className="h-4 w-4 shrink-0" />
      <span className="truncate">
        Просмотр от имени <strong>{user?.name}</strong>{user?.email ? ` (${user.email})` : ''}
      </span>
      <button
        onClick={() => { stop(); router.push('/admin/control'); }}
        className="inline-flex items-center gap-1 rounded-full bg-black/85 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-black"
      >
        <X className="h-3 w-3" /> Выйти
      </button>
    </div>
  );
}
