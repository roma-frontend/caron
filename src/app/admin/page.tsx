'use client';

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
  const { sessionToken } = useAuth();
  const orders = useQuery(api.orders.listAdmin, sessionToken ? { sessionToken } : 'skip');
  const products = useQuery(api.products.listAll, {});
  const categories = useQuery(api.categories.list, {});

  const lowStock =
    products?.filter((p) => p.isActive && p.stock > 0 && p.stock <= 5) ?? [];

  const outOfStock =
    products?.filter((p) => p.isActive && p.stock === 0) ?? [];

  const stats = {
    totalOrders: orders?.length ?? 0,
    pendingOrders:
      orders?.filter((o) => o.status === 'pending').length ?? 0,

    revenue:
      orders
        ?.filter((o) => o.paymentStatus === 'paid')
        .reduce((sum, o) => sum + o.total, 0) ?? 0,

    awaitingPayment:
      orders?.filter((o) => o.paymentStatus === 'awaiting').length ?? 0,

    totalProducts: products?.length ?? 0,
    totalCategories: categories?.length ?? 0,
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          {'Ադմինիստրատորի վահանակ'}
        </h1>

        <p className="text-muted-foreground">
          {'Վիճակագրություն և խանութի կառավարում'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <StatCard
          title={'Պատվերներ'}
          value={String(stats.totalOrders)}
          icon={ShoppingBag}
          desc={'Ընդամենը'}
          href="/admin/orders"
        />

        <StatCard
          title={'Սպասման մեջ'}
          value={String(stats.pendingOrders)}
          icon={Clock}
          desc={'Նոր պատվերներ'}
          href="/admin/orders"
        />

        <StatCard
          title={'Հասույթ'}
          value={formatPrice(stats.revenue)}
          icon={DollarSign}
          desc={'Վճարված'}
        />

        <StatCard
          title={'Ապրանքներ'}
          value={String(stats.totalProducts)}
          icon={Package}
          desc={'Ընդամենը'}
          href="/admin/products"
        />

        <StatCard
          title={'Կատեգորիաներ'}
          value={String(stats.totalCategories)}
          icon={FolderTree}
          desc={'Ընդամենը'}
          href="/admin/categories"
        />

        <StatCard
          title={'Սպասող'}
          value={String(stats.awaitingPayment)}
          icon={TrendingUp}
          desc={'Վճարման սպասող'}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Low Stock Alert */}
        {(lowStock.length > 0 || outOfStock.length > 0) && (
          <Card className="border-orange-200 dark:border-orange-900">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <AlertTriangle className="h-5 w-5" />
                {'Պահեստի ահազանգ'}
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="space-y-2 max-h-6ջ overflow-y-auto scroll-indicator-none">
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
                      {'Սպառված է'}
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
                      {p.stock} {'հատ'}
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
              {'Վերջին պատվերներ'}
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
                        ? 'Վճարված'
                        : 'Սպասման մեջ'}
                    </Badge>
                  </div>
                </Link>
              ))}

              {(!orders || orders.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {'Պատվերներ չկան'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}