'use client';

import { useRecentlyViewedStore } from '@/store/recentlyViewed';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { ProductCard } from '@/components/cards/ProductCard';

export function RecentlyViewed() {
  const items = useRecentlyViewedStore((s) => s.items);

  const ids = items.slice(0, 6).map((i) => i.id);
  const products = useQuery(api.products.list, {});

  if (items.length === 0) return null;

  const getImage = (id: string, fallback: string | null) => {
    if (!products) return fallback;
    const p = products.find((pr) => pr._id === id);
    return p?.images?.[0] ?? fallback;
  };

  return (
    <section className="mx-auto" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingBlock: 'var(--space-8)' }}>
      <h2 className="mb-6 text-xl font-bold">{'Վերջերս դիտված ապրանքներ'}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {items.slice(0, 6).map((item, i) => (
          <ProductCard key={item.id} id={item.id} slug={item.slug} name={item.name} price={item.price} image={getImage(item.id, item.image)} index={i} />
        ))}
      </div>
    </section>
  );
}
