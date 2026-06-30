'use client';

import { useQuery } from 'convex/react';
import { Sparkle } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { ProductRail, type RailProduct } from './ProductRail';
import { useT } from '@/lib/i18n/admin';

export function NewArrivals() {
  const { t } = useT();
  const products = useQuery(api.products.listCards, { limit: 16 });
  const inStock = products?.filter((p) => p.stock > 0).slice(0, 12);

  // Don't reserve skeleton space until we know the section will actually
  // render. A skeleton that later collapses to `null` shifts everything below
  // it (incl. the footer) and was the main source of CLS on the home page.
  if (!inStock || inStock.length < 3) return null;

  return (
    <ProductRail
      title={t('sx.rail.newArrivals')}
      icon={<Sparkle className="h-5 w-5 text-primary" />}
      products={inStock as RailProduct[]}
      viewAllHref="/products?sort=newest"
      asNew
    />
  );
}
