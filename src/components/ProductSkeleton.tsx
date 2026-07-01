'use client';

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="skeleton aspect-square" />
      <div className="p-4 space-y-3">
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-1/2" />
        <div className="skeleton h-8 w-full mt-4" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8, className }: { count?: number; className?: string }) {
  // Reserve a full viewport of height so the footer starts *below the fold*
  // during the first-page load. Otherwise, when the (much taller) real grid
  // replaces this skeleton, the footer — pinned to the viewport bottom while
  // content is short — slams down out of view, which is the dominant source of
  // Cumulative Layout Shift on the catalog pages. Gap/column sizing is kept in
  // sync with the live grid so the skeleton→grid swap is height-stable.
  return (
    <div
      className={`grid gap-1 sm:gap-3 min-h-[100dvh] content-start ${className ?? ''}`}
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}
    >
      {Array.from({ length: count }).map((_, i) => <ProductCardSkeleton key={i} />)}
    </div>
  );
}
