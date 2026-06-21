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
  }).slice(0, 4);

  if (visible.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-[var(--container-max)] sm:px-[var(--space-container)] py-[var(--space-section)]">
      <h2 className="mb-6 text-xl font-bold px-4 sm:px-0">{'Վերջերս դիտված ապրանքներ'}</h2>
      <div className="grid grid-cols-2 gap-1 sm:gap-3 lg:grid-cols-4">
        {visible.map((item, i) => {
          const p = productMap.get(item.id);
          return (
            <ProductCard
              key={item.id}
              id={item.id}
              slug={item.slug}
              atgCode={p?.atgCode}
              sku={p?.sku}
              name={item.name}
              price={item.price}
              wholesalePrice={p?.wholesalePrice}
              retailDiscount={p?.retailDiscount}
              wholesaleDiscount={p?.wholesaleDiscount}
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
