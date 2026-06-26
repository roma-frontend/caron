'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Zap, X, Phone } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { toast } from 'sonner';
import { Id } from '../../convex/_generated/dataModel';
import { useT } from '@/lib/i18n/admin';

interface QuickBuyProps {
  productId: string;
  productName: string;
  productPrice: number;
  productImage?: string | null;
}

export function QuickBuyButton({ productId, productName, productPrice, productImage }: QuickBuyProps) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const createOrder = useMutation(api.orders.create);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setOpen(false);
        if (e.key === 'Tab' && dialogRef.current) {
          const focusable = dialogRef.current.querySelectorAll<HTMLElement>('button, input, [tabindex]:not([tabindex="-1"])');
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      setTimeout(() => dialogRef.current?.querySelector<HTMLElement>('input')?.focus(), 50);
      return () => document.removeEventListener('keydown', handleKeyDown);
    } else {
      previousFocusRef.current?.focus();
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!phone || !name) { toast.error(t('sp.fillRequiredFields')); return; }
    setLoading(true);
    try {
      await createOrder({
        customerName: name,
        customerPhone: phone,
        customerEmail: '',
        shippingAddress: '',
        items: [{ productId: productId as Id<'products'>, name: productName, price: productPrice, quantity: 1, imageUrl: productImage ?? undefined }],
        subtotal: productPrice,
        shipping: 0,
        total: productPrice,
        notes: 'Արագ գնում՝ ' + productName,
      });
      toast.success(t('sp.orderAccepted'));
      setOpen(false);
      setPhone('');
      setName('');
    } catch {
      toast.error(t('sp.orderCreateError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="lg" className="gap-2" onClick={() => setOpen(true)}>
        <Zap className="h-5 w-5" /> {t('sp.quickBuy')}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={t('sp.quickBuy')}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div ref={dialogRef} className="relative w-full max-w-sm rounded-2xl bg-background p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <button onClick={() => setOpen(false)} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>

            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold">{t('sp.quickBuy')}</h3>
                <p className="text-xs text-muted-foreground">{t('sp.quickBuyNote') + ' ' + productName}</p>
              </div>
            </div>

            <div className="mb-4 rounded-lg bg-muted/50 p-3">
              <p className="text-sm font-medium truncate">{productName}</p>
              <p className="text-primary font-bold">{productPrice.toLocaleString()} {t('sp.dramAbbr')}</p>
            </div>

            <div className="space-y-3">
              <div>
                <Label>{t('sp.fullNameLabel')}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('sp.fullNamePlaceholder')} className="h-11" />
              </div>
              <div>
                <Label>{t('sp.phoneLabel')}</Label>
                <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+374..." className="h-11" />
              </div>
              <Button onClick={handleSubmit} disabled={loading} className="w-full gap-2 h-11">
                <Phone className="h-4 w-4" /> {loading ? t('sp.submitting') : t('sp.quickBuy')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
