'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileDown, ShoppingBag, Clock, CheckCircle, Truck, Package, Search, Phone, MessageSquare, Smartphone, FileSpreadsheet } from 'lucide-react';
import { formatPrice, formatDateHy } from '@/lib/formatters';
import { toast } from 'sonner';
import { Id } from '../../../../convex/_generated/dataModel';
import { useReveal, revealStyle } from '@/lib/motion';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/hooks/useSettings';
import Link from 'next/link';

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'Սպասում', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  confirmed: { label: 'Հաստատվել է', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  processing: { label: 'Կատարվում է', color: 'bg-purple-100 text-purple-800', icon: Package },
  shipped: { label: 'Ուղարկվել է', color: 'bg-indigo-100 text-indigo-800', icon: Truck },
  delivered: { label: 'Առաքված', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  cancelled: { label: 'Չեղյալ', color: 'bg-red-100 text-red-800', icon: Clock },
};

const PAYMENT_MAP: Record<string, { label: string; color: string }> = {
  awaiting: { label: 'Սպասում', color: 'bg-orange-100 text-orange-800' },
  paid: { label: 'Վճարվել է', color: 'bg-green-100 text-green-800' },
  refunded: { label: 'Վերադարձվել է', color: 'bg-red-100 text-red-800' },
};

function escapeHtml(str: string): string {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}

function exportPDF(order: { orderNumber: string; customerName: string; customerPhone: string; customerEmail: string; shippingAddress: string; items: { name: string; price: number; quantity: number }[]; total: number; createdAt: number }) {
  const html = `
    <html><head><meta charset="utf-8"><title>Invoice ${escapeHtml(order.orderNumber)}</title>
    <style>body{font-family:sans-serif;padding:40px;max-width:700px;margin:auto}h1{color:#333}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{border:1px solid #ddd;padding:10px;text-align:left}th{background:#f5f5f5}.total{font-size:1.3em;font-weight:bold;text-align:right;margin-top:20px}</style></head>
    <body><h1>Invoice #${escapeHtml(order.orderNumber)}</h1>
    <p><strong>Անձը՝</strong> ${escapeHtml(order.customerName)}<br>${escapeHtml(order.customerPhone)}<br>${escapeHtml(order.customerEmail)}<br>${escapeHtml(order.shippingAddress)}</p>
    <p><strong>Ամսաթիվ՝</strong> ${formatDateHy(order.createdAt)}</p>
    <table><thead><tr><th>Ապրանք</th><th>Քանակ</th><th>Գին</th><th>Վճարված</th></tr></thead><tbody>
    ${order.items.map((i) => `<tr><td>${escapeHtml(i.name)}</td><td>${i.quantity}</td><td>${i.price.toLocaleString()} ֏</td><td>${(i.price * i.quantity).toLocaleString()} ֏</td></tr>`).join('')}
    </tbody></table>
    <p class="total">Վճարված: ${order.total.toLocaleString()} ֏</p>
    <hr><p><strong>Բանկ՝</strong><br>Ameriabank<br>Հաշվեհամար: 1570000000000000<br>AutoParts LLC</p>
    </body></html>`;
  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); w.print(); }
  else {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    iframe.contentDocument?.write(html);
    iframe.contentDocument?.close();
    iframe.contentWindow?.print();
    setTimeout(() => iframe.remove(), 3000);
  }
}

const PAYMENT_LABELS: Record<string, string> = { cash: 'Կանխիկ', card: 'Քարտով', idram: 'Idram', easypay: 'EasyPay', transfer: 'Բանկային փոխանցում' };

