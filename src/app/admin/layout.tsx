'use client';

import { useAuthStore, useAuth } from '@/store/auth';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Link from '@/components/LocalizedLink';
import { LayoutDashboard, Package, FolderTree, Tag, FileText, LogOut, Settings, Menu, Users, Home, Search, BarChart3, Star, Ticket, SlidersHorizontal, Warehouse, TrendingUp, MessageCircleQuestion, RotateCcw, Truck, Award, Crown } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { Button } from '@/components/ui/button';
import { useStoreName } from '@/hooks/useStoreName';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { toast } from 'sonner';
import { useOrderNotificationStore } from '@/store/orderNotifications';
import { clearAuthCookie } from '@/actions/auth';
import { IdleTimeoutModal } from '@/components/admin/IdleTimeoutModal';
import { AdminUserMenu } from '@/components/admin/AdminUserMenu';
import { AdminCommandPalette } from '@/components/admin/AdminCommandPalette';
import { AdminNotificationBell } from '@/components/admin/AdminNotificationBell';
import { useAdminT } from '@/lib/i18n/admin';
import { Loader } from '@/components/ui/loader';
import { BottomTabBar, GridMenuSheet, AiMenuBanner, type TabItem, type GridMenuItem } from '@/components/shared/MobileTabBar';

