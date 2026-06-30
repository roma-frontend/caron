'use client';

import { useQuery } from 'convex/react';
import { Flame } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { ProductRail, type RailProduct } from './ProductRail';
import { useT } from '@/lib/i18n/admin';

/**
 * "Բեսթսելլերներ" — real bestsellers ranked by quantity sold across orders
 * (products.getBestsellers). Auto-hides when there are no sales yet.
 */
export function Bestsellers() {
  const { t } = useT();
  const products = useQuery(api.products.getBestsellers, { limit: 12 });

  // Only reserve space once we know the rail will render — prevents a
  // skeleton→null collapse that shifts the footer (CLS).
  if (!products || products.length < 3) return null;

  return (
    <ProductRail
      title={t('sx.rail.bestsellers')}
      icon={<Flame className="h-5 w-5 text-destructive" />}
      products={products as RailProduct[]}
      viewAllHref="/products?sort=popular"
      asHit
    />
  );
}
