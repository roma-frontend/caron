'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  Home,
  List,
  ShoppingCart,
  User,
  LayoutGrid,
  Car,
  Hash,
  Tag,
  Percent,
  ArrowLeftRight,
  Heart,
  Package,
  Search,
  Phone,
  Info,
  Truck,
  ClipboardList,
  ScanSearch,
} from 'lucide-react';
import { useCartStore } from '@/store/cart';
import { useFavoritesStore } from '@/store/favorites';
import { useAuth } from '@/store/auth';
import { useBuyBarStore } from '@/store/buyBar';
import { useSettings } from '@/hooks/useSettings';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import type { NavBadgeConfig } from '@/components/NavBadge';
import { BottomTabBar, GridMenuSheet, AiMenuBanner, type TabItem, type GridMenuItem } from '@/components/shared/MobileTabBar';
import { useT } from '@/lib/i18n/admin';

export function MobileNav() {
  const { t } = useT();
  const pathname = usePathname();
  const cartCount = useCartStore((s) => s.totalItems());
  const favCount = useFavoritesStore((s) => s.count());
  const { user } = useAuth();
  const settings = useSettings();
  // The product-detail sticky buy-bar takes over the bottom edge when it's on
  // screen; the rest of the time (including the top of a product page) the
  // tab bar is shown everywhere.
  const buyBarVisible = useBuyBarStore((s) => s.visible);
  // Real mount flag: server and first client render both see `false`, so the
  // SSR HTML matches and there is no hydration mismatch. Counts (from the
  // localStorage-backed stores) only appear after mount.
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  const [menuOpen, setMenuOpen] = useState(false);

  // On a product detail page the sticky buy-bar takes over the bottom while
  // it's on screen — step aside then to avoid two overlapping bottom bars.
  if (buyBarVisible) return null;

  const accountHref = mounted && user ? ((user.role === 'admin' || user.role === 'manager' || user.role === 'superadmin') ? '/admin' : '/dashboard') : '/login';

  const tabs: TabItem[] = [
    { href: '/', icon: Home, label: t('cmp.home'), active: pathname === '/' },
    { href: '/products', icon: List, label: t('cmp.nav_catalog'), active: pathname.startsWith('/products') },
    {
      href: '/cart',
      icon: ShoppingCart,
      label: t('cmp.nav_cart'),
      active: pathname.startsWith('/cart'),
      badge: mounted ? cartCount : 0,
      iconAttrs: { 'data-mobile-cart-icon': '' },
    },
    { href: accountHref, icon: User, label: t('cmp.nav_account'), active: pathname.startsWith('/dashboard') || pathname.startsWith('/admin') },
  ];

  const navBadges = (() => {
    try {
      const raw = settings?.navBadges;
      if (!raw) return {} as Record<string, NavBadgeConfig>;
      const parsed = JSON.parse(raw) as Array<{ path: string; text: string; variant: string }>;
      const map: Record<string, NavBadgeConfig> = {};
      for (const it of parsed) map[it.path] = { text: it.text, variant: it.variant as NavBadgeConfig['variant'] };
      return map;
    } catch { return {} as Record<string, NavBadgeConfig>; }
  })();

  const baseItems: GridMenuItem[] = [
    { href: '/categories', icon: LayoutGrid, label: t('cmp.nav_categories') },
    ...(settings !== undefined && settings?.enableCarSelector !== false ? [{ href: '/car-selector', icon: Car, label: t('cmp.select_car') }] : []),
    ...(settings?.enableOemSearch ? [{ href: '/oem', icon: Hash, label: t('cmp.oem_search') }] : []),
    ...(settings?.enableVinDecoder ? [{ href: '/vin-decoder', icon: ScanSearch, label: t('cmp.vin_decoder') }] : []),
    { href: '/promotions', icon: Tag, label: t('cmp.nav_promotions') },
    { href: '/discounts', icon: Percent, label: t('cmp.discounts') },
    { href: '/compare', icon: ArrowLeftRight, label: t('cmp.nav_compare') },
    { href: '/favorites', icon: Heart, label: t('cmp.favorites_short'), badge: mounted ? favCount : 0 },
    { href: '/orders', icon: Package, label: t('cmp.orders') },
    { href: '/order-status', icon: ClipboardList, label: t('cmp.nav_order_status') },
    { href: '/delivery', icon: Truck, label: t('cmp.nav_delivery') },
    { href: '/contact', icon: Phone, label: t('cmp.nav_contact') },
    { href: '/about', icon: Info, label: t('cmp.nav_about') },
    { href: '/products', icon: Search, label: t('cmp.search_label') },
    { href: accountHref, icon: User, label: mounted && user ? t('cmp.nav_account') : t('cmp.nav_login') },
  ];
  const menuItems: GridMenuItem[] = baseItems.map((it) =>
    it.href && navBadges[it.href] ? { ...it, navBadge: navBadges[it.href] } : it
  );

  const openAiChat = () => {
    setMenuOpen(false);
    window.dispatchEvent(new Event('caron:open-ai-chat'));
  };

  return (
    <>
      <BottomTabBar tabs={tabs} fabIcon={LayoutGrid} fabLabel={t('cmp.menu')} onFabClick={() => setMenuOpen(true)} />
      <GridMenuSheet
        open={menuOpen}
        onOpenChange={setMenuOpen}
        title={t('cmp.menu')}
        items={menuItems}
        feature={
          <div className="space-y-3">
            <AiMenuBanner onClick={openAiChat} subtitle={t('cmp.find_part_fast')} />
            <div className="flex items-center justify-center rounded-2xl border border-border/60 bg-muted/40 p-2">
              <LanguageSwitcher />
            </div>
          </div>
        }
      />
    </>
  );
}
