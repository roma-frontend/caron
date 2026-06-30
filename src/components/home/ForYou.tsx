'use client';

import { useQuery } from 'convex/react';
import { Sparkles } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { useRecentlyViewedStore } from '@/store/recentlyViewed';
import { ProductRail, type RailProduct } from './ProductRail';
import { useT } from '@/lib/i18n/admin';

/**
 * "Ձեզ համար" — personalized recommendations based on the shopper's recently
 * viewed products. Only shown once there is browsing history, so it feels
 * genuinely personal (discovery is covered by featured / new arrivals).
 */
export function ForYou() {
  const { t } = useT();
  const items = useRecentlyViewedStore((s) => s.items);
  const viewedIds = items.map((i) => i.id) as Id<'products'>[];

  const recommended = useQuery(
    api.products.recommendedFromViewed,
    viewedIds.length > 0 ? { viewedIds, limit: 12 } : 'skip',
  );

  // No browsing history yet → don't render.
  if (viewedIds.length === 0) return null;
  // Avoid reserving skeleton space that could later collapse (CLS): only
  // render once we have a confirmed, non-empty recommendation set.
  if (!recommended || recommended.length === 0) return null;

  return (
    <ProductRail
      title={t('sx.rail.forYou')}
      icon={<Sparkles className="h-5 w-5 text-primary" />}
      products={recommended as RailProduct[]}
      viewAllHref="/products"
    />
  );
}
