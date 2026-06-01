'use client';

import { useQuery } from 'convex/react';
import { useAuth } from '@/store/auth';
import { Loader } from '@/components/ui/loader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, User, ShoppingBag, LogOut, Heart, Truck, Clock } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';
import { useMutation } from 'convex/react';
import { clearAuthCookie } from '@/actions/auth';
import { formatDateHy, formatPrice } from '@/lib/formatters';
import Link from 'next/link';
import { api } from '../../../../convex/_generated/api';

export default function DashboardPage() {
  const { user, sessionToken, hydrated } = useAuth();
  const router = useRouter();
  const logoutStore = useAuthStore((s) => s.logout);
  const logoutMutation = useMutation(api.auth.logout);
  const orders = useQuery(api.orders.listByUser, sessionToken ? { sessionToken } : 'skip');

  if (!hydrated) return <Loader />;
  if (!user) { router.push('/login'); return null; }

  const handleLogout = async () => {
    if (sessionToken) try { await logoutMutation({ sessionToken }); } catch {}
    logoutStore();
    await clearAuthCookie();
    router.push('/');
  };

  return (
    <div className="mx-auto" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingBlock: 'var(--space-8)' }}>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Իմ վահանակը</h1>
        <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
          <LogOut className="h-4 w-4" /> Դուրս գալ
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-5 w-5 text-primary" /> Պրոֆիլ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Անուն</span>
              <span className="font-medium">{user.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Էլ․ հասցե</span>
              <span>{user.email}</span>
            </div>
            {user.customerType && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Տիպ</span>
                <Badge variant={user.customerType === 'wholesale' ? 'default' : 'secondary'}>
                  {user.customerType === 'wholesale' ? 'Մեծածախ' : 'Մանրածախ'}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-5 w-5 text-primary" /> Արագ հղումներ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/orders" className="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors hover:bg-muted">
              <ShoppingBag className="h-4 w-4 text-muted-foreground" /> Իմ պատվերներ
            </Link>
            <Link href="/favorites" className="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors hover:bg-muted">
              <Heart className="h-4 w-4 text-muted-foreground" /> Նախընտրածներ
            </Link>
            <Link href="/products" className="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors hover:bg-muted">
              <Package className="h-4 w-4 text-muted-foreground" /> Կատալոգ
            </Link>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingBag className="h-5 w-5 text-primary" /> Ստատիստիկա
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Բոլոր պատվերներ</span>
              <span className="font-bold text-lg">{orders?.length ?? 0}</span>
            </div>
            {orders && orders.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Ընդհանուր գումար</span>
                <span className="font-bold text-primary">{formatPrice(orders.reduce((s, o) => s + o.total, 0))}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-5 w-5 text-primary" /> Վերջին պատվերներ
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orders && orders.length > 0 ? (
            <div className="space-y-2">
              {orders.slice(0, 5).map((o) => (
                <div key={o._id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">#{o.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">{formatDateHy(o.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{formatPrice(o.total)}</p>
                    <Badge variant={o.status === 'delivered' ? 'default' : 'secondary'} className="text-[10px]">{o.status === 'delivered' ? 'Առաքվել է' : o.status === 'shipped' ? 'Ուղարկվել է' : o.status === 'processing' ? 'Մշակվում է' : o.status === 'cancelled' ? 'Չեղարկվել է' : 'Սպասվում է'}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">Ուղարկված պատվերներ չկան</p>
          )}
          {orders && orders.length > 5 && (
            <Link href="/orders" className="mt-3 block text-center text-sm text-primary hover:underline">Բոլոր պատվերներ →</Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
