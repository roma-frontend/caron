'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import {
  Package, FolderTree, Ticket, ShoppingBag, Users, LayoutDashboard,
  Warehouse, BarChart3, Plus,
} from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import {
  Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { useAdminT } from '@/lib/i18n/admin';

interface AdminCommandPaletteProps {
  sessionToken: string | null;
}

const QUICK_ACTIONS = [
  { labelKey: 'palette.addProduct', href: '/admin/products/add', icon: Package },
  { labelKey: 'palette.addCategory', href: '/admin/categories/add', icon: FolderTree },
  { labelKey: 'nav.coupons', href: '/admin/promotions/coupons', icon: Ticket },
];

const SECTIONS = [
  { labelKey: 'nav.dashboard', href: '/admin', icon: LayoutDashboard },
  { labelKey: 'nav.products', href: '/admin/products', icon: Package },
  { labelKey: 'nav.orders', href: '/admin/orders', icon: ShoppingBag },
  { labelKey: 'nav.customers', href: '/admin/customers', icon: Users },
  { labelKey: 'nav.stock', href: '/admin/stock', icon: Warehouse },
  { labelKey: 'nav.analytics', href: '/admin/analytics', icon: BarChart3 },
];

/**
 * Global ⌘K / Ctrl+K command palette for the admin. Searches products, orders
 * and customers server-side (api.admin.commandSearch) and offers quick-create
 * actions + section navigation. Opens on the keyboard shortcut or the
 * `caron:open-command-palette` window event (fired by the profile menu).
 */
export function AdminCommandPalette({ sessionToken }: AdminCommandPaletteProps) {
  const { t } = useAdminT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  // Open via keyboard shortcut and custom event.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpen = () => setOpen(true);
    document.addEventListener('keydown', onKey);
    window.addEventListener('caron:open-command-palette', onOpen);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('caron:open-command-palette', onOpen);
    };
  }, []);

  // Reset query when closed.
  useEffect(() => { if (!open) setQuery(''); }, [open]);

  const term = query.trim();
  const results = useQuery(
    api.admin.commandSearch,
    sessionToken && term.length >= 2 ? { sessionToken, query: term } : 'skip',
  );

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const hasResults = results && (results.products.length || results.orders.length || results.customers.length);

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title={t('palette.title')}
      description={t('palette.description')}
    >
      <Command shouldFilter={false}>
        <CommandInput
          placeholder={t('palette.placeholder')}
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
        {term.length >= 2 && !hasResults && (
          <CommandEmpty>{t('palette.empty')}</CommandEmpty>
        )}

        {term.length < 2 && (
          <>
            <CommandGroup heading={t('palette.quickActions')}>
              {QUICK_ACTIONS.map((a) => (
                <CommandItem key={a.href} value={t(a.labelKey)} onSelect={() => go(a.href)}>
                  <span className="relative flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <a.icon className="h-4 w-4" />
                    <Plus className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-primary text-primary-foreground" />
                  </span>
                  {t(a.labelKey)}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading={t('palette.sections')}>
              {SECTIONS.map((s) => (
                <CommandItem key={s.href} value={t(s.labelKey)} onSelect={() => go(s.href)}>
                  <s.icon className="h-4 w-4 text-muted-foreground" />
                  {t(s.labelKey)}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {results && results.products.length > 0 && (
          <CommandGroup heading={t('palette.products')}>
            {results.products.map((p) => (
              <CommandItem key={p.id} value={`p-${p.id}`} onSelect={() => go(p.href)}>
                <Package className="h-4 w-4 text-muted-foreground" />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate">{p.title}</span>
                  {p.subtitle && <span className="truncate text-xs text-muted-foreground">{p.subtitle}</span>}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results && results.orders.length > 0 && (
          <CommandGroup heading={t('palette.orders')}>
            {results.orders.map((o) => (
              <CommandItem key={o.id} value={`o-${o.id}`} onSelect={() => go(o.href)}>
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate">{o.title}</span>
                  {o.subtitle && <span className="truncate text-xs text-muted-foreground">{o.subtitle}</span>}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results && results.customers.length > 0 && (
          <CommandGroup heading={t('palette.customers')}>
            {results.customers.map((c) => (
              <CommandItem key={c.id} value={`c-${c.id}`} onSelect={() => go(c.href)}>
                <Users className="h-4 w-4 text-muted-foreground" />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate">{c.title}</span>
                  {c.subtitle && <span className="truncate text-xs text-muted-foreground">{c.subtitle}</span>}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
      </Command>
    </CommandDialog>
  );
}
