'use client';

import { useQuery } from 'convex/react';
import { Sparkle } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { ProductRail, type RailProduct } from './ProductRail';

/**
 * "Նորույթներ" — newest products. `products.list` returns active products
 * ordered by creation (newest first); we keep only in-stock ones.
 */
export function NewArrivals() {
  const products = useQuery(api.products.list, { limit: 16 });

  const inStock = products?.filter((p) => p.stock > 0).slice(0, 12);

  if (inStock && inStock.length < 3) return null;

  return (
    <ProductRail
      title="Նորույթներ"
      icon={<Sparkle className="h-5 w-5 text-primary" />}
      products={inStock as RailProduct[] | undefined}
      viewAllHref="/products?sort=newest"
      asNew
    />
  );
}
