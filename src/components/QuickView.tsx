'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Heart, Star, Check, XIcon } from 'lucide-react';
import { formatPrice, discountPercent } from '@/lib/formatters';
import { useCartStore } from '@/store/cart';
import { useFavoritesStore } from '@/store/favorites';
import { useAuthStore } from '@/store/auth';
import { flyProductToTarget } from '@/lib/flyToTarget';
import { showUndoCountdownToast } from '@/lib/undoCountdownToast';
import { toast } from 'sonner';
import Image from 'next/image';
import Link from 'next/link';

interface QuickViewProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  product: {
    id: string;
    slug?: string;
    name: string;
    price: number;
    wholesalePrice?: number;
    compareAtPrice?: number;
    image?: string | null;
    description?: string;
    inStock?: boolean;
    rating?: number;
    reviewCount?: number;
    carBrand?: string;
  };
}

export function QuickView({ open, onOpenChange, product }: QuickViewProps) {
  const addItem = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const toggleFav = useFavoritesStore((s) => s.toggle);
  const favoriteItems = useFavoritesStore((s) => s.items);
  const isFav = useFavoritesStore((s) => s.items.some((i) => i.id === product.id));
  const currentUser = useAuthStore((s) => s.user);
  const fallbackWholesale = typeof product.wholesalePrice === 'number' && product.wholesalePrice > 0
    ? product.wholesalePrice
    : Math.round(product.price * (1 - (currentUser?.discountPercent ?? 0) / 100));
  const cartPrice = currentUser?.customerType === 'wholesale' ? fallbackWholesale : product.price;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden rounded-2xl border-0 shadow-2xl" showCloseButton={false}>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="font-semibold text-sm">Արագ դիտում</span>
          <Button variant="ghost" size="icon-sm" onClick={() => onOpenChange(false)}>
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid sm:grid-cols-2">
          <div className="relative aspect-square bg-gradient-to-br from-muted/50 to-muted/30">
            {product.image ? (
              <Image src={product.image} alt={product.name} fill sizes="(max-width: 640px) 100vw, 50vw" className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground/20">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
              </div>
            )}
            {product.compareAtPrice && (
              <Badge className="absolute left-3 top-3 bg-destructive text-white text-xs font-bold shadow-lg">
                -{discountPercent(product.price, product.compareAtPrice)}%
              </Badge>
            )}
            {!product.inStock && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
                <Badge variant="secondary" className="text-sm">Ապահովված չէ</Badge>
              </div>
            )}
          </div>

          <div className="flex flex-col p-4 sm:p-6">
            <DialogHeader className="p-0">
              <DialogTitle className="text-xl font-bold leading-tight">{product.name}</DialogTitle>
            </DialogHeader>

            {product.reviewCount && product.reviewCount > 0 ? (
              <div className="mt-2 flex items-center gap-1">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className={`h-3.5 w-3.5 ${i <= Math.round(product.rating ?? 0) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">({product.reviewCount})</span>
              </div>
            ) : null}

            {product.description && (
              <DialogDescription className="mt-3 text-sm text-muted-foreground line-clamp-3">
                {product.description}
              </DialogDescription>
            )}

            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-primary">{formatPrice(cartPrice)}</span>
              {product.compareAtPrice ? (
                <span className="text-sm text-muted-foreground line-through">{formatPrice(product.compareAtPrice)}</span>
              ) : cartPrice !== product.price ? (
                <span className="text-sm text-muted-foreground line-through">{formatPrice(product.price)}</span>
              ) : null}
            </div>

            {product.carBrand && (
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-green-600/10 px-3 py-1 text-xs font-medium text-green-600 dark:text-green-400">
                <Check className="h-3.5 w-3.5" /> Համապատասխան է {product.carBrand}
              </span>
            )}

            <div className="mt-auto flex flex-col gap-2 pt-6">
              <Button
                size="lg"
                className="w-full gap-2 rounded-xl"
                disabled={!product.inStock}
                onClick={(e) => {
                  const prevQty = cartItems.find((i) => i.id === product.id)?.quantity ?? 0;
                  addItem({ id: product.id, name: product.name, price: cartPrice, image: product.image ?? null });
                  flyProductToTarget({ triggerEl: e.currentTarget as HTMLElement, kind: 'cart', imageSrc: product.image ?? null });
                  showUndoCountdownToast({
                    message: `${product.name} ավելացվել է զամբյուղում`,
                    onUndo: () => {
                      if (prevQty <= 0) removeItem(product.id);
                      else updateQuantity(product.id, prevQty);
                    },
                  });
                }}
              >
                <ShoppingCart className="h-4 w-4" /> {product.inStock ? 'Ավելացնել' : 'Չկա պահանջվող քանակով'}
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="lg" className={`flex-1 gap-2 ${isFav ? 'border-red-200 text-red-500' : ''}`} onClick={(e) => { const adding = !isFav; const existing = favoriteItems.find((i) => i.id === product.id); toggleFav({ id: product.id, name: product.name, price: cartPrice, image: product.image ?? null }); const svg = e.currentTarget.querySelector('svg'); svg?.classList.add('heart-pulse'); setTimeout(() => svg?.classList.remove('heart-pulse'), 400); if (adding) { flyProductToTarget({ triggerEl: e.currentTarget as HTMLElement, kind: 'favorites', imageSrc: product.image ?? null }); toast.success('Ավելացվել է'); if (adding) setTimeout(() => onOpenChange(false), 350); } else if (existing) { showUndoCountdownToast({ message: 'Հեռացվել է', onUndo: () => toggleFav(existing) }); } }}>
                  <Heart className={`h-4 w-4 ${isFav ? 'fill-red-500 text-red-500' : ''}`} />
                  {isFav ? 'Ընտրված' : 'Ընտրել'}
                </Button>
                {product.slug && (
                  <Link href={`/products/${product.slug}`} className="flex-1" onClick={() => onOpenChange(false)}>
                    <Button variant="secondary" size="lg" className="w-full">Մանրամասներ</Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
