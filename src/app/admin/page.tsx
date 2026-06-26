'use client';

import { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  ShoppingBag,
  DollarSign,
  Clock,
  AlertTriangle,
  FolderTree,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { formatPrice } from '@/lib/formatters';
import { useAuth } from '@/store/auth';
import { useAdminT } from '@/lib/i18n/admin';

function StatCard({
  title,
  value,
  icon: Icon,
  desc,
  href,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
  href?: string;
}) {
  const content = (
    <Card
      className={
        href ? 'hover:border-primary/50 transition-colors cursor-pointer' : ''
      }
    >
      <CardContent className="flex flex-col items-start gap-4 px-5 py-2">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>

        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

export default function AdminDashboard() {
  const { t } = useAdminT();
  const { sessionToken } = useAuth();
  const orders = useQuery(api.orders.listAdmin, sessionToken ? { sessionToken } : 'skip');
  const products = useQuery(api.products.listStockSummary);
  const categories = useQuery(api.categories.list, {});
  const health = useQuery(api.products.dataHealth, sessionToken ? { sessionToken } : 'skip');

  const lowStock = products?.low ?? [];
  const outOfStock = products?.out ?? [];

  const stats = {
    totalOrders: orders?.length ?? 0,
    pendingOrders:
      orders?.filter((o) => o.status === 'pending').length ?? 0,

    revenue:
      orders
        ?.filter((o) => o.paymentStatus === 'paid' && o.status !== 'cancelled')
        .reduce((sum, o) => sum + o.total, 0) ?? 0,

    awaitingPayment:
      orders?.filter((o) => o.paymentStatus === 'awaiting' && o.status !== 'cancelled').length ?? 0,

    totalProducts: products?.total ?? 0,
    totalCategories: categories?.length ?? 0,
  };

  const [now] = useState(() => Date.now());
  const problems = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    const DAY = 86400000;
    const result: Array<{ order: typeof orders[number]; reason: string }> = [];
    for (const o of orders) {
      if (o.status === 'delivered' && o.paymentStatus !== 'paid') {
        result.push({ order: o, reason: t('ac.reasonDeliveredUnpaid') });
      } else if (o.status === 'cancelled' && o.paymentStatus === 'paid') {
        result.push({ order: o, reason: t('ac.reasonCancelledPaid') });
      } else if (o.status === 'pending' && now - o.createdAt > 2 * DAY) {
        result.push({ order: o, reason: t('ac.reasonPending2Days') });
      } else if (o.paymentStatus === 'awaiting' && o.status !== 'cancelled' && now - o.createdAt > 3 * DAY) {
        result.push({ order: o, reason: t('ac.reasonPayment3Days') });
      } else if (!o.customerPhone && !o.customerEmail) {
        result.push({ order: o, reason: t('ac.reasonNoContact') });
      } else if (o.total === 0) {
        result.push({ order: o, reason: t('ac.reasonZeroPrice') });
      }
    }
    return result;
  }, [orders]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          {t('ac.adminPanel')}
        </h1>

        <p className="text-muted-foreground">
          {t('ac.dashboardSubtitle')}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <StatCard
          title={t('ac.orders')}
          value={String(stats.totalOrders)}
          icon={ShoppingBag}
          desc={t('ac.total')}
          href="/admin/orders"
        />

        <StatCard
          title={t('ac.pending')}
          value={String(stats.pendingOrders)}
          icon={Clock}
          desc={t('ac.newOrders')}
          href="/admin/orders"
        />

        <StatCard
          title={t('ac.revenue')}
          value={formatPrice(stats.revenue)}
          icon={DollarSign}
          desc={t('ac.paid')}
        />

        <StatCard
          title={t('ac.products')}
          value={String(stats.totalProducts)}
          icon={Package}
          desc={t('ac.total')}
          href="/admin/products"
        />

        <StatCard
          title={t('ac.categories')}
          value={String(stats.totalCategories)}
          icon={FolderTree}
          desc={t('ac.total')}
          href="/admin/categories"
        />

        <StatCard
          title={t('ac.awaiting')}
          value={String(stats.awaitingPayment)}
          icon={TrendingUp}
          desc={t('ac.awaitingPayment')}
        />
      </div>

      {/* Data Health */}
      {health && (
        <Card className="mt-8">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5 text-primary" />
              {t('ac.dataQuality')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {([
                { label: t('ac.noImage'), value: health.activeNoImage, bad: true, key: 'noImage' },
                { label: t('ac.noDescription'), value: health.activeNoDescription, bad: true, key: 'noDescription' },
                { label: t('ac.zeroStockActive'), value: health.activeZeroStock, bad: true, key: 'zeroStock' },
                { label: t('ac.duplicateSku'), value: health.duplicateSkus, bad: true, key: 'dupSku' },
                { label: t('ac.noSeo'), value: health.missingSeo, bad: false, key: 'noSeo' },
                { label: t('ac.noBrand'), value: health.noBrand, bad: false, key: 'noBrand' },
                { label: t('ac.lowStock5'), value: health.lowStock, bad: false, key: 'lowStock' },
                { label: t('ac.activeProducts'), value: health.active, bad: false, neutral: true, key: '' },
              ] as { label: string; value: number; bad: boolean; neutral?: boolean; key: string }[]).map((m) => {
                const flag = !m.neutral && m.value > 0;
                return (
                  <Link
                    key={m.label}
                    href={m.key ? `/admin/products?health=${m.key}` : '/admin/products'}
                    className={`flex items-center justify-between rounded-lg border p-3 transition-colors hover:border-primary/40 ${
                      flag && m.bad ? 'border-red-300 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20'
                      : flag ? 'border-amber-300 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20'
                      : ''
                    }`}
                  >
                    <span className="text-xs text-muted-foreground">{m.label}</span>
                    <span className={`text-lg font-bold ${flag && m.bad ? 'text-red-600' : flag ? 'text-amber-600' : ''}`}>
                      {m.value}
                    </span>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Problematic Orders */}
        {problems.length > 0 && (
            <Card className="border-red-200 dark:border-red-900 lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  {t('ac.problematicOrders')} <Badge variant="destructive" className="ml-1">{problems.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {problems.slice(0, 20).map(({ order, reason }) => (
                    <Link key={order._id} href="/admin/orders" className="flex items-center justify-between rounded-lg border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 p-3 hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground truncate">{order.customerName} &middot; {formatPrice(order.total)}</p>
                      </div>
                      <Badge variant="outline" className="shrink-0 ml-2 text-[10px] text-red-600 border-red-300">{reason}</Badge>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
        )}

        {/* Low Stock Alert */}
        {(lowStock.length > 0 || outOfStock.length > 0) && (
          <Card className="border-orange-200 dark:border-orange-900">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <AlertTriangle className="h-5 w-5" />
                {t('ac.stockAlert')}
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-none">
                {outOfStock.map((p) => (
                  <Link
                    key={p._id}
                    href={`/admin/products/${p._id}/edit`}
                    className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 p-3 hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors"
                  >
                    <span className="text-sm font-medium truncate">
                      {p.name}
                    </span>

                    <Badge variant="destructive">
                      {t('ac.outOfStock')}
                    </Badge>
                  </Link>
                ))}

                {lowStock.map((p) => (
                  <Link
                    key={p._id}
                    href={`/admin/products/${p._id}/edit`}
                    className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900 p-3 hover:bg-orange-100 dark:hover:bg-orange-950/40 transition-colors"
                  >
                    <span className="text-sm font-medium truncate">
                      {p.name}
                    </span>

                    <Badge className="bg-orange-500">
                      {p.stock} {t('ac.pcs')}
                    </Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Orders */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>
              {t('ac.recentOrders')}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {orders?.slice(0, 8).map((order) => (
                <Link
                  key={order._id}
                  href="/admin/orders"
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {order.orderNumber}
                    </p>

                    <p className="text-xs text-muted-foreground truncate">
                      {order.customerName}
                    </p>
                  </div>

                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-bold">
                      {formatPrice(order.total)}
                    </p>

                    <Badge
                      variant={
                        order.paymentStatus === 'paid'
                          ? 'default'
                          : 'secondary'
                      }
                      className="text-[10px]"
                    >
                      {order.paymentStatus === 'paid'
                        ? t('ac.paid')
                        : t('ac.pending')}
                    </Badge>
                  </div>
                </Link>
              ))}

              {(!orders || orders.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('ac.noOrders')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
