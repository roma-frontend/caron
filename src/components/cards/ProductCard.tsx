'use client';

import { useReveal, useMouseGlow, cardRevealStyle } from '@/lib/motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Heart, Star, Check } from 'lucide-react';
import { formatPrice, discountPercent } from '@/lib/formatters';
import { useCartStore } from '@/store/cart';
import { useFavoritesStore } from '@/store/favorites';
import { useVehicleStore } from '@/store/vehicle';
import { toast } from 'sonner';
import { PRODUCT } from '@/lib/constants';

import Link from 'next/link';
import Image from 'next/image';

interface ProductCardProps {
  id: string;
  name: string;
  slug?: string;
  price: number;
  compareAtPrice?: number;
  image?: string | null;
  category?: string;
  inStock?: boolean;
  stock?: number;
  isNew?: boolean;
  isHit?: boolean;
  rating?: number;
  reviewCount?: number;
  carBrand?: string;
  index?: number;
}

export function ProductCard({ id, name, slug, price, compareAtPrice, image, category, inStock = true, stock, isNew, isHit, rating, reviewCount, carBrand, index = 0 }: ProductCardProps) {
  const { ref, visible } = useReveal();
  const { mousePos, isHovered, handlers } = useMouseGlow();
  const addItem = useCartStore((s) => s.addItem);
  const toggleFav = useFavoritesStore((s) => s.toggle);
  const isFav = useFavoritesStore((s) => s.isFavorite)(id);
  const vehicle = useVehicleStore((s) => s.vehicle);
  const fits = !!(vehicle && carBrand && vehicle.brand === carBrand);

  return (
    <div ref={ref} style={cardRevealStyle(visible, index * 0.06)} {...handlers}>
      <div
        className="group relative overflow-hidden rounded-2xl border bg-background/80 backdrop-blur-sm"
        style={{
          transition: 'transform 0.3s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s ease',
          transform: isHovered ? 'translateY(-6px) scale(1.02)' : 'translateY(0) scale(1)',
          boxShadow: isHovered
            ? '0 20px 40px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.1)'
            : 'var(--shadow-card)',
        }}
      >
        {/* Mouse-follow glow */}
        {isHovered && (
          <div
            className="pointer-events-none absolute inset-0 -z-10 rounded-2xl"
            style={{ background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, oklch(0.6 0.14 248 / 0.14), transparent 50%)`, filter: 'blur(30px)' }}
          />
        )}

        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-muted/50 to-muted/30">
          {slug && <Link href={`/products/${slug}`} aria-label={name} className="absolute inset-0 z-[5]" />}
          {image ? (
            <Image src={image} alt={name} width={400} height={400} sizes="(max-width: 640px) 50vw, 240px" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/20"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div>
          )}

          {/* Discount badge */}
          {compareAtPrice && (
            <Badge className="absolute left-3 top-3 bg-destructive text-white text-xs font-bold shadow-lg">
              -{discountPercent(price, compareAtPrice)}%
            </Badge>
          )}

          {/* Favorite button */}
          <button
            aria-label="Նախընտրած"
            aria-pressed={isFav}
            onClick={(e) => { e.preventDefault(); toggleFav({ id, name, price, image: image ?? null }); const svg = e.currentTarget.querySelector('svg'); svg?.classList.add('heart-pulse'); setTimeout(() => svg?.classList.remove('heart-pulse'), 400); }}
            className={`absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border shadow-lg backdrop-blur-sm transition-all duration-300 ${isFav ? 'border-red-500 bg-red-500 text-white scale-110' : 'border-border bg-card/80 text-muted-foreground hover:border-red-500/60 hover:bg-red-500/10 hover:text-red-500 hover:scale-110'}`}
          >
            <Heart className={`h-4 w-4 ${isFav ? 'fill-current' : ''}`} />
          </button>

          {/* Out of stock overlay */}
          {!inStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
              <Badge variant="secondary" className="text-sm">{PRODUCT.outOfStock}</Badge>
            </div>
          )}

          {/* Bottom gradient */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background/80 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </div>

        {/* Content */}
        <div className="p-4">
          {category && <p className="mb-1 text-xs font-medium text-primary/70">{category}</p>}
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug transition-colors duration-200 group-hover:text-primary">
            {slug ? <Link href={`/products/${slug}`} className="hover:underline">{name}</Link> : name}
          </h3>

          {reviewCount && reviewCount > 0 ? (
            <div className="mt-1.5 flex items-center gap-1">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((i) => <Star key={i} className={`h-3 w-3 ${i <= Math.round(rating ?? 0) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} />)}
              </div>
              <span className="text-[11px] text-muted-foreground">({reviewCount})</span>
            </div>
          ) : null}

          <div className="mt-3 flex items-center gap-2">
            <span className="text-lg font-bold text-primary">{formatPrice(price)}</span>
            {compareAtPrice && <span className="text-xs text-muted-foreground line-through">{formatPrice(compareAtPrice)}</span>}
          </div>

          {fits && (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-green-600/10 px-2 py-0.5 text-[11px] font-medium text-green-600 dark:text-green-400">
              <Check className="h-3 w-3" /> Համապատասխանում է ձեր {vehicle!.brand}-ին
            </span>
          )}
        </div>

        {/* Add to cart */}
        <div className="px-4 pb-4">
          <Button
            size="sm"
            className="w-full gap-2 rounded-xl"
            disabled={!inStock}
            onClick={(e) => { e.preventDefault(); addItem({ id, name, price, image: image ?? null }); toast.success(`${name} ավելացվել է`); }}
          >
            <ShoppingCart data-cart-icon className="h-4 w-4" /> {PRODUCT.addToCart}
          </Button>
        </div>
      </div>
    </div>
  );
}
