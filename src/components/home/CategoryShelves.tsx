'use client';

import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { ProductRail, type RailProduct } from './ProductRail';
import { useCategoryName } from '@/lib/i18n/filterNames';

/** One category's product shelf. Auto-hides when it has too few products. */
function CategoryShelf({ categoryId, name, slug }: { categoryId: Id<'categories'>; name: string; slug: string }) {
  const products = useQuery(api.products.listCards, { categoryId, limit: 16 });
  const inStock = products?.filter((p) => p.stock > 0).slice(0, 12);

  // Loaded but not enough to justify a shelf → render nothing.
  if (inStock && inStock.length < 3) return null;

  return (
    <ProductRail
      title={name}
      products={inStock as RailProduct[] | undefined}
      viewAllHref={`/categories/${slug}`}
      skeletonCount={6}
    />
  );
}

/**
 * Category shelves (OZON-style): a horizontal product rail for each of the top
 * categories. Rendering a different number of children once categories load is
 * fine — hook rules apply per-component, and each shelf owns its own query.
 */
export function CategoryShelves({ limit = 4 }: { limit?: number }) {
  const categories = useQuery(api.categories.list, {});
  const catName = useCategoryName();
  if (!categories) return null;

  return (
    <>
      {categories.slice(0, limit).map((c) => (
        <CategoryShelf key={c._id} categoryId={c._id} name={catName(c)} slug={c.slug} />
      ))}
    </>
  );
}
