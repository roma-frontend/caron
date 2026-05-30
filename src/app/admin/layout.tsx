'use client';

import { useAuthStore, useAuth } from '@/store/auth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LayoutDashboard, Package, FolderTree, ShoppingBag, Tag, FileText, LogOut, Settings, Menu, X, Users, Home } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { Button } from '@/components/ui/button';
import { SITE } from '@/lib/constants';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { toast } from 'sonner';
import { useOrderNotifications } from '@/hooks/useOrderNotifications';
import { clearAuthCookie } from '@/actions/auth';
import { IdleTimeoutModal } from '@/components/admin/IdleTimeoutModal';

const NAV_ITEMS = [
  { href: '/admin', icon: LayoutDashboard, label: 'Վահանակ' },
  { href: '/admin/products', icon: Package, label: 'Ապրանքներ' },
  { href: '/admin/categories', icon: FolderTree, label: 'Կատեգորիաներ' },
  { href: '/admin/orders', icon: ShoppingBag, label: 'Պատվերներ' },
  { href: '/admin/customers', icon: Users, label: 'Հաճախորդներ' },
  { href: '/admin/promotions', icon: Tag, label: 'Ակցիաներ' },
  { href: '/admin/pages', icon: FileText, label: 'Էջեր' },
  { href: '/admin/settings', icon: Settings, label: 'Կարգավորումներ' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, sessionToken, hydrated } = useAuth();
  const logoutStore = useAuthStore((s) => s.logout);
  const logoutMutation = useMutation(api.auth.logout);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pendingCount, flash } = useOrderNotifications(sessionToken);

  // Redirect handled inline below


  const handleLogout = async () => {
    if (sessionToken) await logoutMutation({ sessionToken });
    logoutStore();
    await clearAuthCookie();
    toast.success('Դուք դուրս եկաք համակարգից');
    router.push('/');
  };

  if (!hydrated) return <div className="flex min-h-screen items-center justify-center">...</div>;
  if (!user || user.role !== 'admin') return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <LogOut className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Սեսիան ավարտվել է</h1>
        <Link href="/login">
          <Button className="mt-2 gap-2">
            <LogOut className="h-4 w-4" />
            Մուտք գործել
          </Button>
        </Link>
      </div>
    </div>
  );

  const sidebar = (
    <>
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Link href="/" className="transition-transform hover:scale-110">
          <Logo size={32} />
        </Link>
        <span className="font-bold">{SITE.name}</span>
        <span className="ml-auto rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Admin</span>
        <button onClick={() => setSidebarOpen(false)} className="ml-2 lg:hidden"><X className="h-5 w-5" /></button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}>
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
              {item.href === '/admin/orders' && pendingCount > 0 && (
                <span className={`ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-white ${flash ? 'animate-bounce' : ''}`}>{pendingCount}</span>
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
          <LogOut className="h-4 w-4" /> Դուրս գալ
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen">
      <IdleTimeoutModal />
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:bg-muted/30 sticky top-0 h-screen">
        {sidebar}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-background shadow-xl" style={{ animation: 'slideInLeft 0.2s ease' }}>
            {sidebar}
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex flex-1 flex-col">
        {/* Mobile header */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/80 backdrop-blur-md px-4 lg:hidden">
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(true)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors hover:bg-primary/20">
              <Menu className="h-4 w-4" />
            </button>
            <Link href="/" className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
              <Home className="h-4 w-4" />
            </Link>
          </div>
          <div className="relative group">
            <button className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary transition-colors hover:bg-accent hover:text-foreground">
              {user.name.charAt(0)}
            </button>
            <div className="absolute right-0 top-full mt-2 hidden w-40 flex-col rounded-xl border bg-popover p-1 shadow-lg group-hover:flex">
              <span className="px-3 py-2 text-xs font-medium text-muted-foreground truncate">{user.email}</span>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-xs" onClick={handleLogout}>
                <LogOut className="h-3.5 w-3.5" /> Դուրս գալ
              </Button>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 pb-20 md:p-8 lg:pb-8">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex flex-col border-t bg-background/95 backdrop-blur-md lg:hidden transition-all duration-300 group/nav touch-none">
        <div className="mx-auto w-10 h-1.5 rounded-full bg-muted-foreground/30 mt-2 mb-1 cursor-grab touch-none"
          onTouchStart={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).dataset.touchY = String(e.touches[0].clientY); }}
          onTouchMove={(e) => { e.preventDefault(); }}
          onTouchEnd={(e) => {
            e.preventDefault();
            const startY = Number((e.currentTarget as HTMLElement).dataset.touchY);
            const endY = e.changedTouches[0].clientY;
            const nav = e.currentTarget.closest('nav') as HTMLElement;
            if (startY - endY > 20) nav.dataset.expanded = 'true';
            else if (endY - startY > 20) nav.dataset.expanded = '';
          }}
        />
        <div className="flex items-stretch h-14">
          {NAV_ITEMS.slice(0, 5).map((item) => {
            const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={`relative flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                <item.icon className="h-5 w-5" />
                {item.label.slice(0, 6)}
                {item.href === '/admin/orders' && pendingCount > 0 && <span className="absolute left-1/2 top-1 ml-1 rounded-full bg-destructive px-1.5 text-[9px] font-bold text-white">{pendingCount}</span>}
              </Link>
            );
          })}
        </div>
        <div className="grid grid-cols-5 overflow-hidden transition-all duration-300 h-0 group-data-[expanded]/nav:h-14">
          {NAV_ITEMS.slice(5).map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={`flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                <item.icon className="h-5 w-5" />
                {item.label.slice(0, 6)}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
