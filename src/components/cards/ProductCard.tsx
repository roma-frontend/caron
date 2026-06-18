'use client';

import { useState, useCallback, useMemo } from 'react';
import { useReveal, useMouseGlow, cardRevealStyle } from '@/lib/motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Heart, Star, Check, Eye } from 'lucide-react';
import { formatPrice, discountPercent } from '@/lib/formatters';
import { useCartStore } from '@/store/cart';
import { useFavoritesStore } from '@/store/favorites';
import { useVehicleStore } from '@/store/vehicle';
import { useSettings } from '@/hooks/useSettings';
import { flyProductAway, flyProductToTarget } from '@/lib/flyToTarget';
import { showUndoCountdownToast } from '@/lib/undoCountdownToast';
import { normalizeImageUrl } from '../../../convex/lib/imageUrl';
import dynamic from 'next/dynamic';
import { PRODUCT } from '@/lib/constants';
const QuickView = dynamic(() => import('@/components/QuickView').then((m) => ({ default: m.QuickView })));

import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/store/auth';

interface ProductCardProps {
  id: string;
  name: string;
  slug?: string;
  atgCode?: string;
  price: number;
  sku?: string;
  wholesalePrice?: number;
  compareAtPrice?: number;
  retailDiscount?: number;
  wholesaleDiscount?: number;
  image?: string | null;
  category?: string;
  inStock?: boolean;
  stock?: number;
  isNew?: boolean;
  isHit?: boolean;
  rating?: number;
  reviewCount?: number;
  carBrand?: string;
  promoDiscountPercent?: number;
  qtyStep?: number;
  attributes?: Record<string, unknown>;
  index?: number;
  description?: string;
  compact?: boolean;
}

function checkFits(vehicle: { brand: string; model: string; year: string } | null, carBrand?: string, attributes?: Record<string, unknown>): boolean {
  if (!vehicle) return false;
  const compat = attributes?.vehicleCompat as Array<{ brand: string; model: string; yearFrom: number; yearTo: number }> | undefined;
  if (compat && compat.length > 0) {
    const year = Number(vehicle.year);
    return compat.some((c) =>
      c.brand === vehicle.brand && c.model === vehicle.model && year >= c.yearFrom && year <= c.yearTo
    );
  }
  return !!(carBrand && vehicle.brand === carBrand);
}

