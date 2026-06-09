'use client';

import { useState, useSyncExternalStore, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { usePaginatedQuery, useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Car, X, LayoutGrid, List } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { LoaderInline } from '@/components/ui/loader';
import { ProductGridSkeleton } from '@/components/ProductSkeleton';
import { ProductCard } from '@/components/cards/ProductCard';
import { ProductFilters, SortBar } from '@/components/ProductFilters';
import { NAV } from '@/lib/constants';
import { useVehicleStore } from '@/store/vehicle';

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export default function ProductsPage() {
  const params = useSearchParams();
  const router = useRouter();
  const settings = useSettings();
  const PAGE_SIZE = settings?.productsPerPage || 20;
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(settings?.defaultViewMode || 'grid');
  const vehicle = useVehicleStore((s) => s.vehicle);
  const [search, setSearch] = useState(() => {
    const q = params.get('q');
    if (q) return q;
    if (vehicle) return [vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(' ');
    return '';
  });
  const clearVehicle = useVehicleStore((s) => s.clear);
  const cats = useQuery(api.categories.list, {});
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const urlBrand = params.get('brand');
  const [filters, setFilters] = useState<{
    categoryId?: Id<'categories'>; brand?: string; minPrice?: number; maxPrice?: number; inStockOnly?: boolean; onSale?: boolean; minRating?: number; sort?: string; attributes?: Record<string, unknown>;
  }>({});
  const filterDefs = useQuery(api.filters.getByCategory, filters.categoryId ? { categoryId: filters.categoryId as Id<'categories'> } : 'skip');

  /** Clear URL brand param without page reload */
  const clearUrlBrand = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('brand');
    window.history.replaceState(null, '', url.toString());
  };

  const isVehicleSearch = !!vehicle && (search?.includes(vehicle.brand) || !!params.get('q'));
  const activeBrand = filters.brand || urlBrand || undefined;
  const [brandLoading, setBrandLoading] = useState(false);
  const brandTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const prevBrand = useRef(activeBrand);
  useEffect(() => {
    if (prevBrand.current !== activeBrand) {
      prevBrand.current = activeBrand;
      setBrandLoading(true);
      clearTimeout(brandTimer.current);
      brandTimer.current = setTimeout(() => setBrandLoading(false), 400);
    }
  }, [activeBrand]);

  /** Detect products matching the brand for auto-category */
  const brandProducts = useQuery(api.customers.getByBrand, urlBrand ? { brand: urlBrand } : 'skip');

  const { results, status, loadMore } = usePaginatedQuery(
    api.products.listPaginated,
    {
      search: isVehicleSearch ? undefined : (search || undefined),
      categoryId: filters.categoryId,
      brand: activeBrand,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      inStockOnly: filters.inStockOnly,
      onSale: filters.onSale,
      minRating: filters.minRating,
      sort: filters.sort as 'newest' | 'priceAsc' | 'priceDesc' | 'popular' | undefined,
      attributes: isVehicleSearch
        ? { ...(filters.attributes ?? {}), carBrand: vehicle.brand }
        : filters.attributes,
    },
    { initialNumItems: PAGE_SIZE },
  );

  // Auto-select category when brand is set from URL
  const [autoCatted, setAutoCatted] = useState(false);
  if (!autoCatted && urlBrand && !filters.categoryId && brandProducts && cats) {
    const catCount: Record<string, number> = {};
    for (const p of brandProducts) {
      if (p.categoryId) catCount[p.categoryId] = (catCount[p.categoryId] || 0) + 1;
    }
    const best = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (best) {
      setFilters((f) => ({ ...f, categoryId: best as Id<'categories'> }));
    }
    setAutoCatted(true);
  }

  const fchips: { key: string; label: string; clear: () => void }[] = [];
  if (activeBrand) fchips.push({ key: 'brand', label: `${activeBrand}`, clear: () => { setFilters({ ...filters, brand: undefined }); clearUrlBrand(); } });
  if (filters.categoryId) fchips.push({ key: 'cat', label: cats?.find((c) => c._id === filters.categoryId)?.name ?? 'Կատեգորիա', clear: () => setFilters({ ...filters, categoryId: undefined, attributes: undefined }) });
  if (filters.onSale) fchips.push({ key: 'sale', label: 'Զեղչված', clear: () => setFilters({ ...filters, onSale: undefined }) });
  if (filters.minRating) fchips.push({ key: 'rating', label: `${filters.minRating}★+`, clear: () => setFilters({ ...filters, minRating: undefined }) });
  if (filters.minPrice) fchips.push({ key: 'min', label: `Գին ≥ ${filters.minPrice}`, clear: () => setFilters({ ...filters, minPrice: undefined }) });
  if (filters.maxPrice) fchips.push({ key: 'max', label: `Գին ≤ ${filters.maxPrice}`, clear: () => setFilters({ ...filters, maxPrice: undefined }) });
  if (filters.inStockOnly) fchips.push({ key: 'stock', label: 'Միայն առկա', clear: () => setFilters({ ...filters, inStockOnly: undefined }) });
  for (const [k, v] of Object.entries(filters.attributes ?? {})) {
    const val = Array.isArray(v) ? v.join(', ') : String(v);
    fchips.push({ key: k, label: val, clear: () => { const a = { ...(filters.attributes ?? {}) }; delete a[k]; setFilters({ ...filters, attributes: Object.keys(a).length ? a : undefined }); } });
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
          <div className="mb-5 flex flex-col items-start sm:items-center justify-between gap-3">
            <SortBar activeFilters={filters} onFilterChange={setFilters} />
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => setViewMode('grid')} className={`rounded-lg p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent'}`} aria-label="Grid">
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button onClick={() => setViewMode('list')} className={`rounded-lg p-1.5 transition-colors ${viewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent'}`} aria-label="List">
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
          {filterDefs && filterDefs.length > 0 && (
            <div className="mb-4 space-y-2 rounded-xl border border-primary/15 bg-linear-to-br from-card via-primary/5 to-muted/40 p-4 shadow-sm backdrop-blur-sm">
              {filterDefs.filter((def) => def.slug === 'type' || def.name === 'Տեսակ').map((def) => {
                const active = (filters.attributes?.[def.slug] as string[]) || [];
                return (
                  <div key={def._id} className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground mr-1">{def.name}:</span>
                    {def.options?.map((opt) => {
                      const isActive = active.includes(opt);
                      return (
                        <button key={opt} onClick={() => {
                          const next = isActive ? active.filter((v) => v !== opt) : [...active, opt];
                          const attrs = { ...(filters.attributes ?? {}) };
                          if (next.length > 0) attrs[def.slug] = next;
                          else delete attrs[def.slug];
                          setFilters({ ...filters, attributes: Object.keys(attrs).length > 0 ? attrs : undefined });
                        }}
                          className={`rounded-full border px-3 py-1 text-xs transition-all duration-300 hover:scale-105 ${isActive ? 'border-transparent bg-linear-to-r from-primary to-primary/80 text-primary-foreground shadow-sm' : 'bg-linear-to-r from-card to-muted/60 text-muted-foreground hover:border-primary/35 hover:text-primary hover:from-primary/10 hover:to-primary/5'}`}>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
          {mounted && vehicle && (
            <div className="mb-5 flex items-center gap-2 rounded-xl border bg-primary/5 px-4 py-2.5 text-sm">
              <Car className="h-4 w-4 text-primary" />
              <span className="font-medium">{[vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(' ')}</span>
              <button onClick={() => { clearVehicle(); setSearch(''); }} className="ml-auto text-muted-foreground transition-colors hover:text-foreground">{'Մաքրել'}</button>
            </div>
          )}

          {filters.categoryId || activeBrand || Object.keys(filters.attributes ?? {}).length > 0 || filters.onSale || filters.minRating || filters.minPrice || filters.maxPrice || filters.inStockOnly ? (
            <div className="mb-5 space-y-3">
              {filters.categoryId && (
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold tracking-tight">{cats?.find((c) => c._id === filters.categoryId)?.name ?? 'Կատեգորիա'}</h2>
                  <button onClick={() => setFilters({ ...filters, categoryId: undefined, attributes: undefined })} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                    <X className="h-3.5 w-3.5 inline" />
                  </button>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {fchips.filter((c) => c.key !== 'cat').map((c) => (
                  <button key={c.key} onClick={c.clear} className="inline-flex items-center gap-1 rounded-full border bg-card px-3 py-1 text-xs transition-colors hover:border-primary/40 hover:text-primary">
                    {c.label} <X className="h-3 w-3" />
                  </button>
                ))}
                <button onClick={() => { setFilters({ sort: filters.sort }); clearUrlBrand(); }} className="text-xs text-muted-foreground underline-offset-2 hover:underline">{'Մաքրել ֆիլտրերը'}</button>
              </div>
            </div>
          ) : null}

          {!brandLoading && (
            <div className={viewMode === 'list' ? 'mx-auto max-w-3xl flex flex-col gap-3' : 'grid'} style={viewMode === 'list' ? {} : { gap: 'var(--space-5)', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
              {results.map((p, i) => (
                <ProductCard key={p._id} id={p._id} slug={p.slug} name={p.name} price={p.price} wholesalePrice={p.wholesalePrice} compareAtPrice={p.compareAtPrice} image={p.images?.[0]} inStock={p.stock > 0} stock={p.stock} rating={p.rating} reviewCount={p.reviewCount} carBrand={p.attributes?.carBrand} qtyStep={p.qtyStep} attributes={p.attributes} index={i} compact={viewMode === 'list'} />
              ))}
            </div>
          )}

          {!brandLoading && results.length === 0 && status !== 'LoadingFirstPage' && (
            <div className="py-16 text-center text-muted-foreground">{'Ոչ մի ապրանք չի գտնվել'}</div>
          )}

          {(status === 'LoadingFirstPage' || brandLoading) && <ProductGridSkeleton />}

          {status === 'CanLoadMore' && (
            <div className="mt-8 flex justify-center">
              <Button variant="outline" size="lg" onClick={() => loadMore(PAGE_SIZE)}>{'Բեռնել ավելի շատ ապրանքներ'}</Button>
            </div>
          )}

          {status === 'LoadingMore' && <LoaderInline />}
        </div>
      </div>
    </div>
  );
}