function OrderCard({ order, sessionToken, index, settings }: { order: { _id: Id<'orders'>; orderNumber: string; customerName: string; customerPhone: string; customerEmail: string; shippingAddress: string; items: { name: string; price: number; quantity: number; productId: Id<'products'>; imageUrl?: string }[]; total: number; status: string; paymentStatus: string; paymentMethod?: string; createdAt: number }; sessionToken: string; index: number; settings: ReturnType<typeof useSettings> }) {
  const { ref, visible } = useReveal();
  const updateStatus = useMutation(api.orders.updateStatus);
  const status = STATUS_MAP[order.status] ?? STATUS_MAP.pending;
  const payment = PAYMENT_MAP[order.paymentStatus] ?? PAYMENT_MAP.awaiting;

  return (
    <div ref={ref} style={revealStyle(visible, index * 0.05)}>
      <div className="group rounded-xl border bg-background p-5 transition-all hover:shadow-lg" style={{ boxShadow: 'var(--shadow-xs)' }}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-bold">{order.orderNumber}</span>
              <Badge className={`${status.color} border-0 text-[10px]`}>{status.label}</Badge>
              <Badge className={`${payment.color} border-0 text-[10px]`}>{payment.label}</Badge>
              {order.paymentMethod && <Badge variant="outline" className="text-[10px]">{PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}</Badge>}
            </div>
            <p className="mt-1 text-sm font-medium">{order.customerName}</p>
            <p className="text-xs text-muted-foreground">{order.customerPhone} · {order.customerEmail}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {order.items.map((item, i) => (
                <span key={i} className="rounded bg-muted px-2 py-0.5 text-[11px]">{item.name} ×{item.quantity}</span>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className="text-xl font-bold text-primary">{formatPrice(order.total)}</span>
            <span className="text-xs text-muted-foreground">{formatDateHy(order.createdAt)}</span>
            <div className="flex gap-2">
              <Select value={order.status} onValueChange={(v: string | null) => { if (v) { updateStatus({ sessionToken, id: order._id, status: v as 'pending' }); toast.success('Ստատուսը թարմացվել է'); } }}>
                <SelectTrigger className="h-8 w-28 text-xs"><span>{STATUS_MAP[order.status]?.label ?? order.status}</span></SelectTrigger>
                <SelectContent>{Object.entries(STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={order.paymentStatus} onValueChange={(v: string | null) => { if (v) { updateStatus({ sessionToken, id: order._id, paymentStatus: v as 'awaiting' }); toast.success('Վճարման ստատուսը թարմացվել է'); } }}>
                <SelectTrigger className="h-8 w-28 text-xs"><span>{PAYMENT_MAP[order.paymentStatus]?.label ?? order.paymentStatus}</span></SelectTrigger>
                <SelectContent>{Object.entries(PAYMENT_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
              <Button size="sm" variant={order.paymentStatus === 'paid' ? 'outline' : 'default'} className="h-8 gap-1 text-xs" onClick={() => { updateStatus({ sessionToken, id: order._id, paymentStatus: order.paymentStatus === 'paid' ? 'awaiting' : 'paid' }); toast.success(order.paymentStatus === 'paid' ? 'Վերադարձվել է սպասման' : 'Նշվել է որպես վճարված'); }}>
                {order.paymentStatus === 'paid' ? '✗' : '✓'} Վճարված
              </Button>
              <Link href="/api/export/orders" className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent">
                <FileDown className="h-3 w-3" /> PDF
              </Link>
              <div className="flex gap-1">
                <Link href={`tel:${order.customerPhone}`} className="flex h-8 w-8 items-center justify-center rounded-lg border text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Զանգել">
                  <Phone className="h-3.5 w-3.5" />
                </Link>
                {settings?.whatsapp && (
                  <Link href={`https://wa.me/${order.customerPhone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex h-8 w-8 items-center justify-center rounded-lg border text-green-600 hover:bg-green-50" aria-label="WhatsApp">
                    <MessageSquare className="h-3.5 w-3.5" />
                  </Link>
                )}
                {settings?.telegram && (
                  <Link href={`https://t.me/${order.customerPhone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex h-8 w-8 items-center justify-center rounded-lg border text-sky-600 hover:bg-sky-50" aria-label="Telegram">
                    <Smartphone className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminOrdersPage() {
  const { sessionToken } = useAuth();
  const orders = useQuery(api.orders.listAdmin, sessionToken ? { sessionToken } : 'skip');
  const settings = useSettings();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = orders?.filter((o) => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return o.orderNumber.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q) || o.customerPhone.includes(q);
    }
    return true;
  });

  return (
    <div>
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold">Պատվերներ</h1>
          <p className="text-muted-foreground">{orders?.length ?? 0} պատվեր</p>
        </div>
        <Link href="/api/export/orders" className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent">
          <FileSpreadsheet className="h-4 w-4" /> CSV
        </Link>
      </div>

      <div className="space-y-3">
        {filtered?.map((order, i) => <OrderCard key={order._id} order={order} sessionToken={sessionToken ?? ''} index={i} settings={settings} />)}
      </div>

      {filtered?.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <ShoppingBag className="h-16 w-16 text-muted-foreground/30" />
          <p className="text-muted-foreground">Պատվերներ չեն գտնվել</p>
        </div>
      )}
    </div>
  );
}