const NAV_ITEMS = [
  { href: '/admin', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { href: '/admin/products', icon: Package, labelKey: 'nav.products' },
  { href: '/admin/categories', icon: FolderTree, labelKey: 'nav.categories' },
  { href: '/admin/brands', icon: Award, labelKey: 'nav.brands' },
  { href: '/admin/filters', icon: SlidersHorizontal, labelKey: 'nav.filters' },
  { href: '/admin/orders', icon: BarChart3, labelKey: 'nav.orders' },
  { href: '/admin/returns', icon: RotateCcw, labelKey: 'nav.returns' },
  { href: '/admin/customers', icon: Users, labelKey: 'nav.customers' },
  { href: '/admin/stock', icon: Warehouse, labelKey: 'nav.stock' },
  { href: '/admin/analytics', icon: TrendingUp, labelKey: 'nav.analytics' },

  { href: '/admin/promotions', icon: Tag, labelKey: 'nav.promotions' },
  { href: '/admin/promotions/coupons', icon: Ticket, labelKey: 'nav.coupons' },
  { href: '/admin/reviews', icon: Star, labelKey: 'nav.reviews' },
  { href: '/admin/qa', icon: MessageCircleQuestion, labelKey: 'nav.qa' },
  { href: '/admin/pages', icon: FileText, labelKey: 'nav.pages' },
  { href: '/admin/delivery', icon: Truck, labelKey: 'nav.delivery' },
  { href: '/admin/settings', icon: Settings, labelKey: 'nav.settings' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, sessionToken, hydrated } = useAuth();
  const logoutStore = useAuthStore((s) => s.logout);
  const logoutMutation = useMutation(api.auth.logout);
  const [menuOpen, setMenuOpen] = useState(false);
  const pendingCount = useOrderNotificationStore((s) => s.pendingCount);
  const returnsPendingCount = useOrderNotificationStore((s) => s.returnsPendingCount);
  const flash = useOrderNotificationStore((s) => s.flash);
  const storeName = useStoreName();
  const { t } = useAdminT();
  const me = useQuery(api.auth.me, sessionToken ? { sessionToken } : 'skip');
  const isStaff = user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'manager';
  const myCaps = useQuery(api.access.getMyCapabilities, sessionToken && isStaff ? { sessionToken } : 'skip');

  // Section key from an admin href: '/admin/products' -> 'products', '/admin' -> ''.
  const sectionKey = (href: string) => href.replace(/^\/admin\/?/, '').split('/')[0];
  const disabledSet = new Set(myCaps?.disabled ?? []);
  const callerIsSuperadmin = myCaps?.isSuperadmin ?? (user?.role === 'superadmin');
  const visibleNav = NAV_ITEMS.filter((item) => {
    const key = sectionKey(item.href);
    if (!key) return true; // dashboard root always visible
    return !disabledSet.has(key);
  });
  // Route guard: current section disabled for this role → block render below.
  const currentSection = sectionKey(pathname);
  const sectionBlocked = !!currentSection && disabledSet.has(currentSection);

  const sessionStartRef = useRef<number | null>(null);

  useEffect(() => { sessionStartRef.current = Date.now(); }, []);

  useEffect(() => {
    if (me === null && sessionStartRef.current && Date.now() - sessionStartRef.current > 3000) {
      toast.error(t('shell.sessionExpiredToast'));
      logoutStore();
      router.push('/login');
    }
  }, [me, logoutStore, router]);

  // Redirect handled inline below


  const handleLogout = async () => {
    if (sessionToken) await logoutMutation({ sessionToken });
    logoutStore();
    await clearAuthCookie();
    toast.success(t('shell.loggedOut'));
    router.push('/');
  };

  if (!hydrated) return <div className="flex min-h-screen items-center justify-center"><Loader /></div>;
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <LogOut className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">{t('shell.sessionExpired')}</h1>
        <p className="text-sm text-muted-foreground">{t('shell.untilNextTime')}</p>
      </div>
    </div>
  );

  const sidebar = (
    <>
      <div className="flex h-14 items-center justify-between gap-2 border-b px-4">
        <Link href="/" className="transition-transform hover:scale-110">
          <Logo size={32} />
        </Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {callerIsSuperadmin && (
          <Link href="/admin/control" className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${pathname === '/admin/control' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-gradient-to-r from-amber-500/10 to-purple-500/10 text-foreground hover:from-amber-500/20 hover:to-purple-500/20'}`}>
            <Crown className="h-4 w-4 shrink-0 text-amber-500" />
            <span className="truncate">{t('sc.navControl')}</span>
          </Link>
        )}
        {visibleNav.map((item, i) => {
          const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
          return (
            <Link key={`${item.href}-${i}`} href={item.href} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}>
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{t(item.labelKey)}</span>
              {item.href === '/admin/orders' && pendingCount > 0 && (
                <span className={`ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-white ${flash ? 'animate-bounce' : ''}`}>{pendingCount}</span>
              )}
              {item.href === '/admin/returns' && returnsPendingCount > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-white">{returnsPendingCount}</span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-3">
        <div className="mb-2 flex items-center gap-2 px-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{user.name.charAt(0)}</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" onClick={handleLogout}>
          <LogOut className="h-4 w-4" /> {t('common.logout')}
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen">
      <IdleTimeoutModal />
      <AdminCommandPalette sessionToken={sessionToken} />
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:bg-muted/30 sticky top-0 h-screen">
        {sidebar}
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/80 backdrop-blur-md px-4 lg:hidden">
          <div className="flex items-center gap-2">
            <Link href="/" className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
              <Home className="h-4 w-4" />
            </Link>
          </div>
          <div className="flex items-center gap-1">
            <AdminNotificationBell sessionToken={sessionToken} />
            <AdminUserMenu user={user} sessionToken={sessionToken} onLogout={handleLogout} compact />
          </div>
        </header>
        {/* Desktop header */}
        <header className="hidden lg:flex sticky top-0 z-40 h-14 items-center justify-between border-b bg-background/80 backdrop-blur-md px-6">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('caron:open-command-palette'))}
            className="group/search flex h-9 w-72 items-center gap-2 rounded-lg border bg-muted/50 px-3 text-sm text-muted-foreground transition-colors hover:bg-background hover:border-primary/40"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left">{t('palette.searchPlaceholderShort')}</span>
            <kbd className="rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
          </button>
          <div className="flex items-center gap-2">
            <Link href="/" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"><Home className="h-4 w-4" /></Link>
            <AdminNotificationBell sessionToken={sessionToken} />
            <div className="h-5 w-px bg-border" />
            <AdminUserMenu user={user} sessionToken={sessionToken} onLogout={handleLogout} />
          </div>
        </header>
        <main className="flex-1 p-4 pb-20 md:p-8 lg:pb-8">
          {sectionBlocked ? (
            <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <LogOut className="h-7 w-7 text-destructive" />
              </div>
              <h1 className="text-xl font-semibold">{t('sc.noAccessTitle')}</h1>
              <p className="max-w-sm text-sm text-muted-foreground">{t('sc.noAccessDesc')}</p>
            </div>
          ) : children}
        </main>
      </div>

      {/* Mobile bottom nav: 4 tabs + central FAB opening the full sections grid */}
      <BottomTabBar
        tabs={[
          { href: '/admin', icon: LayoutDashboard, label: t('nav.dashboard'), active: pathname === '/admin' },
          { href: '/admin/products', icon: Package, label: t('nav.products'), active: pathname.startsWith('/admin/products') },
          { href: '/admin/orders', icon: BarChart3, label: t('nav.orders'), active: pathname.startsWith('/admin/orders'), badge: pendingCount },
          { href: '/admin/analytics', icon: TrendingUp, label: t('nav.analytics'), active: pathname.startsWith('/admin/analytics') },
        ] satisfies TabItem[]}
        fabIcon={Menu}
        fabLabel={t('common.all')}
        onFabClick={() => setMenuOpen(true)}
      />
      <GridMenuSheet
        open={menuOpen}
        onOpenChange={setMenuOpen}
        title={storeName || t('common.management')}
        feature={
          <AiMenuBanner
            onClick={() => {
              setMenuOpen(false);
              window.dispatchEvent(new Event('caron:open-ai-chat'));
            }}
            subtitle={t('shell.aiBannerSubtitle')}
          />
        }
        items={[
          ...(callerIsSuperadmin ? [{ href: '/admin/control', icon: Crown, label: t('sc.navControl') }] : []),
          ...visibleNav.map((item) => ({
            href: item.href,
            icon: item.icon,
            label: t(item.labelKey),
            badge:
              item.href === '/admin/orders'
                ? pendingCount
                : item.href === '/admin/returns'
                  ? returnsPendingCount
                  : undefined,
          })),
          { icon: LogOut, label: t('common.logout'), onClick: handleLogout, highlight: true },
        ] satisfies GridMenuItem[]}
      />
    </div>
  );
}
