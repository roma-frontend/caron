'use client';

import { useAuthStore, useAuth } from '@/store/auth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LayoutDashboard, Package, FolderTree, ShoppingBag, Tag, FileText, LogOut, Settings, Menu, X, Users } from 'lucide-react';
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
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background px-4 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent">
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-bold">{SITE.name} Admin</span>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
