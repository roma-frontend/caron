'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, ShoppingCart, Heart, User } from 'lucide-react';
import { useCartStore } from '@/store/cart';
import { useFavoritesStore } from '@/store/favorites';
import { useAuth } from '@/store/auth';

const ITEMS = [
  { href: '/', icon: Home, label: 'Գլխավոր' },
  { href: '/products', icon: LayoutGrid, label: 'Ցանկ' },
  { href: '/cart', icon: ShoppingCart, label: 'Զամբյուղ', badge: 'cart' as const },
  { href: '/favorites', icon: Heart, label: 'Նախ.', badge: 'fav' as const },
  { href: '/account', icon: User, label: 'Հաշիվ', auth: true },
];

export function MobileNav() {
  const pathname = usePathname();
  const cartCount = useCartStore((s) => s.totalItems());
  const favCount = useFavoritesStore((s) => s.count());
  const { user } = useAuth();
  const mounted = typeof window !== 'undefined';

  // On a product detail page the sticky buy-bar takes over the bottom.
  if (/^\/products\/.+/.test(pathname)) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t bg-background/95 backdrop-blur-md lg:hidden" style={{ height: 'calc(4rem + env(safe-area-inset-bottom, 0px))', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {ITEMS.map((item) => {
        const href = item.auth ? (mounted && user ? '/admin' : '/login') : item.href;
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
        const count = mounted ? (item.badge === 'cart' ? cartCount : item.badge === 'fav' ? favCount : 0) : 0;
        return (
          <Link key={item.label} href={href} className={`relative flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors ${active ? 'text-primary' : 'text-muted-foreground'}`}>
            <item.icon className="h-5 w-5" />
            {item.label}
            {count > 0 && <span className="absolute left-1/2 -translate-x-1/2 top-1 ml-3 rounded-full bg-primary px-1 min-w-[14px] text-[8px] font-bold text-primary-foreground leading-[14px] text-center">{count}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
