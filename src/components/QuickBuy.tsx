'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Zap, X, Phone } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { toast } from 'sonner';
import { Id } from '../../convex/_generated/dataModel';

interface QuickBuyProps {
  productId: string;
  productName: string;
  productPrice: number;
  productImage?: string | null;
}

export function QuickBuyButton({ productId, productName, productPrice, productImage }: QuickBuyProps) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const createOrder = useMutation(api.orders.create);

  const handleSubmit = async () => {
    if (!phone || !name) { toast.error('Լրացրեք բոլոր պահանջվող դաշտերը'); return; }
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
      toast.success('Ձեր պատվերը հաջողությամբ ընդունվել է։ Մենք կկապնվենք ձեզ շուտով։');
      setOpen(false);
      setPhone('');
      setName('');
    } catch {
      toast.error('Առաջարկի ստեղծման սխալ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="lg" className="gap-2" onClick={() => setOpen(true)}>
        <Zap className="h-5 w-5" /> {'Արագ գնում'}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-background p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <button onClick={() => setOpen(false)} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>

            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold">{'Արագ գնում'}</h3>
                <p className="text-xs text-muted-foreground">{'Արագ գնում՝ ' + productName}</p>
              </div>
            </div>

            <div className="mb-4 rounded-lg bg-muted/50 p-3">
              <p className="text-sm font-medium truncate">{productName}</p>
              <p className="text-primary font-bold">{productPrice.toLocaleString()} դր.</p>
            </div>

            <div className="space-y-3">
              <div>
                <Label>{'Անուն, ազգանուն *'}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={'Անուն, ազգանուն'} className="h-11" />
              </div>
              <div>
                <Label>{'Հեռախոսահամար *'}</Label>
                <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+374..." className="h-11" />
              </div>
              <Button onClick={handleSubmit} disabled={loading} className="w-full gap-2 h-11">
                <Phone className="h-4 w-4" /> {loading ? 'Ներկայացվում է...' : 'Արագ գնում'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
