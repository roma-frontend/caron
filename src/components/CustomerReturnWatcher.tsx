'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuthStore } from '@/store/auth';
import { toast } from 'sonner';
import { CheckCircle2, PackageCheck, XCircle, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useT } from '@/lib/i18n/admin';

type Status = 'pending' | 'approved' | 'rejected' | 'completed';

const STATUS_INFO: Record<Exclude<Status, 'pending'>, { title: string; Icon: typeof CheckCircle2; cls: string }> = {
  approved: { title: 'cmp.return_approved', Icon: CheckCircle2, cls: 'text-blue-600' },
  completed: { title: 'cmp.return_completed', Icon: PackageCheck, cls: 'text-emerald-600' },
  rejected: { title: 'cmp.return_rejected', Icon: XCircle, cls: 'text-destructive' },
};

/**
 * Live, on-site notifier for the logged-in customer: shows a toast when one of
 * their return/exchange requests changes status (approved / completed /
 * rejected). Relies on the reactive `returns.listMine` query.
 */
export function CustomerReturnWatcher() {
  const { t } = useT();
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const user = useAuthStore((s) => s.user);
  // Admins use AdminReturnWatcher; this is for customers.
  const enabled = !!sessionToken && user?.role !== 'admin';

  const requests = useQuery(api.returns.listMine, enabled ? { sessionToken } : 'skip');

  const prevStatuses = useRef<Map<string, Status>>(new Map());
  const initialized = useRef(false);

  useEffect(() => {
    if (!enabled || !requests) return;

    // First snapshot: record current statuses without notifying.
    if (!initialized.current) {
      initialized.current = true;
      prevStatuses.current = new Map(requests.map((r) => [r._id as string, r.status as Status]));
      return;
    }

    for (const r of requests) {
      const id = r._id as string;
      const status = r.status as Status;
      const prev = prevStatuses.current.get(id);

      if (prev && prev !== status && status !== 'pending') {
        const info = STATUS_INFO[status as Exclude<Status, 'pending'>];
        if (info) {
          const { Icon } = info;
          toast.custom(
            (tp) => (
              <Link
                href="/orders"
                onClick={() => toast.dismiss(tp)}
                className="flex w-full items-start gap-4 rounded-xl border bg-card p-4 shadow-xl ring-1 ring-primary/20"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Icon className={`h-6 w-6 ${info.cls}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`flex items-center gap-1.5 text-sm font-bold ${info.cls}`}>
                    <RotateCcw className="h-3.5 w-3.5" /> {t(info.title)}
                  </p>
                  <p className="mt-0.5 truncate text-sm font-semibold">#{r.orderNumber}</p>
                  {r.adminComment ? (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{r.adminComment}</p>
                  ) : null}
                </div>
              </Link>
            ),
            { duration: 8000, position: 'top-right' },
          );
        }
      }
      prevStatuses.current.set(id, status);
    }
  }, [enabled, requests]);

  return null;
}
