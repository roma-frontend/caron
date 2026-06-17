'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TrendingUp, ShoppingBag, DollarSign, Clock, FileDown, Search, Phone, MessageSquare, FileSpreadsheet, XCircle, History } from 'lucide-react';
import { formatPrice, formatDateHy } from '@/lib/formatters';
import { Id } from '../../../../convex/_generated/dataModel';
import { useReveal, revealStyle } from '@/lib/motion';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/hooks/useSettings';
import Link from 'next/link';

type PeriodKey = 'today' | 'yesterday' | '7d' | '30d' | 'thisMonth' | 'lastMonth' | 'custom';
type CancelReasonKey = 'changed_mind' | 'no_answer' | 'out_of_stock' | 'expensive' | 'slow_delivery' | 'order_error' | 'duplicate' | 'other';

const PERIOD_LABELS: Record<PeriodKey, string> = {
  today: 'Այսօր',
  yesterday: 'Երեկ',
  '7d': '7 օր',
  '30d': '30 օր',
  thisMonth: 'Այս ամիս',
  lastMonth: 'Անցած ամիս',
  custom: 'Ընտրել օրերը',
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999).getTime();
}

function formatDateInput(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function parseDateInput(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function getPeriodRange(period: PeriodKey, customFrom: string, customTo: string) {
  const now = new Date();
  const todayStart = startOfDay(now);

  if (period === 'today') return { from: todayStart, to: endOfDay(now) };

  if (period === 'yesterday') {
    const yesterday = new Date(todayStart);
    yesterday.setDate(yesterday.getDate() - 1);
    return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
  }

  if (period === '7d' || period === '30d') {
    const days = period === '7d' ? 7 : 30;
    const from = new Date(todayStart);
    from.setDate(from.getDate() - (days - 1));
    return { from: startOfDay(from), to: endOfDay(now) };
  }

  if (period === 'thisMonth') {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1).getTime(), to: endOfDay(now) };
  }

  if (period === 'lastMonth') {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: startOfDay(from), to: endOfDay(to) };
  }

  const fromDate = parseDateInput(customFrom);
  const toDate = parseDateInput(customTo);

  return {
    from: fromDate ? startOfDay(fromDate) : Number.NEGATIVE_INFINITY,
    to: toDate ? endOfDay(toDate) : Number.POSITIVE_INFINITY,
  };
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: 'Սպասում', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Հաստատվել է', color: 'bg-blue-100 text-blue-800' },
  processing: { label: 'Կատարվում է', color: 'bg-purple-100 text-purple-800' },
  shipped: { label: 'Ուղարկվել է', color: 'bg-indigo-100 text-indigo-800' },
  delivered: { label: 'Առաքված', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Չեղյալ', color: 'bg-red-100 text-red-800' },
};

const PAYMENT_MAP: Record<string, { label: string; color: string }> = {
  awaiting: { label: 'Սպասում', color: 'bg-orange-100 text-orange-800' },
  paid: { label: 'Վճարվել է', color: 'bg-green-100 text-green-800' },
  refunded: { label: 'Վերադարձվել է', color: 'bg-red-100 text-red-800' },
};

const PAYMENT_LABELS: Record<string, string> = { cash: 'Կանխիկ', card: 'Քարտով', idram: 'Idram', easypay: 'EasyPay', transfer: 'Բանկային փոխանցում' };

const PAYMENT_METHODS = [
  { key: 'cash', label: 'Կանխիկ' },
  { key: 'transfer', label: 'Բանկային փոխանցում' },
  { key: 'idram', label: 'Idram' },
  { key: 'easypay', label: 'EasyPay' },
  { key: 'card', label: 'Քարտ' },
] as const;

const CANCEL_REASONS: Array<{ key: CancelReasonKey; label: string }> = [
  { key: 'changed_mind', label: 'Հաճախորդը մտափոխվել է' },
  { key: 'no_answer', label: 'Չհաջողվեց կապվել' },
  { key: 'out_of_stock', label: 'Ապրանքը չկա' },
  { key: 'expensive', label: 'Թանկ է' },
  { key: 'slow_delivery', label: 'Երկար առաքում' },
  { key: 'order_error', label: 'Սխալ պատվերում' },
  { key: 'duplicate', label: 'Կրկնվող պատվեր' },
  { key: 'other', label: 'Այլ' },
];

