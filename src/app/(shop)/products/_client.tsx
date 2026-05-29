'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePaginatedQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { Loader, LoaderInline } from '@/components/ui/loader';
import { ProductGridSkeleton } from '@/components/ProductSkeleton';
import { ProductCard } from '@/components/cards/ProductCard';
import { ProductFilters } from '@/components/ProductFilters';
import { NAV } from '@/lib/constants';

const PAGE_SIZE = 20;

export default function ProductsPage() {
  const params = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [filters, setFilters] = useState<{
    minPrice?: number; maxPrice?: number; inStockOnly?: boolean; sort?: string; attributes?: Record<string, unknown>;
  }>({});

  const { results, status, loadMore } = usePaginatedQuery(
    api.products.listPaginated,
    {
      search: search || undefined,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      inStockOnly: filters.inStockOnly,
      sort: filters.sort as 'newest' | 'priceAsc' | 'priceDesc' | 'popular' | undefined,
      attributes: filters.attributes,
    },
    { initialNumItems: PAGE_SIZE },
  );

  return (
    <div className="mx-auto" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingBlock: 'var(--space-8)' }}>
      <div className="flex flex-col justify-between md:flex-row md:items-center" style={{ gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <h1 className="font-bold" style={{ fontSize: 'var(--text-3xl)' }}>{NAV.catalog}</h1>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder={NAV.search} className="h-10 pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <ProductFilters onFilterChange={setFilters} activeFilters={filters} />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4" style={{ gap: 'var(--space-5)' }}>
        {results.map((p, i) => (
          <ProductCard key={p._id} id={p._id} slug={p.slug} name={p.name} price={p.price} compareAtPrice={p.compareAtPrice} image={p.images?.[0]} inStock={p.stock > 0} stock={p.stock} index={i} />
        ))}
      </div>

      {results.length === 0 && status !== 'LoadingFirstPage' && (
        <div className="py-16 text-center text-muted-foreground">{'Ոչ մի ապրանք չի գտնվել'}</div>
      )}

      {status === 'LoadingFirstPage' && <ProductGridSkeleton />}

      {status === 'CanLoadMore' && (
        <div className="mt-8 flex justify-center">
          <Button variant="outline" size="lg" onClick={() => loadMore(PAGE_SIZE)}>{'Տեսնել ավելին'}</Button>
        </div>
      )}

      {status === 'LoadingMore' && <LoaderInline />}
    </div>
  );
}
