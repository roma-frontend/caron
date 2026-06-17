'use client';

import { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp } from 'lucide-react';
import { formatPrice } from '@/lib/formatters';
import { useAuth } from '@/store/auth';

type PeriodKey = 'all' | '7d' | '30d' | 'thisMonth' | 'lastMonth';
const PERIODS: Record<PeriodKey, string> = {
  all: '\u0532\u0578\u056C\u0578\u0580 \u056A\u0561\u0574\u0561\u0576\u0561\u056F',
  '7d': '7 \u0585\u0580',
  '30d': '30 \u0585\u0580',
  thisMonth: '\u0531\u0575\u057D \u0561\u0574\u056B\u057D',
  lastMonth: '\u0531\u0576\u0581\u0561\u056E \u0561\u0574\u056B\u057D',
};

function getPeriodFrom(period: PeriodKey): number {
  if (period === 'all') return 0;
  const now = new Date();
  if (period === '7d') return now.getTime() - 7 * 86400000;
  if (period === '30d') return now.getTime() - 30 * 86400000;
  if (period === 'thisMonth') return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  // lastMonth
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return from.getTime();
}

function getPeriodTo(period: PeriodKey): number {
  if (period === 'lastMonth') {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime();
  }
  return Date.now();
}

export default function AnalyticsPage() {
  const { sessionToken } = useAuth();
  const orders = useQuery(api.orders.listAdmin, sessionToken ? { sessionToken } : 'skip');
  const products = useQuery(api.products.listAnalyticsMap);
  const categories = useQuery(api.categories.list, {});

  const [period, setPeriod] = useState<PeriodKey>('30d');
  const [categoryId, setCategoryId] = useState('all');
  const [brand, setBrand] = useState('all');

  const productMap = useMemo(() => {
    const m = new Map<string, { name: string; categoryId: string; brand?: string; costPrice?: number }>();
    products?.forEach((p) => {
      m.set(p._id as string, { name: p.name, categoryId: p.categoryId as string, brand: p.brand ?? undefined, costPrice: p.costPrice ?? undefined });
    });
    return m;
  }, [products]);

  const categoryMap = useMemo(() => new Map(categories?.map((c) => [c._id as string, c.name]) ?? []), [categories]);

  const brands = useMemo(() => {
    const s = new Set<string>();
    productMap.forEach((p) => { if (p.brand) s.add(p.brand); });
    return [...s].sort();
  }, [productMap]);

  const analytics = useMemo(() => {
    if (!orders) return [];
    const from = getPeriodFrom(period);
    const to = getPeriodTo(period);

    const paidOrders = orders.filter((o) =>
      o.paymentStatus === 'paid' && o.status !== 'cancelled' &&
      o.createdAt >= from && o.createdAt <= to
    );

    // Aggregate by productId
    const agg = new Map<string, { qty: number; revenue: number }>();
    for (const order of paidOrders) {
      for (const item of order.items) {
        const key = item.productId as string;
        const prev = agg.get(key) ?? { qty: 0, revenue: 0 };
        prev.qty += item.quantity;
        prev.revenue += item.price * item.quantity;
        agg.set(key, prev);
      }
    }

    // Build rows
    const rows: Array<{
      productId: string; name: string; category: string; categoryId: string;
      brand: string; qty: number; revenue: number; cost: number; profit: number; margin: number;
    }> = [];

    agg.forEach((data, productId) => {
      const info = productMap.get(productId);
      if (!info) return;
      if (categoryId !== 'all' && info.categoryId !== categoryId) return;
      if (brand !== 'all' && info.brand !== brand) return;

      const cost = (info.costPrice ?? 0) * data.qty;
      const profit = data.revenue - cost;
      const margin = data.revenue > 0 ? (profit / data.revenue) * 100 : 0;

      rows.push({
        productId, name: info.name,
        category: categoryMap.get(info.categoryId) ?? '',
        categoryId: info.categoryId,
        brand: info.brand ?? '',
        qty: data.qty, revenue: data.revenue, cost, profit, margin,
      });
    });

    return rows.sort((a, b) => b.revenue - a.revenue);
  }, [orders, products, period, categoryId, brand, productMap, categoryMap]);

  const totals = useMemo(() => {
    const t = { qty: 0, revenue: 0, cost: 0, profit: 0 };
    analytics.forEach((r) => { t.qty += r.qty; t.revenue += r.revenue; t.cost += r.cost; t.profit += r.profit; });
    return { ...t, margin: t.revenue > 0 ? (t.profit / t.revenue) * 100 : 0 };
  }, [analytics]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6" /> {'\u054E\u0565\u0580\u056C\u0578\u0582\u056E\u0578\u0582\u0569\u0575\u0578\u0582\u0576'}</h1>
        <p className="text-sm text-muted-foreground">{'\u054E\u0561\u0573\u0561\u057C\u0584\u0576\u0565\u0580\u056B \u057E\u0565\u0580\u056C\u0578\u0582\u056E\u0578\u0582\u0569\u0575\u0578\u0582\u0576 \u0568\u057D\u057F \u056F\u0561\u057F\u0565\u0563\u0578\u0580\u056B\u0561\u0575\u056B, \u0562\u0580\u0565\u0576\u0564\u056B \u0587 \u056A\u0561\u0574\u0561\u0576\u0561\u056F\u0561\u0570\u0561\u057F\u057E\u0561\u056E\u056B'}</p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <Select value={period} onValueChange={(v) => { if (v) setPeriod(v as PeriodKey); }}>
          <SelectTrigger className="h-9 w-40 text-xs"><span>{PERIODS[period]}</span></SelectTrigger>
          <SelectContent>
            {Object.entries(PERIODS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={categoryId} onValueChange={(v) => { if (v) setCategoryId(v); }}>
          <SelectTrigger className="h-9 w-48 text-xs"><span>{categoryId === 'all' ? '\u0532\u0578\u056C\u0578\u0580 \u056F\u0561\u057F\u0565\u0563\u0578\u0580\u056B\u0561\u0576\u0565\u0580' : categoryMap.get(categoryId) ?? categoryId}</span></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{'\u0532\u0578\u056C\u0578\u0580 \u056F\u0561\u057F\u0565\u0563\u0578\u0580\u056B\u0561\u0576\u0565\u0580'}</SelectItem>
            {categories?.map((c) => <SelectItem key={c._id} value={c._id as string}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={brand} onValueChange={(v) => { if (v) setBrand(v); }}>
          <SelectTrigger className="h-9 w-44 text-xs"><span>{brand === 'all' ? '\u0532\u0578\u056C\u0578\u0580 \u0562\u0580\u0565\u0576\u0564\u0576\u0565\u0580' : brand}</span></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{'\u0532\u0578\u056C\u0578\u0580 \u0562\u0580\u0565\u0576\u0564\u0576\u0565\u0580'}</SelectItem>
            {brands.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Totals */}
      <div className="mb-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">{'\u054E\u0561\u0573\u0561\u057C\u057E\u0561\u056E'}</p><p className="text-lg font-bold">{totals.qty}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">{'\u0540\u0561\u057D\u0578\u0582\u0575\u0569'}</p><p className="text-lg font-bold text-primary">{formatPrice(totals.revenue)}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">{'\u053B\u0576\u0584\u0576\u0561\u0580\u056A\u0565\u0584'}</p><p className="text-lg font-bold text-amber-600">{formatPrice(totals.cost)}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">{'\u0547\u0561\u0570\u0578\u0582\u0575\u0569'}</p><p className={`text-lg font-bold ${totals.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatPrice(totals.profit)}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">{'\u0544\u0561\u0580\u056A\u0561'}</p><p className={`text-lg font-bold ${totals.margin >= 20 ? 'text-emerald-600' : 'text-orange-600'}`}>{totals.margin.toFixed(1)}%</p></CardContent></Card>
      </div>

      {/* Table */}
      {analytics.length > 0 ? (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">{'\u0531\u057A\u0580\u0561\u0576\u0584'}</th>
                  <th className="px-3 py-2 text-left font-medium">{'\u053F\u0561\u057F\u0565\u0563\u0578\u0580\u056B\u0561'}</th>
                  <th className="px-3 py-2 text-left font-medium">{'\u0532\u0580\u0565\u0576\u0564'}</th>
                  <th className="px-3 py-2 text-right font-medium">{'\u054E\u0561\u0573\u0561\u057C\u057E\u0561\u056E'}</th>
                  <th className="px-3 py-2 text-right font-medium">{'\u0540\u0561\u057D\u0578\u0582\u0575\u0569'}</th>
                  <th className="px-3 py-2 text-right font-medium">{'\u053B\u0576\u0584\u0576\u0561\u0580\u056A\u0565\u0584'}</th>
                  <th className="px-3 py-2 text-right font-medium">{'\u0547\u0561\u0570\u0578\u0582\u0575\u0569'}</th>
                  <th className="px-3 py-2 text-right font-medium">%</th>
                </tr>
              </thead>
              <tbody>
                {analytics.map((row) => (
                  <tr key={row.productId} className="border-t hover:bg-muted/30">
                    <td className="px-3 py-2 max-w-[200px] truncate">{row.name}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{row.category}</td>
                    <td className="px-3 py-2 text-xs">{row.brand || '\u2014'}</td>
                    <td className="px-3 py-2 text-right">{row.qty}</td>
                    <td className="px-3 py-2 text-right font-medium">{formatPrice(row.revenue)}</td>
                    <td className="px-3 py-2 text-right text-amber-600">{row.cost > 0 ? formatPrice(row.cost) : '\u2014'}</td>
                    <td className={`px-3 py-2 text-right font-medium ${row.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{row.cost > 0 ? formatPrice(row.profit) : '\u2014'}</td>
                    <td className="px-3 py-2 text-right">
                      {row.cost > 0 ? <Badge variant="outline" className={`text-[10px] ${row.margin >= 20 ? 'text-emerald-600' : 'text-orange-600'}`}>{row.margin.toFixed(0)}%</Badge> : '\u2014'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {analytics.map((row) => (
              <div key={row.productId} className="rounded-xl border bg-card p-3">
                <p className="text-sm font-medium truncate">{row.name}</p>
                <p className="text-xs text-muted-foreground">{row.category} {row.brand ? `\u00b7 ${row.brand}` : ''}</p>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="text-muted-foreground">{'\u054E\u0561\u0573\u0561\u057C\u057E\u0561\u056E'}:</span><span className="text-right font-medium">{row.qty}</span>
                  <span className="text-muted-foreground">{'\u0540\u0561\u057D\u0578\u0582\u0575\u0569'}:</span><span className="text-right font-medium text-primary">{formatPrice(row.revenue)}</span>
                  <span className="text-muted-foreground">{'\u053B\u0576\u0584\u0576\u0561\u0580\u056A\u0565\u0584'}:</span><span className="text-right text-amber-600">{row.cost > 0 ? formatPrice(row.cost) : '\u2014'}</span>
                  <span className="text-muted-foreground">{'\u0547\u0561\u0570\u0578\u0582\u0575\u0569'}:</span><span className={`text-right font-medium ${row.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{row.cost > 0 ? formatPrice(row.profit) : '\u2014'}</span>
                </div>
                {row.cost > 0 && <Badge variant="outline" className={`mt-2 text-[10px] ${row.margin >= 20 ? 'text-emerald-600' : 'text-orange-600'}`}>{row.margin.toFixed(0)}%</Badge>}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <TrendingUp className="h-16 w-16 text-muted-foreground/30" />
          <p className="text-muted-foreground">{'\u054F\u057E\u0575\u0561\u056C\u0576\u0565\u0580 \u0579\u056F\u0561\u0576'}</p>
        </div>
      )}
    </div>
  );
}
