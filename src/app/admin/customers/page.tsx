'use client';

import { useState } from 'react';
import { numericInputProps } from '@/lib/utils';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { LayoutGrid, List, Search, Percent, Phone, Mail, Pencil, Ban, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth';
import { formatDateLocalized } from '@/lib/formatters';
import { Id, Doc } from '../../../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { useAdminT } from '@/lib/i18n/admin';

type Customer = Doc<'users'>;
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

type ConfirmState = { userId: Id<'users'>; name: string } | null;

function ConfirmDeleteDialog({ state, onConfirm, onClose }: { state: NonNullable<ConfirmState>; onConfirm: () => void; onClose: () => void }) {
  const { t } = useAdminT();
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>{t('ac.confirmDelete')}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">«{state.name}» {t('ac.customerWillBeDeleted')}</p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('ac.cancel')}</Button>
          <Button variant="destructive" onClick={() => { onConfirm(); onClose(); }}>{t('ac.delete')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({ customer, sessionToken, onClose }: { customer: Customer; sessionToken: string; onClose: () => void }) {
  const { t } = useAdminT();
  const updateCustomer = useMutation(api.customers.updateCustomer);
  const [form, setForm] = useState({ name: customer.name, phone: customer.phone ?? '', address: customer.address ?? '' });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateCustomer({ sessionToken, userId: customer._id, name: form.name, phone: form.phone || undefined, address: form.address || undefined });
      toast.success(t('ac.saved'));
      onClose();
    } catch { toast.error(t('ac.error')); } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{t('ac.editCustomer')}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div><Label>{t('ac.name')}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-10 mt-1" /></div>
          <div><Label>{t('ac.email')}</Label><Input value={customer.email} disabled className="h-10 mt-1 opacity-60" /></div>
          <div><Label>{t('ac.phoneLabel')}</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+374 XX XXX XXX" className="h-10 mt-1" /></div>
          <div><Label>{t('ac.address')}</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder={t('ac.addressPlaceholder')} className="h-10 mt-1" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('ac.cancel')}</Button>
          <Button onClick={save} disabled={saving}>{saving ? t('ac.saving') : t('ac.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminCustomersPage() {
  const { t } = useAdminT();
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const [search, setSearch] = useState(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('q') ?? '';
  });
  const [typeFilter, setTypeFilter] = useState<'all' | 'retail' | 'wholesale'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ConfirmState>(null);
  const PAGE_SIZE = 24;

  const customers = useQuery(api.customers.list, sessionToken ? {
    sessionToken,
    search: search || undefined,
    customerType: typeFilter !== 'all' ? typeFilter : undefined,
    paginationOpts: { numItems: PAGE_SIZE, cursor: null },
  } : 'skip');

  const updateCustomer = useMutation(api.customers.updateCustomer);
  const deleteCustomer = useMutation(api.customers.deleteCustomer);

  const toggleType = async (userId: Id<'users'>, current?: string) => {
    if (!sessionToken) return;
    try {
      const newType = current === 'wholesale' ? 'retail' : 'wholesale';
      await updateCustomer({ sessionToken, userId, customerType: newType as 'retail' | 'wholesale' });
      toast.success(`${t('ac.customerMovedTo')} ${newType === 'wholesale' ? t('ac.wholesale') : t('ac.retail')}`);
    } catch { toast.error(t('ac.error')); }
  };

  const setDiscount = async (userId: Id<'users'>, discountPercent: number) => {
    if (!sessionToken) return;
    try { await updateCustomer({ sessionToken, userId, discountPercent }); toast.success(t('ac.discountSaved')); } catch { toast.error(t('ac.error')); }
  };

  const toggleBlock = async (userId: Id<'users'>, isActive: boolean) => {
    if (!sessionToken) return;
    try { await updateCustomer({ sessionToken, userId, isActive: !isActive }); toast.success(!isActive ? t('ac.activated') : t('ac.blockedToast')); }
    catch { toast.error(t('ac.error')); }
  };

  const handleDelete = (userId: Id<'users'>, name: string) => {
    setConfirmDelete({ userId, name });
  };


  if (customers === undefined) return <Loader />;

  return (
    <div>
      {editingCustomer && (
        <EditDialog customer={editingCustomer} sessionToken={sessionToken!} onClose={() => setEditingCustomer(null)} />
      )}
      {confirmDelete && (
        <ConfirmDeleteDialog state={confirmDelete} onConfirm={async () => { if (sessionToken) { try { await deleteCustomer({ sessionToken, userId: confirmDelete.userId }); toast.success(t('ac.customerRemoved')); } catch { toast.error(t('ac.error')); } } }} onClose={() => setConfirmDelete(null)} />
      )}

      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('ac.customers')}</h1>
          <p className="text-sm text-muted-foreground">{customers.total} {t('ac.customersCountSuffix')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setViewMode('grid')} className={`rounded-lg p-2 transition-colors ${viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent'}`}><LayoutGrid className="h-4 w-4" /></button>
          <button onClick={() => setViewMode('list')} className={`rounded-lg p-2 transition-colors ${viewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent'}`}><List className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder={t('ac.search')} className="h-10 pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as 'all' | 'retail' | 'wholesale')} className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
          <option value="all">{t('ac.all')}</option>
          <option value="retail">{t('ac.retail')}</option>
          <option value="wholesale">{t('ac.wholesale')}</option>
        </select>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {customers.page.map((c) => (
            <CustomerCard key={c._id} customer={c} sessionToken={sessionToken!} onToggleType={() => toggleType(c._id, c.customerType)} onSetDiscount={(d) => setDiscount(c._id, d)} onEdit={() => setEditingCustomer(c)} onToggleBlock={() => toggleBlock(c._id, c.isActive)} onDelete={() => handleDelete(c._id, c.name)} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="border-b">
                <th className="p-3 text-left font-medium">{t('ac.name')}</th>
                <th className="p-3 text-left font-medium hidden sm:table-cell">{t('ac.email')}</th>
                <th className="p-3 text-left font-medium hidden md:table-cell">{t('ac.phoneShort')}</th>
                <th className="p-3 text-left font-medium hidden lg:table-cell">{t('ac.address')}</th>
                <th className="p-3 text-left font-medium">{t('ac.type')}</th>
                <th className="p-3 text-left font-medium hidden sm:table-cell">{t('ac.discount')}</th>
                <th className="p-3 text-left font-medium hidden md:table-cell">{t('ac.statusCol')}</th>
                <th className="p-3 text-left font-medium hidden lg:table-cell">{t('ac.date')}</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {customers.page.map((c) => (
                <tr key={c._id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3 font-medium">
                    <div>{c.name}</div>
                    <div className="text-xs text-muted-foreground sm:hidden">{c.email}</div>
                  </td>
                  <td className="p-3 text-muted-foreground hidden sm:table-cell">{c.email}</td>
                  <td className="p-3 text-muted-foreground hidden md:table-cell">{c.phone || '—'}</td>
                  <td className="p-3 text-muted-foreground max-w-[140px] truncate hidden lg:table-cell">{c.address || '—'}</td>
                  <td className="p-3">
                    <Badge variant={c.customerType === 'wholesale' ? 'default' : 'secondary'} className="text-[10px] cursor-pointer" onClick={() => toggleType(c._id, c.customerType)}>
                      {c.customerType === 'wholesale' ? t('ac.wholesaleShort') : t('ac.retailShort')}
                    </Badge>
                  </td>
                  <td className="p-3 hidden sm:table-cell">
                    <input {...numericInputProps(false)} className="h-7 w-16 rounded border border-input bg-background px-2 text-xs" defaultValue={c.discountPercent ?? 0} onBlur={(e) => setDiscount(c._id, Number(e.target.value))} />
                    <span className="text-xs text-muted-foreground ml-1">%</span>
                  </td>
                  <td className="p-3 hidden md:table-cell">{c.isActive ? <Badge className="text-[10px] bg-green-500">{t('ac.activeShort')}</Badge> : <Badge variant="secondary" className="text-[10px]">{t('ac.blockedShort')}</Badge>}</td>
                  <td className="p-3 text-xs text-muted-foreground hidden lg:table-cell">{formatDateLocalized(c.createdAt, t)}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditingCustomer(c)} className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => toggleBlock(c._id, c.isActive)} className={`rounded p-1 transition-colors ${c.isActive ? 'text-amber-500 hover:bg-amber-500/10' : 'text-green-500 hover:bg-green-500/10'}`}><Ban className="h-3.5 w-3.5" /></button>
                      <button onClick={() => handleDelete(c._id, c.name)} className="rounded p-1 text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {customers.page.length === 0 && (
        <div className="py-16 text-center text-muted-foreground">{t('ac.noCustomersFound')}</div>
      )}
    </div>
  );
}

function CustomerCard({ customer, sessionToken: _sessionToken, onToggleType, onSetDiscount, onEdit, onToggleBlock, onDelete }: {
  customer: Customer;
  sessionToken: string; onToggleType: () => void; onSetDiscount: (d: number) => void; onEdit: () => void; onToggleBlock: () => void; onDelete: () => void;
}) {
  const { t } = useAdminT();
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant={customer.customerType === 'wholesale' ? 'default' : 'secondary'} className="cursor-pointer text-[10px]" onClick={onToggleType}>
              {customer.customerType === 'wholesale' ? t('ac.wholesale') : t('ac.retail')}
            </Badge>
            <button onClick={onEdit} className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
            <button onClick={onToggleBlock} className={`rounded p-1 transition-colors ${customer.isActive ? 'text-amber-500 hover:bg-amber-500/10' : 'text-green-500 hover:bg-green-500/10'}`}><Ban className="h-3.5 w-3.5" /></button>
            <button onClick={onDelete} className="rounded p-1 text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        </div>
        <h3 className="mt-2 font-semibold truncate">{customer.name}</h3>
        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {customer.email}</div>
          {customer.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {customer.phone}</div>}
          {customer.address && <div className="flex items-center gap-1.5 truncate">📍 {customer.address}</div>}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Percent className="h-3.5 w-3.5 text-muted-foreground" />
            <input {...numericInputProps(false)} className="h-7 w-14 rounded border border-input bg-background px-2 text-xs" defaultValue={customer.discountPercent ?? 0} onBlur={(e) => onSetDiscount(Number(e.target.value))} />
            <span className="text-xs text-muted-foreground">%</span>
          </div>
          <Badge variant={customer.isActive ? 'default' : 'secondary'} className="text-[10px]">
            {customer.isActive ? t('ac.active') : t('ac.blockedFull')}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
