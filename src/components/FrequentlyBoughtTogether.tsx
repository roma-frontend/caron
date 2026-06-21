'use client';

import { useMemo, useRef, useState } from 'react';
import { useQuery } from 'convex/react';
import Image from 'next/image';
import { Plus, Check, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/formatters';
import { useCartStore } from '@/store/cart';
import { flyProductToTarget } from '@/lib/flyToTarget';
import { normalizeImageUrl } from '../../convex/lib/imageUrl';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

interface BaseProduct {
  id: Id<'products'>;
  name: string;
  price: number;
  retailDiscount?: number;
  image: string | null;
  categoryId: Id<'categories'>;
  qtyStep?: number;
  stock: number;
}

/** Effective retail price after a product-level retail discount. */
function retailPrice(p: { price: number; retailDiscount?: number }): number {
  return p.retailDiscount && p.retailDiscount > 0
    ? Math.round(p.price * (1 - p.retailDiscount / 100))
    : p.price;
}

/**
 * WB/Ozon-style "Frequently bought together": the current product plus a few
 * complementary items from the same category. Checkboxes let the buyer pick
 * the set; the combined price updates and "add all" puts everything in the cart.
 */
export function FrequentlyBoughtTogether({ base }: { base: BaseProduct }) {
  const related = useQuery(api.products.list, { categoryId: base.categoryId, limit: 8 });
  const addItem = useCartStore((s) => s.addItem);
  const flyRefs = useRef<Record<string, HTMLElement | null>>({});

  const suggestions = useMemo(
    () => (related ?? []).filter((p) => p._id !== base.id && p.stock > 0).slice(0, 2),
    [related, base.id],
  );

  // Selected suggestion ids (the base product is always part of the bundle).
  // `null` means "untouched" → default to all suggestions selected.
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const effectiveSelected = selected ?? new Set(suggestions.map((p) => p._id));

  if (suggestions.length === 0) return null;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev ?? suggestions.map((p) => p._id));
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const selectedProducts = suggestions.filter((p) => effectiveSelected.has(p._id));
  const total = retailPrice(base) + selectedProducts.reduce((sum, p) => sum + retailPrice(p), 0);
  const itemCount = 1 + selectedProducts.length;

  const addAll = () => {
    addItem({ id: base.id, name: base.name, price: retailPrice(base), image: base.image, maxStock: base.stock, qtyStep: base.qtyStep ?? 1 });
    for (const p of selectedProducts) {
      addItem({ id: p._id, name: p.name, price: retailPrice(p), image: p.images?.[0] ?? null, maxStock: p.stock, qtyStep: p.qtyStep ?? 1 });
    }

    // Animate each chosen product flying to the cart, with a small stagger so
    // they "gather" and fly one after another.
    const flying: { id: string; image: string | null }[] = [
      { id: base.id, image: base.image },
      ...selectedProducts.map((p) => ({ id: p._id, image: p.images?.[0] ?? null })),
    ];
    flying.forEach((f, idx) => {
      window.setTimeout(() => {
        const el = flyRefs.current[f.id];
        if (el) flyProductToTarget({ triggerEl: el, kind: 'cart', imageSrc: f.image ? (normalizeImageUrl(f.image) ?? f.image) : null });
      }, idx * 140);
    });

    toast.success(`${itemCount} ապրանք ավելացվեց զամբյուղ`);
  };

  const cards: Array<{ id: string; name: string; price: number; image: string | null; locked: boolean; checked: boolean }> = [
    { id: base.id, name: base.name, price: retailPrice(base), image: base.image, locked: true, checked: true },
    ...suggestions.map((p) => ({ id: p._id, name: p.name, price: retailPrice(p), image: p.images?.[0] ?? null, locked: false, checked: effectiveSelected.has(p._id) })),
  ];

  return (
    <section className="mt-12">
      <h2 className="mb-6 text-xl font-bold px-4 sm:px-0">Հաճախ գնում են միասին</h2>
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:p-5 shadow-sm lg:flex-row lg:items-center">
        {/* Product row */}
        <div className="flex flex-1 flex-wrap items-center gap-2 sm:gap-3">
          {cards.map((c, i) => (
            <div key={c.id} className="flex items-center gap-2 sm:gap-3">
              {i > 0 && <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />}
              <label className={`group relative flex w-24 shrink-0 cursor-pointer flex-col gap-1 ${c.locked ? 'cursor-default' : ''}`}>
                <div ref={(el) => { flyRefs.current[c.id] = el; }} className={`relative aspect-square overflow-hidden rounded-xl border-2 bg-muted/40 transition-colors ${c.checked ? 'border-primary' : 'border-transparent'}`}>
                  {c.image ? (
                    <Image src={normalizeImageUrl(c.image) ?? c.image} alt={c.name} fill sizes="96px" className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-2xl">🔧</div>
                  )}
                  <span className={`absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-md border ${c.checked ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40 bg-background'}`}>
                    {c.checked && <Check className="h-3.5 w-3.5" />}
                  </span>
                  {!c.locked && (
                    <input type="checkbox" checked={c.checked} onChange={() => toggle(c.id)} className="absolute inset-0 cursor-pointer opacity-0" aria-label={`Ընտրել ${c.name}`} />
                  )}
                </div>
                <span className="line-clamp-2 text-[11px] leading-tight text-muted-foreground">{c.name}</span>
                <span className="text-xs font-bold text-primary">{formatPrice(c.price)}</span>
              </label>
            </div>
          ))}
        </div>

        {/* Total + action */}
        <div className="flex shrink-0 flex-col items-stretch gap-2 border-t pt-4 lg:w-56 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <div>
            <p className="text-xs text-muted-foreground">Ընդամենը {itemCount} ապրանք</p>
            <p className="text-2xl font-extrabold tracking-tight text-primary">{formatPrice(total)}</p>
          </div>
          <Button onClick={addAll} className="w-full gap-2 rounded-xl">
            <ShoppingCart className="h-4 w-4" /> Ավելացնել ընտրվածը
          </Button>
        </div>
      </div>
    </section>
  );
}
