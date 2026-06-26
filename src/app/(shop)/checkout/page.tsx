'use client';

import { useState, useEffect } from 'react';
import { numericInputProps } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useCartStore } from '@/store/cart';
import { formatPrice, localizeDeliveryEstimate } from '@/lib/formatters';
import { useT } from '@/lib/i18n/admin';
import { useMutation, useQuery } from 'convex/react';
import { useSettings } from '@/hooks/useSettings';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { toast } from 'sonner';
import Link from 'next/link';
import { Check, ChevronLeft, ChevronRight, ShoppingBag, User, MapPin, ClipboardList, CreditCard, Banknote, Smartphone, Building2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth';

type ValidationDiffItem = {
  id: string;
  name: string;
  beforeQty: number;
  afterQty: number;
  beforePrice: number;
  afterPrice: number;
  removed: boolean;
};

const STEPS = [
  { id: 'info', label: 'sc.stepInfo', icon: User },
  { id: 'delivery', label: 'sc.shipping', icon: MapPin },
  { id: 'confirm', label: 'sc.stepConfirm', icon: ClipboardList },
];

export default function CheckoutPage() {
  const { t, lang } = useT();
  const router = useRouter();
  const allItems = useCartStore((s) => s.items);
  const [checkoutIds] = useState<string[]>(() => {
    try {
      const ids = JSON.parse(sessionStorage.getItem('checkout-ids') || '[]');
      return ids.length ? ids : [];
    } catch {
      return [];
    }
  });
  const items = checkoutIds.length > 0 ? allItems.filter((i) => checkoutIds.includes(i.id)) : allItems;
  const totalPrice = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const clearCart = useCartStore((s) => s.clearCart);
  const loadItems = useCartStore((s) => s.loadItems);
  const createOrder = useMutation(api.orders.create);
  const validateCart = useMutation(api.orders.validateCart);
  const applyCoupon = useMutation(api.coupons.apply);
  const settings = useSettings();
  const shippingCost = totalPrice >= (settings?.freeShippingThreshold ?? 20000) ? 0 : (settings?.deliveryYerevan ?? 0);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [validationDiff, setValidationDiff] = useState<ValidationDiffItem[]>([]);

  const [pickup, setPickup] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const coupon = useQuery(api.coupons.validate, couponCode.trim() ? { code: couponCode.trim(), orderTotal: totalPrice + shippingCost } : 'skip');
  const [form, setForm] = useState({
    name: '', phone: '', email: '', address: '', notes: '',
  });

  const currentUser = useAuthStore((s) => s.user);
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const me = useQuery(api.auth.me, sessionToken ? { sessionToken } : 'skip');
  const loyalty = useQuery(api.loyalty.getBalance, sessionToken ? { sessionToken } : 'skip');
  const [pointsToSpend, setPointsToSpend] = useState(0);
  const orderTotalBeforePoints = totalPrice + shippingCost - (coupon?.discount ?? 0);
  const maxRedeemable = Math.max(0, Math.min(loyalty?.points ?? 0, orderTotalBeforePoints));
  const appliedPoints = Math.max(0, Math.min(pointsToSpend, maxRedeemable));

  useEffect(() => {
    const u = me ?? currentUser;
    if (u) {
      // Prefill fields once user data arrives; keep user-entered values intact.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm((prev) => ({
        ...prev,
        name: prev.name || u.name || '',
        email: prev.email || u.email || '',
        phone: prev.phone || ('phone' in u ? u.phone : undefined) || '',
        address: prev.address || ('address' in u ? (u.address as string) : undefined) || '',
      }));
    }
  }, [me, currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const goToStep = (i: number) => {
    setTimeout(() => setStep(i), 150);
  };

  const validateStep = (): boolean => {
    if (step === 0) {
      if (!form.name || !form.phone || !form.email) {
        toast.error(t('sc.fillNamePhoneEmail'));
        return false;
      }
    }
    if (step === 1) {
      if (!form.address) {
        toast.error(t('sc.fillAddress'));
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast.error(t('sc.cartEmpty'));
      return;
    }
    if (!agreed) {
      toast.error(t('sc.agreeTerms'));
      return;
    }
    if ((settings?.paymentMethods?.length ?? 0) > 0 && !paymentMethod) {
      toast.error(t('sc.selectPayment'));
      return;
    }
    if (settings?.minOrderAmount && totalPrice < settings.minOrderAmount) {
      toast.error(`${t('sc.minOrderPrefix')} ${formatPrice(settings.minOrderAmount)} ${t('sc.minOrderSuffix')}`);
      return;
    }
    setLoading(true);
    try {
      const beforeMap = new Map(items.map((i) => [i.id, i]));

      const validation = await validateCart({
        items: items.map((i) => ({
          productId: i.id as Id<'products'>,
          quantity: i.quantity,
        })),
      });

      if (validation.changed) {
        const diff: ValidationDiffItem[] = [];
        const afterMap = new Map(validation.items.map((i) => [i.id, i]));

        for (const before of items) {
          const after = afterMap.get(before.id);
          if (!after) {
            diff.push({
              id: before.id,
              name: before.name,
              beforeQty: before.quantity,
              afterQty: 0,
              beforePrice: before.price,
              afterPrice: before.price,
              removed: true,
            });
            continue;
          }
          if (after.quantity !== before.quantity || after.price !== before.price) {
            diff.push({
              id: before.id,
              name: before.name,
              beforeQty: before.quantity,
              afterQty: after.quantity,
              beforePrice: before.price,
              afterPrice: after.price,
              removed: false,
            });
          }
        }

        for (const after of validation.items) {
          if (!beforeMap.has(after.id)) {
            diff.push({
              id: after.id,
              name: after.name,
              beforeQty: 0,
              afterQty: after.quantity,
              beforePrice: after.price,
              afterPrice: after.price,
              removed: false,
            });
          }
        }

        setValidationDiff(diff);
        loadItems(validation.items.map((i) => ({
          id: i.id,
          name: i.name,
          price: i.price,
          image: i.image,
          quantity: i.quantity,
          maxStock: i.maxStock,
          qtyStep: i.qtyStep,
        })));
        const msg = validation.issues[0] || t('sc.cartUpdatedRetry');
        toast.error(msg);
        return;
      }

      setValidationDiff([]);

      const validatedSubtotal = validation.subtotal;
      const validatedShipping = validatedSubtotal >= (settings?.freeShippingThreshold ?? 20000)
        ? 0
        : (settings?.deliveryYerevan ?? 0);

      const orderId = await createOrder({
        sessionToken: sessionToken || undefined,
        customerName: form.name,
        customerEmail: form.email,
        customerPhone: form.phone,
        shippingAddress: form.address,
        paymentMethod: paymentMethod || undefined,
        notes: form.notes || undefined,
        pointsToSpend: appliedPoints > 0 ? appliedPoints : undefined,
        items: validation.items.map((i) => ({
          productId: i.id as Id<'products'>,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          imageUrl: i.image ?? undefined,
        })),
        subtotal: validatedSubtotal,
        shipping: validatedShipping,
        total: validatedSubtotal + validatedShipping,
      });
      if (coupon) {
        applyCoupon({ code: couponCode.trim() }).catch(() => {});
      }
      clearCart();
      router.push(`/order-success?id=${orderId}`);
    } catch {
      toast.error(t('sc.orderError'));
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
        <p className="text-muted-foreground">{t('sc.cartEmpty')}</p>
        <Link href="/cart" className="mt-2 inline-block text-primary underline">{t('sc.goToCart')}</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[var(--container-max)] sm:px-[var(--space-container)] py-[var(--space-8)]">
      <h1 className="font-bold text-3xl mb-8">{t('sc.order')}</h1>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <button
                onClick={() => {
                  if (i < step) goToStep(i);
                }}
                className={`flex items-center gap-2 ${i < step ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all duration-300 ${
                  i < step ? 'bg-primary text-primary-foreground scale-110' :
                  i === step ? 'bg-primary/10 text-primary ring-2 ring-primary/30' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {i < step ? <Check className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
                </div>
                <span className={`hidden sm:inline text-sm font-medium ${
                  i <= step ? 'text-foreground' : 'text-muted-foreground'
                }`}>{s.label && t(s.label)}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className="mx-4 h-0.5 w-12 sm:w-24 rounded-full transition-colors duration-300" style={{ background: i < step ? 'var(--primary)' : 'var(--border)' }} />
              )}
            </div>
          ))}
        </div>
      </div>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (step === STEPS.length - 1) {
            void handleSubmit();
            return;
          }
          if (validateStep()) {
            goToStep(step + 1);
          }
        }}
        className="grid gap-8 lg:grid-cols-3"
      >
        <div className="space-y-6 lg:col-span-2">
          {step === 0 && (
            <Card style={{ boxShadow: 'var(--shadow-card)' }} className="animate-in slide-in-from-right-4 duration-300">
              <CardHeader><CardTitle>{t('sc.contactInfo')}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label>{t('sc.fullName')} *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('sc.fullName')} className="h-11" /></div>
                  <div><Label>{t('sc.phone')} *</Label><Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder={settings?.phone || "+374 XX XXX XXX"} className="h-11" /></div>
                </div>
                <div><Label>{t('sc.email')} *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder={t('sc.yourEmail')} className="h-11" /></div>
              </CardContent>
            </Card>
          )}

          {step === 1 && (
            <Card style={{ boxShadow: 'var(--shadow-card)' }} className="animate-in slide-in-from-right-4 duration-300">
              <CardHeader><CardTitle>{t('sc.shippingAddress')}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {settings?.enablePickup && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={pickup} onChange={(e) => setPickup(e.target.checked)} className="rounded border-input accent-primary" />
                    <span className="text-sm font-medium">{t('sc.pickup')}</span>
                    {settings.pickupAddress && <span className="text-xs text-muted-foreground">{settings.pickupAddress}</span>}
                  </label>
                )}
                {!pickup && <div><Label>{t('sc.address')} *</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder={t('sc.yerevan')} className="h-11" /></div>}
                <div><Label>{t('sc.notes')}</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={t('sc.notesPlaceholder')} rows={3} /></div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card style={{ boxShadow: 'var(--shadow-card)' }} className="animate-in slide-in-from-right-4 duration-300">
              <CardHeader><CardTitle>{t('sc.orderConfirm')}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {validationDiff.length > 0 && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/30">
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">{t('sc.cartUpdated')}</p>
                    <p className="mt-1 text-xs text-amber-800/90 dark:text-amber-300/90">{t('sc.checkChangesPrefix')} «{t('sc.order')}»:</p>
                    <div className="mt-3 space-y-2">
                      {validationDiff.map((d) => (
                        <div key={d.id} className="rounded-md border border-amber-200 bg-white/80 px-3 py-2 text-xs dark:border-amber-800 dark:bg-amber-950/40">
                          <p className="font-medium text-foreground">{d.name}</p>
                          {d.removed ? (
                            <p className="mt-1 text-rose-600 dark:text-rose-400">{t('sc.removedFromCart')}</p>
                          ) : (
                            <>
                              {(d.beforeQty !== d.afterQty) && (
                                <p className="mt-1 text-muted-foreground">{t('sc.quantity')}: <span className="line-through">{d.beforeQty}</span> → <span className="font-semibold text-foreground">{d.afterQty}</span></p>
                              )}
                              {(d.beforePrice !== d.afterPrice) && (
                                <p className="mt-1 text-muted-foreground">{t('sc.price')}: <span className="line-through">{formatPrice(d.beforePrice)}</span> → <span className="font-semibold text-foreground">{formatPrice(d.afterPrice)}</span></p>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="rounded-xl border-2 border-amber-200 bg-amber-50/60 p-4 space-y-3 dark:border-amber-800 dark:bg-amber-950/30">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{t('sc.dearCustomer')}</p>
                  <ul className="space-y-2 text-sm text-amber-700 dark:text-amber-400">
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-[10px] font-bold text-amber-800 dark:bg-amber-800 dark:text-amber-200">1</span>
                      {t('sc.checkContact')}
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-[10px] font-bold text-amber-800 dark:bg-amber-800 dark:text-amber-200">2</span>
                      {t('sc.checkAddress')}
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-[10px] font-bold text-amber-800 dark:bg-amber-800 dark:text-amber-200">3</span>
                      {t('sc.wrongDataWarning')}
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-[10px] font-bold text-amber-800 dark:bg-amber-800 dark:text-amber-200">4</span>
                      {t('sc.afterConfirmClick')}
                    </li>
                  </ul>
                </div>
                {settings?.paymentMethods && settings.paymentMethods.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-medium">{t('sc.paymentMethod')}</p>
                    <div className="flex flex-wrap gap-2">
                      {settings.paymentMethods.map((m) => {
                        const icons: Record<string, typeof CreditCard> = { cash: Banknote, card: CreditCard, idram: Smartphone, easypay: Smartphone, transfer: Building2 };
                        const Icon = icons[m] || CreditCard;
                        const labels: Record<string, string> = { cash: 'sc.cash', card: 'sc.card', idram: 'Idram', easypay: 'EasyPay', transfer: 'sc.bankTransfer' };
                        return (
                          <button key={m} type="button" onClick={() => setPaymentMethod(m)}
                            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition-all ${paymentMethod === m ? 'border-primary bg-primary/10 text-primary' : 'hover:border-primary/40'}`}>
                            <Icon className="h-4 w-4" /> {t(labels[m] || m)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {paymentMethod === 'transfer' && settings?.bankName && (
                  <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4 space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">{t('sc.paymentDetails')}</p>
                    <p className="text-sm">{t('sc.bank')}՝ <strong>{settings.bankName}</strong></p>
                    {settings?.bankAccount && <p className="text-sm break-all">{t('sc.account')}՝ <strong className="font-mono text-sm sm:text-base">{settings.bankAccount}</strong></p>}
                    {settings?.bankCode && <p className="text-sm">SWIFT/BIC՝ <strong className="font-mono break-all">{settings.bankCode}</strong></p>}
                    {settings?.paymentNote && <p className="text-xs text-muted-foreground mt-2">{settings.paymentNote}</p>}
                  </div>
                )}
                {paymentMethod === 'idram' && settings?.cardNumber && (
                  <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4 space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">Idram {t('sc.cardWord')}</p>
                    <p className="text-sm break-all">{t('sc.number')}՝ <strong className="font-mono text-sm sm:text-base">{settings.cardNumber}</strong></p>
                    {settings?.paymentNote && <p className="text-xs text-muted-foreground mt-2">{settings.paymentNote}</p>}
                  </div>
                )}
                {paymentMethod === 'easypay' && settings?.cardNumber && (
                  <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4 space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">EasyPay {t('sc.cardWord')}</p>
                    <p className="text-sm break-all">{t('sc.number')}՝ <strong className="font-mono text-sm sm:text-base">{settings.cardNumber}</strong></p>
                    {settings?.paymentNote && <p className="text-xs text-muted-foreground mt-2">{settings.paymentNote}</p>}
                  </div>
                )}
                <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                  <p className="text-sm font-medium">{t('sc.contactInfo')}</p>
                  <p className="text-sm text-muted-foreground">{form.name} | {form.phone} | {form.email}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                  <p className="text-sm font-medium">{t('sc.shippingAddress')}</p>
                  <p className="text-sm text-muted-foreground">{form.address}</p>
                  {form.notes && <p className="text-sm text-muted-foreground">{t('sc.note')}: {form.notes}</p>}
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="rounded border-input accent-primary" />
                  <span className="text-sm text-muted-foreground">{t('sc.iAgree')} <Link href="/terms" className="text-primary underline">{t('sc.terms')}</Link> {t('sc.and')} <Link href="/privacy" className="text-primary underline">{t('sc.privacyPolicy')}</Link></span>
                </label>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between">
            {step > 0 ? (
              <Button type="button" variant="outline" size="lg" onClick={() => goToStep(step - 1)} className="gap-2">
                <ChevronLeft className="h-4 w-4" /> {t('sc.back')}
              </Button>
            ) : <div />}
            <Button type="submit" variant="cta" size="lg" className="gap-2 text-sm sm:text-base" disabled={loading || (step === STEPS.length - 1 && (!agreed || ((settings?.paymentMethods?.length ?? 0) > 0 && !paymentMethod)))}>
              {step === STEPS.length - 1 ? (
                loading ? t('sc.processing') : <span className="truncate max-w-50 sm:max-w-none">{t('sc.order')} — {formatPrice(orderTotalBeforePoints - appliedPoints)}</span>
              ) : (
                <>{t('sc.next')} <ChevronRight className="h-4 w-4" /></>
              )}
            </Button>
          </div>
        </div>

        <div>
          <Card className="sticky top-20" style={{ boxShadow: 'var(--shadow-card)' }}>
            <CardHeader><CardTitle>{t('sc.orderSummary')}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="truncate flex-1">{item.name} × {item.quantity}</span>
                  <span className="font-medium ml-2">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between" style={{ fontSize: 'var(--text-sm)' }}><span>{t('sc.subtotal')}</span><span>{formatPrice(totalPrice)}</span></div>
              <div className="flex justify-between" style={{ fontSize: 'var(--text-sm)' }}><span>{t('sc.shipping')}</span><span>{shippingCost === 0 ? t('sc.free') : formatPrice(shippingCost)}</span></div>
              {coupon && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>{t('sc.discount')} ({coupon.code})</span>
                  <span>-{formatPrice(coupon.discount)}</span>
                </div>
              )}
              {settings?.enableLoyalty && (loyalty?.points ?? 0) > 0 && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-amber-700 dark:text-amber-400">{t('sc.payWithPoints')}</span>
                    <span className="text-muted-foreground">{t('sc.available')}՝ {loyalty?.points}</span>
                  </div>
                  <div className="flex gap-2">
                    <Input {...numericInputProps(false)} min={0} max={maxRedeemable} value={pointsToSpend || ''} placeholder="0"
                      onChange={(e) => setPointsToSpend(Math.max(0, Math.min(maxRedeemable, Math.floor(Number(e.target.value) || 0))))}
                      className="h-8 text-xs flex-1" />
                    <Button type="button" size="sm" variant="outline" className="h-8 text-xs whitespace-nowrap"
                      onClick={() => setPointsToSpend(maxRedeemable)}>{t('sc.max')}</Button>
                  </div>
                  {appliedPoints > 0 && <p className="text-[11px] text-amber-700 dark:text-amber-400">−{formatPrice(appliedPoints)} {t('sc.withPoints')}</p>}
                </div>
              )}
              {appliedPoints > 0 && (
                <div className="flex justify-between text-sm text-amber-600 dark:text-amber-400">
                  <span>{t('sc.pointsLabel')}</span>
                  <span>-{formatPrice(appliedPoints)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold" style={{ fontSize: 'var(--text-lg)' }}><span>{t('sc.total')}</span><span>{formatPrice(orderTotalBeforePoints - appliedPoints)}</span></div>
              <div className="flex gap-2">
                <Input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder={t('sc.couponCode')} className="h-9 text-xs flex-1" />
                <Button type="button" size="sm" variant="outline" disabled={!couponCode.trim()} className="h-9 text-xs">OK</Button>
              </div>
              {couponCode.trim() && coupon === null && (
                <p className="text-xs text-red-500 text-center">{t('sc.couponNotExist')}</p>
              )}
              {coupon && (
                <p className="text-xs text-green-500 text-center">-{formatPrice(coupon.discount)} {t('sc.coupon')}</p>
              )}
              {settings?.deliveryEstimateYerevan && form.address && (
                <p className="text-xs text-muted-foreground text-center">{t('sc.deliveryYerevan')}՝ ~{localizeDeliveryEstimate(settings.deliveryEstimateYerevan, lang)}</p>
              )}
              <p className="text-center text-muted-foreground" style={{ fontSize: 'var(--text-xs)' }}>{t('sc.paymentNote')}</p>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
