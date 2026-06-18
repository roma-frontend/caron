'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Heart } from 'lucide-react';
import { formatPrice } from '@/lib/formatters';
import { useCartStore } from '@/store/cart';
import { useFavoritesStore } from '@/store/favorites';
import { flyProductAway, flyProductToTarget } from '@/lib/flyToTarget';
import { showUndoCountdownToast } from '@/lib/undoCountdownToast';
import { toast } from 'sonner';

interface StickyBuyBarProps {
  productId: string;
  productName: string;
  productPrice: number;
  productImage?: string | null;
  productCompareAtPrice?: number;
  inStock?: boolean;
  slug?: string;
  qty?: number;
  productStock?: number;
}

export function StickyBuyBar({ productId, productName, productPrice, productImage, productCompareAtPrice, inStock = true, slug: _slug, qty = 1, productStock }: StickyBuyBarProps) {
  const [visible, setVisible] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const toggleFav = useFavoritesStore((s) => s.toggle);
  const favoriteItems = useFavoritesStore((s) => s.items);
  const isFav = useFavoritesStore((s) => s.items.some((i) => i.id === productId));

  useEffect(() => {
    const el = document.querySelector('[data-product-content]');
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0, rootMargin: '-80px 0px 0px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur-md shadow-2xl animate-in slide-in-from-bottom-4 duration-300 lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="mx-auto flex items-center gap-3 px-4 py-3" style={{ maxWidth: 'var(--container-max)' }}>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{productName}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-primary">{formatPrice(productPrice)}</span>
            {productCompareAtPrice && (
              <span className="text-xs text-muted-foreground line-through">{formatPrice(productCompareAtPrice)}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            aria-label={isFav ? 'Հեռացնել նախընտրածներից' : 'Ավելացնել նախընտրածներին'}
            onClick={(e) => { const adding = !isFav; const existing = favoriteItems.find((i) => i.id === productId); if (!adding) flyProductAway({ triggerEl: e.currentTarget as HTMLElement, imageSrc: productImage ?? null }); toggleFav({ id: productId, name: productName, price: productPrice, image: productImage ?? null }); if (adding) { flyProductToTarget({ triggerEl: e.currentTarget as HTMLElement, kind: 'favorites', imageSrc: productImage ?? null }); toast.success('Ավելացված է'); } else if (existing) { showUndoCountdownToast({ message: 'Հեռացված է', onUndo: () => toggleFav(existing) }); } }}
            className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all ${isFav ? 'border-red-500 bg-red-500 text-white' : 'border-border text-muted-foreground hover:border-red-500/60 hover:text-red-500'}`}
          >
            <Heart className={`h-5 w-5 ${isFav ? 'fill-current' : ''}`} />
          </button>
          <Button
            size="lg"
            className="gap-2 rounded-xl h-10"
            disabled={!inStock}
            onClick={(e) => { const prevQty = cartItems.find((i) => i.id === productId)?.quantity ?? 0; for (let i = 0; i < qty; i++) addItem({ id: productId, name: productName, price: productPrice, image: productImage ?? null, maxStock: productStock, qtyStep: 1 }); flyProductToTarget({ triggerEl: e.currentTarget as HTMLElement, kind: 'cart', imageSrc: productImage ?? null }); showUndoCountdownToast({ message: 'Ապրանքը տեղափոխվեց զամբյուղ', description: `${productName} · քանակ ${qty}`, undoLabel: 'Վերադարձնել', onUndo: () => { if (prevQty <= 0) removeItem(productId); else updateQuantity(productId, prevQty); } }); }}
          >
            <ShoppingCart className="h-4 w-4" /> Զամբյուղ
          </Button>
        </div>
      </div>
    </div>
  );
}
