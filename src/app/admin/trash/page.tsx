'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { useAuth } from '@/store/auth';
import { useAdminT } from '@/lib/i18n/admin';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import Image from 'next/image';
import { formatDateLocalized } from '@/lib/formatters';
import { toast } from 'sonner';
import { Trash2, RotateCcw, Package } from 'lucide-react';

export default function TrashPage() {
  const { t } = useAdminT();
  const { sessionToken } = useAuth();
  const trash = useQuery(api.products.listTrash, sessionToken ? { sessionToken } : 'skip');
  const restore = useMutation(api.products.restoreProduct);
  const purge = useMutation(api.products.permanentDeleteProduct);
  const emptyTrash = useMutation(api.products.emptyTrash);
  const [busy, setBusy] = useState<string | null>(null);

  if (trash === undefined) return <div className="flex min-h-[50vh] items-center justify-center"><Loader /></div>;

  const doRestore = async (trashId: Id<'deletedProducts'>) => {
    setBusy(trashId);
    try { await restore({ sessionToken: sessionToken!, trashId }); toast.success(t('tr.restored')); }
    catch { toast.error(t('tr.error')); } finally { setBusy(null); }
  };
  const doPurge = async (trashId: Id<'deletedProducts'>) => {
    if (!window.confirm(t('tr.confirmPurge'))) return;
    setBusy(trashId);
    try { await purge({ sessionToken: sessionToken!, trashId }); toast.success(t('tr.purged')); }
    catch { toast.error(t('tr.error')); } finally { setBusy(null); }
  };
  const doEmpty = async () => {
    if (!window.confirm(t('tr.confirmEmpty'))) return;
    setBusy('__all__');
    try { await emptyTrash({ sessionToken: sessionToken! }); toast.success(t('tr.emptied')); }
    catch { toast.error(t('tr.error')); } finally { setBusy(null); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('tr.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('tr.subtitle')} · {t('tr.autoPurgeNote')}</p>
        </div>
        {trash.length > 0 && (
          <Button variant="destructive" size="sm" className="gap-1.5" onClick={doEmpty} disabled={busy !== null}>
            <Trash2 className="h-4 w-4" /> {t('tr.emptyTrash')}
          </Button>
        )}
      </div>

      {trash.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
            <Package className="h-12 w-12 opacity-30" />
            <p>{t('tr.empty')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {trash.map((p) => (
            <Card key={p._id} className="border-border/60">
              <CardContent className="flex items-center gap-3 p-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border bg-muted">
                  {p.image ? (
                    <Image src={p.image} alt={p.name} width={56} height={56} className="h-full w-full object-cover opacity-80" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground/40"><Package className="h-5 w-5" /></div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  {p.sku && <p className="truncate text-xs text-muted-foreground">{p.sku}</p>}
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{t('tr.deletedBy')}: {p.deletedByName} · {formatDateLocalized(p.deletedAt, t)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => doRestore(p._id)} disabled={busy !== null}>
                    <RotateCcw className="h-3.5 w-3.5" /> {t('tr.restore')}
                  </Button>
                  <Button size="icon-sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => doPurge(p._id)} disabled={busy !== null} title={t('tr.deleteForever')}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
