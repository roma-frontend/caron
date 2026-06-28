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
} from 'lucide-react';
import { useCartStore } from '@/store/cart';
import { useFavoritesStore } from '@/store/favorites';
import { useAuth } from '@/store/auth';
import { BottomTabBar, GridMenuSheet, AiMenuBanner, type TabItem, type GridMenuItem } from '@/components/shared/MobileTabBar';
import { useT } from '@/lib/i18n/admin';

export function MobileNav() {
  const { t } = useT();
  const pathname = usePathname();
  const cartCount = useCartStore((s) => s.totalItems());
  const favCount = useFavoritesStore((s) => s.count());
  const { user } = useAuth();
  // Real mount flag: server and first client render both see `false`, so the
  // SSR HTML matches and there is no hydration mismatch. Counts (from the
  // localStorage-backed stores) only appear after mount.
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  const [menuOpen, setMenuOpen] = useState(false);

  // On a product detail page the sticky buy-bar takes over the bottom.
  if (/^\/products\/.+/.test(pathname)) return null;

  const accountHref = mounted && user ? (user.role === 'admin' ? '/admin' : '/dashboard') : '/login';

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

  const menuItems: GridMenuItem[] = [
    { href: '/categories', icon: LayoutGrid, label: t('cmp.nav_categories') },
    { href: '/car-selector', icon: Car, label: t('cmp.select_car') },
    { href: '/oem', icon: Hash, label: t('cmp.oem_search') },
    { href: '/promotions', icon: Tag, label: t('cmp.nav_promotions') },
    { href: '/discounts', icon: Percent, label: t('cmp.discounts') },
    { href: '/compare', icon: ArrowLeftRight, label: t('cmp.nav_compare') },
    { href: '/favorites', icon: Heart, label: t('cmp.favorites_short'), badge: mounted ? favCount : 0 },
    { href: '/orders', icon: Package, label: t('cmp.orders') },
    { href: '/products', icon: Search, label: t('cmp.search_label') },
  ];

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
        feature={<AiMenuBanner onClick={openAiChat} subtitle={t('cmp.find_part_fast')} />}
      />
    </>
  );
}
