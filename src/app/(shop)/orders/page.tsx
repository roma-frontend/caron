'use client';

import { useQuery } from 'convex/react';
import { useAuth } from '@/store/auth';
import { api } from '../../../../convex/_generated/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, ArrowLeft } from 'lucide-react';
import { formatPrice, formatDateHy } from '@/lib/formatters';
import Link from 'next/link';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800', confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-purple-100 text-purple-800', shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800', cancelled: 'bg-red-100 text-red-800',
};

export default function OrdersHistoryPage() {
  const { sessionToken } = useAuth();
  const orders = useQuery(api.orders.listByUser, sessionToken ? { sessionToken } : 'skip');

  if (!sessionToken) return (
    <div className="py-16 text-center">
      <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
      <p className="text-lg font-medium">Մուտք գործեք ձեր պատվերները տեսնելու համար</p>
      <Link href="/login"><Button className="mt-4">Մուտք</Button></Link>
    </div>
  );

  return (
    <div className="mx-auto" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingBlock: 'var(--space-8)' }}>
      <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Գլխավոր
      </Link>
      <h1 className="text-3xl font-bold mb-6">Իմ պատվերները</h1>
      <div className="space-y-3">
        {orders?.length === 0 && <p className="py-8 text-center text-muted-foreground">Դեռ պատվերներ չկան</p>}
        {orders?.map((o) => (
          <Card key={o._id}>
            <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold">{o.orderNumber}</span>
                  <Badge className={`${STATUS_COLORS[o.status] || ''} border-0 text-[10px]`}>{o.status}</Badge>
                  <Badge variant="outline" className="text-[10px]">{o.paymentStatus === 'paid' ? 'Վճարված' : 'Սպասում'}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{formatDateHy(o.createdAt)}</p>
                <p className="text-xs text-muted-foreground">{o.items.length} ապրանք</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-primary">{formatPrice(o.total)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
