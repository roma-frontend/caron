'use client';

import { useQuery } from 'convex/react';
import { Sparkle } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { ProductRail, type RailProduct } from './ProductRail';

export function NewArrivals() {
  const products = useQuery(api.products.list, { limit: 16 });
  const inStock = products?.filter((p) => p.stock > 0).slice(0, 12);

  if (inStock && inStock.length < 3) return null;

  return (
    <ProductRail
      title={"\u0546\u0578\u0580\u0578\u0582\u0575\u0569\u0576\u0565\u0580"}
      icon={<Sparkle className="h-5 w-5 text-primary" />}
      products={inStock as RailProduct[] | undefined}
      viewAllHref="/products?sort=newest"
      asNew
    />
  );
}
