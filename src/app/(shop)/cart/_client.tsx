'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ShoppingBag, Trash2, Gift } from 'lucide-react';
import Link from 'next/link';
import { useCartStore } from '@/store/cart';
import { formatPrice } from '@/lib/formatters';
import { useT } from '@/lib/i18n/admin';
import { useSettings } from '@/hooks/useSettings';
import { showUndoCountdownToast } from '@/lib/undoCountdownToast';
import { flyProductAway } from '@/lib/flyToTarget';
import Image from 'next/image';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { resolveCashback } from '../../../../convex/lib/loyalty';
import { ProductCard } from '@/components/cards/ProductCard';
import { QuantityStepper } from '@/components/QuantityStepper';

export default function CartPage() {
  const { t } = useT();
  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const totalPrice = useCartStore((s) => s.totalPrice());
  const settings = useSettings();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const toggleSelect = (id: string) => setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const knownIds = useRef(new Set(items.map((i) => i.id)));
  useEffect(() => {
    const newIds = items.filter((i) => !knownIds.current.has(i.id)).map((i) => i.id);
    if (newIds.length > 0) {
      setSelected((prev) => { const n = new Set(newIds); return n; });
    }
    knownIds.current = new Set(items.map((i) => i.id));
  }, [items]);
  const selectAll = () => setSelected(new Set(items.map((i) => i.id)));
  const deselectAll = () => setSelected(new Set());
  const allSelected = items.length > 0 && selected.size === items.length;

  const restoreCartItem = (item: typeof items[number]) => {
    const step = item.qtyStep || 1;
    for (let i = 0; i < item.quantity; i += step) {
      addItem({
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        maxStock: item.maxStock,
        qtyStep: item.qtyStep,
        sku: item.sku,
      });
    }
  };

  const handleBulkRemove = async () => {
    const removedItems = items.filter((i) => selected.has(i.id));
    if (removedItems.length === 0) return;

    const removedIds = removedItems.map((i) => i.id);
    setRemovingIds((prev) => new Set([...prev, ...removedIds]));

    removedItems.forEach((item) => {
      void flyProductAway({
        triggerEl: rowRefs.current[item.id] ?? null,
        kind: 'cart',
        imageSrc: item.image ?? null,
      });
    });

    await new Promise((resolve) => window.setTimeout(resolve, 240));

    removedItems.forEach((i) => removeItem(i.id));
    setSelected(new Set());
    setRemovingIds((prev) => {
      const next = new Set(prev);
      removedIds.forEach((id) => next.delete(id));
      return next;
    });

    showUndoCountdownToast({
      message: `${t('sc.cartCleared')} ${removedItems.length} ${t('sc.itemsUnit')}`,
      description: t('sc.restoreDeletedQuestion'),
      undoLabel: t('sc.restoreAll'),
      onUndo: () => {
        removedItems.forEach(restoreCartItem);
      },
    });
  };

  const featured = useQuery(api.products.getFeatured, {});

  const handleRemove = async (id: string, name: string, triggerEl?: HTMLElement | null) => {
    if (removingIds.has(id)) return;
    const removedItem = items.find((i) => i.id === id);

    setRemovingIds((prev) => new Set([...prev, id]));
    void flyProductAway({
      triggerEl: rowRefs.current[id] ?? triggerEl ?? null,
      kind: 'cart',
      imageSrc: removedItem?.image ?? null,
    });

    await new Promise((resolve) => window.setTimeout(resolve, 220));
    removeItem(id);
    setRemovingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    if (removedItem) {
      showUndoCountdownToast({
        message: t('sc.itemRemoved'),
        description: name,
        undoLabel: t('sc.undo'),
        onUndo: () => restoreCartItem(removedItem),
      });
    }
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto text-center max-w-[var(--container-max)] px-[var(--space-container)] py-[var(--space-16)]">
        <div className="flex flex-col items-center" style={{ gap: 'var(--space-4)' }}>
          <div className="flex items-center justify-center rounded-full bg-muted" style={{ height: '6rem', width: '6rem' }}>
            <ShoppingBag className="text-muted-foreground" style={{ height: '3rem', width: '3rem' }} />
          </div>
          <h1 className="font-bold" style={{ fontSize: 'var(--text-2xl)' }}>{t('sc.cartEmpty')}</h1>
          <p className="text-muted-foreground">{t('sc.cartEmptyDesc')}</p>
          <Link href="/products">
            <Button size="lg">{t('sc.continueShopping')}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[var(--container-max)] sm:px-[var(--space-container)] py-[var(--space-8)]">
      <h1 className="font-bold mx-4 sm:mx-0" style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-8)' }}>{t('sc.cartTitle')}</h1>
      <div className="grid gap-8 lg:grid-cols-3 px-4 sm:px-0">
        <div className="space-y-3 lg:col-span-2">
          {/* Toolbar */}
          <div className="flex items-center justify-between rounded-2xl border bg-card px-4 py-3 shadow-sm">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input type="checkbox" checked={allSelected} onChange={allSelected ? deselectAll : selectAll}
                className="h-4.5 w-4.5 rounded-md border-2 border-muted-foreground/40 accent-primary cursor-pointer" />
              <span className="text-sm font-medium">{allSelected ? t('sc.deselect') : t('sc.selectAll')}</span>
              <span className="text-xs text-muted-foreground">({items.length})</span>
            </label>
            {selected.size > 0 && (
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleBulkRemove}>
                <Trash2 className="h-3.5 w-3.5" /> {t('sc.delete')} ({selected.size})
              </Button>
            )}
          </div>

          {/* Items */}
          {items.map((item) => (
            <div
              key={item.id}
              ref={(el) => {
                rowRefs.current[item.id] = el;
              }}
              data-cart-row
              data-cart-row-id={item.id}
              className={`group relative flex items-center gap-3 sm:gap-4 rounded-2xl border bg-card p-3 sm:p-4 shadow-sm transition-all duration-300 hover:shadow-md ${selected.has(item.id) ? "ring-2 ring-primary/30 bg-primary/5" : ""} ${removingIds.has(item.id) ? "pointer-events-none opacity-0 translate-x-3 scale-[0.98]" : "opacity-100 translate-x-0 scale-100"}`}
            >
              {/* Checkbox */}
              <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)}
                disabled={removingIds.has(item.id)}
                className="h-4.5 w-4.5 shrink-0 rounded-md border-2 border-muted-foreground/40 accent-primary cursor-pointer" />

              {/* Image */}
              <Link href={`/products/${item.id}`} className="shrink-0">
                <div className="h-18 w-18 sm:h-20 sm:w-20 overflow-hidden rounded-xl bg-muted/50 ring-1 ring-border/50">
                  {item.image ? <Image src={item.image} alt={item.name} width={80} height={80} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" /> : <div className="flex h-full w-full items-center justify-center text-xl text-muted-foreground/40">🔧</div>}
                </div>
              </Link>

              {/* Content */}
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/products/${item.id}`} className="text-sm font-medium leading-snug line-clamp-2 transition-colors hover:text-primary">{item.name}</Link>
                  <button onClick={(e) => void handleRemove(item.id, item.name, e.currentTarget)} disabled={removingIds.has(item.id)} className="shrink-0 rounded-lg p-1.5 text-muted-foreground/60 transition-colors hover:text-destructive hover:bg-destructive/10 disabled:opacity-40" aria-label={t('sc.delete')}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {item.sku && <p className="text-xs text-muted-foreground">{t('sc.article')}: {item.sku}</p>}

                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
                  <QuantityStepper
                    value={item.quantity}
                    onChange={(n) => updateQuantity(item.id, n)}
                    step={item.qtyStep || 1}
                    min={item.qtyStep || 1}
                    max={item.maxStock ?? Infinity}
                    size="sm"
                  />
                  <div className="text-right">
                    <p className="text-base font-bold">{formatPrice(item.price * item.quantity)}</p>
                    {item.quantity > 1 && <p className="text-[11px] text-muted-foreground">{formatPrice(item.price)} / {t('sc.perUnit')}</p>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div>
          <Card style={{ boxShadow: 'var(--shadow-card)' }}>
            <CardHeader><CardTitle>{t('sc.orderSummary')}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {settings?.freeShippingThreshold ? (
                totalPrice >= settings.freeShippingThreshold ? (
                  <p className="rounded-lg bg-green-600/10 px-3 py-2 text-sm font-medium text-green-600 dark:text-green-400">{t('sc.freeShipping')}</p>
                ) : (
                  <div>
                    <p className="text-xs text-muted-foreground">{t('sc.addMore')} <span className="font-semibold text-foreground">{formatPrice(settings.freeShippingThreshold - totalPrice)}</span> {t('sc.forFreeShipping')}</p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${Math.min(100, (totalPrice / settings.freeShippingThreshold) * 100)}%` }} />
                    </div>
                  </div>
                )
              ) : null}
              <div className="flex justify-between" style={{ fontSize: 'var(--text-sm)' }}><span>{t('sc.subtotal')}</span><span>{formatPrice(totalPrice)}</span></div>
              <div className="flex justify-between" style={{ fontSize: 'var(--text-sm)' }}><span>{t('sc.shipping')}</span><span className="text-muted-foreground">{t('sc.calculatedAtCheckout')}</span></div>
              <Separator />
              <div className="flex justify-between font-bold" style={{ fontSize: 'var(--text-lg)' }}><span>{t('sc.total')}</span><span>{formatPrice(selected.size > 0 ? items.filter((i) => selected.has(i.id)).reduce((s, i) => s + i.price * i.quantity, 0) : totalPrice)}</span></div>
              {settings?.enableLoyalty && (() => {
                const chosen = selected.size > 0 ? items.filter((i) => selected.has(i.id)) : items;
                const orderAmount = chosen.reduce((s, i) => s + i.price * i.quantity, 0);
                const qty = chosen.reduce((s, i) => s + i.quantity, 0);
                const { percent: eff, points: pts } = resolveCashback(qty, orderAmount, settings.loyaltyTiers, settings.loyaltyPercent ?? 0);
                return pts > 0 ? (
                  <div className="flex items-center justify-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-600 dark:text-amber-400">
                    <Gift className="h-4 w-4" /> {t('sc.youWillGet')} +{pts} {t('sc.points')} ({eff}%) {t('sc.fromThisOrder')}
                  </div>
                ) : null;
              })()}
              {selected.size > 0 && selected.size < items.length && <p className="text-xs text-muted-foreground text-center">{selected.size} / {items.length} {t('sc.selected')}</p>}
              {selected.size === 0 ? (
                <Button variant="cta" size="xl" className="w-full" disabled> {t('sc.order')} </Button>
              ) : (
                <Link href="/checkout" onClick={() => { if (typeof window !== "undefined") sessionStorage.setItem("checkout-ids", JSON.stringify([...selected])); }} className="block">
                  <Button variant="cta" size="xl" className="w-full">{t('sc.order')} ({selected.size})</Button>
                </Link>
              )}
              <Link href="/products" className="block">
                <Button variant="outline" size="lg" className="w-full">{t('sc.continueShopping')}</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cross-sell */}
      {featured && featured.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold mb-6 mx-4 sm:mx-0">{t('sc.crossSell')}</h2>
          <div className="grid grid-cols-[repeat(var(--grid-cols),minmax(0,1fr))] [--grid-cols:2] md:[--grid-cols:4] gap-1 sm:gap-4">
            {featured.slice(0, 4).map((p, i) => (
              <ProductCard key={p._id} id={p._id} slug={p.slug} atgCode={p.atgCode} sku={p.sku} name={p.name} nameRu={p.nameRu} nameEn={p.nameEn} price={p.price} wholesalePrice={p.wholesalePrice} compareAtPrice={p.compareAtPrice} retailDiscount={p.retailDiscount} wholesaleDiscount={p.wholesaleDiscount} image={p.images?.[0]} inStock={p.stock > 0} stock={p.stock} qtyStep={p.qtyStep} rating={p.rating} reviewCount={p.reviewCount} carBrand={p.attributes?.carBrand} attributes={p.attributes} index={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
