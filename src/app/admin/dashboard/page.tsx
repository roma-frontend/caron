'use client';

import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth';
import { formatPrice } from '@/lib/formatters';
import { TrendingUp, ShoppingBag, Users, DollarSign } from 'lucide-react';

export default function AdminDashboard() {
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const orders = useQuery(api.orders.listAdmin, sessionToken ? { sessionToken } : 'skip');
  const totalRevenue = orders?.reduce((s, o) => s + o.total, 0) ?? 0;
  const paidOrders = orders?.filter((o) => o.paymentStatus === 'paid').length ?? 0;
  const pendingOrders = orders?.filter((o) => o.status === 'pending').length ?? 0;

  const cards = [
    { label: 'Ընդհանուր պատվերներ', value: orders?.length ?? 0, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Վճարված', value: paidOrders, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'Սպասող', value: pendingOrders, icon: TrendingUp, color: 'text-yellow-600', bg: 'bg-yellow-100' },
    { label: 'Ընդհանուր եկամուտ', value: formatPrice(totalRevenue), icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-100' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Դաշբորդ</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label}>
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${c.bg}`}>
                  <Icon className={`h-6 w-6 ${c.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{c.label}</p>
                  <p className="text-2xl font-bold">{c.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Card className="mt-6">
        <CardHeader><CardTitle>Վերջին պատվերներ</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {orders?.slice(0, 5).map((o) => (
              <div key={o._id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <span className="font-mono">{o.orderNumber}</span>
                <span className="text-muted-foreground">{o.customerName}</span>
                <span className="font-medium">{formatPrice(o.total)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
