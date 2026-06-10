'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ShoppingBag, Minus, Plus, Trash2, Undo2 } from 'lucide-react';
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
        <div className="space-y-4 lg:col-span-2">
          {items.map((item) => (
            <div key={item.id} className="flex gap-4 rounded-xl border p-3 sm:p-4 animate-in slide-in-from-right-4 duration-200" style={{ boxShadow: 'var(--shadow-xs)' }}>
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">{item.image ? <Image src={item.image} alt={item.name} width={80} height={80} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-2xl">🔧</div>}</div>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium line-clamp-2"><Link href={`/products/${item.id}`} className="transition-colors hover:text-primary">{item.name}</Link></h3>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10" onClick={() => handleRemove(item.id, item.name)} aria-label="Ջնջել">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <p className="font-bold text-primary" style={{ fontSize: 'var(--text-sm)' }}>{formatPrice(item.price)}</p>
                <div className="mt-auto flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8 hover:bg-accent"
                      onClick={() => { const step = item.qtyStep || 1; if (item.quantity - step <= 0) { handleRemove(item.id, item.name); } else { updateQuantity(item.id, item.quantity - step); } }}
                      disabled={item.quantity <= (item.qtyStep || 1)} aria-label="Նվազեցնել քանակը">
                      <Minus className="h-3 w-3" />
                    </Button>
                    <input type="number" value={item.quantity} onChange={(e) => { const v = parseInt(e.target.value); if (v > 0) updateQuantity(item.id, v); }} className="w-10 text-center text-sm font-medium bg-transparent border-none outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" min={1} aria-label="Քանակ" />
                    <Button variant="outline" size="icon" className="h-8 w-8 hover:bg-accent"
                      onClick={() => { const step = item.qtyStep || 1; updateQuantity(item.id, item.quantity + step); }}
                      disabled={item.maxStock != null && item.quantity >= item.maxStock} aria-label="Ավելացնել քանակը">
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <span className="font-bold">{formatPrice(item.price * item.quantity)}</span>
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
              <ProductCard key={p._id} id={p._id} slug={p.slug} atgCode={p.atgCode} name={p.name} price={p.price} wholesalePrice={p.wholesalePrice} compareAtPrice={p.compareAtPrice} image={p.images?.[0]} inStock={p.stock > 0} stock={p.stock} qtyStep={p.qtyStep} rating={p.rating} reviewCount={p.reviewCount} carBrand={p.attributes?.carBrand} attributes={p.attributes} index={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
