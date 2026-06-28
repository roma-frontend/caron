'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, PackageCheck, Inbox } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth';
import { formatDateLocalized } from '@/lib/formatters';
import { normalizeImageUrl } from '../../../../convex/lib/imageUrl';
import Image from 'next/image';
import type { Id } from '../../../../convex/_generated/dataModel';
import { useAdminT } from '@/lib/i18n/admin';
import { displayEmail } from '@/lib/contact';

type Status = 'pending' | 'approved' | 'rejected' | 'completed';

const STATUS: Record<Status, { label: string; cls: string }> = {
  pending: { label: 'ao.ret.status.pending', cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  approved: { label: 'ao.ret.status.approved', cls: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
  rejected: { label: 'ao.ret.status.rejected', cls: 'bg-red-500/15 text-red-600 dark:text-red-400' },
  completed: { label: 'ao.ret.status.completed', cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
};

const FILTERS: { key: 'all' | Status; label: string }[] = [
  { key: 'all', label: 'ao.all' },
  { key: 'pending', label: 'ao.ret.status.pending' },
  { key: 'approved', label: 'ao.ret.status.approved' },
  { key: 'completed', label: 'ao.ret.status.completed' },
  { key: 'rejected', label: 'ao.ret.status.rejected' },
];

export default function AdminReturnsPage() {
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const { t } = useAdminT();
  const requests = useQuery(api.returns.listAll, sessionToken ? { sessionToken } : 'skip');
  const updateStatus = useMutation(api.returns.updateStatus);
  const [filter, setFilter] = useState<'all' | Status>('all');

  const setStatus = async (id: Id<'returnRequests'>, status: Status) => {
    try {
      await updateStatus({ sessionToken: sessionToken!, id, status });
      toast.success(t('ao.ret.toast.updated'));
    } catch { toast.error(t('ao.ret.toast.error')); }
  };

  const counts = (requests ?? []).reduce<Record<string, number>>((acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc; }, {});
  const visible = (requests ?? []).filter((r) => filter === 'all' || r.status === filter);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4">
        <h1 className="text-2xl font-bold sm:text-3xl">{t('ao.ret.title')}</h1>
        <p className="text-sm text-muted-foreground">{requests?.length ?? 0} {t('ao.ret.requestWord')}</p>
      </div>

      {/* Filter chips */}
      <div className="-mx-1 mb-5 flex flex-wrap gap-1.5 overflow-x-auto px-1 pb-1 scrollbar-none">
        {FILTERS.map((f) => {
          const n = f.key === 'all' ? (requests?.length ?? 0) : (counts[f.key] ?? 0);
          const active = filter === f.key;
          return (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${active ? 'border-transparent bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:border-primary/40 hover:text-primary'}`}>
              {t(f.label)}{n > 0 ? ` · ${n}` : ''}
            </button>
          );
        })}
      </div>

      {/* Loading skeleton */}
      {requests === undefined && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted/50" />)}
        </div>
      )}

      {/* Empty */}
      {requests && visible.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted"><Inbox className="h-6 w-6 text-muted-foreground" /></div>
          <p className="text-muted-foreground">{t('ao.ret.empty')}</p>
        </div>
      )}

      <div className="space-y-3">
        {visible.map((r) => {
          const st = STATUS[r.status as Status] ?? STATUS.pending;
          return (
            <Card key={r._id} className="overflow-hidden">
              <CardContent className="space-y-3 p-4 sm:p-5">
                {/* Header */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-bold">{r.orderNumber}</span>
                  <Badge variant="outline" className="text-[10px]">{r.type === 'return' ? t('ao.ret.typeReturn') : t('ao.ret.typeExchange')}</Badge>
                  <Badge className={`${st.cls} border-0 text-[10px]`}>{t(st.label)}</Badge>
                  <span className="ml-auto text-xs text-muted-foreground">{formatDateLocalized(r.createdAt, t)}</span>
                </div>
                {displayEmail(r.customerEmail) ? <p className="break-all text-xs text-muted-foreground">{displayEmail(r.customerEmail)}</p> : null}

                {/* Items */}
                <div className="space-y-2 rounded-xl border bg-muted/20 p-2.5">
                  {r.items.map((i, idx) => {
                    const img = (i as { image?: string | null }).image;
                    const src = img ? (normalizeImageUrl(img) ?? img) : null;
                    return (
                      <div key={`${i.productId}-${idx}`} className="flex flex-wrap items-center gap-3">
                        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-background ring-1 ring-border/50">
                          {src ? (
                            <Image src={src} alt={i.name} width={44} height={44} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-base">🔧</div>
                          )}
                        </div>
                        <span className="min-w-0 flex-1 truncate text-sm">{i.name}</span>
                        <span className="shrink-0 text-xs font-medium text-muted-foreground">×{i.quantity}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Reason */}
                <div className="text-sm">
                  <p>{t('ao.ret.reasonLabel')} <span className="font-medium">{r.reason}</span></p>
                  {r.comment && <p className="mt-1 text-muted-foreground">«{r.comment}»</p>}
                </div>

                {/* Actions */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <Button size="sm" variant="outline" disabled={r.status === 'approved'} className="h-9 gap-1.5 text-xs text-blue-600" onClick={() => setStatus(r._id, 'approved')}>
                    <Check className="h-3.5 w-3.5" /> {t('ao.ret.approve')}
                  </Button>
                  <Button size="sm" variant="outline" disabled={r.status === 'completed'} className="h-9 gap-1.5 text-xs text-emerald-600" onClick={() => setStatus(r._id, 'completed')}>
                    <PackageCheck className="h-3.5 w-3.5" /> {t('ao.ret.complete')}
                  </Button>
                  <Button size="sm" variant="outline" disabled={r.status === 'rejected'} className="h-9 gap-1.5 text-xs text-destructive" onClick={() => setStatus(r._id, 'rejected')}>
                    <X className="h-3.5 w-3.5" /> {t('ao.ret.reject')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
