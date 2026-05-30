'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePaginatedQuery, useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Car, X } from 'lucide-react';
import { Loader, LoaderInline } from '@/components/ui/loader';
import { ProductGridSkeleton } from '@/components/ProductSkeleton';
import { ProductCard } from '@/components/cards/ProductCard';
import { ProductFilters, SortBar } from '@/components/ProductFilters';
import { NAV } from '@/lib/constants';
import { useVehicleStore } from '@/store/vehicle';

const PAGE_SIZE = 20;

export default function ProductsPage() {
  const params = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const vehicle = useVehicleStore((s) => s.vehicle);
  const clearVehicle = useVehicleStore((s) => s.clear);
  const cats = useQuery(api.categories.list, {});
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    if (!params.get('q') && vehicle) setSearch([vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(' '));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [filters, setFilters] = useState<{
    categoryId?: Id<'categories'>; minPrice?: number; maxPrice?: number; inStockOnly?: boolean; onSale?: boolean; minRating?: number; sort?: string; attributes?: Record<string, unknown>;
  }>({});

  const { results, status, loadMore } = usePaginatedQuery(
    api.products.listPaginated,
    {
      search: search || undefined,
      categoryId: filters.categoryId,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      inStockOnly: filters.inStockOnly,
      onSale: filters.onSale,
      minRating: filters.minRating,
      sort: filters.sort as 'newest' | 'priceAsc' | 'priceDesc' | 'popular' | undefined,
      attributes: filters.attributes,
    },
    { initialNumItems: PAGE_SIZE },
  );

  const fchips: { key: string; label: string; clear: () => void }[] = [];
  if (filters.categoryId) fchips.push({ key: 'cat', label: cats?.find((c) => c._id === filters.categoryId)?.name ?? 'Կատեգորիա', clear: () => setFilters({ ...filters, categoryId: undefined, attributes: undefined }) });
  if (filters.onSale) fchips.push({ key: 'sale', label: 'Զեղչված', clear: () => setFilters({ ...filters, onSale: undefined }) });
  if (filters.minRating) fchips.push({ key: 'rating', label: `${filters.minRating}★+`, clear: () => setFilters({ ...filters, minRating: undefined }) });
  if (filters.minPrice) fchips.push({ key: 'min', label: `Գին ≥ ${filters.minPrice}`, clear: () => setFilters({ ...filters, minPrice: undefined }) });
  if (filters.maxPrice) fchips.push({ key: 'max', label: `Գին ≤ ${filters.maxPrice}`, clear: () => setFilters({ ...filters, maxPrice: undefined }) });
  if (filters.inStockOnly) fchips.push({ key: 'stock', label: 'Միայն առկա', clear: () => setFilters({ ...filters, inStockOnly: undefined }) });
  for (const [k, v] of Object.entries(filters.attributes ?? {})) {
    const val = Array.isArray(v) ? v.join(', ') : String(v);
    fchips.push({ key: k, label: `${k}: ${val}`, clear: () => { const a = { ...(filters.attributes ?? {}) }; delete a[k]; setFilters({ ...filters, attributes: Object.keys(a).length ? a : undefined }); } });
  }

  return (
    <div className="mx-auto" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingBlock: 'var(--space-8)' }}>
      <div className="flex flex-col justify-between md:flex-row md:items-center" style={{ gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <h1 className="font-bold" style={{ fontSize: 'var(--text-3xl)' }}>{NAV.catalog}</h1>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder={NAV.search} className="h-10 pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="lg:flex lg:gap-8">
        <ProductFilters onFilterChange={setFilters} activeFilters={filters} />

        <div className="flex-1 min-w-0">
          <div className="mb-5">
            <SortBar activeFilters={filters} onFilterChange={setFilters} />
          </div>
          {mounted && vehicle && (
            <div className="mb-5 flex items-center gap-2 rounded-xl border bg-primary/5 px-4 py-2.5 text-sm">
              <Car className="h-4 w-4 text-primary" />
              <span className="font-medium">{[vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(' ')}</span>
              <button onClick={() => { clearVehicle(); setSearch(''); }} className="ml-auto text-muted-foreground transition-colors hover:text-foreground">{'\u0549\u0565\u0572\u0561\u0580\u056F\u0565\u056C \u2715'}</button>
            </div>
          )}

          {fchips.length > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {fchips.map((c) => (
                <button key={c.key} onClick={c.clear} className="inline-flex items-center gap-1 rounded-full border bg-card px-3 py-1 text-xs transition-colors hover:border-primary/40 hover:text-primary">
                  {c.label} <X className="h-3 w-3" />
                </button>
              ))}
              <button onClick={() => setFilters({ sort: filters.sort })} className="text-xs text-muted-foreground underline-offset-2 hover:underline">{'\u0544\u0561\u0584\u0580\u0565\u056C \u0562\u0578\u056C\u0578\u0580\u0568'}</button>
            </div>
          )}

          <div className="grid" style={{ gap: 'var(--space-5)', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
            {results.map((p, i) => (
              <ProductCard key={p._id} id={p._id} slug={p.slug} name={p.name} price={p.price} compareAtPrice={p.compareAtPrice} image={p.images?.[0]} inStock={p.stock > 0} stock={p.stock} rating={p.rating} reviewCount={p.reviewCount} carBrand={p.attributes?.carBrand} index={i} />
            ))}
          </div>

          {results.length === 0 && status !== 'LoadingFirstPage' && (
            <div className="py-16 text-center text-muted-foreground">{'\u0548\u0579 \u0574\u056B \u0561\u057A\u0580\u0561\u0576\u0584 \u0579\u056B \u0563\u057F\u0576\u057E\u0565\u056C'}</div>
          )}

          {status === 'LoadingFirstPage' && <ProductGridSkeleton />}

          {status === 'CanLoadMore' && (
            <div className="mt-8 flex justify-center">
              <Button variant="outline" size="lg" onClick={() => loadMore(PAGE_SIZE)}>{'\u054F\u0565\u057D\u0576\u0565\u056C \u0561\u057E\u0565\u056C\u056B\u0576'}</Button>
            </div>
          )}

          {status === 'LoadingMore' && <LoaderInline />}
        </div>
      </div>
    </div>
  );
}