'use client';

import { useFavoritesStore } from '@/store/favorites';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { ProductCard } from '@/components/cards/ProductCard';
import type { Doc } from '../../../../convex/_generated/dataModel';

export default function FavoritesPage() {
  const items = useFavoritesStore((s) => s.items);

  // Load full product data for all favorites
  const products = useQuery(
    api.products.listAll,
    {}
  );

  const fullProducts = products?.filter((p: Doc<"products">) => items.some(i => i.id === p._id));

  if (items.length === 0) {
    return (
      <div className="mx-auto text-center" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingBlock: 'var(--space-16)' }}>
        <div className="flex flex-col items-center" style={{ gap: 'var(--space-4)' }}>
          <div className="flex items-center justify-center rounded-full bg-muted" style={{ height: '6rem', width: '6rem' }}>
            <Heart className="text-muted-foreground" style={{ height: '3rem', width: '3rem' }} />
          </div>
          <h1 className="font-bold" style={{ fontSize: 'var(--text-2xl)' }}>Ընտրված</h1>
          <p className="text-muted-foreground">Ձեր ընտրված ապրանքները դատարկ են</p>
          <Link href="/products"><Button size="lg">Դիտել ապրանքները</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingBlock: 'var(--space-8)' }}>
      <h1 className="font-bold" style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-8)' }}>Ընտրված ({items.length})</h1>
      <div className="grid" style={{ gap: 'var(--space-4)', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {fullProducts?.map((product: Doc<"products">, i: number) => (
          <div key={product._id} className="relative group">
            <ProductCard
              id={product._id}
              slug={product.slug}
              name={product.name}
              price={product.price}
              compareAtPrice={product.compareAtPrice}
              image={product.images?.[0]}
              inStock={product.stock > 0}
              sku={product.sku}
              stock={product.stock}
              rating={product.rating}
              reviewCount={product.reviewCount}
              carBrand={product.attributes?.carBrand}
              attributes={product.attributes}
              index={i}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
