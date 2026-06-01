'use client';

import Link from 'next/link';
import { ShoppingCart, Search, ActivityIcon, Menu, User, Heart, X, Grid3X3, Tag, Phone, Car, Info, Truck, BarChart3, ClipboardList } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NAV, SITE } from '@/lib/constants';
import { useState, useSyncExternalStore } from 'react';

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;
import { useRouter } from 'next/navigation';
import { useSettings } from '@/hooks/useSettings';
import { useStoreName } from '@/hooks/useStoreName';
import { useCartStore } from '@/store/cart';
import { useAuth } from '@/store/auth';
import { useFavoritesStore } from '@/store/favorites';
import { ThemeToggle } from '@/components/ThemeToggle';
import dynamic from 'next/dynamic';
const SearchCommand = dynamic(() => import('@/components/SearchCommand').then((m) => ({ default: m.SearchCommand })));
import { AnnouncementBar } from '@/components/AnnouncementBar';
import { NavBadge } from '@/components/NavBadge';
import type { NavBadgeConfig } from '@/components/NavBadge';

const LINKS = [
  { href: '/products', label: NAV.catalog },
  { href: '/categories', label: NAV.categories },
  { href: '/promotions', label: NAV.promotions },
  { href: '/contact', label: NAV.contact },
];

const MORE_LINKS = [
  { href: '/about', label: 'Մեր մասին', icon: Info },
  { href: '/order-status', label: NAV.orderStatus, icon: ClipboardList },
  { href: '/compare', label: 'Համեմատել', icon: BarChart3 },
  { href: '/delivery', label: 'Առաքում', icon: Truck },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const cartCount = useCartStore((s) => s.totalItems());
  const { user } = useAuth();
  const router = useRouter();
  const settings = useSettings();
  const [searchOpen, setSearchOpen] = useState(false);
  const favCount = useFavoritesStore((s) => s.count());
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const hasFavs = mounted && favCount > 0;
  const storeName = useStoreName();
  const navBadges = (() => {
    try {
      const raw = settings?.navBadges;
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Array<{ path: string; text: string; variant: string }>;
      const map: Record<string, NavBadgeConfig> = {};
      for (const item of parsed) map[item.path] = { text: item.text, variant: item.variant as NavBadgeConfig['variant'] };
      return map;
    } catch { return {}; }
  })();

  return (
    <>
      {settings?.announcementEnabled !== false && <AnnouncementBar raw={settings?.announcementBar} phone={settings?.phone} />}
      <header className="glass-header sticky top-0 w-full" style={{ zIndex: 'var(--z-sticky)', height: 'var(--header-height)' }}>
        <div className="mx-auto flex h-full items-center justify-between gap-1 px-2 sm:px-4" style={{ maxWidth: 'var(--container-max)' }}>
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Logo size={36} />
            <span className="text-xl font-bold sm:inline">{storeName}</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {settings?.enableCarSelector !== false && (
              <Link href="/car-selector" className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10">
                <Car className="h-4 w-4" /> Ընտրել մակնիշ
              </Link>
            )}
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="relative rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                {link.label}
                {navBadges[link.href] && <span className="absolute -right-2 -top-1.5"><NavBadge config={navBadges[link.href]} /></span>}
              </Link>
            ))}
            <div className="relative" onMouseEnter={() => setMoreOpen(true)} onMouseLeave={() => setMoreOpen(false)}>
              <button className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                onClick={() => setMoreOpen((v) => !v)} onBlur={(e) => { if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) setMoreOpen(false); }}
                aria-expanded={moreOpen} aria-haspopup="true">Ավելին ▾</button>
              <div className={`absolute left-0 top-full z-50 min-w-[200px] rounded-xl border bg-background p-2 shadow-xl transition-all ${moreOpen ? 'visible opacity-100' : 'invisible opacity-0'}`}
                onMouseEnter={() => setMoreOpen(true)} onMouseLeave={() => setMoreOpen(false)}>
                {MORE_LINKS.map((link) => (
                  <Link key={link.href} href={link.href} className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    onFocus={() => setMoreOpen(true)} onBlur={(e) => { if (!e.currentTarget.parentElement?.parentElement?.contains(e.relatedTarget as Node)) setMoreOpen(false); }}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </nav>

          {/* Search - desktop */}
          <div className="hidden flex-1 items-center lg:flex" style={{ maxWidth: '16rem', marginInline: '1.5rem' }}>
            <button onClick={() => setSearchOpen(true)} className="relative flex h-9 w-full items-center rounded-md border bg-background pl-9 pr-3 text-left text-sm text-muted-foreground transition-colors hover:bg-accent">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              <span className="truncate">{NAV.search}</span>
            </button>
          </div>

          {/* Actions */}
          <div suppressHydrationWarning className="flex items-center gap-0.5 sm:gap-1">
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label={NAV.search} onClick={() => setSearchOpen(true)}>
              <Search className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <ThemeToggle />
            <Link href="/favorites">
              <Button variant="ghost" size="icon" className="hidden sm:inline-flex group/fav" aria-label={NAV.favorites} suppressHydrationWarning>
                <Heart className={`h-4 w-4 sm:h-5 sm:w-5 transition-colors group-hover/fav:fill-red-500 group-hover/fav:text-red-500 ${hasFavs ? 'fill-red-500 text-red-500' : ''}`} />
              </Button>
            </Link>
            <Link href="/cart">
              <Button variant="ghost" size="icon" className="relative overflow-visible" aria-label={NAV.cart}>
                <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" data-cart-icon />
                <Badge className="absolute -right-1 -top-1 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center p-0 text-[9px] sm:text-[10px]">{cartCount}</Badge>
              </Button>
            </Link>
            <Link href={!user ? "/login" : user.role === 'admin' ? "/admin" : "/dashboard"}>
              <Button variant="ghost" size="icon" aria-label={NAV.login}>
                <User className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </Link>
            <button onClick={() => setMenuOpen(true)} className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-md hover:bg-accent md:hidden" aria-label="Menu">
              <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>
      </header>

      <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />

      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <div className="fixed inset-0" style={{ zIndex: 'var(--z-modal)' }}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-80 max-w-[85vw] flex flex-col bg-background shadow-2xl" style={{ animation: 'slideInRight 0.3s ease' }}>
            {/* Header */}
            <div className="flex-1 overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <Link href="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-2">
                <Logo size={32} />
                <span className="text-lg font-bold">{storeName}</span>
              </Link>
              <button onClick={() => setMenuOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-accent transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b">
              <form onSubmit={(e) => { e.preventDefault(); const v = (e.currentTarget.elements.namedItem('mq') as HTMLInputElement).value; if (v) { router.push(`/products?q=${v}`); setMenuOpen(false); } }} className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input name="mq" placeholder={NAV.search} className="h-10 w-full rounded-xl border bg-muted/50 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:bg-background transition-colors" />
              </form>
            </div>

            {/* Main Nav */}
            <nav className="p-3">
              <p className="px-3 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Նավիգացիա</p>
              {[
                { href: '/products', label: NAV.catalog, icon: Grid3X3 },
                { href: '/categories', label: NAV.categories, icon: Tag },
                { href: '/promotions', label: NAV.promotions, icon: ActivityIcon },
                { href: '/contact', label: NAV.contact, icon: Phone },
              ].map((link) => (
                <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent">
                  <link.icon className="h-4 w-4 text-muted-foreground" />
                  {link.label}
                  {navBadges[link.href] && <span className="absolute -right-1 -top-1"><NavBadge config={navBadges[link.href]} /></span>}
                </Link>
              ))}
            </nav>

            {/* More Links */}
            <nav className="p-3 border-t">
              <p className="px-3 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ավելին</p>
              {MORE_LINKS.map((link) => (
                <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent">
                  <link.icon className="h-4 w-4 text-muted-foreground" />
                  {link.label}
                </Link>
              ))}
            </nav>
            </div>

            {/* User Actions */}
            <div className="p-3 border-t mt-auto">
              <div className="flex flex-col gap-2">
                <Link href="/favorites" onClick={() => setMenuOpen(false)} className="group/fav flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-all hover:border-red-500/40 hover:bg-red-500/5 hover:text-red-500">
                  <Heart className={`h-4 w-4 transition-colors ${hasFavs ? 'fill-red-500 text-red-500' : ''}`} />
                  {NAV.favorites}
                </Link>
                <Link href={!user ? "/login" : user.role === 'admin' ? "/admin" : "/dashboard"} onClick={() => setMenuOpen(false)} className="flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-all hover:border-green-500/40 hover:bg-green-500/5 hover:text-green-500">
                  <User className="h-4 w-4" />
                  {user ? NAV.account : NAV.login}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
