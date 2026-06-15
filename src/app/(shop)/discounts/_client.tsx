'use client';

import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { ProductCard } from '@/components/cards/ProductCard';
import { useState, useMemo } from 'react';
import { Flame, SlidersHorizontal, TrendingDown, Clock, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

type SortKey = 'discount' | 'price_asc' | 'price_desc' | 'newest';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'discount', label: 'Մեծ զեղչ' },
  { key: 'price_asc', label: 'Էժան' },
  { key: 'price_desc', label: 'Թանկ' },
  { key: 'newest', label: 'Նոր' },
];

export default function DiscountsClient() {
  const currentUser = useAuthStore((s) => s.user);
  const isWholesale = currentUser?.customerType === 'wholesale' && currentUser?.role !== 'admin';

  const retailProducts = useQuery(api.products.getRetailDiscounted, isWholesale ? 'skip' : {});
  const wholesaleProducts = useQuery(api.products.getWholesaleDiscounted, isWholesale ? {} : 'skip');
  const products = isWholesale ? wholesaleProducts : retailProducts;

  const [sort, setSort] = useState<SortKey>('discount');

  const sorted = useMemo(() => {
    if (!products) return [];
    return [...products].sort((a, b) => {
      if (sort === 'discount') return isWholesale
        ? (b.wholesaleDiscount ?? 0) - (a.wholesaleDiscount ?? 0)
        : (b.retailDiscount ?? 0) - (a.retailDiscount ?? 0);
      if (sort === 'price_asc') return a.price - b.price;
      if (sort === 'price_desc') return b.price - a.price;
      return b._creationTime - a._creationTime;
    });
  }, [products, sort]);

  const maxDiscount = products ? Math.max(...products.map((p) => isWholesale ? (p.wholesaleDiscount ?? 0) : (p.retailDiscount ?? 0))) : 0;

  return (
    <div className="min-h-screen">
      {/* ── Hero banner ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-destructive via-destructive/80 to-orange-500 py-14 text-white">
        {/* decorative blobs */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 right-10 h-56 w-56 rounded-full bg-black/10 blur-2xl" />

        <div className="relative mx-auto max-w-[var(--container-max)] px-[var(--space-container)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-widest backdrop-blur-sm">
                <Flame className="h-3.5 w-3.5 animate-pulse" /> Հատուկ առաջարկ
              </div>
              <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Զեղ&shy;չեր</h1>
              <p className="mt-2 max-w-sm text-white/70 text-sm">
                Ավտոպահեստամասեր՝ հատուկ գներով։ Մի բաց թողեք հնարավորությունը։
              </p>
            </div>

            {/* stat pills */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-2xl bg-white/15 px-4 py-2.5 backdrop-blur-sm">
                <TrendingDown className="h-5 w-5" />
                <div>
                  <div className="text-xs text-white/70">Ընդհանուր</div>
                  <div className="text-xl font-black">{products?.length ?? '—'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-white/15 px-4 py-2.5 backdrop-blur-sm">
                <Percent className="h-5 w-5" />
                <div>
                  <div className="text-xs text-white/70">Մաքս. զեղչ</div>
                  <div className="text-xl font-black">{maxDiscount > 0 ? `${maxDiscount}%` : '—'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-white/15 px-4 py-2.5 backdrop-blur-sm">
                <Clock className="h-5 w-5" />
                <div>
                  <div className="text-xs text-white/70">Կարգավիճակ</div>
                  <div className="text-sm font-bold">Ակտիվ</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sort bar ── */}
      <div className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[var(--container-max)] items-center gap-2 overflow-x-auto px-[var(--space-container)] py-3 scrollbar-none">
          <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="shrink-0 text-xs text-muted-foreground mr-1">Դասավորել՝</span>
          {SORTS.map((s) => (
            <Button
              key={s.key}
              size="sm"
              variant={sort === s.key ? 'default' : 'outline'}
              className={cn('shrink-0 rounded-full text-xs h-8', sort === s.key && 'bg-destructive hover:bg-destructive/90 border-destructive')}
              onClick={() => setSort(s.key)}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="mx-auto max-w-[var(--container-max)] px-[var(--space-container)] py-8">
        {products === undefined ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl bg-muted" style={{ height: '18rem' }} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center py-32 text-center">
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-destructive/10">
              <Flame className="h-10 w-10 text-destructive/40" />
            </div>
            <p className="text-xl font-bold">Ակտիվ զեղչեր չկան</p>
            <p className="mt-2 text-sm text-muted-foreground">Ստուգեք ավելի ուշ — շուտով կլինեն</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {sorted.map((p, i) => (
              <ProductCard
                key={p._id}
                id={p._id}
                slug={p.slug}
                name={p.name}
                price={p.price}
                wholesalePrice={p.wholesalePrice}
                retailDiscount={p.retailDiscount}
                wholesaleDiscount={p.wholesaleDiscount}
                image={p.images?.[0]}
                inStock={p.stock > 0}
                stock={p.stock}
                sku={p.sku}
                atgCode={p.atgCode}
                qtyStep={p.qtyStep}
                rating={p.rating}
                reviewCount={p.reviewCount}
                attributes={p.attributes as Record<string, unknown>}
                index={i}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
