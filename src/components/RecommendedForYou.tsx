'use client';

import { useQuery } from 'convex/react';
import { useMemo } from 'react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useRecentlyViewedStore } from '@/store/recentlyViewed';
import { ProductCard } from '@/components/cards/ProductCard';
import { useT } from '@/lib/i18n/admin';

/**
 * "Подобрано для вас" — personalized grid based on the shopper's
 * recently-viewed categories (falls back to featured when no history).
 */
export function RecommendedForYou({ title, limit = 8 }: { title?: string; limit?: number }) {
  const { t } = useT();
  const resolved = title ?? t('sx.rail.forYou');
  const items = useRecentlyViewedStore((s) => s.items);
  const ids = useMemo(() => items.map((i) => i.id) as Id<'products'>[], [items]);
  const products = useQuery(api.products.recommendedFromViewed, { viewedIds: ids, limit });

  if (!products || products.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="mb-6 text-xl font-bold px-4 sm:px-0">{resolved}</h2>
      <div className="grid grid-cols-[repeat(var(--grid-cols),minmax(0,1fr))] [--grid-cols:2] md:[--grid-cols:3] lg:[--grid-cols:4] gap-4">
        {products.map((p, i) => (
          <ProductCard key={p._id} id={p._id} slug={p.slug} atgCode={p.atgCode} sku={p.sku} name={p.name} nameRu={p.nameRu} nameEn={p.nameEn} price={p.price} wholesalePrice={p.wholesalePrice} compareAtPrice={p.compareAtPrice} retailDiscount={p.retailDiscount} wholesaleDiscount={p.wholesaleDiscount} image={p.images?.[0]} inStock={p.stock > 0} stock={p.stock} qtyStep={p.qtyStep} rating={p.rating} reviewCount={p.reviewCount} carBrand={p.attributes?.carBrand} attributes={p.attributes} index={i} />
        ))}
      </div>
    </section>
  );
}
