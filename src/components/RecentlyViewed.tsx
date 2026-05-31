'use client';

import { useRecentlyViewedStore } from '@/store/recentlyViewed';
import { ProductCard } from '@/components/cards/ProductCard';

export function RecentlyViewed() {
  const items = useRecentlyViewedStore((s) => s.items);
  if (items.length === 0) return null;

  return (
    <section className="mx-auto" style={{ maxWidth: 'var(--container-max)' }}>
      <h2 className="mb-6 text-xl font-bold">{'Վերջերս դիտված ապրանքներ'}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {items.slice(0, 6).map((item, i) => (
          <ProductCard key={item.id} id={item.id} slug={item.slug} name={item.name} price={item.price} image={item.image} index={i} />
        ))}
      </div>
    </section>
  );
}
