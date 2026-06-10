'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, usePaginatedQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Input } from '@/components/ui/input';
import { Search, ArrowLeft } from 'lucide-react';
import { Loader, LoaderInline } from '@/components/ui/loader';
import { ProductGridSkeleton } from '@/components/ProductSkeleton';
import { ProductCard } from '@/components/cards/ProductCard';
import { ProductFilters } from '@/components/ProductFilters';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import Link from 'next/link';

const PAGE_SIZE = 20;

export default function CategoryPage() {
  const params = useParams();
  const slug = params.slug as string;
  const category = useQuery(api.categories.getBySlug, { slug });
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<{
    minPrice?: number; maxPrice?: number; inStockOnly?: boolean; sort?: string; attributes?: Record<string, unknown>;
  }>({});

  const sentinelRef = useRef<HTMLDivElement>(null);

  const { results, status, loadMore } = usePaginatedQuery(
    api.products.listPaginated,
    category ? {
      categoryId: category._id,
      search: search || undefined,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      inStockOnly: filters.inStockOnly,
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
  }, [status, loadMore]);

  if (!category) return <Loader />;

  return (
    <div className="mx-auto" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingBlock: 'var(--space-8)' }}>
      <div className="mb-6">
        <Breadcrumbs items={[{ label: 'Կատեգորիաներ', href: '/categories' }, { label: category.name }]} />
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold">{category.name}</h1>
            {category.description && <p className="mt-1 text-muted-foreground">{category.description}</p>}
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder={'Որոնել...'} className="h-10 pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="lg:flex lg:gap-8">
        <ProductFilters categoryId={category._id} onFilterChange={setFilters} activeFilters={filters} />

        <div className="flex-1 min-w-0">
        <div className="grid" style={{ gap: 'var(--space-5)', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
        {results.map((p, i) => (
          <ProductCard key={p._id} id={p._id} slug={p.slug} atgCode={p.atgCode} name={p.name} price={p.price} wholesalePrice={p.wholesalePrice} compareAtPrice={p.compareAtPrice} image={p.images?.[0]} inStock={p.stock > 0} stock={p.stock} rating={p.rating} reviewCount={p.reviewCount} carBrand={p.attributes?.carBrand} attributes={p.attributes} index={i} />
        ))}
      </div>

      {results.length === 0 && status !== 'LoadingFirstPage' && (
        <div className="py-16 text-center text-muted-foreground">{'Ոչ մի ապրանք չի գտնվել'}</div>
      )}

      {status === 'LoadingFirstPage' && <ProductGridSkeleton />}

      <div ref={sentinelRef} />
      {status === 'LoadingMore' && <LoaderInline />}
        </div>
      </div>
    </div>
  );
}
