'use client';

import Link from 'next/link';
import { useReveal, useMouseGlow, cardRevealStyle } from '@/lib/motion';

interface CategoryCardProps {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string | null;
  productCount?: number;
  index?: number;
}

const CATEGORY_ICONS: Record<string, string> = {
  tires: '🛞', oils: '🛢️', filters: '🔧', brakes: '🚗', lamps: '💡', batteries: '🔋',
};

export function CategoryCard({ id, name, slug, description, imageUrl, productCount, index = 0 }: CategoryCardProps) {
  const { ref, visible } = useReveal();
  const { mousePos, isHovered, handlers } = useMouseGlow();
  const icon = CATEGORY_ICONS[slug] ?? '📦';

  return (
    <Link href={`/categories/${slug}`}>
      <div ref={ref} style={cardRevealStyle(visible, index * 0.08)} {...handlers}>
        <div
          className="group relative overflow-hidden rounded-2xl border bg-background/80 backdrop-blur-sm"
          style={{
            transition: 'transform 0.4s cubic-bezier(0.22,1,0.36,1), box-shadow 0.4s ease',
            transform: isHovered ? 'translateY(-8px) rotateX(2deg)' : 'translateY(0) rotateX(0deg)',
            boxShadow: isHovered
              ? '0 24px 48px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.15)'
              : 'var(--shadow-card)',
            perspective: '1000px',
          }}
        >
          {/* Mouse-follow glow */}
          {isHovered && (
            <div
              className="pointer-events-none absolute inset-0 -z-10 rounded-2xl"
              style={{ background: `radial-gradient(500px circle at ${mousePos.x}px ${mousePos.y}px, oklch(0.6 0.15 260 / 0.1), transparent 50%)`, filter: 'blur(40px)' }}
            />
          )}

          {/* Top shimmer line */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

          {/* Content */}
          <div className="flex flex-col items-center p-8 text-center">
            <div
              className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-3xl transition-all duration-500 group-hover:scale-125 group-hover:rotate-6 group-hover:bg-primary/20"
              style={{ boxShadow: isHovered ? '0 8px 24px oklch(0.5 0.18 260 / 0.15)' : 'none' }}
            >
              {icon}
            </div>
            <h3 className="text-base font-bold transition-colors duration-200 group-hover:text-primary">{name}</h3>
            {description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{description}</p>}
            {productCount !== undefined && (
              <span className="mt-2 rounded-full bg-muted px-3 py-0.5 text-xs font-medium text-muted-foreground">{productCount} ապրանք</span>
            )}
          </div>

          {/* Corner decoration */}
          <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-primary/5 opacity-0 blur-2xl transition-opacity duration-700 group-hover:opacity-100" />
        </div>
      </div>
    </Link>
  );
}
