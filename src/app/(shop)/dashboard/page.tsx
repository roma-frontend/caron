'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { useAuth, useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';
import { Loader } from '@/components/ui/loader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, User, ShoppingBag, LogOut, Heart, Clock, Gift, Copy } from 'lucide-react';
import { clearAuthCookie } from '@/actions/auth';
import { toast } from 'sonner';
import { formatDateLocalized, formatPrice } from '@/lib/formatters';
import { ReorderButton } from '@/components/ReorderButton';
import { PushToggle } from '@/components/PushToggle';
import { useSettings } from '@/hooks/useSettings';
import Link from 'next/link';
import { api } from '../../../../convex/_generated/api';
import { useT } from '@/lib/i18n/admin';

export default function DashboardPage() {
  const { t } = useT();
  const { user, sessionToken, hydrated } = useAuth();
  const router = useRouter();
  const logoutStore = useAuthStore((s) => s.logout);
  const logoutMutation = useMutation(api.auth.logout);
  const orders = useQuery(api.orders.listByUser, sessionToken ? { sessionToken } : 'skip');
  const settings = useSettings();
  const loyalty = useQuery(api.loyalty.getBalance, sessionToken ? { sessionToken } : 'skip');
  const ensureReferral = useMutation(api.auth.ensureReferralCode);
  const [referral, setReferral] = useState<{ code: string; referredCount: number } | null>(null);
  useEffect(() => {
    if (sessionToken) ensureReferral({ sessionToken }).then((r) => { if (r) setReferral(r); }).catch(() => {});
  }, [sessionToken, ensureReferral]);
  const referralLink = referral && typeof window !== 'undefined' ? `${window.location.origin}/register?ref=${referral.code}` : '';

  useEffect(() => {
    if (hydrated && !user) {
      const t = setTimeout(() => router.push('/'), 800);
      return () => clearTimeout(t);
    }
  }, [hydrated, user, router]);

  if (!hydrated) return <Loader />;
  if (!user) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <LogOut className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">{t('pg.dash.sessionEnded')}</h1>
        <p className="text-sm text-muted-foreground">{t('pg.dash.untilNext')}</p>
      </div>
    </div>
  );

  const handleLogout = async () => {
    if (sessionToken) try { await logoutMutation({ sessionToken }); } catch {}
    logoutStore();
    await clearAuthCookie();
  };

  return (
    <div className="mx-auto max-w-[var(--container-max)] sm:px-[var(--space-container)] py-[var(--space-8)]">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('pg.dash.title')}</h1>
        <div className="flex items-center gap-2">
          <PushToggle />
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" /> {t('pg.dash.logout')}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-5 w-5 text-primary" /> {t('pg.dash.profile')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('pg.dash.name')}</span>
              <span className="font-medium">{user.name}</span>
            </div>
            {user.email?.endsWith('@telegram.local') ? (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Telegram</span>
                <span className="font-medium">{user.telegramUsername ? `@${user.telegramUsername}` : t('pg.dash.connected')}</span>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('pg.dash.emailAddr')}</span>
                <span>{user.email}</span>
              </div>
            )}
            {user.customerType && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('pg.dash.type')}</span>
                <Badge variant={user.customerType === 'wholesale' ? 'default' : 'secondary'}>
                  {user.customerType === 'wholesale' ? t('pg.dash.wholesale') : t('pg.dash.retail')}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-5 w-5 text-primary" /> {t('pg.dash.quickLinks')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/orders" className="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors hover:bg-muted">
              <ShoppingBag className="h-4 w-4 text-muted-foreground" /> {t('pg.dash.myOrders')}
            </Link>
            <Link href="/favorites" className="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors hover:bg-muted">
              <Heart className="h-4 w-4 text-muted-foreground" /> {t('pg.dash.favorites')}
            </Link>
            <Link href="/products" className="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors hover:bg-muted">
              <Package className="h-4 w-4 text-muted-foreground" /> {t('pg.dash.catalog')}
            </Link>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingBag className="h-5 w-5 text-primary" /> {t('pg.dash.stats')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('pg.dash.allOrders')}</span>
              <span className="font-bold text-lg">{orders?.length ?? 0}</span>
            </div>
            {orders && orders.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('pg.dash.totalAmount')}</span>
                <span className="font-bold text-primary">{formatPrice(orders.reduce((s, o) => s + o.total, 0))}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Loyalty balance */}
        {settings?.enableLoyalty && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Gift className="h-5 w-5 text-amber-500" /> {t('pg.dash.loyaltyPoints')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">{loyalty?.points ?? 0}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t('pg.dash.totalEarned')} {loyalty?.totalEarned ?? 0} {t('pg.dash.pts')}</p>
              {(settings.loyaltyPercent ?? 0) > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">{t('pg.dash.earnPrefix')} {settings.loyaltyPercent}{t('pg.dash.earnSuffix')}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Referral program */}
        {settings?.enableLoyalty && referral && (
          <Card className="border-primary/30 bg-primary/5 lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Gift className="h-5 w-5 text-primary" /> {t('pg.dash.inviteFriend')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{t('pg.dash.referralDesc')}</p>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-lg border bg-background px-4 py-2 font-mono text-lg font-bold tracking-wider text-primary">{referral.code}</span>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { navigator.clipboard.writeText(referralLink); toast.success(t('pg.dash.linkCopied')); }}>
                  <Copy className="h-3.5 w-3.5" /> {t('pg.dash.copyLink')}
                </Button>
                <span className="text-xs text-muted-foreground">{t('pg.dash.invited')} {referral.referredCount}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Orders */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-5 w-5 text-primary" /> {t('pg.dash.recentOrders')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orders && orders.length > 0 ? (
            <div className="space-y-2">
              {orders.slice(0, 5).map((o) => (
                <div key={o._id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">#{o.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">{formatDateLocalized(o.createdAt, t)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatPrice(o.total)}</p>
                      <Badge variant={o.status === 'delivered' ? 'default' : 'secondary'} className="text-[10px]">{o.status === 'delivered' ? t('pg.dash.status.delivered') : o.status === 'shipped' ? t('pg.dash.status.shipped') : o.status === 'processing' ? t('pg.dash.status.processing') : o.status === 'cancelled' ? t('pg.dash.status.cancelled') : t('pg.dash.status.pending')}</Badge>
                    </div>
                    <ReorderButton items={o.items.map((it) => ({ productId: it.productId, name: it.name, quantity: it.quantity }))} variant="ghost" label="" className="shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">{t('pg.dash.noOrders')}</p>
          )}
          {orders && orders.length > 5 && (
            <Link href="/orders" className="mt-3 block text-center text-sm text-primary hover:underline">{t('pg.dash.allOrders')} →</Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
