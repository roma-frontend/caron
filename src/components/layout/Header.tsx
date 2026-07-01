'use client';

import Link from '@/components/LocalizedLink';
import { ShoppingCart, Search, User, Heart, Car, Info, Truck, BarChart3, ClipboardList } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useT } from '@/lib/i18n/admin';
import { useState, useSyncExternalStore, useEffect, useRef } from 'react';

const BASE_HEADER_HEIGHT_PX = 64;

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;
import { useSettings } from '@/hooks/useSettings';
import { useStoreName } from '@/hooks/useStoreName';
import { useCartStore } from '@/store/cart';
import { useAuth } from '@/store/auth';
import { useFavoritesStore } from '@/store/favorites';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import dynamic from 'next/dynamic';
const SearchCommand = dynamic(() => import('@/components/SearchCommand').then((m) => ({ default: m.SearchCommand })));
import { AnnouncementBar } from '@/components/AnnouncementBar';
import { NavBadge } from '@/components/NavBadge';
import type { NavBadgeConfig } from '@/components/NavBadge';

const LINKS = [
  { href: '/products', label: 'cmp.nav_catalog' },
  { href: '/categories', label: 'cmp.nav_categories' },
  { href: '/promotions', label: 'cmp.nav_promotions' },
  { href: '/contact', label: 'cmp.nav_contact' },
];

const MORE_LINKS = [
  { href: '/about', label: 'cmp.nav_about', icon: Info },
  { href: '/order-status', label: 'cmp.nav_order_status', icon: ClipboardList },
  { href: '/compare', label: 'cmp.nav_compare', icon: BarChart3 },
  { href: '/delivery', label: 'cmp.nav_delivery', icon: Truck },
];

