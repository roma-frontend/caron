'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ShoppingBag, Minus, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useCartStore } from '@/store/cart';
import { formatPrice } from '@/lib/formatters';
import { CART } from '@/lib/constants';
import { useSettings } from '@/hooks/useSettings';
import { toast } from 'sonner';
import Image from 'next/image';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { ProductCard } from '@/components/cards/ProductCard';

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const undoRemove = useCartStore((s) => s.undoRemove);
  const totalPrice = useCartStore((s) => s.totalPrice());
  const settings = useSettings();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll = () => setSelected(new Set(items.map((i) => i.id)));
  const deselectAll = () => setSelected(new Set());
  const allSelected = items.length > 0 && selected.size === items.length;
  const handleBulkRemove = () => { selected.forEach((id) => removeItem(id)); setSelected(new Set()); toast.success(`${selected.size} ապրանք ջնջվեց`); };

  const featured = useQuery(api.products.getFeatured, {});

  const handleRemove = (id: string, name: string) => {
    removeItem(id);
    toast.success(`${name} Ջնջվեց`, {
      action: { label: 'Չեղարկել', onClick: () => undoRemove() },
      duration: 5000,
    });
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto text-center" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingBlock: 'var(--space-16)' }}>
        <div className="flex flex-col items-center" style={{ gap: 'var(--space-4)' }}>
          <div className="flex items-center justify-center rounded-full bg-muted" style={{ height: '6rem', width: '6rem' }}>
            <ShoppingBag className="text-muted-foreground" style={{ height: '3rem', width: '3rem' }} />
          </div>
          <h1 className="font-bold" style={{ fontSize: 'var(--text-2xl)' }}>{CART.empty}</h1>
          <p className="text-muted-foreground">{CART.emptyDesc}</p>
          <Link href="/products">
            <Button size="lg">{CART.continueShopping}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingBlock: 'var(--space-8)' }}>
      <h1 className="font-bold" style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-8)' }}>{CART.title}</h1>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {/* Toolbar */}
          <div className="flex items-center justify-between rounded-2xl border bg-card px-4 py-3 shadow-sm">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input type="checkbox" checked={allSelected} onChange={allSelected ? deselectAll : selectAll}
                className="h-[18px] w-[18px] rounded-md border-2 border-muted-foreground/40 accent-primary cursor-pointer" />
              <span className="text-sm font-medium">{allSelected ? 'Հանել նշումը' : 'Ընտրել բոլորը'}</span>
              <span className="text-xs text-muted-foreground">({items.length})</span>
            </label>
            {selected.size > 0 && (
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleBulkRemove}>
                <Trash2 className="h-3.5 w-3.5" /> Ջնջել ({selected.size})
              </Button>
            )}
          </div>

          {/* Items */}
          {items.map((item) => (
            <div key={item.id} className={`group relative flex items-center gap-3 sm:gap-4 rounded-2xl border bg-card p-3 sm:p-4 shadow-sm transition-all duration-200 hover:shadow-md ${selected.has(item.id) ? "ring-2 ring-primary/30 bg-primary/5" : ""}`}>
              {/* Checkbox */}
              <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)}
                className="h-[18px] w-[18px] shrink-0 rounded-md border-2 border-muted-foreground/40 accent-primary cursor-pointer" />

              {/* Image */}
              <Link href={`/products/${item.id}`} className="shrink-0">
                <div className="h-[72px] w-[72px] sm:h-20 sm:w-20 overflow-hidden rounded-xl bg-muted/50 ring-1 ring-border/50">
                  {item.image ? <Image src={item.image} alt={item.name} width={80} height={80} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" /> : <div className="flex h-full w-full items-center justify-center text-xl text-muted-foreground/40">🔧</div>}
                </div>
              </Link>

              {/* Content */}
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/products/${item.id}`} className="text-sm font-medium leading-snug line-clamp-2 transition-colors hover:text-primary">{item.name}</Link>
                  <button onClick={() => handleRemove(item.id, item.name)} className="shrink-0 rounded-lg p-1.5 text-muted-foreground/60 transition-colors hover:text-destructive hover:bg-destructive/10" aria-label="Ջնջել">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {item.sku && <p className="text-xs text-muted-foreground">Արտիկուլ: {item.sku}</p>}

                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-0.5 rounded-full border bg-muted/30 p-0.5">
                    <button onClick={() => { const step = item.qtyStep || 1; if (item.quantity - step <= 0) { handleRemove(item.id, item.name); } else { updateQuantity(item.id, item.quantity - step); } }}
                      disabled={item.quantity <= (item.qtyStep || 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-background disabled:opacity-30">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="min-w-[28px] text-center text-sm font-semibold">{item.quantity}</span>
                    <button onClick={() => { const step = item.qtyStep || 1; updateQuantity(item.id, item.quantity + step); }}
                      disabled={item.maxStock != null && item.quantity >= item.maxStock}
                      className="flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-background disabled:opacity-30">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold">{formatPrice(item.price * item.quantity)}</p>
                    {item.quantity > 1 && <p className="text-[11px] text-muted-foreground">{formatPrice(item.price)} / հատ</p>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div>
          <Card style={{ boxShadow: 'var(--shadow-card)' }}>
            <CardHeader><CardTitle>{CART.orderSummary}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {settings?.freeShippingThreshold ? (
                totalPrice >= settings.freeShippingThreshold ? (
                  <p className="rounded-lg bg-green-600/10 px-3 py-2 text-sm font-medium text-green-600 dark:text-green-400">Անվճար առաքում!</p>
                ) : (
                  <div>
                    <p className="text-xs text-muted-foreground">Ավելացրեք ևս <span className="font-semibold text-foreground">{formatPrice(settings.freeShippingThreshold - totalPrice)}</span> անվճար առաքման համար</p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${Math.min(100, (totalPrice / settings.freeShippingThreshold) * 100)}%` }} />
                    </div>
                  </div>
                )
              ) : null}
              <div className="flex justify-between" style={{ fontSize: 'var(--text-sm)' }}><span>{CART.subtotal}</span><span>{formatPrice(totalPrice)}</span></div>
              <div className="flex justify-between" style={{ fontSize: 'var(--text-sm)' }}><span>{CART.shipping}</span><span className="text-muted-foreground">Հաշվարկվում է պատվիրելիս</span></div>
              <Separator />
              <div className="flex justify-between font-bold" style={{ fontSize: 'var(--text-lg)' }}><span>{CART.total}</span><span>{formatPrice(totalPrice)}</span></div>
              <Link href="/checkout" className="block">
                <Button variant="cta" size="xl" className="w-full">{CART.checkout}</Button>
              </Link>
              <Link href="/products" className="block">
                <Button variant="outline" size="lg" className="w-full">{CART.continueShopping}</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cross-sell */}
      {featured && featured.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold mb-6">Այս ապրանքի հետ գնում են</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {featured.slice(0, 4).map((p, i) => (
              <ProductCard key={p._id} id={p._id} slug={p.slug} atgCode={p.atgCode} sku={p.sku} name={p.name} price={p.price} wholesalePrice={p.wholesalePrice} compareAtPrice={p.compareAtPrice} retailDiscount={p.retailDiscount} wholesaleDiscount={p.wholesaleDiscount} image={p.images?.[0]} inStock={p.stock > 0} stock={p.stock} qtyStep={p.qtyStep} rating={p.rating} reviewCount={p.reviewCount} carBrand={p.attributes?.carBrand} attributes={p.attributes} index={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
