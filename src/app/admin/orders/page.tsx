'use client';

import { useState } from 'react';
import { useQuery, useMutation, useConvex } from 'convex/react';
import * as XLSX from 'xlsx-js-style';
import { api } from '../../../../convex/_generated/api';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/DatePicker';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TrendingUp, ShoppingBag, DollarSign, Clock, FileDown, Search, Phone, MessageSquare, FileSpreadsheet, XCircle, History, Eye } from 'lucide-react';
import { formatPrice, formatDateLocalized } from '@/lib/formatters';
import { Id } from '../../../../convex/_generated/dataModel';
import { useReveal, revealStyle } from '@/lib/motion';
import { useAuth } from '@/store/auth';
import { displayEmail } from '@/lib/contact';
import { useSettings } from '@/hooks/useSettings';
import { useAdminT } from '@/lib/i18n/admin';
import Link from '@/components/LocalizedLink';

type PeriodKey = 'today' | 'yesterday' | '7d' | '30d' | 'thisMonth' | 'lastMonth' | 'custom';
type CancelReasonKey = 'changed_mind' | 'no_answer' | 'out_of_stock' | 'expensive' | 'slow_delivery' | 'order_error' | 'duplicate' | 'other';

const PERIOD_LABELS: Record<PeriodKey, string> = {
  today: 'ao.period.today',
  yesterday: 'ao.period.yesterday',
  '7d': 'ao.period.7d',
  '30d': 'ao.period.30d',
  thisMonth: 'ao.period.thisMonth',
  lastMonth: 'ao.period.lastMonth',
  custom: 'ao.period.custom',
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
  pending: { label: 'ao.status.pending', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'ao.status.confirmed', color: 'bg-blue-100 text-blue-800' },
  processing: { label: 'ao.status.processing', color: 'bg-purple-100 text-purple-800' },
  shipped: { label: 'ao.status.shipped', color: 'bg-indigo-100 text-indigo-800' },
  delivered: { label: 'ao.status.delivered', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'ao.status.cancelled', color: 'bg-red-100 text-red-800' },
};

const PAYMENT_MAP: Record<string, { label: string; color: string }> = {
  awaiting: { label: 'ao.status.pending', color: 'bg-orange-100 text-orange-800' },
  paid: { label: 'ao.pay.paid', color: 'bg-green-100 text-green-800' },
  refunded: { label: 'ao.pay.refunded', color: 'bg-red-100 text-red-800' },
};

const PAYMENT_LABELS: Record<string, string> = { cash: 'ao.method.cash', card: 'ao.method.cardWith', idram: 'Idram', easypay: 'EasyPay', transfer: 'ao.method.transfer' };

const PAYMENT_METHODS = [
  { key: 'cash', label: 'ao.method.cash' },
  { key: 'transfer', label: 'ao.method.transfer' },
  { key: 'idram', label: 'Idram' },
  { key: 'easypay', label: 'EasyPay' },
  { key: 'card', label: 'ao.method.card' },
] as const;

const CANCEL_REASONS: Array<{ key: CancelReasonKey; label: string }> = [
  { key: 'changed_mind', label: 'ao.reason.changed_mind' },
  { key: 'no_answer', label: 'ao.reason.no_answer' },
  { key: 'out_of_stock', label: 'ao.reason.out_of_stock' },
  { key: 'expensive', label: 'ao.reason.expensive' },
  { key: 'slow_delivery', label: 'ao.reason.slow_delivery' },
  { key: 'order_error', label: 'ao.reason.order_error' },
  { key: 'duplicate', label: 'ao.reason.duplicate' },
  { key: 'other', label: 'ao.reason.other' },
];

const CANCEL_REASON_LABELS = Object.fromEntries(CANCEL_REASONS.map((reason) => [reason.key, reason.label]));

function escapeHtml(str: string): string {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}

type InvoiceMeta = { storeName: string; phone?: string; email?: string; address?: string };

/** A professionally styled, self-contained invoice document (inline CSS + inline
 * logo) used both for printing/PDF and as the live preview inside the order
 * details modal — single source of truth, identical look. */
