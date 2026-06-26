'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from 'convex/react';
import { RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useCartStore, type CartItem } from '@/store/cart';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useT } from '@/lib/i18n/admin';

interface OrderItem {
  productId: Id<'products'>;
  name: string;
  quantity: number;
}

/**
 * WB-style "Buy again" — re-adds a past order's items to the cart.
 * Stock/price are re-validated server-side via orders.validateCart, then
 * merged into the existing cart (quantities summed, capped at available stock).
 */
export function ReorderButton({
  items,
  size = 'sm',
  variant = 'outline',
  className,
  label,
}: {
  items: OrderItem[];
  size?: 'sm' | 'lg' | 'default';
  variant?: 'outline' | 'default' | 'ghost';
  className?: string;
  label?: string;
}) {
  const { t } = useT();
  const resolvedLabel = label ?? t('sp.repeatOrder');
  const router = useRouter();
  const validateCart = useMutation(api.orders.validateCart);
  const loadItems = useCartStore((s) => s.loadItems);
  const [loading, setLoading] = useState(false);

  const handleReorder = async () => {
    if (loading || items.length === 0) return;
    setLoading(true);
    try {
      const res = await validateCart({
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      });

      if (!res.items || res.items.length === 0) {
        toast.error(t('sp.orderItemsUnavailable'));
        return;
      }

      // Merge validated items into the current cart (sum quantities, cap at stock).
      const current = useCartStore.getState().items;
      const map = new Map<string, CartItem>(current.map((i) => [i.id, { ...i }]));
      for (const it of res.items) {
        const max = it.maxStock ?? Infinity;
        const existing = map.get(it.id);
        if (existing) {
          existing.quantity = Math.min(max, existing.quantity + it.quantity);
        } else {
          map.set(it.id, {
            id: it.id,
            name: it.name,
            price: it.price,
            image: it.image,
            quantity: Math.min(max, it.quantity),
            maxStock: it.maxStock,
            qtyStep: it.qtyStep,
          });
        }
      }
      loadItems([...map.values()]);

      if (res.issues && res.issues.length > 0) {
        toast.warning(res.issues[0], { description: t('sp.cartUpdatedByAvailability') });
      } else {
        toast.success(t('sp.itemsAddedToCart'));
      }
      router.push('/cart');
    } catch {
      toast.error(t('sp.reorderFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant={variant} size={size} className={`gap-1.5 ${className ?? ''}`} disabled={loading} onClick={handleReorder}>
      <RotateCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
      {resolvedLabel}
    </Button>
  );
}
