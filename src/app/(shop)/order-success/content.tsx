'use client';

import { useSearchParams } from 'next/navigation';
import { useQuery, useAction } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle, Printer, Smartphone, Check } from 'lucide-react';
import { formatPrice, formatDateHy } from '@/lib/formatters';
import Link from 'next/link';
import { Id } from '../../../../convex/_generated/dataModel';
import { useSettings } from '@/hooks/useSettings';
import { useState } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth';

export default function OrderSuccessContent() {
  const params = useSearchParams();
  const orderId = params.get('id') as Id<'orders'> | null;
  const settings = useSettings();
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const order = useQuery(api.orders.getById, orderId ? { id: orderId, sessionToken: sessionToken || undefined } : 'skip');
  const o = order as Record<string, unknown> | null | undefined;

  const bank = settings?.bankName || 'Ameriabank';
  const account = settings?.bankAccount || '1570000000000000';
  const swift = settings?.bankCode || '';
  const card = settings?.cardNumber || '';
  const pm = o?.paymentMethod as string | undefined;

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 1.5rem; }
          .print-area .no-print { display: none !important; }
          .print-card { box-shadow: none !important; border: 1px solid #ddd !important; }
          @page { margin: 1.5cm; }
        }
      `}</style>

      <div className="mx-auto print-area" style={{ maxWidth: '48rem', paddingInline: 'var(--space-container)', paddingBlock: 'var(--space-8)' }}>
        <div className="hero-fade-1 mb-8 text-center no-print">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold">Պատվերը հաջողությամբ ստեղծվել է</h1>
          <p className="mt-2 text-muted-foreground">Ձեր պատվերը հաջողությամբ ստեղծվել է և կկարգավորվի կարճ ժամանակում</p>
          {o?.orderNumber ? <p className="mt-1 font-mono font-bold text-primary">{String(o.orderNumber)}</p> : null}
        </div>

        <Card className="print-card" style={{ boxShadow: 'var(--shadow-lg)' }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Հաշիվ-ապրանքագիր / Invoice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {o?.orderNumber ? (
              <>
                <div className="flex justify-between text-sm">
                  <span><strong>Պատվեր՝</strong> {String(o.orderNumber)}</span>
                  <span><strong>Ամսաթիվ՝</strong> {formatDateHy(Number(o.createdAt))}</span>
                </div>
                <div className="text-sm">
                  <p><strong>Հաճախորդ՝</strong> {String(o.customerName)}</p>
                  <p><strong>Հեռ․՝</strong> {String(o.customerPhone)}</p>
                  <p><strong>Էլ․ փոստ՝</strong> {String(o.customerEmail)}</p>
                  <p><strong>Հասցե՝</strong> {String(o.shippingAddress)}</p>
                  {o.notes ? <p className="mt-1 text-muted-foreground">Նշում՝ {String(o.notes)}</p> : null}
                </div>
              </>
            ) : null}

            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Ապրանք</th>
                  <th className="pb-2 font-medium text-right">Քանակ</th>
                  <th className="pb-2 font-medium text-right">Գին</th>
                  <th className="pb-2 font-medium text-right">Գումար</th>
                </tr>
              </thead>
              <tbody>
                {(o?.items as Array<Record<string, unknown>> | undefined)?.map((item, i: number) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2">{String(item.name)}</td>
                    <td className="py-2 text-right">{Number(item.quantity)}</td>
                    <td className="py-2 text-right">{formatPrice(Number(item.price))}</td>
                    <td className="py-2 text-right font-medium">{formatPrice(Number(item.price) * Number(item.quantity))}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end">
              <div className="w-48 space-y-1 text-sm">
                <div className="flex justify-between"><span>Ենթագումար</span><span>{o?.subtotal ? formatPrice(Number(o.subtotal)) : ''}</span></div>
                <div className="flex justify-between"><span>Առաքում</span><span>{o?.shipping !== undefined ? (Number(o.shipping) === 0 ? 'Անվճար' : formatPrice(Number(o.shipping))) : ''}</span></div>
                <Separator />
                <div className="flex justify-between font-bold text-base"><span>Ընդհանուր</span><span>{o?.total ? formatPrice(Number(o.total)) : ''}</span></div>
              </div>
            </div>

            {(pm === 'transfer' || pm === 'idram' || pm === 'easypay') && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2 print-break-inside">
                <h3 className="font-semibold text-sm">Վճարման տվյալներ</h3>
                {pm === 'transfer' && (
                  <div className="text-sm space-y-1">
                    <p>Բանկ՝ <strong>{bank}</strong></p>
                    <p>Հաշիվ՝ <strong className="font-mono">{account}</strong></p>
                    {swift && <p>SWIFT/BIC՝ <strong className="font-mono">{swift}</strong></p>}
                  </div>
                )}
                {(pm === 'idram' || pm === 'easypay') && card && (
                  <p className="text-sm">{pm === 'idram' ? 'Idram' : 'EasyPay'} քարտ՝ <strong className="font-mono">{card}</strong></p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row no-print">
              <Button variant="outline" className="min-w-38 gap-2 flex-1" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Տպել / Print
              </Button>
              {String(o?.orderNumber ?? '') && sessionToken && (
                <SendTelegramReceipt orderId={orderId!} />
              )}
              <Link href="/products" className="flex-1"><Button variant="cta" className="w-full">Շարունակել գնումը</Button></Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function SendTelegramReceipt({ orderId }: { orderId: Id<'orders'> }) {
  const [username, setUsername] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const sendReceipt = useAction(api.notifications.sendReceiptToCustomer);

  const handleSend = async () => {
    const user = username.replace('@', '').trim();
    if (!user) return;
    setSending(true);
    try {
      const result = await sendReceipt({ orderId, telegramUser: user, sessionToken: sessionToken || '' });
      const r = result as { ok: boolean; error?: string; botUsername?: string } | undefined;
      if (r?.ok) {
        setSent(true);
        toast.success('Չեկը ուղարկվել է Telegram');
      } else {
        if (r?.botUsername) setBotUsername(r.botUsername);
        if (r?.error?.includes('chat not found')) {
          toast.error('Սեղմեք Start Telegram-ում, ապա փորձեք նորից');
        } else {
          toast.error(r?.error || 'Սխալ ուղարկելիս');
        }
      }
    } catch {
      toast.error('Սխալ միացման ժամանակ');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
        <Check className="h-4 w-4" /> Չեկը ուղարկված է Telegram
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      <p className="text-xs text-muted-foreground">
        {botUsername ? (
          <>Բացեք բոտը՝ <a href={`https://t.me/${botUsername}`} target="_blank" rel="noopener noreferrer" className="text-primary font-medium underline">t.me/{botUsername}</a>, սեղմեք <b>Start</b>, ապա մուտքագրեք ձեր @username</>
        ) : (
          <>Գտեք մեր բոտը Telegram-ում, սեղմեք <b>Start</b>, ապա մուտքագրեք ձեր @username</>
        )}
      </p>
      <div className="flex gap-2">
        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="@username"
          className="h-10 flex-1 min-w-0"
        />
        <Button
          variant="outline"
          size="sm"
          className="gap-2 shrink-0 h-10"
          onClick={handleSend}
          disabled={!username.trim() || sending}
        >
          <Smartphone className="h-4 w-4" />
          {sending ? '...' : 'Telegram'}
        </Button>
      </div>
    </div>
  );
}
