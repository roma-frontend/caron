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
import { Check, ChevronLeft, ChevronRight, ShoppingBag, User, MapPin, ClipboardList } from 'lucide-react';

const STEPS = [
  { id: 'info', label: 'Данные', icon: User },
  { id: 'delivery', label: 'Доставка', icon: MapPin },
  { id: 'confirm', label: 'Подтверждение', icon: ClipboardList },
];

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const totalPrice = useCartStore((s) => s.totalPrice());
  const clearCart = useCartStore((s) => s.clearCart);
  const createOrder = useMutation(api.orders.create);
  const settings = useSettings();
  const shippingCost = totalPrice >= (settings?.freeShippingThreshold ?? 20000) ? 0 : (settings?.deliveryYerevan ?? 0);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [animatedStep, setAnimatedStep] = useState(0);

  const [form, setForm] = useState({
    name: '', phone: '', email: '', address: '', notes: '',
  });

  const goToStep = (i: number) => {
    setAnimatedStep(i);
    setTimeout(() => setStep(i), 150);
  };

  const validateStep = (): boolean => {
    if (step === 0) {
      if (!form.name || !form.phone || !form.email) {
        toast.error('Լրացրեք անուն, հեռախոս и email');
        return false;
      }
    }
    if (step === 1) {
      if (!form.address) {
        toast.error('Լրացրեք адрес доставки');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast.error('Զամբյուղը дарк է');
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
      toast.error('Ошибка при оформлении заказа');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-muted">
          <ShoppingBag className="h-10 w-10 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">Զամբյուղը дарк է</p>
        <Link href="/cart" className="mt-2 inline-block text-primary underline">Перейти в корзину</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingBlock: 'var(--space-8)' }}>
      <h1 className="font-bold text-3xl mb-8">{CHECKOUT.title}</h1>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <button onClick={() => i < step ? goToStep(i) : null} className={`flex items-center gap-2 ${i < step ? 'cursor-pointer' : 'cursor-default'}`}>
                <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all duration-300 ${
                  i < step ? 'bg-primary text-primary-foreground scale-110' :
                  i === step ? 'bg-primary/10 text-primary ring-2 ring-primary/30' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {i < step ? <Check className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
                </div>
                <span className={`hidden sm:inline text-sm font-medium ${
                  i <= step ? 'text-foreground' : 'text-muted-foreground'
                }`}>{s.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className="mx-4 h-0.5 w-12 sm:w-24 rounded-full transition-colors duration-300" style={{ background: i < step ? 'var(--primary)' : 'var(--border)' }} />
              )}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); step === STEPS.length - 1 ? handleSubmit() : (validateStep() && goToStep(step + 1)); }} className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {step === 0 && (
            <Card style={{ boxShadow: 'var(--shadow-card)' }} className="animate-in slide-in-from-right-4 duration-300">
              <CardHeader><CardTitle>{CHECKOUT.contactInfo}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label>{CHECKOUT.fullName} *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Аннон" className="h-11" /></div>
                  <div><Label>{CHECKOUT.phone} *</Label><Input required type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder={settings?.phone || "+374 XX XXX XXX"} className="h-11" /></div>
                </div>
                <div><Label>{CHECKOUT.email} *</Label><Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" className="h-11" /></div>
              </CardContent>
            </Card>
          )}

          {step === 1 && (
            <Card style={{ boxShadow: 'var(--shadow-card)' }} className="animate-in slide-in-from-right-4 duration-300">
              <CardHeader><CardTitle>Адрес доставки</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><Label>{CHECKOUT.address} *</Label><Input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Ереван, ул. Антарайн 1" className="h-11" /></div>
                <div><Label>{CHECKOUT.notes}</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={CHECKOUT.notesPlaceholder} rows={3} /></div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card style={{ boxShadow: 'var(--shadow-card)' }} className="animate-in slide-in-from-right-4 duration-300">
              <CardHeader><CardTitle>Подтверждение заказа</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                  <p className="text-sm font-medium">Контактные данные</p>
                  <p className="text-sm text-muted-foreground">{form.name} | {form.phone} | {form.email}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                  <p className="text-sm font-medium">Адрес доставки</p>
                  <p className="text-sm text-muted-foreground">{form.address}</p>
                  {form.notes && <p className="text-sm text-muted-foreground">Примечание: {form.notes}</p>}
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="rounded border-input accent-primary" />
                  <span className="text-sm text-muted-foreground">Я согласен с <Link href="/terms" className="text-primary underline">условиями</Link> и <Link href="/privacy" className="text-primary underline">политикой конфиденциальности</Link></span>
                </label>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between">
            {step > 0 ? (
              <Button type="button" variant="outline" size="lg" onClick={() => goToStep(step - 1)} className="gap-2">
                <ChevronLeft className="h-4 w-4" /> Назад
              </Button>
            ) : <div />}
            <Button type="submit" variant="cta" size="lg" className="gap-2" disabled={loading || (step === STEPS.length - 1 && !agreed)}>
              {step === STEPS.length - 1 ? (
                loading ? 'Оформление...' : `${CHECKOUT.placeOrder} — ${formatPrice(totalPrice + shippingCost)}`
              ) : (
                <>Далее <ChevronRight className="h-4 w-4" /></>
              )}
            </Button>
          </div>
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
              <div className="flex justify-between" style={{ fontSize: 'var(--text-sm)' }}><span>{CART.shipping}</span><span>{shippingCost === 0 ? 'Анвчар' : formatPrice(shippingCost)}</span></div>
              <Separator />
              <div className="flex justify-between font-bold" style={{ fontSize: 'var(--text-lg)' }}><span>{CART.total}</span><span>{formatPrice(totalPrice + shippingCost)}</span></div>
              <p className="text-center text-muted-foreground" style={{ fontSize: 'var(--text-xs)' }}>{CHECKOUT.paymentNote}</p>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
