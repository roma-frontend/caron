'use client';

import { useEffect, useRef, useState } from 'react';
import Link from '@/components/LocalizedLink';
import { useQuery } from 'convex/react';
import { Bell, ShoppingBag, RotateCcw, Star, MessageCircleQuestion, CheckCircle2 } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { formatDateLocalized } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useAdminT } from '@/lib/i18n/admin';

interface AdminNotificationBellProps {
  sessionToken: string | null;
}

const LS_KEY = 'admin-notifications-last-seen';

const KIND_ICON = {
  order: ShoppingBag,
  return: RotateCcw,
  exchange: RotateCcw,
  review: Star,
  question: MessageCircleQuestion,
} as const;

const KIND_COLOR = {
  order: 'text-blue-500',
  return: 'text-amber-500',
  exchange: 'text-amber-500',
  review: 'text-yellow-500',
  question: 'text-violet-500',
} as const;

/**
 * Header notification bell with a unified activity feed (new orders, returns,
 * reviews to moderate, unanswered questions). Unread count is derived from a
 * last-seen timestamp in localStorage — opening the panel marks everything as
 * seen, so no backend write is needed.
 */
export function AdminNotificationBell({ sessionToken }: AdminNotificationBellProps) {
  const { t } = useAdminT();
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState<number>(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const items = useQuery(api.admin.recentActivity, sessionToken ? { sessionToken } : 'skip');

  // Load last-seen marker on mount.
  useEffect(() => {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(LS_KEY) : null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLastSeen(raw ? Number(raw) : 0);
  }, []);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const unread = items ? items.filter((i) => i.createdAt > lastSeen).length : 0;

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      // Mark all current items as seen.
      const newest = items && items.length ? Math.max(...items.map((i) => i.createdAt)) : Date.now();
      const seen = Math.max(newest, Date.now());
      setLastSeen(seen);
      if (typeof window !== 'undefined') window.localStorage.setItem(LS_KEY, String(seen));
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={handleToggle}
        aria-label={t('bell.title')}
        aria-expanded={open}
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border bg-popover shadow-xl"
          style={{ animation: 'fadeIn 0.12s ease' }}
        >
          <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2.5">
            <span className="text-sm font-semibold">{t('bell.title')}</span>
            {items && items.length > 0 && (
              <span className="text-xs text-muted-foreground">{items.length}</span>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {items === undefined ? (
              <div className="space-y-1 p-2">
                <div className="h-12 animate-pulse rounded-lg bg-muted" />
                <div className="h-12 animate-pulse rounded-lg bg-muted" />
                <div className="h-12 animate-pulse rounded-lg bg-muted" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                <p className="text-sm font-medium">{t('bell.empty')}</p>
                <p className="text-xs text-muted-foreground">{t('bell.emptyHint')}</p>
              </div>
            ) : (
              items.map((item) => {
                const Icon = KIND_ICON[item.kind];
                const isUnread = item.createdAt > lastSeen;
                const base = t(`feed.${item.kind}`);
                const title =
                  item.kind === 'review'
                    ? `${base} · ${item.ref}`
                    : item.ref
                      ? `${base} #${item.ref}`
                      : base;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-start gap-2.5 border-b px-3 py-2.5 transition-colors last:border-b-0 hover:bg-accent',
                      isUnread && 'bg-primary/5',
                    )}
                  >
                    <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted', KIND_COLOR[item.kind])}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{title}</p>
                      <p className="truncate text-xs text-muted-foreground">{item.meta}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground/70">{formatDateLocalized(item.createdAt, t)}</p>
                    </div>
                    {isUnread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
