'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { useQuery, usePaginatedQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, LayoutGrid, List, Package, ChevronRight } from 'lucide-react';
import { Loader, LoaderInline } from '@/components/ui/loader';
import { ProductGridSkeleton } from '@/components/ProductSkeleton';
import { ProductCard } from '@/components/cards/ProductCard';
import { ProductFilters, SortBar } from '@/components/ProductFilters';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { useSettings } from '@/hooks/useSettings';

type CategoryFilters = {
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  onSale?: boolean;
  minRating?: number;
  sort?: string;
  attributes?: Record<string, unknown>;
};

export default function CategoryPage() {
  const params = useParams();
  const slug = params.slug as string;
  const category = useQuery(api.categories.getBySlug, { slug });
  const categoryCounts = useQuery(api.categories.listWithCounts, {});
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState<CategoryFilters>({});
  const settings = useSettings();
  const PAGE_SIZE = settings?.productsPerPage || 20;

  const sentinelRef = useRef<HTMLDivElement>(null);

  const { results, status, loadMore } = usePaginatedQuery(
    api.products.listPaginated,
    category ? {
      categoryId: category._id,
      search: search || undefined,
      brand: filters.brand,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      inStockOnly: filters.inStockOnly,
      onSale: filters.onSale,
      minRating: filters.minRating,
      sort: filters.sort as 'newest' | 'priceAsc' | 'priceDesc' | 'popular' | undefined,
      attributes: filters.attributes,
    } : 'skip',
    { initialNumItems: PAGE_SIZE },
  );

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && status === 'CanLoadMore') loadMore(PAGE_SIZE); },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [status, loadMore, PAGE_SIZE]);

  if (!category) return <Loader />;

  const productCount = categoryCounts?.find((c) => c._id === category._id)?.count;

  // Active filter chips (mirrors products page behaviour, minus category since we're inside one)
  const fchips: { key: string; label: string; clear: () => void }[] = [];
  if (filters.brand) fchips.push({ key: 'brand', label: filters.brand, clear: () => setFilters({ ...filters, brand: undefined }) });
  if (filters.onSale) fchips.push({ key: 'sale', label: 'Զեղչված', clear: () => setFilters({ ...filters, onSale: undefined }) });
  if (filters.minRating) fchips.push({ key: 'rating', label: `${filters.minRating}★+`, clear: () => setFilters({ ...filters, minRating: undefined }) });
  if (filters.minPrice) fchips.push({ key: 'min', label: `Գին ≥ ${filters.minPrice}`, clear: () => setFilters({ ...filters, minPrice: undefined }) });
  if (filters.maxPrice) fchips.push({ key: 'max', label: `Գին ≤ ${filters.maxPrice}`, clear: () => setFilters({ ...filters, maxPrice: undefined }) });
  if (filters.inStockOnly) fchips.push({ key: 'stock', label: 'Միայն առկա', clear: () => setFilters({ ...filters, inStockOnly: undefined }) });
  for (const [k, v] of Object.entries(filters.attributes ?? {})) {
    const val = Array.isArray(v) ? v.join(', ') : String(v);
    fchips.push({ key: k, label: val, clear: () => { const a = { ...(filters.attributes ?? {}) }; delete a[k]; setFilters({ ...filters, attributes: Object.keys(a).length ? a : undefined }); } });
  }
  const hasActiveFilters = fchips.length > 0;

  return (
    <div className="mx-auto" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingBlock: 'var(--space-8)' }}>
      <Breadcrumbs items={[{ label: 'Կատեգորիաներ', href: '/categories' }, { label: category.name }]} />

      {/* ── Modern category hero ───────────────────────────────── */}
      <div className="group relative mt-4 mb-8 overflow-hidden rounded-3xl border border-primary/10 bg-linear-to-br from-primary/10 via-card to-muted/40 p-6 shadow-sm sm:p-8">
        {/* Decorative animated orbs */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/15 blur-3xl transition-transform duration-700 group-hover:scale-125" />
        <div className="pointer-events-none absolute -bottom-20 right-1/3 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            {category.imageUrl ? (
              <Image src={category.imageUrl} alt={category.name} width={80} height={80}
                sizes="80px" priority unoptimized={category.imageUrl.startsWith('/api/')}
                className="h-16 w-16 shrink-0 rounded-2xl object-cover shadow-md ring-1 ring-border sm:h-20 sm:w-20" />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-inner sm:h-20 sm:w-20">
                <Package className="h-8 w-8" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{category.name}</h1>
              {category.description && (
                <p className="mt-1 max-w-xl text-sm text-muted-foreground">{category.description}</p>
              )}
              {productCount !== undefined && (
                <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <Package className="h-3.5 w-3.5" />
                  {productCount} ապրանք
                </span>
              )}
            </div>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder={'Որոնել կատեգորիայում...'} className="h-11 rounded-xl pl-9 shadow-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground" aria-label="Մաքրել">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="lg:flex lg:gap-8">
        <ProductFilters categoryId={category._id} onFilterChange={setFilters} activeFilters={filters} />

        <div className="flex-1 min-w-0 pb-24 lg:pb-0">
          {/* Sort + view toggle */}
          <div className="mb-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
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

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {fchips.map((c) => (
                <button key={c.key} onClick={c.clear} className="inline-flex items-center gap-1 rounded-full border bg-card px-3 py-1 text-xs transition-colors hover:border-primary/40 hover:text-primary">
                  {c.label} <X className="h-3 w-3" />
                </button>
              ))}
              <button onClick={() => setFilters({ sort: filters.sort })} className="text-xs text-muted-foreground underline-offset-2 hover:underline">{'Մաքրել ֆիլտրերը'}</button>
            </div>
          )}

          {/* Products */}
          <div
            className={viewMode === 'list' ? 'mx-auto flex max-w-3xl flex-col gap-3' : 'grid'}
            style={viewMode === 'list' ? {} : { gap: 'var(--space-5)', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}
          >
            {results.map((p, i) => (
              <ProductCard key={p._id} id={p._id} slug={p.slug} atgCode={p.atgCode} sku={p.sku} name={p.name} price={p.price} wholesalePrice={p.wholesalePrice} compareAtPrice={p.compareAtPrice} retailDiscount={p.retailDiscount} wholesaleDiscount={p.wholesaleDiscount} image={p.images?.[0]} inStock={p.stock > 0} stock={p.stock} rating={p.rating} reviewCount={p.reviewCount} carBrand={p.attributes?.carBrand} qtyStep={p.qtyStep} attributes={p.attributes} index={i} compact={viewMode === 'list'} lite />
            ))}
          </div>

          {results.length === 0 && status !== 'LoadingFirstPage' && (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Package className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">{'Ոչ մի ապրանք չի գտնվել'}</p>
              {(hasActiveFilters || search) && (
                <Button variant="outline" size="sm" className="rounded-full" onClick={() => { setFilters({ sort: filters.sort }); setSearch(''); }}>
                  Մաքրել ֆիլտրերը <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}

          {status === 'LoadingFirstPage' && <ProductGridSkeleton count={PAGE_SIZE} />}

          <div ref={sentinelRef} />
          {status === 'LoadingMore' && <LoaderInline />}
        </div>
      </div>
    </div>
  );
}
