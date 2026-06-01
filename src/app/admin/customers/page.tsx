'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { LayoutGrid, List, Search, UserCog, Percent, Phone, Mail, Shield, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth';
import { formatDateHy } from '@/lib/formatters';
import { Id } from '../../../../convex/_generated/dataModel';

export default function AdminCustomersPage() {
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'retail' | 'wholesale'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 24;

  const customers = useQuery(api.customers.list, sessionToken ? {
    sessionToken,
    search: search || undefined,
    customerType: typeFilter !== 'all' ? typeFilter : undefined,
    paginationOpts: { numItems: PAGE_SIZE, cursor: null },
  } : 'skip');

  const updateCustomer = useMutation(api.customers.updateCustomer);

  const toggleType = async (userId: Id<'users'>, current?: string) => {
    if (!sessionToken) return;
    try {
      const newType = current === 'wholesale' ? 'retail' : 'wholesale';
      await updateCustomer({ sessionToken, userId, customerType: newType as 'retail' | 'wholesale' });
      toast.success(`Հաճախորդը տեղափոխվեց ${newType === 'wholesale' ? 'մեծածախ' : 'մանրածախ'}`);
    } catch { toast.error('Սխալ առաջացավ'); }
  };

  const setDiscount = async (userId: Id<'users'>, discountPercent: number) => {
    if (!sessionToken) return;
    try { await updateCustomer({ sessionToken, userId, discountPercent }); toast.success('Скидка сохранена'); } catch { toast.error('Սխալ առաջացավ'); }
  };

  if (customers === undefined) return <Loader />;

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Հաճախորդներ</h1>
          <p className="text-sm text-muted-foreground">{customers.total} գրանցվել է</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setViewMode('grid')} className={`rounded-lg p-2 transition-colors ${viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent'}`}><LayoutGrid className="h-4 w-4" /></button>
          <button onClick={() => setViewMode('list')} className={`rounded-lg p-2 transition-colors ${viewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent'}`}><List className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Որոնել անուն, էլ. փոստ, հեռախոսահամար..." className="h-10 pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
          <option value="all">Բոլորը</option>
          <option value="retail">Մանրածախ</option>
          <option value="wholesale">Մեծածախ</option>
        </select>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {customers.page.map((c) => (
            <CustomerCard key={c._id} customer={c} sessionToken={sessionToken!} onToggleType={() => toggleType(c._id, c.customerType)} onSetDiscount={(d) => setDiscount(c._id, d)} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="border-b">
                <th className="p-3 text-left font-medium">Անուն</th>
                <th className="p-3 text-left font-medium">Էլ. փոստ</th>
                <th className="p-3 text-left font-medium">Հեռախոս</th>
                <th className="p-3 text-left font-medium">Տիպ</th>
                <th className="p-3 text-left font-medium">Զեղչ</th>
                <th className="p-3 text-left font-medium">Ստատուս</th>
                <th className="p-3 text-left font-medium">Ամսաթիվ</th>
              </tr>
            </thead>
            <tbody>
              {customers.page.map((c) => (
                <tr key={c._id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3 font-medium">{c.name}</td>
                  <td className="p-3 text-muted-foreground">{c.email}</td>
                  <td className="p-3 text-muted-foreground">{c.phone || '—'}</td>
                  <td className="p-3">
                    <Badge variant={c.customerType === 'wholesale' ? 'default' : 'secondary'} className="text-[10px] cursor-pointer" onClick={() => toggleType(c._id, c.customerType)}>
                      {c.customerType === 'wholesale' ? 'Մեծածախ' : 'Մանրածախ'}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <input type="number" className="h-7 w-16 rounded border border-input bg-background px-2 text-xs" defaultValue={c.discountPercent ?? 0} onBlur={(e) => setDiscount(c._id, Number(e.target.value))} />
                    <span className="text-xs text-muted-foreground ml-1">%</span>
                  </td>
                  <td className="p-3">{c.isActive ? <Badge className="text-[10px] bg-green-500">Ակտիվ</Badge> : <Badge variant="secondary" className="text-[10px]">Բլոկ</Badge>}</td>
                  <td className="p-3 text-xs text-muted-foreground">{formatDateHy(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {customers.page.length === 0 && (
        <div className="py-16 text-center text-muted-foreground">Հաճախորդներ չեն գտնվել</div>
      )}
    </div>
  );
}

function CustomerCard({ customer, sessionToken, onToggleType, onSetDiscount }: {
  customer: { _id: Id<'users'>; name: string; email: string; phone?: string; role: string; customerType?: string; discountPercent?: number; isActive: boolean; createdAt: number };
  sessionToken: string; onToggleType: () => void; onSetDiscount: (d: number) => void;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <Badge variant={customer.customerType === 'wholesale' ? 'default' : 'secondary'} className="cursor-pointer text-[10px]" onClick={onToggleType}>
            {customer.customerType === 'wholesale' ? 'Մեծածախ' : 'Մանրածախ'}
          </Badge>
        </div>
        <h3 className="mt-2 font-semibold truncate">{customer.name}</h3>
        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {customer.email}</div>
          {customer.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {customer.phone}</div>}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Percent className="h-3.5 w-3.5 text-muted-foreground" />
            <input type="number" className="h-7 w-14 rounded border border-input bg-background px-2 text-xs" defaultValue={customer.discountPercent ?? 0} onBlur={(e) => onSetDiscount(Number(e.target.value))} />
            <span className="text-xs text-muted-foreground">%</span>
          </div>
          <Badge variant={customer.isActive ? 'default' : 'secondary'} className="text-[10px]">
            {customer.isActive ? 'Ակտիվ' : 'Բլոկավորված'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