export function Header() {
  const { t } = useT();
  const [moreOpen, setMoreOpen] = useState(false);
  const cartCount = useCartStore((s) => s.totalItems());
  const { user, hydrated: authHydrated } = useAuth();
  const settings = useSettings();
  const [searchOpen, setSearchOpen] = useState(false);
  const favCount = useFavoritesStore((s) => s.count());
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const hasFavs = mounted && favCount > 0;
  const displayCartCount = mounted ? cartCount : 0;
  const accountHref = !authHydrated ? '/login' : !user ? '/login' : (user.role === 'admin' || user.role === 'manager') ? '/admin' : '/dashboard';
  const storeName = useStoreName();
  const announcementBar = settings?.announcementBar;
  const showAnnouncement = settings?.announcementEnabled !== false && Boolean(announcementBar);
  const announcementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const update = () => {
      const announcementHeight = announcementRef.current?.offsetHeight ?? 0;
      root.style.setProperty('--header-height', `${BASE_HEADER_HEIGHT_PX + announcementHeight}px`);
    };
    update();
    const ro = new ResizeObserver(update);
    const announcementEl = announcementRef.current;
    if (announcementEl) ro.observe(announcementEl);
    return () => ro.disconnect();
  }, [showAnnouncement]);
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
      <div className="fixed inset-x-0 top-0" style={{ zIndex: 'var(--z-sticky)' }}>
        <div ref={announcementRef} className="overflow-hidden" style={{ height: showAnnouncement ? undefined : '0' }}>
          {showAnnouncement && (
            <AnnouncementBar raw={announcementBar} phone={settings?.phone} />
          )}
        </div>
        <header className="glass-header w-full" style={{ height: 'var(--header-base-height)' }}>
        <div className="mx-auto flex h-full items-center justify-between gap-1 px-4 max-w-[var(--container-max)]">
          {/* Logo */}
          <Link href="/" className="flex items-center shrink-0" aria-label={storeName}>
            <Logo size={34} />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {settings !== undefined && settings?.enableCarSelector !== false && (
              <Link href="/car-selector" className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10">
                <Car className="h-4 w-4" /> {t('cmp.select_make')}
              </Link>
            )}
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="relative rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                {t(link.label)}
                {navBadges[link.href] && <span className="absolute -right-2 -top-1.5 z-50"><NavBadge config={navBadges[link.href]} /></span>}
              </Link>
            ))}
            <div className="relative" onMouseEnter={() => setMoreOpen(true)} onMouseLeave={() => setMoreOpen(false)}>
              <button className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                onClick={() => setMoreOpen((v) => !v)} onBlur={(e) => { if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) setMoreOpen(false); }}
                aria-expanded={moreOpen} aria-haspopup="true">{t('cmp.more')} ▾</button>
              <div className={`absolute left-0 top-full z-50 min-w-[200px] rounded-xl border bg-background p-2 shadow-xl transition-all ${moreOpen ? 'visible opacity-100' : 'invisible opacity-0'}`}
                onMouseEnter={() => setMoreOpen(true)} onMouseLeave={() => setMoreOpen(false)}>
                {MORE_LINKS.map((link) => (
                  <Link key={link.href} href={link.href} className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    onFocus={() => setMoreOpen(true)} onBlur={(e) => { if (!e.currentTarget.parentElement?.parentElement?.contains(e.relatedTarget as Node)) setMoreOpen(false); }}>
                    {t(link.label)}
                  </Link>
                ))}
                {settings?.enableVinDecoder && (
                  <Link href="/vin-decoder" className="block rounded-lg px-3 py-2.5 text-sm text-primary font-medium transition-colors hover:bg-primary/10"
                    onFocus={() => setMoreOpen(true)} onBlur={(e) => { if (!e.currentTarget.parentElement?.parentElement?.contains(e.relatedTarget as Node)) setMoreOpen(false); }}>
                    {t('cmp.vin_decoder')}
                  </Link>
                )}
                {settings?.enableOemSearch && (
                  <Link href="/oem" className="block rounded-lg px-3 py-2.5 text-sm text-primary font-medium transition-colors hover:bg-primary/10"
                    onFocus={() => setMoreOpen(true)} onBlur={(e) => { if (!e.currentTarget.parentElement?.parentElement?.contains(e.relatedTarget as Node)) setMoreOpen(false); }}>
                    {t('cmp.oem_search')}
                  </Link>
                )}
              </div>
            </div>
          </nav>

          {/* Search - desktop (expandable + ⌘K) */}
          <div className="hidden flex-1 items-center lg:flex" style={{ maxWidth: '20rem', marginInline: '1.5rem' }}>
            <button onClick={() => setSearchOpen(true)} className="group/search relative flex h-9 w-full items-center rounded-full border bg-background pl-9 pr-8 text-left text-sm text-muted-foreground transition-all duration-300 hover:border-primary/40 hover:bg-accent focus-within:w-full focus-within:border-primary/50 focus-within:shadow-[0_0_0_3px_var(--primary)/0.1]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors group-hover/search:text-primary" />
              <span className="truncate">{t('cmp.nav_search')}</span>
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden rounded border bg-muted p-1 font-mono text-[10px] text-muted-foreground sm:inline-block">⌘K</kbd>
            </button>
          </div>

          {/* Actions */}
          <div suppressHydrationWarning className="flex items-center gap-0.5 sm:gap-1">
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t('cmp.nav_search')} onClick={() => setSearchOpen(true)}>
              <Search className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <LanguageSwitcher className="hidden sm:flex" />
            <ThemeToggle />
            <Link href="/favorites">
              <Button variant="ghost" size="icon" className="hidden sm:inline-flex group/fav" aria-label={t('cmp.nav_favorites')} suppressHydrationWarning>
                <Heart data-fav-icon className={`h-4 w-4 sm:h-5 sm:w-5 transition-colors group-hover/fav:fill-red-500 group-hover/fav:text-red-500 ${hasFavs ? 'fill-red-500 text-red-500' : ''}`} />
              </Button>
            </Link>
            <Link href="/cart">
              <Button variant="ghost" size="icon" className="relative overflow-visible" aria-label={t('cmp.nav_cart')}>
                <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" data-cart-icon />
                <Badge className="absolute -right-1 -top-1 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center p-0 text-[9px] sm:text-[10px] bg-primary text-white dark:bg-primary dark:text-white">{displayCartCount}</Badge>
              </Button>
            </Link>
            <Link href={accountHref}>
              <Button variant="ghost" size="icon" aria-label={t('cmp.nav_login')}>
                <User className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </Link>
          </div>
        </div>
        </header>
      </div>

      {/* Keeps content below a fixed header + optional announcement bar */}
      <div aria-hidden="true" style={{ height: 'var(--header-height)' }} />

      <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />

    </>
  );
}