function invoiceHtml(o: Record<string, unknown>, meta: InvoiceMeta): string {
  const BRAND = '#0066ae';
  const items = (o.items as Array<Record<string, unknown>>) || [];
  const email = displayEmail(String(o.customerEmail ?? ''));
  const fmt = (n: number) => Number(n).toLocaleString() + ' ֏';
  const subtotal = o.subtotal != null ? Number(o.subtotal) : items.reduce((s, i) => s + Number(i.price) * Number(i.quantity), 0);
  const shipping = Number(o.shipping ?? 0);
  const date = o.createdAt ? new Date(Number(o.createdAt)).toLocaleDateString() : '';

  const logo = `<svg width="44" height="44" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect width="64" height="64" rx="15" fill="#1B5FCB"/><rect x="11" y="22" width="42" height="20" rx="10" fill="#fff"/><rect x="19" y="27.5" width="26" height="9" rx="4.5" fill="none" stroke="#1B5FCB" stroke-width="2.4"/><line x1="19" y1="32" x2="45" y2="32" stroke="#1B5FCB" stroke-width="1.8"/></svg>`;

  const rows = items.map((i, idx) =>
    `<tr style="background:${idx % 2 ? '#f7fafc' : '#fff'}">
      <td class="art">${escapeHtml(String(i.sku ?? '') || '—')}</td>
      <td>${escapeHtml(String(i.name))}</td>
      <td class="num">${Number(i.quantity)}</td>
      <td class="num">${fmt(Number(i.price))}</td>
      <td class="num strong">${fmt(Number(i.price) * Number(i.quantity))}</td>
    </tr>`).join('');

  const contacts = [meta.phone, email || meta.email, meta.address].filter(Boolean).map((c) => escapeHtml(String(c))).join('&nbsp;&nbsp;•&nbsp;&nbsp;');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice ${escapeHtml(String(o.orderNumber))}</title>
<style>
*{box-sizing:border-box}
/* Hide the scrollbar inside the preview iframe (scroll still works). */
html{scrollbar-width:none;-ms-overflow-style:none}
html::-webkit-scrollbar{display:none}
body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;margin:0;color:#1a2330;background:#fff;}
.sheet{max-width:760px;width:100%;margin:0 auto;padding:32px 30px}
.bar{height:6px;background:${BRAND};border-radius:6px;margin-bottom:28px}
.head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap}
.brand{display:flex;gap:12px;align-items:center}
.brand .name{font-size:20px;font-weight:800;letter-spacing:-.3px}
.brand .tag{font-size:11px;color:#6b7785;margin-top:2px}
.inv{text-align:right}
.inv h1{margin:0;font-size:26px;font-weight:800;color:${BRAND};letter-spacing:1px}
.inv .meta{font-size:12px;color:#6b7785;margin-top:4px;line-height:1.5}
.inv .num{font-family:ui-monospace,Menlo,monospace;font-weight:700;color:#1a2330}
.billto{margin:30px 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#9aa5b1;font-weight:700}
.cust{font-size:14px;line-height:1.6}
.cust .who{font-weight:700;font-size:15px}
.badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700}
.paid{background:#e6f6ec;color:#15803d}
.await{background:#fff4e5;color:#b45309}
table{width:100%;border-collapse:collapse;margin:22px 0 0}
th{background:${BRAND};color:#fff;text-align:left;padding:11px 12px;font-size:12px;font-weight:600;letter-spacing:.3px}
th:first-child{border-radius:8px 0 0 0}th:last-child{border-radius:0 8px 0 0}
td{padding:11px 12px;font-size:13px;border-bottom:1px solid #eef1f5}
.num{text-align:right;white-space:nowrap}
.art{font-family:ui-monospace,Menlo,monospace;font-size:12px;color:#52606d}
.strong{font-weight:700}
.totals{margin-top:18px;display:flex;justify-content:flex-end}
.totals table{width:300px;margin:0}
.totals td{border:none;padding:6px 4px;font-size:13px}
.totals .lbl{color:#6b7785}.totals .v{text-align:right;font-weight:600}
.totals .grand td{border-top:2px solid ${BRAND};padding-top:12px;font-size:18px;font-weight:800;color:${BRAND}}
.foot{margin-top:40px;padding-top:16px;border-top:1px solid #eef1f5;text-align:center;color:#6b7785;font-size:11.5px;line-height:1.7}
.thanks{font-weight:700;color:#1a2330;font-size:13px;margin-bottom:4px}
@media (max-width:560px){.sheet{padding:20px 16px}.inv h1{font-size:22px}th,td{padding:8px 8px;font-size:12px}.art{font-size:11px}}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.sheet{padding:0;max-width:none}}
</style></head><body><div class="sheet">
<div class="bar"></div>
<div class="head">
  <div class="brand">${logo}<div><div class="name">${escapeHtml(meta.storeName)}</div><div class="tag">${escapeHtml(meta.address ?? '')}</div></div></div>
  <div class="inv"><h1>INVOICE</h1><div class="meta"># <span class="num">${escapeHtml(String(o.orderNumber))}</span><br>${date}<br><span class="badge ${o.paymentStatus === 'paid' ? 'paid' : 'await'}">${o.paymentStatus === 'paid' ? 'PAID' : 'AWAITING PAYMENT'}</span></div></div>
</div>
<div class="billto">Bill To</div>
<div class="cust"><div class="who">${escapeHtml(String(o.customerName ?? ''))}</div>${escapeHtml(String(o.customerPhone ?? ''))}${email ? '<br>' + escapeHtml(email) : ''}${o.shippingAddress ? '<br>' + escapeHtml(String(o.shippingAddress)) : ''}</div>
<table><thead><tr><th>Article</th><th>Item</th><th class="num">Qty</th><th class="num">Price</th><th class="num">Total</th></tr></thead><tbody>${rows}</tbody></table>
<div class="totals"><table>
  <tr><td class="lbl">Subtotal</td><td class="v">${fmt(subtotal)}</td></tr>
  ${shipping ? `<tr><td class="lbl">Shipping</td><td class="v">${fmt(shipping)}</td></tr>` : ''}
  <tr class="grand"><td>Total</td><td class="v">${fmt(Number(o.total))}</td></tr>
</table></div>
<div class="foot"><div class="thanks">Thank you for your order!</div>${contacts}</div>
</div></body></html>`;
}

function printInvoice(o: Record<string, unknown>, meta: InvoiceMeta) {
  const html = invoiceHtml(o, meta);
  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 250); }
  else {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    iframe.contentDocument?.write(html);
    iframe.contentDocument?.close();
    setTimeout(() => { iframe.contentWindow?.print(); }, 250);
    setTimeout(() => iframe.remove(), 4000);
  }
}

/** Download the invoice as a styled .xlsx workbook (brand colors, borders,
 * currency formatting, item article column). */
function exportXLSX(o: Record<string, unknown>, meta: InvoiceMeta) {
  const BRAND = '0066AE';
  const orderNumber = String(o.orderNumber);
  const items = (o.items as Array<Record<string, unknown>>) || [];
  const email = displayEmail(String(o.customerEmail ?? '')) || meta.email || '';
  const date = o.createdAt ? new Date(Number(o.createdAt)).toLocaleDateString() : '';
  const subtotal = o.subtotal != null ? Number(o.subtotal) : items.reduce((s, i) => s + Number(i.price) * Number(i.quantity), 0);
  const shipping = Number(o.shipping ?? 0);

  const aoa: (string | number)[][] = [
    [meta.storeName, '', '', '', 'INVOICE'],
    [`# ${orderNumber}`, '', '', '', date],
    [o.paymentStatus === 'paid' ? 'PAID' : 'AWAITING PAYMENT'],
    [],
    ['BILL TO'],
    ['Name', String(o.customerName ?? '')],
    ['Phone', String(o.customerPhone ?? '')],
    ...(email ? [['Email', email]] : []),
    ['Address', String(o.shippingAddress ?? '')],
    [],
    ['Article', 'Item', 'Qty', 'Price', 'Total'],
    ...items.map((i) => [
      String(i.sku ?? '') || '—',
      String(i.name ?? ''),
      Number(i.quantity),
      Number(i.price),
      Number(i.price) * Number(i.quantity),
    ]),
    [],
    ['', '', '', 'Subtotal', subtotal],
    ...(shipping ? [['', '', '', 'Shipping', shipping]] : []),
    ['', '', '', 'Total', Number(o.total)],
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 16 }, { wch: 42 }, { wch: 8 }, { wch: 14 }, { wch: 16 }];

  const headerRow = aoa.findIndex((r) => r[0] === 'Article');
  const lastItemRow = headerRow + items.length;
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
  ws['!rows'] = []; ws['!rows'][headerRow] = { hpt: 22 };

  const MONEY = '#,##0" ֏"';
  const thin = { style: 'thin', color: { rgb: 'E5E9EF' } } as const;
  const allBorders = { top: thin, bottom: thin, left: thin, right: thin };
  const at = (r: number, c: number) => XLSX.utils.encode_cell({ r, c });
  const style = (r: number, c: number, s: Record<string, unknown>) => {
    const addr = at(r, c);
    if (!ws[addr]) ws[addr] = { t: 's', v: '' };
    ws[addr].s = { ...(ws[addr].s || {}), ...s };
  };

  // Title row
  style(0, 0, { font: { bold: true, sz: 16, color: { rgb: '1A2330' } } });
  style(0, 4, { font: { bold: true, sz: 16, color: { rgb: BRAND } }, alignment: { horizontal: 'right' } });
  style(1, 0, { font: { bold: true, color: { rgb: '52606D' } } });
  style(1, 4, { font: { color: { rgb: '6B7785' } }, alignment: { horizontal: 'right' } });
  style(2, 0, { font: { bold: true, color: { rgb: o.paymentStatus === 'paid' ? '15803D' : 'B45309' } } });
  // Bill-to label + labels
  style(4, 0, { font: { bold: true, sz: 9, color: { rgb: '9AA5B1' } } });
  for (let r = 5; r < headerRow - 1; r++) style(r, 0, { font: { bold: true, color: { rgb: '6B7785' } } });

  // Items header
  for (let c = 0; c < 5; c++) {
    style(headerRow, c, {
      font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
      fill: { fgColor: { rgb: BRAND } },
      alignment: { horizontal: c >= 2 ? 'right' : 'left', vertical: 'center' },
      border: allBorders,
    });
  }
  // Item rows
  for (let r = headerRow + 1; r <= lastItemRow; r++) {
    for (let c = 0; c < 5; c++) {
      style(r, c, {
        border: allBorders,
        alignment: { horizontal: c >= 2 ? 'right' : 'left', vertical: 'center', wrapText: c === 1 },
      });
    }
    if (ws[at(r, 3)]) { ws[at(r, 3)].z = MONEY; }
    if (ws[at(r, 4)]) { ws[at(r, 4)].z = MONEY; ws[at(r, 4)].s = { ...(ws[at(r, 4)].s || {}), font: { bold: true } }; }
    if (ws[at(r, 0)]) ws[at(r, 0)].s = { ...(ws[at(r, 0)].s || {}), font: { color: { rgb: '52606D' } } };
  }
  // Totals block
  const totalRow = aoa.length - 1;
  for (let r = lastItemRow + 2; r <= totalRow; r++) {
    style(r, 3, { font: { bold: r === totalRow, color: { rgb: r === totalRow ? BRAND : '6B7785' } }, alignment: { horizontal: 'right' } });
    style(r, 4, { font: { bold: true, sz: r === totalRow ? 13 : 11, color: { rgb: r === totalRow ? BRAND : '1A2330' } }, alignment: { horizontal: 'right' } });
    if (ws[at(r, 4)]) ws[at(r, 4)].z = MONEY;
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Invoice');
  XLSX.writeFile(wb, `invoice-${orderNumber}.xlsx`);
}

function OrderCard({ order, sessionToken, index, settings }: { order: Record<string, unknown>; sessionToken: string; index: number; settings: ReturnType<typeof useSettings> }) {
  const { ref, visible } = useReveal();
  const { t } = useAdminT();
  const updateStatus = useMutation(api.orders.updateStatus);
  const convex = useConvex();
  const [exporting, setExporting] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const invoiceMeta: InvoiceMeta = {
    storeName: String((settings as Record<string, unknown> | null | undefined)?.storeName ?? 'Caron'),
    phone: (settings as Record<string, unknown> | null | undefined)?.phone as string | undefined,
    email: (settings as Record<string, unknown> | null | undefined)?.email as string | undefined,
    address: (settings as Record<string, unknown> | null | undefined)?.address as string | undefined,
  };

  // Order enriched with each line item's article (SKU). Loaded lazily when the
  // details modal opens; also reused for the print/XLSX export.
  const invoice = useQuery(
    api.orders.getForInvoice,
    detailsOpen && sessionToken ? { sessionToken, id: order._id as Id<'orders'> } : 'skip',
  );
  const invoiceData = (invoice as unknown as Record<string, unknown>) ?? order;

  // Fetch the order with articles resolved server-side, then hand it to the PDF
  // / XLSX generator. Falls back to the in-memory order if the query fails.
  const runExport = async (kind: 'pdf' | 'xlsx') => {
    if (exporting) return;
    setExporting(true);
    try {
      let data: Record<string, unknown> = order;
      if (invoice) data = invoice as unknown as Record<string, unknown>;
      else if (sessionToken) {
        const enriched = await convex.query(api.orders.getForInvoice, {
          sessionToken,
          id: order._id as Id<'orders'>,
        });
        if (enriched) data = enriched as unknown as Record<string, unknown>;
      }
      if (kind === 'pdf') printInvoice(data, invoiceMeta);
      else exportXLSX(data, invoiceMeta);
    } catch {
      if (kind === 'pdf') printInvoice(order, invoiceMeta);
      else exportXLSX(order, invoiceMeta);
    } finally {
      setExporting(false);
    }
  };
  // Best-effort: email the customer when their order status changes. Never
  // blocks the admin action; silently skipped if email isn't configured or the
  // account has no real email (Telegram placeholder).
  const notifyStatusEmail = (status: string) => {
    const email = String(order.customerEmail ?? '');
    if (!email || email.endsWith('@telegram.local')) return;
    fetch('/api/email/order-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: email, orderNumber: String(order.orderNumber), status, customerName: String(order.customerName ?? '') }),
    }).catch(() => {});
  };
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
      toast.error(t('ao.toast.selectCancelReason'));
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
      toast.success(t('ao.toast.orderCancelled'));
      notifyStatusEmail('cancelled');
      setCancelOpen(false);
      setCancelReason('');
      setCancelComment('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('ao.toast.cancelFailed'));
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
            <Badge className={`${s.color} border-0 text-[10px]`}>{t(s.label)}</Badge>
            <Badge className={`${p.color} border-0 text-[10px]`}>{t(p.label)}</Badge>
            {order.paymentMethod != null ? <Badge variant="outline" className="text-[10px] text-muted-foreground">{t(PAYMENT_LABELS[String(order.paymentMethod)] ?? String(order.paymentMethod))}</Badge> : null}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-lg font-bold text-primary">{formatPrice(Number(order.total))}</span>
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">{formatDateLocalized(Number(order.createdAt), t)}</span>
          </div>
        </div>
        {/* Content row — customer + actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 gap-3">
          <div className="flex items-center gap-3 cursor-pointer group/cust" onClick={() => setDetailsOpen(true)} title={t('ao.details.open')}>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary shrink-0">
              {String(order.customerName).charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium leading-tight group-hover/cust:text-primary transition-colors">{String(order.customerName)}</p>
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
              void updateStatus({ sessionToken, id: order._id as Id<'orders'>, status: v as 'pending' }).then(() => notifyStatusEmail(v));
            }}>
              <SelectTrigger className="h-8 w-full sm:w-[110px] text-xs min-w-0"><span>{t(s.label)}</span></SelectTrigger>
              <SelectContent>{Object.entries(STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{t(v.label)}</SelectItem>)}</SelectContent>
            </Select>
            <button data-testid="order-payment-toggle" onClick={() => updateStatus({ sessionToken, id: order._id as Id<'orders'>, paymentStatus: order.paymentStatus === 'paid' ? 'awaiting' as const : 'paid' as const })}
              className={`flex h-8 items-center gap-1.5 rounded-lg border px-2 sm:px-3 text-[11px] sm:text-xs font-medium transition-colors ${order.paymentStatus === 'paid' ? 'bg-green-50 border-green-200 text-green-700' : 'text-muted-foreground hover:bg-accent'}`}>
              {order.paymentStatus === 'paid' ? '✓' : '○'} {order.paymentStatus === 'paid' ? t('ao.paid') : t('ao.btn.markPaid')}
            </button>
            <div className="h-6 w-px bg-border mx-1 hidden sm:block" />
            <Link href={`tel:${String(order.customerPhone)}`} className="flex h-8 w-8 items-center justify-center rounded-lg border text-muted-foreground hover:bg-accent hover:text-primary transition-colors" title={t('ao.action.call')}>
              <Phone className="h-3.5 w-3.5" />
            </Link>
            {settings?.whatsapp && (
              <Link href={`https://wa.me/${String(order.customerPhone).replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-lg border text-green-600 hover:bg-green-50 transition-colors" title="WhatsApp">
                <MessageSquare className="h-3.5 w-3.5" />
              </Link>
            )}
            <button onClick={() => setDetailsOpen(true)} className="flex h-8 w-8 items-center justify-center rounded-lg border text-muted-foreground hover:bg-accent hover:text-primary transition-colors" title={t('ao.details.open')}>
              <Eye className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => runExport('pdf')} disabled={exporting} className="flex h-8 w-8 items-center justify-center rounded-lg border text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50" title="PDF">
              <FileDown className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => runExport('xlsx')} disabled={exporting} className="flex h-8 w-8 items-center justify-center rounded-lg border text-green-700 hover:bg-green-50 transition-colors disabled:opacity-50" title="XLSX">
              <FileSpreadsheet className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setHistoryOpen((v) => !v)} className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${historyOpen ? 'bg-accent text-primary' : 'text-muted-foreground hover:bg-accent'}`} title={t('ao.action.history')}>
              <History className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {order.status === 'cancelled' && (cancelReasonLabel != null || order.cancelComment != null) && (
          <div className="border-t bg-red-50/60 px-4 py-2 text-xs text-red-800">
            {cancelReasonLabel && <p><span className="font-medium">{t('ao.cancel.reasonLabel')}</span> {t(cancelReasonLabel)}</p>}
            {order.cancelComment ? <p className="mt-1 text-red-700/80">{String(order.cancelComment)}</p> : null}
          </div>
        )}
        {historyOpen && (
          <div className="border-t bg-muted/20 px-4 py-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground flex items-center gap-1.5"><History className="h-3 w-3" /> {t('ao.history.title')}</p>
            {events === undefined && <p className="text-xs text-muted-foreground">{t('ao.loading')}</p>}
            {events?.length === 0 && <p className="text-xs text-muted-foreground">{t('ao.history.empty')}</p>}
            {events && events.length > 0 && (
              <div className="space-y-1.5">
                {events.map((e) => {
                  const st = (v: string | null | undefined) => ({ pending: t('ao.status.pending'), confirmed: t('ao.status.confirmed'), processing: t('ao.status.processing'), shipped: t('ao.status.shipped'), delivered: t('ao.status.delivered'), cancelled: t('ao.status.cancelled'), awaiting: t('ao.status.pending'), paid: t('ao.pay.paid'), refunded: t('ao.pay.refundedAlt') })[v as string] || v || "";
                  const label: string =
                    e.type === 'created' ? t('ao.evt.created') :
                    e.type === 'status_changed' ? `${t('ao.evt.status')}: ${st(e.prevValue)} → ${st(e.nextValue)}` :
                    e.type === 'cancelled' ? `${t('ao.evt.cancelled')}: ${st(e.prevValue)} → ${t('ao.status.cancelled')}` :
                    e.type === 'reopened' ? `${t('ao.evt.reopened')}: ${t('ao.status.cancelled')} → ${st(e.nextValue)}` :
                    e.type === 'payment_changed' ? `${t('ao.evt.payment')}: ${st(e.prevValue)} → ${st(e.nextValue)}` :
                    e.comment ?? '';
                  return (
                    <div key={e._id} className="flex flex-wrap items-start gap-x-2 gap-y-0.5 text-xs">
                      <span className="shrink-0 text-muted-foreground/70 whitespace-nowrap">{formatDateLocalized(e.createdAt, t)}</span>
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
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-[760px]! w-[96vw] p-0 overflow-hidden gap-0">
          <DialogHeader className="flex flex-row items-center justify-between gap-2 border-b px-4 py-3 space-y-0">
            <div>
              <DialogTitle className="text-base">{t('ao.details.title')} <span className="font-mono text-primary">{String(order.orderNumber)}</span></DialogTitle>
              <DialogDescription className="text-xs">{String(order.customerName)} · {formatDateLocalized(Number(order.createdAt), t)}</DialogDescription>
            </div>
            <div className="flex items-center gap-2 pr-8">
              <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => runExport('pdf')} disabled={exporting}>
                <FileDown className="h-3.5 w-3.5" /> PDF
              </Button>
              <Button type="button" size="sm" variant="outline" className="gap-1.5 text-green-700" onClick={() => runExport('xlsx')} disabled={exporting}>
                <FileSpreadsheet className="h-3.5 w-3.5" /> XLSX
              </Button>
            </div>
          </DialogHeader>
          <iframe
            title={`invoice-${String(order.orderNumber)}`}
            srcDoc={invoiceHtml(invoiceData, invoiceMeta)}
            className="h-[72vh] w-full border-0 bg-white"
          />
        </DialogContent>
      </Dialog>
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="overflow-visible">
          <DialogHeader>
            <DialogTitle>{t('ao.dialog.cancelTitle')}</DialogTitle>
            <DialogDescription>{t('ao.dialog.cancelDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('ao.label.reason')}</Label>
              <Select value={cancelReason} onValueChange={(v) => setCancelReason(v as CancelReasonKey)}>
                <SelectTrigger className="h-9 w-full text-sm"><span>{cancelReason ? t(CANCEL_REASON_LABELS[cancelReason]) : t('ao.cancel.selectReason')}</span></SelectTrigger>
                <SelectContent>
                  {CANCEL_REASONS.map((reason) => <SelectItem key={reason.key} value={reason.key}>{t(reason.label)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor={`cancel-comment-${String(order._id)}`}>{t('ao.label.comment')}</Label>
              <Textarea id={`cancel-comment-${String(order._id)}`} value={cancelComment} onChange={(e) => setCancelComment(e.target.value)} placeholder={t('ao.placeholder.comment')} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCancelOpen(false)} disabled={savingCancel}>{t('ao.btn.close')}</Button>
            <Button type="button" variant="destructive" onClick={submitCancellation} disabled={!cancelReason || savingCancel}>{savingCancel ? t('ao.btn.cancelling') : t('ao.dialog.cancelTitle')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { sessionToken } = useAuth();
  const { t } = useAdminT();
  const orders = useQuery(api.orders.listAdmin, sessionToken ? { sessionToken } : 'skip');
  const allProducts = useQuery(api.products.listCostMap);
  const settings = useSettings();
  const [search, setSearch] = useState(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('q') ?? '';
  });
  const [statusFilter, setStatusFilter] = useState('all');
  const [period, setPeriod] = useState<PeriodKey>('30d');
  const [customFrom, setCustomFrom] = useState(() => formatDateInput(new Date()));
  const [customTo, setCustomTo] = useState(() => formatDateInput(new Date()));

  // ─── Bulk selection mode (superadmin control) ───
  const bulkAction = useMutation(api.orders.bulkAction);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkPayment, setBulkPayment] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);
  const toggleSelect = (id: string) => setSelected((prev) => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

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

  const applyBulk = async () => {
    if (selected.size === 0 || (!bulkStatus && !bulkPayment)) return;
    setBulkSaving(true);
    try {
      const res = await bulkAction({
        sessionToken: sessionToken!,
        ids: [...selected] as Parameters<typeof bulkAction>[0]['ids'],
        status: (bulkStatus || undefined) as Parameters<typeof bulkAction>[0]['status'],
        paymentStatus: (bulkPayment || undefined) as Parameters<typeof bulkAction>[0]['paymentStatus'],
      });
      toast.success(`${t('ao.bulk.done')}: ${res.updated}${res.failed ? ` (${res.failed} ${t('ao.bulk.failed')})` : ''}`);
      setSelected(new Set()); setBulkStatus(''); setBulkPayment('');
    } catch { toast.error(t('ao.bulk.error')); } finally { setBulkSaving(false); }
  };

  const exportSelected = () => {
    const rows = (filtered ?? []).filter((o) => selected.has(String(o._id)));
    if (rows.length === 0) return;
    const header = ['Order', 'Date', 'Customer', 'Phone', 'Status', 'Payment', 'Total'];
    const body = rows.map((o) => [
      String(o.orderNumber ?? ''),
      new Date(o.createdAt).toISOString().slice(0, 10),
      String(o.customerName ?? ''),
      String(o.customerPhone ?? ''),
      String(o.status ?? ''),
      String(o.paymentStatus ?? ''),
      String(o.total ?? ''),
    ]);
    const csv = [header, ...body].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `orders-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const statCards = [
    { label: 'ao.stat.total', value: periodOrders.length, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'ao.paid', value: paidOrders, description: formatPrice(totalRevenue), icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'ao.awaitingPayment', value: awaitingPaymentOrders, description: formatPrice(awaitingPaymentRevenue), icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100' },
    { label: 'ao.cancelled', value: cancelledOrders.length, description: formatPrice(cancelledRevenue), icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
    { label: 'ao.revenue', value: formatPrice(totalRevenue), icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-100' },
    { label: 'ao.avgOrder', value: formatPrice(averageOrderValue), icon: DollarSign, color: 'text-cyan-600', bg: 'bg-cyan-100' },
  ];

  const financeRows = [
    { label: 'ao.paid', value: formatPrice(totalRevenue), note: `${paidOrders} ${t('ao.orderCountWord')}`, color: 'text-green-600' },
    { label: 'ao.awaitingPayment', value: formatPrice(awaitingPaymentRevenue), note: `${awaitingPaymentOrders} ${t('ao.orderCountWord')}`, color: 'text-yellow-600' },
    { label: 'ao.cancelled', value: formatPrice(cancelledRevenue), note: `${cancelledOrders.length} ${t('ao.orderCountWord')}`, color: 'text-red-600' },
    { label: 'ao.refunds', value: formatPrice(refundedRevenue), note: `${refundedOrders.length} ${t('ao.orderCountWord')}`, color: 'text-orange-600' },
    { label: 'ao.netRevenue', value: formatPrice(netRevenue), note: t('ao.note.paidMinusRefunds'), color: 'text-primary' },
    { label: 'ao.avgOrder', value: formatPrice(averageOrderValue), note: t('ao.note.byPaidOrders'), color: 'text-cyan-600' },
    { label: 'ao.cost', value: formatPrice(totalCost), note: t('ao.note.ordersCost'), color: 'text-amber-600' },
    { label: 'ao.grossProfit', value: formatPrice(grossProfit), note: t('ao.note.paidMinusRefunds'), color: grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600' },
    { label: 'ao.margin', value: `${margin.toFixed(1)}%`, note: t('ao.note.marginOverPaid'), color: margin >= 20 ? 'text-emerald-600' : 'text-orange-600' },

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
      label: 'ao.reason.unknown',
      count: cancelledOrders.filter((o) => !o.cancelReason).length,
      amount: cancelledOrders.filter((o) => !o.cancelReason).reduce((s, o) => s + o.total, 0),
    },
  ].filter((row) => row.count > 0);

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('ao.title')}</h1>
        <Link href={`/api/export/orders?from=${periodRange.from}&to=${periodRange.to}`} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent">
          <FileSpreadsheet className="h-4 w-4" /> CSV
        </Link>
      </div>

      {/* Period filter */}
      <div className="mb-4 rounded-xl border bg-card p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium">{t('ao.finance.period')}</p>
            <p className="text-xs text-muted-foreground">{t('ao.finance.periodHint')}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select value={period} onValueChange={(v) => { if (v) setPeriod(v as PeriodKey); }}>
              <SelectTrigger className="h-9 w-full sm:w-44 text-xs"><span>{t(PERIOD_LABELS[period])}</span></SelectTrigger>
              <SelectContent>
                {Object.entries(PERIOD_LABELS).map(([key, label]) => <SelectItem key={key} value={key}>{t(label)}</SelectItem>)}
              </SelectContent>
            </Select>
            {period === 'custom' && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="w-44"><DatePicker value={customFrom} onChange={setCustomFrom} placeholder={t('ao.placeholder.from')} /></div>
                <div className="w-44"><DatePicker value={customTo} onChange={setCustomTo} placeholder={t('ao.placeholder.to')} /></div>
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
                  <p className="text-xs text-muted-foreground">{t(c.label)}</p>
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
                <p className="text-sm font-medium">{t('ao.finance.breakdown')}</p>
                <p className="text-xs text-muted-foreground">{t('ao.finance.byPeriod')}</p>
              </div>
              <Badge variant="outline" className="shrink-0 text-[10px]">{t(PERIOD_LABELS[period])}</Badge>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {financeRows.map((row) => (
                <div key={row.label} className="rounded-lg border bg-background p-3">
                  <p className="text-xs text-muted-foreground">{t(row.label)}</p>
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
              <p className="text-sm font-medium">{t('ao.payMethods.title')}</p>
              <p className="text-xs text-muted-foreground">{t('ao.payMethods.hint')}</p>
            </div>
            <div className="space-y-2">
              {paymentMethodTotals.map((method) => (
                <div key={method.key} className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2">
                  <span className="text-sm text-muted-foreground">{t(method.label)}</span>
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
            <p className="text-sm font-medium">{t('ao.cancelReasons.title')}</p>
            <p className="text-xs text-muted-foreground">{t('ao.cancelReasons.hint')}</p>
          </div>
          {cancelReasonRows.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {cancelReasonRows.map((row) => (
                <div key={row.key} className="rounded-lg border bg-background p-3">
                  <p className="text-xs text-muted-foreground">{t(row.label)}</p>
                  <p className="text-lg font-bold text-red-600">{row.count}</p>
                  <p className="text-[11px] text-muted-foreground">{formatPrice(row.amount)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border bg-background p-3 text-sm text-muted-foreground">{t('ao.cancelReasons.empty')}</p>
          )}
        </CardContent>
      </Card>

      {/* Search & filter */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('ao.search.placeholder')} className="h-9 pl-9 text-sm" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { if (v !== null) setStatusFilter(v); }}>
          <SelectTrigger className="h-9 w-full sm:w-32 text-xs"><span>{statusFilter === 'all' ? t('ao.all') : t(STATUS_MAP[statusFilter]?.label ?? statusFilter)}</span></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('ao.all')}</SelectItem>
            {Object.entries(STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{t(v.label)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant={selectMode ? 'default' : 'outline'} className="h-9 text-xs" onClick={() => { setSelectMode((s) => !s); setSelected(new Set()); }}>
          {selectMode ? t('ao.bulk.exit') : t('ao.bulk.select')}
        </Button>
      </div>

      {/* Bulk action bar */}
      {selectMode && (
        <div className="mb-4 flex flex-col gap-2 rounded-xl border bg-muted/40 p-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span>{t('ao.bulk.selected')}: {selected.size}</span>
            <button className="text-primary hover:underline" onClick={() => setSelected(new Set((filtered ?? []).map((o) => String(o._id))))}>{t('ao.bulk.all')}</button>
            {selected.size > 0 && <button className="text-muted-foreground hover:underline" onClick={() => setSelected(new Set())}>{t('ao.bulk.clear')}</button>}
          </div>
          <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
            <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-2 text-xs">
              <option value="">{t('ao.bulk.status')}</option>
              {['pending', 'confirmed', 'processing', 'shipped', 'delivered'].map((s) => <option key={s} value={s}>{t(STATUS_MAP[s]?.label ?? s)}</option>)}
            </select>
            <select value={bulkPayment} onChange={(e) => setBulkPayment(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-2 text-xs">
              <option value="">{t('ao.bulk.payment')}</option>
              <option value="awaiting">{t('ao.awaitingPayment')}</option>
              <option value="paid">{t('ao.paid')}</option>
              <option value="refunded">{t('ao.refunded')}</option>
            </select>
            <Button className="h-9 text-xs" disabled={bulkSaving || selected.size === 0 || (!bulkStatus && !bulkPayment)} onClick={applyBulk}>{bulkSaving ? t('ao.bulk.applying') : t('ao.bulk.apply')}</Button>
            <Button variant="outline" className="h-9 text-xs" disabled={selected.size === 0} onClick={exportSelected}>{t('ao.bulk.export')}</Button>
          </div>
        </div>
      )}

      {/* Orders list */}
      <div className="space-y-2">
        {filtered?.map((order, i) => {
          const id = String(order._id);
          return (
            <div key={id} className="flex items-start gap-2">
              {selectMode && (
                <input type="checkbox" checked={selected.has(id)} onChange={() => toggleSelect(id)} className="mt-5 h-4 w-4 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <OrderCard order={order as Record<string, unknown>} sessionToken={sessionToken ?? ''} index={i} settings={settings} />
              </div>
            </div>
          );
        })}
      </div>

      {filtered?.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <ShoppingBag className="h-16 w-16 text-muted-foreground/30" />
          <p className="text-muted-foreground">{t('ao.empty')}</p>
        </div>
      )}
    </div>
  );
}
