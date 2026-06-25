'use client';

import { useState } from 'react';
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

export function MobileNav() {
  const pathname = usePathname();
  const cartCount = useCartStore((s) => s.totalItems());
  const favCount = useFavoritesStore((s) => s.count());
  const { user } = useAuth();
  const mounted = typeof window !== 'undefined';
  const [menuOpen, setMenuOpen] = useState(false);

  // On a product detail page the sticky buy-bar takes over the bottom.
  if (/^\/products\/.+/.test(pathname)) return null;

  const accountHref = mounted && user ? (user.role === 'admin' ? '/admin' : '/dashboard') : '/login';

  const tabs: TabItem[] = [
    { href: '/', icon: Home, label: 'Գլխավոր', active: pathname === '/' },
    { href: '/products', icon: List, label: 'Ցանկ', active: pathname.startsWith('/products') },
    {
      href: '/cart',
      icon: ShoppingCart,
      label: 'Զամբյուղ',
      active: pathname.startsWith('/cart'),
      badge: mounted ? cartCount : 0,
      iconAttrs: { 'data-mobile-cart-icon': '' },
    },
    { href: accountHref, icon: User, label: 'Հաշիվ', active: pathname.startsWith('/dashboard') || pathname.startsWith('/admin') },
  ];

  const menuItems: GridMenuItem[] = [
    { href: '/categories', icon: LayoutGrid, label: 'Կատեգորիաներ' },
    { href: '/car-selector', icon: Car, label: 'Ընտրել ավто' },
    { href: '/oem', icon: Hash, label: 'OEM որոնում' },
    { href: '/promotions', icon: Tag, label: 'Ակցիաներ' },
    { href: '/discounts', icon: Percent, label: 'Զեղչեր' },
    { href: '/compare', icon: ArrowLeftRight, label: 'Համեմատել' },
    { href: '/favorites', icon: Heart, label: 'Նախընտրած', badge: mounted ? favCount : 0 },
    { href: '/orders', icon: Package, label: 'Պատվերներ' },
    { href: '/products', icon: Search, label: 'Որոնում' },
  ];

  const openAiChat = () => {
    setMenuOpen(false);
    window.dispatchEvent(new Event('caron:open-ai-chat'));
  };

  return (
    <>
      <BottomTabBar tabs={tabs} fabIcon={LayoutGrid} fabLabel="Մենյու" onFabClick={() => setMenuOpen(true)} />
      <GridMenuSheet
        open={menuOpen}
        onOpenChange={setMenuOpen}
        title="Մենյու"
        items={menuItems}
        feature={<AiMenuBanner onClick={openAiChat} subtitle="Գտեք ճիշտ պահեստամասը արագ" />}
      />
    </>
  );
}
