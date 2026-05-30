'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useCartStore } from '@/store/cart';
import { formatPrice } from '@/lib/formatters';
import { CHECKOUT, CART } from '@/lib/constants';
import { useMutation } from 'convex/react';
import { useSettings } from '@/hooks/useSettings';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { toast } from 'sonner';
import Link from 'next/link';

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const totalPrice = useCartStore((s) => s.totalPrice());
  const clearCart = useCartStore((s) => s.clearCart);
  const createOrder = useMutation(api.orders.create);
  const settings = useSettings();
  const shippingCost = totalPrice >= (settings?.freeShippingThreshold ?? 20000) ? 0 : (settings?.deliveryYerevan ?? 0);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const [form, setForm] = useState({
    name: '', phone: '', email: '', address: '', notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.email || !form.address) {
      toast.error('խնդրում ենք լրացնել բոլոր պարտադիր դաշտերը');
      return;
    }
    if (items.length === 0) {
      toast.error('Զամբյուղը դատարկ է');
      return;
    }

    setLoading(true);
    try {
      const orderId = await createOrder({
        customerName: form.name,
        customerEmail: form.email,
        customerPhone: form.phone,
        shippingAddress: form.address,
        notes: form.notes || undefined,
        items: items.map((i) => ({
          productId: i.id as Id<'products'>,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          imageUrl: i.image ?? undefined,
        })),
        subtotal: totalPrice,
        shipping: shippingCost,
        total: totalPrice + shippingCost,
      });
      clearCart();
      router.push(`/order-success?id=${orderId}`);
    } catch {
      toast.error('Սխալ առաջացել է պատվիրման ընթացքում');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Զամբյուղը դատարկ է</p>
        <Link href="/cart" className="mt-2 inline-block text-primary underline">Անցնել զամբյուղ</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingBlock: 'var(--space-8)' }}>
      <h1 className="font-bold" style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-8)' }}>{CHECKOUT.title}</h1>
      <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card style={{ boxShadow: 'var(--shadow-card)' }}>
            <CardHeader><CardTitle>{CHECKOUT.contactInfo}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label>{CHECKOUT.fullName} *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Անուն" className="h-11" /></div>
                <div><Label>{CHECKOUT.phone} *</Label><Input required type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder={settings?.phone || "+374..."} className="h-11" /></div>
              </div>
              <div><Label>{CHECKOUT.email} *</Label><Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" className="h-11" /></div>
              <div><Label>{CHECKOUT.address} *</Label><Input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Երևան, Անտառային փողոց 1" className="h-11" /></div>
              <div><Label>{CHECKOUT.notes}</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={CHECKOUT.notesPlaceholder} rows={3} /></div>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card className="sticky top-20" style={{ boxShadow: 'var(--shadow-card)' }}>
            <CardHeader><CardTitle>{CART.orderSummary}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="truncate flex-1">{item.name} × {item.quantity}</span>
                  <span className="font-medium ml-2">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between" style={{ fontSize: 'var(--text-sm)' }}><span>{CART.subtotal}</span><span>{formatPrice(totalPrice)}</span></div>
              <div className="flex justify-between" style={{ fontSize: 'var(--text-sm)' }}><span>{CART.shipping}</span><span>{shippingCost === 0 ? 'Անվճար' : formatPrice(shippingCost)}</span></div>
              <Separator />
              <div className="flex justify-between font-bold" style={{ fontSize: 'var(--text-lg)' }}><span>{CART.total}</span><span>{formatPrice(totalPrice + shippingCost)}</span></div>
              <Button type="submit" variant="cta" size="xl" className="w-full" disabled={loading}>
                {loading ? 'Բեռնվում է...' : CHECKOUT.placeOrder}
              </Button>
              <p className="text-center text-muted-foreground" style={{ fontSize: 'var(--text-xs)' }}>{CHECKOUT.paymentNote}</p>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
