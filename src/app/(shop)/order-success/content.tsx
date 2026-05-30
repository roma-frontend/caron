'use client';

import { useSearchParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Copy, Printer } from 'lucide-react';
import { formatPrice } from '@/lib/formatters';
import { toast } from 'sonner';
import Link from 'next/link';
import { Id } from '../../../../convex/_generated/dataModel';

const BANK_DETAILS = { bank: 'Ameriabank', account: '1570000000000000', name: 'AutoParts LLC', swift: 'ARMIAM22' };

export default function OrderSuccessContent() {
  const params = useSearchParams();
  const orderId = params.get('id') as Id<'orders'> | null;
  const order = useQuery(api.orders.getById, orderId ? { id: orderId } : 'skip');

  return (
    <div className="mx-auto" style={{ maxWidth: '48rem', paddingInline: 'var(--space-container)', paddingBlock: 'var(--space-8)' }}>
      <div className="hero-fade-1 mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold">Պատվերը հաջողությամբ ստեղծվել է</h1>
        <p className="mt-2 text-muted-foreground">Ձեր պատվերը հաջողությամբ ստեղծվել է և կարգավորվի կարճ ժամանակում</p>
        {order && <p className="mt-1 font-mono font-bold text-primary">{order.orderNumber}</p>}
      </div>

      <Card className="hero-fade-2" style={{ boxShadow: 'var(--shadow-lg)' }}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Պատվեր / Հաշիվ</CardTitle>
          <Badge variant="secondary">Պատվեր</Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          {order && (
            <div className="text-sm"><p className="font-bold">{formatPrice(order.total)}</p></div>
          )}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <h3 className="font-semibold">Բանկային տվյալներ</h3>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Բանկ</span><span className="font-medium">{BANK_DETAILS.bank}</span></div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Հաշիվ</span>
                <span className="flex items-center gap-2 font-mono font-medium">
                  {BANK_DETAILS.account}
                  <button onClick={() => { navigator.clipboard.writeText(BANK_DETAILS.account); toast.success('Հաշիվը պատճենվեց'); }} className="text-primary hover:text-primary/80"><Copy className="h-3.5 w-3.5" /></button>
                </span>
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">Անուն</span><span className="font-medium">{BANK_DETAILS.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">SWIFT</span><span className="font-mono font-medium">{BANK_DETAILS.swift}</span></div>
            </div>
          </div>
          <Separator />
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm dark:border-yellow-900 dark:bg-yellow-950">
            <p className="font-medium text-yellow-800 dark:text-yellow-200">Խնդրում ենք փոխանցումը կատարել համապատասխան տվյալներով։ Շնորհակալություն, որ ընտրել եք մեզ։</p>
          </div>
          <Separator />
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" className="gap-2 flex-1" onClick={() => window.print()}><Printer className="h-4 w-4" /> Տպել</Button>
            <Link href="/products" className="flex-1"><Button variant="cta" className="w-full">Շարունակել գնումը</Button></Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}