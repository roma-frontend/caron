'use client';

import { ProductCard } from '@/components/cards/ProductCard';

interface Product {
  _id: string;
  name: string;
  slug: string;
  atgCode?: string;
  price: number;
  wholesalePrice?: number;
  compareAtPrice?: number;
  images: string[];
  stock: number;
  rating?: number;
  reviewCount?: number;
  oemNumbers?: Array<string | { code: string; manufacturer?: string }>;
  attributes?: Record<string, unknown>;
  qtyStep?: number;
}

export function ProductOemResults({
  products,
  decoded,
}: {
  products: Product[];
  decoded: string;
}) {
  return (
    <div className="p-2">
      {products.map((p, i) => {
        const matchedOem = p.oemNumbers?.find(
          (o) => {
            const code = typeof o === 'string' ? o : o.code;
            return code.toLowerCase().includes(decoded.toLowerCase());
          }
        );
        return (
          <ProductCard
            key={p._id}
            id={p._id}
            slug={p.slug}
            atgCode={p.atgCode}
            name={p.name}
            price={p.price}
            wholesalePrice={p.wholesalePrice}
            compareAtPrice={p.compareAtPrice}
            image={p.images?.[0]}
            stock={p.stock}
            inStock={p.stock > 0}
            rating={p.rating}
            reviewCount={p.reviewCount}
            carBrand={p.attributes?.carBrand as string | undefined}
            attributes={p.attributes}
            qtyStep={p.qtyStep}
            index={i}
          />
        );
      })}
    </div>
  );
}
