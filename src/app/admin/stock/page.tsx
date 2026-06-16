'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Warehouse, Search, ArrowDown, ArrowUp, RefreshCw } from 'lucide-react';
import { formatDateHy } from '@/lib/formatters';
import { useAuth } from '@/store/auth';

const TYPE_MAP: Record<string, { label: string; color: string; icon: typeof ArrowDown }> = {
  sale: { label: '\u054E\u0561\u0573\u0561\u057C\u0584', color: 'bg-red-100 text-red-800', icon: ArrowDown },
  cancel: { label: '\u0549\u0565\u0572\u0561\u0580\u056F\u0578\u0582\u0574', color: 'bg-green-100 text-green-800', icon: ArrowUp },
  reopen: { label: '\u054E\u0565\u0580\u0561\u0562\u0561\u0581\u0578\u0582\u0574', color: 'bg-orange-100 text-orange-800', icon: ArrowDown },
  manual: { label: '\u0541\u0565\u057C\u0584\u0578\u057E', color: 'bg-blue-100 text-blue-800', icon: RefreshCw },
};

export default function StockMovementsPage() {
  const { sessionToken } = useAuth();
  const movements = useQuery(api.products.listStockMovements, sessionToken ? { sessionToken, limit: 500 } : 'skip');
  const products = useQuery(api.products.listAll);
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
        <h1 className="text-2xl font-bold">{'\u054A\u0561\u0570\u0565\u057D\u057F\u056B \u0577\u0561\u0580\u056A\u0578\u0582\u0574\u0576\u0565\u0580'}</h1>
        <p className="text-sm text-muted-foreground">{'\u054F\u0565\u057D\u0565\u0584, \u0569\u0565 \u056B\u0576\u0579\u0578\u0582 \u0587 \u0565\u0580\u0562 \u0567 \u0583\u0578\u056D\u057E\u0565\u056C \u0561\u057A\u0580\u0561\u0576\u0584\u056B \u0574\u0576\u0561\u0581\u0578\u0580\u0564\u0568'}</p>
      </div>

      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={'\u0548\u0580\u0578\u0576\u0565\u056C \u0561\u057A\u0580\u0561\u0576\u0584...'} className="h-9 pl-9 text-sm" />
        </div>
        <Select value={typeFilter} onValueChange={(v) => { if (v) setTypeFilter(v); }}>
          <SelectTrigger className="h-9 w-full sm:w-40 text-xs"><span>{typeFilter === 'all' ? '\u0532\u0578\u056C\u0578\u0580\u0568' : TYPE_MAP[typeFilter]?.label ?? typeFilter}</span></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{'\u0532\u0578\u056C\u0578\u0580\u0568'}</SelectItem>
            {Object.entries(TYPE_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered === undefined && <p className="text-muted-foreground">{'\u0532\u0565\u057C\u0576\u057E\u0578\u0582\u0574 \u0567...'}</p>}

      {filtered?.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <Warehouse className="h-16 w-16 text-muted-foreground/30" />
          <p className="text-muted-foreground">{'\u0533\u0580\u0561\u057C\u0578\u0582\u0574\u0576\u0565\u0580 \u0579\u056F\u0561\u0576'}</p>
        </div>
      )}

      <div className="space-y-2">
        {filtered?.map((m) => {
          const t = TYPE_MAP[m.type] ?? TYPE_MAP.manual;
          const Icon = t.icon;
          const productName = productMap.get(m.productId) ?? '\u0531\u0576\u0570\u0561\u0575\u057F';
          return (
            <Card key={m._id}>
              <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${t.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{productName}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge className={`${t.color} border-0 text-[10px]`}>{t.label}</Badge>
                      <span>{m.stockBefore} &rarr; {m.stockAfter}</span>
                      <span className={m.qty > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {m.qty > 0 ? '+' : ''}{m.qty}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {m.adminName && <span>{m.adminName}</span>}
                  <span>{formatDateHy(m.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
