'use client';

import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';
import { useAdminT } from '@/lib/i18n/admin';
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
  const { t } = useAdminT();

  if (!impersonator) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[9999] flex items-center justify-center gap-3 border-t border-amber-600/40 bg-amber-500 px-4 py-2.5 text-sm font-medium text-black shadow-[0_-4px_20px_rgba(0,0,0,0.25)]">
      <UserCog className="h-4 w-4 shrink-0" />
      <span className="truncate">
        {t('sc.impViewAs')} <strong>{user?.name}</strong>{user?.email && !user.email.endsWith('@telegram.local') ? ` (${user.email})` : ''}
      </span>
      <button
        onClick={() => { stop(); router.push('/admin/control'); }}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-black px-4 py-1.5 text-xs font-bold text-white transition-transform hover:scale-105"
      >
        <X className="h-3.5 w-3.5" /> {t('sc.impExit')}
      </button>
    </div>
  );
}
