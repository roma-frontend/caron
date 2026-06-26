'use client';

import { useQuery } from 'convex/react';
import { useAuth } from '@/store/auth';
import { api } from '../../../../convex/_generated/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, ArrowLeft } from 'lucide-react';
import { formatPrice, formatDateLocalized } from '@/lib/formatters';
import { useT } from '@/lib/i18n/admin';
import { ReorderButton } from '@/components/ReorderButton';
import { ReturnRequestButton } from '@/components/ReturnRequestButton';
import { normalizeImageUrl } from '../../../../convex/lib/imageUrl';
import Image from 'next/image';
import Link from 'next/link';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800', confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-purple-100 text-purple-800', shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800', cancelled: 'bg-red-100 text-red-800',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'sc.osPending', confirmed: 'sc.osConfirmed', processing: 'sc.osProcessing',
  shipped: 'sc.osShipped', delivered: 'sc.osDelivered', cancelled: 'sc.osCancelled',
};

export default function OrdersHistoryPage() {
  const { t } = useT();
  const { sessionToken } = useAuth();
  const orders = useQuery(api.orders.listByUser, sessionToken ? { sessionToken } : 'skip');
  const myReturns = useQuery(api.returns.listMine, sessionToken ? { sessionToken } : 'skip');
  const returnByOrder = new Map((myReturns ?? []).map((r) => [r.orderId, r.status]));

  if (!sessionToken) return (
    <div className="py-16 text-center">
      <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
      <p className="text-lg font-medium">{t('sc.loginToSeeOrders')}</p>
      <Link href="/login"><Button className="mt-4">{t('sc.login')}</Button></Link>
    </div>
  );

  return (
    <div className="mx-auto max-w-[var(--container-max)] sm:px-[var(--space-container)] py-[var(--space-8)]">
      <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t('sc.home')}
      </Link>
      <h1 className="text-3xl font-bold mb-6">{t('sc.myOrders')}</h1>
      <div className="space-y-3">
        {orders?.length === 0 && <p className="py-8 text-center text-muted-foreground">{t('sc.noOrdersYet')}</p>}
        {orders?.map((o) => (
          <Card key={o._id}>
            <CardContent className="p-4 sm:p-5 space-y-4">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-bold">{o.orderNumber}</span>
                  <Badge className={`${STATUS_COLORS[o.status] || ''} border-0 text-[10px]`}>{STATUS_LABEL[o.status] ? t(STATUS_LABEL[o.status]) : o.status}</Badge>
                  <Badge variant="outline" className="text-[10px]">{o.paymentStatus === 'paid' ? t('sc.paid') : t('sc.pendingPayment')}</Badge>
                  <span className="text-xs text-muted-foreground">{formatDateLocalized(o.createdAt, t)}</span>
                </div>
                <span className="text-lg font-bold text-primary">{formatPrice(o.total)}</span>
              </div>

              {/* Ordered items */}
              <div className="space-y-2">
                {o.items.map((it, idx) => {
                  const img = it.imageUrl ? (normalizeImageUrl(it.imageUrl) ?? it.imageUrl) : null;
                  return (
                    <div key={`${it.productId}-${idx}`} className="flex items-center gap-3">
                      <Link href={`/products/${it.productId}`} className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted/50 ring-1 ring-border/50">
                        {img ? (
                          <Image src={img} alt={it.name} width={48} height={48} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-base">🔧</div>
                        )}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link href={`/products/${it.productId}`} className="block truncate text-sm font-medium hover:text-primary transition-colors">{it.name}</Link>
                        <p className="text-xs text-muted-foreground">{it.quantity} × {formatPrice(it.price)}</p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold">{formatPrice(it.price * it.quantity)}</span>
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-3">
                <ReorderButton items={o.items.map((it) => ({ productId: it.productId, name: it.name, quantity: it.quantity }))} />
                {o.status === 'delivered' && (
                  <ReturnRequestButton
                    orderId={o._id}
                    items={o.items.map((it) => ({ productId: it.productId, name: it.name, quantity: it.quantity }))}
                    existingStatus={returnByOrder.get(o._id)}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
