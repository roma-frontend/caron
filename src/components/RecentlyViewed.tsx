'use client';

import { useRecentlyViewedStore } from '@/store/recentlyViewed';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { ProductCard } from '@/components/cards/ProductCard';

export function RecentlyViewed() {
  const items = useRecentlyViewedStore((s) => s.items);
  const products = useQuery(api.products.list, {});

  if (items.length === 0) return null;

  const productMap = new Map(products?.map((p) => [p._id as string, p]) ?? []);

  const visible = items.filter((item) => {
    const p = productMap.get(item.id);
    return p && p.isActive && p.stock > 0;
  }).slice(0, 6);

  if (visible.length === 0) return null;

  return (
    <section className="mx-auto w-full" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingBlock: 'var(--space-section)' }}>
      <h2 className="mb-6 text-xl font-bold">{'Վերջերս դիտված ապրանքներ'}</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {visible.map((item, i) => {
          const p = productMap.get(item.id);
          return (
            <ProductCard
              key={item.id}
              id={item.id}
              slug={item.slug}
              name={item.name}
              price={item.price}
              wholesalePrice={p?.wholesalePrice}
              image={p?.images?.[0] ?? item.image}
              stock={p?.stock}
              inStock={(p?.stock ?? 0) > 0}
              index={i}
            />
          );
        })}
      </div>
    </section>
  );
}
