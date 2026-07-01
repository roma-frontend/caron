'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Warehouse, Search, ArrowDown, ArrowUp, RefreshCw, TrendingUp, AlertTriangle, PackageCheck } from 'lucide-react';
import { formatDateLocalized } from '@/lib/formatters';
import { useAuth } from '@/store/auth';
import { useAdminT } from '@/lib/i18n/admin';

const TYPE_MAP: Record<string, { labelKey: string; color: string; icon: typeof ArrowDown }> = {
  sale: { labelKey: 'acat.stockSale', color: 'bg-red-100 text-red-800', icon: ArrowDown },
  cancel: { labelKey: 'acat.stockCancel', color: 'bg-green-100 text-green-800', icon: ArrowUp },
  reopen: { labelKey: 'acat.stockReopen', color: 'bg-orange-100 text-orange-800', icon: ArrowDown },
  manual: { labelKey: 'acat.stockManual', color: 'bg-blue-100 text-blue-800', icon: RefreshCw },
};

export default function StockMovementsPage() {
  const { sessionToken } = useAuth();
  const { t } = useAdminT();
  const movements = useQuery(api.products.listStockMovements, sessionToken ? { sessionToken, limit: 500 } : 'skip');
  const products = useQuery(api.products.listNameMap);
  const insights = useQuery(api.products.stockInsights, sessionToken ? { sessionToken } : 'skip');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const productMap = new Map(products?.map((p) => [p._id, p.name]) ?? []);

  const filtered = movements?.filter((m) => {
    if (typeFilter !== 'all' && m.type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const name = productMap.get(m.productId)?.toLowerCase() ?? '';
      return name.includes(q) || (m.adminName?.toLowerCase().includes(q) ?? false);
    }
    return true;
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t('acat.stock')}</h1>
        <p className="text-sm text-muted-foreground">{t('acat.stockSubtitle')}</p>
      </div>

      {/* Smart insights: reorder suggestions + dead stock */}
      {insights && (insights.reorder.length > 0 || insights.deadStock.length > 0) && (
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          <Card className="border-orange-500/30">
            <CardContent className="p-4">
              <h2 className="mb-3 flex items-center gap-2 font-semibold"><TrendingUp className="h-4 w-4 text-orange-500" /> {t('acat.reorderTitle')}</h2>
              {insights.reorder.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground"><PackageCheck className="h-4 w-4 text-green-500" /> {t('acat.reorderNone')}</p>
              ) : (
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {insights.reorder.map((r) => (
                    <div key={r._id} className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{r.name}</p>
                        <p className="text-[11px] text-muted-foreground">{t('acat.perDay')}: {r.perDay} · {t('acat.daysLeft')}: {r.daysLeft} · {t('acat.inStock')}: {r.stock}</p>
                      </div>
                      <Badge className="shrink-0 bg-orange-100 text-orange-800 border-0 text-[10px]">+{r.suggested}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="border-red-500/30">
            <CardContent className="p-4">
              <h2 className="mb-3 flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4 text-red-500" /> {t('acat.deadStockTitle')}</h2>
              {insights.deadStock.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('acat.deadStockNone')}</p>
              ) : (
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {insights.deadStock.map((d) => (
                    <div key={d._id} className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm">
                      <p className="min-w-0 truncate font-medium">{d.name}</p>
                      <Badge variant="secondary" className="shrink-0 text-[10px]">{t('acat.inStock')}: {d.stock}</Badge>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-2 text-[11px] text-muted-foreground">{t('acat.deadStockHint')}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('acat.search')} className="h-9 pl-9 text-sm" />
        </div>
        <Select value={typeFilter} onValueChange={(v) => { if (v) setTypeFilter(v); }}>
          <SelectTrigger className="h-9 w-full sm:w-40 text-xs"><span>{typeFilter === 'all' ? t('acat.all') : (TYPE_MAP[typeFilter] ? t(TYPE_MAP[typeFilter]!.labelKey) : typeFilter)}</span></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('acat.all')}</SelectItem>
            {Object.entries(TYPE_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{t(v.labelKey)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered === undefined && <p className="text-muted-foreground">{t('acat.loadingStock')}</p>}

      {filtered?.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <Warehouse className="h-16 w-16 text-muted-foreground/30" />
          <p className="text-muted-foreground">{t('acat.noMovements')}</p>
        </div>
      )}

      <div className="space-y-2">
        {filtered?.map((m) => {
          const tp = TYPE_MAP[m.type] ?? TYPE_MAP.manual;
          const Icon = tp.icon;
          const productName = productMap.get(m.productId) ?? '—';
          return (
            <Card key={m._id}>
              <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tp.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{productName}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge className={`${tp.color} border-0 text-[10px]`}>{t(tp.labelKey)}</Badge>
                      <span>{m.stockBefore} &rarr; {m.stockAfter}</span>
                      <span className={m.qty > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {m.qty > 0 ? '+' : ''}{m.qty}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {m.adminName && <span>{m.adminName}</span>}
                  <span>{formatDateLocalized(m.createdAt, t)}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
