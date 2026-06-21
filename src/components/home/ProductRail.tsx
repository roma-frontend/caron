'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/cards/ProductCard';

/** Minimal shape a product needs to render in a rail card. */
export interface RailProduct {
  _id: string;
  slug?: string;
  name: string;
  price: number;
  images?: string[];
  stock?: number;
  sku?: string;
  atgCode?: string;
  wholesalePrice?: number;
  compareAtPrice?: number;
  retailDiscount?: number;
  wholesaleDiscount?: number;
  rating?: number;
  reviewCount?: number;
  qtyStep?: number;
  isFeatured?: boolean;
  attributes?: Record<string, unknown> | null;
}

interface ProductRailProps {
  title: string;
  /** undefined = loading (skeletons); [] = caller should not render (auto-hide). */
  products?: RailProduct[];
  icon?: React.ReactNode;
  viewAllHref?: string;
  /** Mark cards with the "hit" badge (e.g. bestsellers). */
  asHit?: boolean;
  /** Mark cards with the "new" badge (e.g. new arrivals). */
  asNew?: boolean;
  /** Skeleton count while loading. */
  skeletonCount?: number;
}

/**
 * Horizontal, snap-scrolling product carousel (WB/OZON-style shelf). Reuses the
 * shared ProductCard. Scrollbar is hidden on mobile (global CSS); desktop gets
 * arrow controls. Render nothing when `products` is an empty array.
 */
export function ProductRail({
  title,
  products,
  icon,
  viewAllHref,
  asHit,
  asNew,
  skeletonCount = 6,
}: ProductRailProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.9), behavior: 'smooth' });
  };

  const loading = products === undefined;

  return (
    <section className="mx-auto" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingBlock: 'var(--space-8)' }}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex min-w-0 items-center gap-2 font-bold" style={{ fontSize: 'var(--text-2xl)' }}>
          {icon}
          <span className="truncate">{title}</span>
        </h2>
        <div className="flex shrink-0 items-center gap-2">
          {viewAllHref && (
            <Link href={viewAllHref}>
              <Button variant="outline" size="sm" className="gap-1.5">
                Դիտել բոլորը <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
          <div className="hidden gap-1.5 sm:flex">
            <button onClick={() => scrollBy(-1)} aria-label="Նախորդ" className="flex h-9 w-9 items-center justify-center rounded-full border bg-card transition-colors hover:border-primary/40 hover:text-primary">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={() => scrollBy(1)} aria-label="Հաջորդ" className="flex h-9 w-9 items-center justify-center rounded-full border bg-card transition-colors hover:border-primary/40 hover:text-primary">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="scrollbar-none -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-1 pb-2"
        style={{ scrollPadding: '0 0.25rem' }}
      >
        {loading
          ? Array.from({ length: skeletonCount }).map((_, i) => (
              <div key={i} className="w-[42%] sm:w-[30%] md:w-[23%] lg:w-[18.5%] shrink-0 snap-start">
                <div className="h-[20rem] animate-pulse rounded-2xl bg-muted" />
              </div>
            ))
          : products.map((p, i) => (
              <div key={p._id} className="w-[42%] sm:w-[30%] md:w-[23%] lg:w-[18.5%] shrink-0 snap-start">
                <ProductCard
                  id={p._id}
                  slug={p.slug}
                  atgCode={p.atgCode}
                  sku={p.sku}
                  name={p.name}
                  price={p.price}
                  wholesalePrice={p.wholesalePrice}
                  compareAtPrice={p.compareAtPrice}
                  retailDiscount={p.retailDiscount}
                  wholesaleDiscount={p.wholesaleDiscount}
                  image={p.images?.[0]}
                  inStock={(p.stock ?? 0) > 0}
                  stock={p.stock}
                  rating={p.rating}
                  reviewCount={p.reviewCount}
                  carBrand={(p.attributes as Record<string, unknown> | undefined)?.carBrand as string | undefined}
                  qtyStep={p.qtyStep}
                  attributes={(p.attributes ?? undefined) as Record<string, unknown> | undefined}
                  isHit={asHit || p.isFeatured}
                  isNew={asNew}
                  index={i}
                  lite
                />
              </div>
            ))}
      </div>
    </section>
  );
}
