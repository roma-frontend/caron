'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ShoppingBag, Minus, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useCartStore } from '@/store/cart';
import { formatPrice } from '@/lib/formatters';
import { CART } from '@/lib/constants';
import Image from 'next/image';

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const totalPrice = useCartStore((s) => s.totalPrice());

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
            <div key={item.id} className="flex items-center gap-4 rounded-xl border p-4" style={{ boxShadow: 'var(--shadow-xs)' }}>
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">{item.image ? <Image src={item.image} alt={item.name} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-2xl">🔧</div>}</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate"><Link href={`/products/${item.id}`} className="hover:text-primary transition-colors">{item.name}</Link></h3>
                <p className="text-primary font-bold" style={{ fontSize: 'var(--text-sm)' }}>{formatPrice(item.price)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center font-medium">{item.quantity}</span>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <span className="font-bold w-24 text-right">{formatPrice(item.price * item.quantity)}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(item.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <div>
          <Card style={{ boxShadow: 'var(--shadow-card)' }}>
            <CardHeader><CardTitle>{CART.orderSummary}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between" style={{ fontSize: 'var(--text-sm)' }}><span>{CART.subtotal}</span><span>{formatPrice(totalPrice)}</span></div>
              <div className="flex justify-between" style={{ fontSize: 'var(--text-sm)' }}><span>{CART.shipping}</span><span>0 ֏</span></div>
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
    </div>
  );
}