const CANCEL_REASON_LABELS = Object.fromEntries(CANCEL_REASONS.map((reason) => [reason.key, reason.label]));

function escapeHtml(str: string): string {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}

function exportPDF(o: Record<string, unknown>) {
  const html = [
    '<html><head><meta charset="utf-8"><title>Invoice</title>',
    '<style>body{font-family:sans-serif;padding:40px;max-width:700px;margin:auto}',
    'h1{color:#333}table{width:100%;border-collapse:collapse;margin:20px 0}',
    'th,td{border:1px solid #ddd;padding:10px;text-align:left}th{background:#f5f5f5}',
    '.total{font-size:1.3em;font-weight:bold;text-align:right;margin-top:20px}</style></head><body>',
    `<h1>Invoice #${escapeHtml(String(o.orderNumber))}</h1>`,
    `<p><strong>Name:</strong> ${escapeHtml(String(o.customerName))}<br>`,
    `${escapeHtml(String(o.customerPhone))}<br>${escapeHtml(String(o.customerEmail))}<br>`,
    `${escapeHtml(String(o.shippingAddress))}</p>`,
    `<table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>`,
    (o.items as Array<Record<string, unknown>> || []).map((i: Record<string, unknown>) =>
      `<tr><td>${escapeHtml(String(i.name))}</td><td>${Number(i.quantity)}</td><td>${Number(i.price).toLocaleString()} ֏</td><td>${(Number(i.price) * Number(i.quantity)).toLocaleString()} ֏</td></tr>`
    ).join(''),
    `</tbody></table><p class="total">Total: ${Number(o.total).toLocaleString()} ֏</p></body></html>`,
  ].join('\n');
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

function OrderCard({ order, sessionToken, index, settings }: { order: Record<string, unknown>; sessionToken: string; index: number; settings: ReturnType<typeof useSettings> }) {
  const { ref, visible } = useReveal();
  const updateStatus = useMutation(api.orders.updateStatus);
  const s = STATUS_MAP[String(order.status)] ?? STATUS_MAP.pending;
  const p = PAYMENT_MAP[String(order.paymentStatus)] ?? PAYMENT_MAP.awaiting;
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState<CancelReasonKey | ''>('');
  const [cancelComment, setCancelComment] = useState('');
  const [savingCancel, setSavingCancel] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const cancelReasonLabel: string | null = order.cancelReason ? (CANCEL_REASON_LABELS[String(order.cancelReason)] ?? String(order.cancelReason)) : null;
  const events = useQuery(
    api.orders.getOrderEvents,
    historyOpen && sessionToken ? { sessionToken, orderId: order._id as Id<'orders'> } : 'skip',
  );

  async function submitCancellation() {
    if (!cancelReason) {
      toast.error('Ընտրեք չեղարկման պատճառը');
      return;
    }

    setSavingCancel(true);
    try {
      await updateStatus({
        sessionToken,
        id: order._id as Id<'orders'>,
        status: 'cancelled',
        cancelReason,
        cancelComment,
      });
      toast.success('Պատվերը չեղարկվեց');
      setCancelOpen(false);
      setCancelReason('');
      setCancelComment('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Չեղարկումը չհաջողվեց');
    } finally {
      setSavingCancel(false);
    }
  }

  return (
    <div ref={ref} style={revealStyle(visible, index * 0.03)}>
      <div className="rounded-xl border bg-background transition-all hover:shadow-md hover:border-primary/20 overflow-hidden">
        {/* Top bar — status + order number */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-muted/40 px-4 py-2 border-b gap-2">
          <div className="flex items-center flex-wrap gap-1.5">
            <span className="font-mono text-xs font-bold tracking-wider text-muted-foreground whitespace-nowrap">{String(order.orderNumber)}</span>
            <Badge className={`${s.color} border-0 text-[10px]`}>{s.label}</Badge>
            <Badge className={`${p.color} border-0 text-[10px]`}>{p.label}</Badge>
            {order.paymentMethod != null ? <Badge variant="outline" className="text-[10px] text-muted-foreground">{PAYMENT_LABELS[String(order.paymentMethod)] ?? String(order.paymentMethod)}</Badge> : null}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-lg font-bold text-primary">{formatPrice(Number(order.total))}</span>
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">{formatDateHy(Number(order.createdAt))}</span>
          </div>
        </div>
        {/* Content row — customer + actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary shrink-0">
              {String(order.customerName).charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium leading-tight">{String(order.customerName)}</p>
              <p className="text-xs text-muted-foreground">{String(order.customerPhone)}</p>
            </div>
          </div>
          <div className="flex items-center flex-wrap gap-2">
            <Select value={String(order.status)} onValueChange={(v) => {
              if (!v) return;
              if (v === 'cancelled' && order.status !== 'cancelled') {
                setCancelOpen(true);
                return;
              }
              updateStatus({ sessionToken, id: order._id as Id<'orders'>, status: v as 'pending' });
            }}>
              <SelectTrigger className="h-8 w-full sm:w-[110px] text-xs min-w-0"><span>{s.label}</span></SelectTrigger>
              <SelectContent>{Object.entries(STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
            </Select>
            <button onClick={() => updateStatus({ sessionToken, id: order._id as Id<'orders'>, paymentStatus: order.paymentStatus === 'paid' ? 'awaiting' as const : 'paid' as const })}
              className={`flex h-8 items-center gap-1.5 rounded-lg border px-2 sm:px-3 text-[11px] sm:text-xs font-medium transition-colors ${order.paymentStatus === 'paid' ? 'bg-green-50 border-green-200 text-green-700' : 'text-muted-foreground hover:bg-accent'}`}>
              {order.paymentStatus === 'paid' ? '✓' : '○'} {order.paymentStatus === 'paid' ? 'Վճարված' : 'Նշել վճարած'}
            </button>
            <div className="h-6 w-px bg-border mx-1 hidden sm:block" />
            <Link href={`tel:${String(order.customerPhone)}`} className="flex h-8 w-8 items-center justify-center rounded-lg border text-muted-foreground hover:bg-accent hover:text-primary transition-colors" title="Զանգել">
              <Phone className="h-3.5 w-3.5" />
            </Link>
            {settings?.whatsapp && (
              <Link href={`https://wa.me/${String(order.customerPhone).replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-lg border text-green-600 hover:bg-green-50 transition-colors" title="WhatsApp">
                <MessageSquare className="h-3.5 w-3.5" />
              </Link>
            )}
            <button onClick={() => exportPDF(order)} className="flex h-8 w-8 items-center justify-center rounded-lg border text-muted-foreground hover:bg-accent transition-colors" title="PDF">
              <FileDown className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setHistoryOpen((v) => !v)} className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${historyOpen ? 'bg-accent text-primary' : 'text-muted-foreground hover:bg-accent'}`} title="История">
              <History className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {order.status === 'cancelled' && (cancelReasonLabel != null || order.cancelComment != null) && (
          <div className="border-t bg-red-50/60 px-4 py-2 text-xs text-red-800">
            {cancelReasonLabel && <p><span className="font-medium">Չեղարկման պատճառը:</span> {String(cancelReasonLabel)}</p>}
            {order.cancelComment ? <p className="mt-1 text-red-700/80">{String(order.cancelComment)}</p> : null}
          </div>
        )}
        {historyOpen && (
          <div className="border-t bg-muted/20 px-4 py-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground flex items-center gap-1.5"><History className="h-3 w-3" /> Գործողությունների պատմություն</p>
            {events === undefined && <p className="text-xs text-muted-foreground">Բեռնվում է...</p>}
            {events?.length === 0 && <p className="text-xs text-muted-foreground">Գրառումներ չկան</p>}
            {events && events.length > 0 && (
              <div className="space-y-1.5">
                {events.map((e) => {
                  const label: string =
                    e.type === 'created' ? 'Պատվերը ստեղծվեց' :
                    e.type === 'status_changed' ? `Կարգավիճակ: ${e.prevValue ?? ""} → ${e.nextValue ?? ""}` :
                    e.type === 'cancelled' ? `Չեղարկվեց: ${e.prevValue ?? ""} → cancelled` :
                    e.type === 'reopened' ? `Վերաբացվեց: cancelled → ${e.nextValue ?? ""}` :
                    e.type === 'payment_changed' ? `Վճարում: ${e.prevValue ?? ""} → ${e.nextValue ?? ""}` :
                    e.comment ?? '';
                  return (
                    <div key={e._id} className="flex flex-wrap items-start gap-x-2 gap-y-0.5 text-xs">
                      <span className="shrink-0 text-muted-foreground/70 whitespace-nowrap">{formatDateHy(e.createdAt)}</span>
                      {e.adminName && <span className="shrink-0 font-medium">{e.adminName}</span>}
                      <span className="text-foreground/80">{label}</span>
                      {e.comment && e.type !== 'comment' && <span className="text-muted-foreground/60 italic">— {String(e.comment ?? "")}</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="overflow-visible">
          <DialogHeader>
            <DialogTitle>Չեղարկել պատվերը</DialogTitle>
            <DialogDescription>Ընտրեք պատճառը, որպեսզի հետագայում տեսանելի լինի՝ ինչու է վաճառքը կորել։</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Պատճառ</Label>
              <Select value={cancelReason} onValueChange={(v) => setCancelReason(v as CancelReasonKey)}>
                <SelectTrigger className="h-9 w-full text-sm"><span>{cancelReason ? CANCEL_REASON_LABELS[cancelReason] : 'Ընտրեք պատճառը'}</span></SelectTrigger>
                <SelectContent>
                  {CANCEL_REASONS.map((reason) => <SelectItem key={reason.key} value={reason.key}>{reason.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor={`cancel-comment-${String(order._id)}`}>Մեկնաբանություն</Label>
              <Textarea id={`cancel-comment-${String(order._id)}`} value={cancelComment} onChange={(e) => setCancelComment(e.target.value)} placeholder="Լրացուցիչ մանրամասներ" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCancelOpen(false)} disabled={savingCancel}>Փակել</Button>
            <Button type="button" variant="destructive" onClick={submitCancellation} disabled={!cancelReason || savingCancel}>{savingCancel ? 'Չեղարկվում է...' : 'Չեղարկել պատվերը'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { sessionToken } = useAuth();
  const orders = useQuery(api.orders.listAdmin, sessionToken ? { sessionToken } : 'skip');
  const allProducts = useQuery(api.products.listCostMap);
  const settings = useSettings();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [period, setPeriod] = useState<PeriodKey>('30d');
  const [customFrom, setCustomFrom] = useState(() => formatDateInput(new Date()));
  const [customTo, setCustomTo] = useState(() => formatDateInput(new Date()));

  const periodRange = getPeriodRange(period, customFrom, customTo);
  const periodOrders = orders?.filter((o) => o.createdAt >= periodRange.from && o.createdAt <= periodRange.to) ?? [];
  const paidActiveOrders = periodOrders.filter((o) => o.paymentStatus === 'paid' && o.status !== 'cancelled');
  const awaitingPaymentActiveOrders = periodOrders.filter((o) => o.paymentStatus === 'awaiting' && o.status !== 'cancelled');
  const refundedOrders = periodOrders.filter((o) => o.paymentStatus === 'refunded');
  const totalRevenue = paidActiveOrders.reduce((s, o) => s + o.total, 0);
  const awaitingPaymentRevenue = awaitingPaymentActiveOrders.reduce((s, o) => s + o.total, 0);
  const refundedRevenue = refundedOrders.reduce((s, o) => s + o.total, 0);
  const paidOrders = paidActiveOrders.length;
  const awaitingPaymentOrders = awaitingPaymentActiveOrders.length;
  const cancelledOrders = periodOrders.filter((o) => o.status === 'cancelled');
  const cancelledRevenue = cancelledOrders.reduce((s, o) => s + o.total, 0);
  const netRevenue = totalRevenue - refundedRevenue;
  const averageOrderValue = paidOrders > 0 ? totalRevenue / paidOrders : 0;
  const paymentMethodTotals = PAYMENT_METHODS.map((method) => ({
    ...method,
    amount: paidActiveOrders.filter((o) => o.paymentMethod === method.key).reduce((s, o) => s + o.total, 0),
  }));

  // Profit metrics
  const costMap = new Map<string, number | undefined>(allProducts?.map((p) => [p._id as string, p.costPrice as number | undefined]) ?? []);
  const totalCost = paidActiveOrders.reduce((sum, o) => {
    const items = o.items as Array<{ productId: string; quantity: number }>;
    return sum + items.reduce((s, item) => s + (costMap.get(item.productId) ?? 0) * item.quantity, 0);
  }, 0);
  const grossProfit = totalRevenue - totalCost;
  const margin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  const filtered = orders?.filter((o) => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return String(o.orderNumber).toLowerCase().includes(q) || String(o.customerName).toLowerCase().includes(q) || String(o.customerPhone).includes(q);
    }
    return true;
  });

  const statCards = [
    { label: 'Ընդհանուր', value: periodOrders.length, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Վճարված', value: paidOrders, description: formatPrice(totalRevenue), icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'Վճարման սպասող', value: awaitingPaymentOrders, description: formatPrice(awaitingPaymentRevenue), icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100' },
    { label: 'Չեղարկված', value: cancelledOrders.length, description: formatPrice(cancelledRevenue), icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
    { label: 'Եկամուտ', value: formatPrice(totalRevenue), icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-100' },
    { label: 'Միջին հաշիվ', value: formatPrice(averageOrderValue), icon: DollarSign, color: 'text-cyan-600', bg: 'bg-cyan-100' },
  ];

  const financeRows = [
    { label: 'Վճարված', value: formatPrice(totalRevenue), note: `${paidOrders} պատվեր`, color: 'text-green-600' },
    { label: 'Վճարման սպասող', value: formatPrice(awaitingPaymentRevenue), note: `${awaitingPaymentOrders} պատվեր`, color: 'text-yellow-600' },
    { label: 'Չեղարկված', value: formatPrice(cancelledRevenue), note: `${cancelledOrders.length} պատվեր`, color: 'text-red-600' },
    { label: 'Վերադարձներ', value: formatPrice(refundedRevenue), note: `${refundedOrders.length} պատվեր`, color: 'text-orange-600' },
    { label: 'Մաքուր եկամուտ', value: formatPrice(netRevenue), note: 'վճարված - վերադարձներ', color: 'text-primary' },
    { label: 'Միջին հաշիվ', value: formatPrice(averageOrderValue), note: 'վճարված պատվերներով', color: 'text-cyan-600' },
    { label: 'Ծախս', value: formatPrice(totalCost), note: 'պատվերների ծախսեր', color: 'text-amber-600' },
    { label: 'Ընդհանուր շահույթ', value: formatPrice(grossProfit), note: 'վճարված - վերադարձներ', color: grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600' },
    { label: 'Մարժան', value: `${margin.toFixed(1)}%`, note: 'մարժան / վճարված', color: margin >= 20 ? 'text-emerald-600' : 'text-orange-600' },

  ];
  const cancelReasonRows = [
    ...CANCEL_REASONS.map((reason) => {
      const matchingOrders = cancelledOrders.filter((o) => o.cancelReason === reason.key);
      return {
        key: reason.key,
        label: reason.label,
        count: matchingOrders.length,
        amount: matchingOrders.reduce((s, o) => s + o.total, 0),
      };
    }),
    {
      key: 'unknown',
      label: 'Պատճառը նշված չէ',
      count: cancelledOrders.filter((o) => !o.cancelReason).length,
      amount: cancelledOrders.filter((o) => !o.cancelReason).reduce((s, o) => s + o.total, 0),
    },
  ].filter((row) => row.count > 0);

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Պատվերների վահանակ</h1>
        <Link href={`/api/export/orders?from=${periodRange.from}&to=${periodRange.to}`} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent">
          <FileSpreadsheet className="h-4 w-4" /> CSV
        </Link>
      </div>

      {/* Period filter */}
      <div className="mb-4 rounded-xl border bg-card p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium">Ֆինանսական ժամանակահատված</p>
            <p className="text-xs text-muted-foreground">Քարտերը հաշվարկվում են ըստ ընտրված պատվերի ամսաթվի</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select value={period} onValueChange={(v) => { if (v) setPeriod(v as PeriodKey); }}>
              <SelectTrigger className="h-9 w-full sm:w-44 text-xs"><span>{PERIOD_LABELS[period]}</span></SelectTrigger>
              <SelectContent>
                {Object.entries(PERIOD_LABELS).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
            {period === 'custom' && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="h-9 text-xs" aria-label="Սկիզբ" />
                <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="h-9 text-xs" aria-label="Ավարտ" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {statCards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${c.bg}`}>
                  <Icon className={`h-5 w-5 ${c.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                  <p className="text-xl font-bold">{c.value}</p>
                  {'description' in c && <p className="text-xs text-muted-foreground">{c.description}</p>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Finance breakdown */}
      <div className="mb-6 grid gap-3 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Ֆինանսական բաժանում</p>
                <p className="text-xs text-muted-foreground">Ըստ ընտրված ժամանակահատվածի</p>
              </div>
              <Badge variant="outline" className="shrink-0 text-[10px]">{PERIOD_LABELS[period]}</Badge>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {financeRows.map((row) => (
                <div key={row.label} className="rounded-lg border bg-background p-3">
                  <p className="text-xs text-muted-foreground">{row.label}</p>
                  <p className={`text-lg font-bold ${row.color}`}>{row.value}</p>
                  <p className="text-[11px] text-muted-foreground">{row.note}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="mb-3">
              <p className="text-sm font-medium">Վճարման եղանակներ</p>
              <p className="text-xs text-muted-foreground">Միայն վճարված և չեղարկված չհանդիսացող պատվերներ</p>
            </div>
            <div className="space-y-2">
              {paymentMethodTotals.map((method) => (
                <div key={method.key} className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2">
                  <span className="text-sm text-muted-foreground">{method.label}</span>
                  <span className="text-sm font-semibold">{formatPrice(method.amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="mb-3">
            <p className="text-sm font-medium">Չեղարկումների պատճառներ</p>
            <p className="text-xs text-muted-foreground">Վերլուծություն ըստ ընտրված ժամանակահատվածի</p>
          </div>
          {cancelReasonRows.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {cancelReasonRows.map((row) => (
                <div key={row.key} className="rounded-lg border bg-background p-3">
                  <p className="text-xs text-muted-foreground">{row.label}</p>
                  <p className="text-lg font-bold text-red-600">{row.count}</p>
                  <p className="text-[11px] text-muted-foreground">{formatPrice(row.amount)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border bg-background p-3 text-sm text-muted-foreground">Այս ժամանակահատվածում չեղարկումներ չկան</p>
          )}
        </CardContent>
      </Card>

      {/* Search & filter */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Որոնել պատվեր..." className="h-9 pl-9 text-sm" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { if (v !== null) setStatusFilter(v); }}>
          <SelectTrigger className="h-9 w-full sm:w-32 text-xs"><span>{statusFilter === 'all' ? 'Բոլորը' : STATUS_MAP[statusFilter]?.label || statusFilter}</span></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Բոլորը</SelectItem>
            {Object.entries(STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Orders list */}
      <div className="space-y-2">
        {filtered?.map((order, i) => <OrderCard key={String(order._id)} order={order as Record<string, unknown>} sessionToken={sessionToken ?? ''} index={i} settings={settings} />)}
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