export function ProductCard({ id, name, slug, atgCode, sku, price, wholesalePrice, compareAtPrice, retailDiscount, wholesaleDiscount, image, category, inStock = true, stock, isNew, isHit, rating, reviewCount, carBrand, promoDiscountPercent: _promoDiscountPercent, qtyStep, attributes, index = 0, description, compact }: ProductCardProps) {
  const { ref, visible } = useReveal();
  const [imgError, setImgError] = useState(false);
  const onImgError = useCallback(() => setImgError(true), []);
  const { mousePos, isHovered, handlers } = useMouseGlow();
  const normalizedImage = useMemo(() => normalizeImageUrl(image), [image]);
  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const cartItems = useCartStore((s) => s.items);
  const toggleFav = useFavoritesStore((s) => s.toggle);
  const favoriteItems = useFavoritesStore((s) => s.items);
  const isFav = useFavoritesStore((s) => s.items.some((i) => i.id === id));
  const vehicle = useVehicleStore((s) => s.vehicle);
  const settings = useSettings();
  const currentUser = useAuthStore((s) => s.user);
  const step = qtyStep || 1;
  const [qty, setQty] = useState(step);
  const isWholesale = currentUser?.customerType === 'wholesale' && currentUser?.role !== 'admin';
  const userDiscount = currentUser?.role !== 'admin' ? (currentUser?.discountPercent ?? 0) : 0;
  // Product-level wholesale discount only applies to wholesale customers
  // If product explicitly sets wholesaleDiscount, it overrides customer's personal discount
  const effectiveWholesaleDiscount = isWholesale
    ? (wholesaleDiscount != null && wholesaleDiscount > 0 ? wholesaleDiscount : (wholesaleDiscount == null ? userDiscount : 0))
    : 0;
  const baseWholesale = isWholesale
    ? (typeof wholesalePrice === 'number' && wholesalePrice > 0
        ? Math.round(wholesalePrice * (1 - (wholesaleDiscount != null && wholesaleDiscount > 0 ? wholesaleDiscount : 0) / 100))
        : Math.round(price * (1 - effectiveWholesaleDiscount / 100)))
    : price;
  const fallbackWholesale = isWholesale ? baseWholesale : price;
  const retailDisplayPrice = !isWholesale && retailDiscount && retailDiscount > 0 ? Math.round(price * (1 - retailDiscount / 100)) : price;
  const displayPrice = isWholesale ? fallbackWholesale : retailDisplayPrice;
  const fits = checkFits(vehicle, carBrand, attributes);
  const [quickOpen, setQuickOpen] = useState(false);
  const cartQty = cartItems.find((i) => i.id === id)?.quantity ?? 0;
  const maxQty = stock != null ? Math.max(0, stock - cartQty) : Infinity;
  const atLimit = stock != null && cartQty >= stock;
  const detailHref = `/products/${encodeURIComponent(slug ?? id)}`;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (atLimit) return;
    for (let i = 0; i < qty; i += step) addItem({ id, name, price: displayPrice, image: image ?? null, maxStock: stock, qtyStep: step, sku });
    flyProductToTarget({ triggerEl: e.currentTarget as HTMLElement, kind: 'cart', imageSrc: normalizedImage ?? image ?? null });
    showUndoCountdownToast({
      message: `${name} ավելացվել է`,
      onUndo: () => {
        if (cartQty <= 0) removeItem(id);
        else updateQuantity(id, cartQty);
      },
    });
  };

  return (
    <>
      <div ref={ref} data-product-card style={{ ...cardRevealStyle(visible, index * 0.06), contentVisibility: 'auto', containIntrinsicSize: '0 320px' }} {...handlers}>
        {compact ? (
          /* ─── Compact list mode ─── */
          <div className="flex gap-2 sm:gap-3 rounded-xl border bg-background p-1.5 sm:p-2 transition-all hover:shadow-md" style={{ boxShadow: 'var(--shadow-xs)' }}>
            <Link href={detailHref} className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
              {normalizedImage ? <Image src={normalizedImage} alt={name} width={64} height={64} className="h-full w-full object-fill" /> : <div className="flex h-full items-center justify-center text-lg">🔧</div>}
            </Link>
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
              <Link href={detailHref} className="text-sm font-medium line-clamp-1 hover:text-primary transition-colors">{name}</Link>
              {atgCode && <p className="text-[10px] text-muted-foreground">ԱՏԳԱԱ: <span className="font-mono">{atgCode}</span></p>}
              <div className="flex flex-wrap items-center justify-between gap-y-1.5 gap-x-2">
                <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                  <span className="text-sm font-bold text-primary shrink-0">{formatPrice(displayPrice)}</span>
                  {!isWholesale && retailDiscount != null && retailDiscount > 0 && <span className="text-xs text-muted-foreground line-through shrink-0">{formatPrice(price)}</span>}
                  {!isWholesale && retailDiscount != null && retailDiscount > 0 && <span className="text-[10px] font-bold text-destructive shrink-0">-{retailDiscount}%</span>}
                  {isWholesale && effectiveWholesaleDiscount > 0 && <span className="text-[10px] font-bold text-primary shrink-0">-{effectiveWholesaleDiscount}%</span>}
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-auto">
                  <button onClick={(e) => { e.preventDefault(); const adding = !isFav; const existing = favoriteItems.find((i) => i.id === id); const payload = { id, name, price, image: image ?? null }; if (!adding) flyProductAway({ triggerEl: e.currentTarget as HTMLElement, imageSrc: normalizedImage ?? image ?? null }); toggleFav(payload); if (adding) { flyProductToTarget({ triggerEl: e.currentTarget as HTMLElement, kind: 'favorites', imageSrc: normalizedImage ?? image ?? null }); } else if (existing) { showUndoCountdownToast({ message: `${name} հեռացվեց ընտրյալներից`, onUndo: () => toggleFav(existing) }); } }} aria-label="Նախընտրած" className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-colors ${isFav ? 'border-red-500 bg-red-500 text-white' : 'text-muted-foreground hover:border-red-500/60 hover:text-red-500'}`}>
                    <Heart className={`h-3 w-3 ${isFav ? 'fill-current' : ''}`} />
                  </button>
                  <div className="flex items-center rounded-lg border h-7">
                    <button onClick={(e) => { e.preventDefault(); setQty(Math.max(step, qty - step)); }} disabled={qty <= step} className="flex h-full w-6 items-center justify-center text-xs hover:bg-muted rounded-l-lg disabled:opacity-30">−</button>
                    <span className="flex h-full w-6 items-center justify-center text-[10px] font-semibold border-x">{qty}</span>
                    <button onClick={(e) => { e.preventDefault(); setQty(Math.min(maxQty, qty + step)); }} disabled={atLimit || qty >= maxQty} className="flex h-full w-6 items-center justify-center text-xs hover:bg-muted rounded-r-lg disabled:opacity-30">+</button>
                  </div>
                  <Button size="sm" className="h-7 gap-1 rounded-lg text-[10px] px-2" disabled={!inStock || atLimit} onClick={handleAddToCart}>
                    <ShoppingCart className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ─── Grid card mode (original) ─── */
          <div className="relative overflow-hidden rounded-2xl">
            <div
              className="group relative border bg-background/80 backdrop-blur-sm card-modern rounded-2xl"
              style={{
                viewTransitionName: `product-img-${id}`,
                transition: 'transform 0.4s cubic-bezier(0.22,1,0.36,1), box-shadow 0.4s ease, border-color 0.4s cubic-bezier(0.22,1,0.36,1)',
                transform: isHovered
                  ? `translateY(-8px) scale(1.02) perspective(1000px) rotateX(${(mousePos.y - 150) / -30}deg) rotateY(${(mousePos.x - 150) / 30}deg)`
                  : 'translateY(0) scale(1) perspective(1000px) rotateX(0deg) rotateY(0deg)',
                transformStyle: 'preserve-3d',
                backfaceVisibility: 'hidden',
                boxShadow: isHovered
                  ? 'var(--shadow-card-hover)'
                  : 'var(--shadow-card)',
              }}
            >
            {isHovered && (
              <div
                className="pointer-events-none absolute inset-0 -z-10 rounded-2xl"
                style={{ background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, oklch(0.6 0.14 248 / 0.14), transparent 50%)`, filter: 'blur(30px)' }}
              />
            )}

            <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-muted/50 to-muted/30">
              <Link href={detailHref} aria-label={name} className="absolute inset-0 z-[5]" />
              {normalizedImage && !imgError ? (
                <Image src={normalizedImage} alt={name} fill sizes="(max-width: 640px) 50vw, 240px" loading={index < 4 ? 'eager' : 'lazy'} fetchPriority={index < 2 ? 'high' : 'auto'} className="object-fill" placeholder={index < 4 ? 'blur' : 'empty'} blurDataURL="data:image/webp;base64,UklGRlIAAABXRUJQVlA4IEYAAAAwAQCdASoQAAkABUB8JQBOgBQAv6W2S+dgAP7+0u3bt27du3bt27du3bt27du3bt27du3bt27du3bt27du3bt27du3fuwAA" onError={onImgError} />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted/40 to-muted/20" aria-hidden="true">
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/30"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                </div>
              )}

              {(!isWholesale && retailDiscount != null && retailDiscount > 0) ? (
                <Badge className="absolute left-3 top-3 bg-destructive text-white text-xs font-bold shadow-lg">
                  -{retailDiscount}%
                </Badge>
              ) : (!isWholesale && compareAtPrice) ? (
                <Badge className="absolute left-3 top-3 bg-destructive text-white text-xs font-bold shadow-lg">
                  -{discountPercent(price, compareAtPrice)}%
                </Badge>
              ) : null}

              {isNew && (isWholesale || !retailDiscount) && !compareAtPrice && (
                <Badge className="absolute left-3 top-3 badge-new text-xs font-bold shadow-lg">Նոր</Badge>
              )}

              {isHit && !retailDiscount && !compareAtPrice && !isNew && (
                <Badge className="absolute left-3 top-3 badge-hit text-xs font-bold shadow-lg">Թոփ</Badge>
              )}

              <button
                aria-label="Նախընտրած"
                aria-pressed={isFav}
                onClick={(e) => { e.preventDefault(); const adding = !isFav; const existing = favoriteItems.find((i) => i.id === id); const payload = { id, name, price, image: image ?? null }; if (!adding) flyProductAway({ triggerEl: e.currentTarget as HTMLElement, imageSrc: normalizedImage ?? image ?? null }); toggleFav(payload); const svg = e.currentTarget.querySelector('svg'); svg?.classList.add('heart-pulse'); setTimeout(() => svg?.classList.remove('heart-pulse'), 400); if (adding) { flyProductToTarget({ triggerEl: e.currentTarget as HTMLElement, kind: 'favorites', imageSrc: normalizedImage ?? image ?? null }); } else if (existing) { showUndoCountdownToast({ message: `${name} հեռացվեց ընտրյալներից`, onUndo: () => toggleFav(existing) }); } }}
                className={`absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border shadow-lg backdrop-blur-sm transition-all duration-300 ${isFav ? 'border-red-500 bg-red-500 text-white scale-110' : 'border-border bg-card/80 text-muted-foreground hover:border-red-500/60 hover:bg-red-500/10 hover:text-red-500 hover:scale-110'}`}
              >
                <Heart className={`h-4 w-4 ${isFav ? 'fill-current' : ''}`} />
              </button>

              {carBrand && (
                <div className="absolute left-3 bottom-3 z-10 flex items-center gap-1.5 rounded-xl border bg-white/90 px-2.5 py-1 text-[10px] font-bold tracking-wide text-gray-800 shadow-lg backdrop-blur-xs dark:bg-gray-900/90 dark:text-gray-100 uppercase">
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                  {carBrand}
                </div>
              )}

              {settings !== undefined && settings?.enableQuickView !== false && (
                <button
                  aria-label="Արագ դիտում"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setQuickOpen(true); }}
                  className="absolute right-3 bottom-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border bg-card/80 shadow-lg backdrop-blur-sm opacity-100 transition-all duration-300 hover:bg-primary hover:text-white hover:border-primary md:opacity-0 md:group-hover:opacity-100 hover:scale-110"
                >
                  <Eye className="h-4 w-4" />
                </button>
              )}

              {!inStock && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
                  <Badge variant="secondary" className="text-sm">{PRODUCT.outOfStock}</Badge>
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-foreground/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </div>

            <div className="p-3">
              {category && <p className="mb-1 text-xs font-medium text-primary/70">{category}</p>}
              <h3 className="line-clamp-3 text-sm font-semibold leading-snug transition-colors duration-200 group-hover:text-primary">
                <Link href={detailHref} className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm">{name}</Link>
              </h3>
              {sku && <p className="mt-1 text-[10px] text-muted-foreground">Արտիկուլ: <span className="font-mono">{sku}</span></p>}

              {reviewCount && reviewCount > 0 ? (
                <div className="mt-1.5 flex items-center gap-1" aria-label={`Գնահատական: ${rating} աստղ ${reviewCount} կարծիքից`}>
                  <div className="flex" role="img" aria-label={`${Math.round(rating ?? 0)} 5 աստղից`}>
                    {[1, 2, 3, 4, 5].map((i) => <Star key={i} className={`h-3 w-3 ${i <= Math.round(rating ?? 0) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} aria-hidden="true" />)}
                  </div>
                  <span className="text-[11px] text-muted-foreground">({reviewCount})</span>
                </div>
              ) : null}

              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className="text-md font-bold text-primary">{formatPrice(displayPrice)}</span>
                {!isWholesale && retailDiscount != null && retailDiscount > 0 && <span className="text-xs text-muted-foreground line-through">{formatPrice(price)}</span>}
                {!isWholesale && retailDiscount != null && retailDiscount > 0 && <span className="text-[10px] font-bold text-destructive">-{retailDiscount}%</span>}
                {isWholesale && effectiveWholesaleDiscount > 0 && displayPrice < price && <span className="text-xs text-muted-foreground line-through">{formatPrice(price)}</span>}
                {isWholesale && effectiveWholesaleDiscount > 0 && displayPrice < price && <span className="text-[10px] font-bold text-primary">-{effectiveWholesaleDiscount}%</span>}
              </div>

              {fits && (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 to-emerald-400/5 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 shadow-xs dark:text-emerald-400">
                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20">
                    <Check className="h-2.5 w-2.5" />
                  </div>
                  <span>{vehicle!.brand}</span>
                </div>
              )}
              {settings?.showStockCount && inStock && stock !== undefined && stock <= (settings.lowStockThreshold ?? 5) && (
                <p className="mt-1.5 text-[11px] font-medium text-orange-600">Մնացել է {stock} հատ</p>
              )}
            </div>

              <div className="px-2 pb-2 sm:pb-4">
              <div className="flex items-center gap-1.5">
                <div className="flex items-center rounded-lg border">
                  <button onClick={(e) => { e.preventDefault(); setQty(Math.max(step, qty - step)); }} disabled={qty <= step} className="flex h-8 w-7 items-center justify-center text-sm hover:bg-muted transition-colors rounded-l-lg disabled:opacity-30">−</button>
                  <span className="flex h-8 w-7 items-center justify-center text-xs font-semibold border-x">{qty}</span>
                  <button onClick={(e) => { e.preventDefault(); setQty(Math.min(maxQty, qty + step)); }} disabled={atLimit || qty >= maxQty} className="flex h-8 w-7 items-center justify-center text-sm hover:bg-muted transition-colors rounded-r-lg disabled:opacity-30">+</button>
                </div>
                <Button size="sm" className="flex-1 gap-2 rounded-xl" disabled={!inStock || atLimit} onClick={handleAddToCart}
                  aria-label={inStock ? `Ավելացնել ${name} զամբյուղ` : 'Ապահովված չէ'}>
                  <ShoppingCart className="h-4 w-4" />
                </Button>
              </div>
            </div>
            </div>
          </div>
        )}
      </div>

      <QuickView
        open={quickOpen}
        onOpenChange={setQuickOpen}
        product={{ id, slug, name, price, wholesalePrice, compareAtPrice, image, description, inStock, rating, reviewCount, carBrand }}
      />
    </>
  );
}
