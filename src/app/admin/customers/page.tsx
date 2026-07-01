'use client';

import { useState } from 'react';
import { numericInputProps } from '@/lib/utils';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { LayoutGrid, List, Search, Percent, Phone, Mail, Pencil, Ban, Trash2, UserPlus, Shield, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth';
import { formatDateLocalized } from '@/lib/formatters';
import { Id, Doc } from '../../../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { useAdminT } from '@/lib/i18n/admin';

type Customer = Doc<'users'>;

/** What to show as the customer's contact line: their real email, or the
 *  Telegram @username — never the internal `tg_<id>@telegram.local` placeholder.
 *  Returns { text, href } so Telegram users link to their t.me profile. */
function customerContact(c: Customer): { text: string; href?: string } {
  if (c.email?.endsWith('@telegram.local')) {
    return c.telegramUsername
      ? { text: `@${c.telegramUsername}`, href: `https://t.me/${c.telegramUsername}` }
      : { text: 'Telegram' };
  }
  return { text: c.email };
}
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

function EditDialog({ customer, sessionToken, canManageStaff, onClose }: { customer: Customer; sessionToken: string; canManageStaff: boolean; onClose: () => void }) {
  const { t } = useAdminT();
  const updateCustomer = useMutation(api.customers.updateCustomer);
  const isTelegram = customer.email?.endsWith('@telegram.local');
  const [form, setForm] = useState({
    name: customer.name,
    phone: customer.phone ?? '',
    address: customer.address ?? '',
    role: (customer.role as 'customer' | 'manager' | 'admin'),
    customerType: (customer.customerType ?? 'retail') as 'retail' | 'wholesale',
    discountPercent: customer.discountPercent ?? 0,
    isActive: customer.isActive,
    newPassword: '',
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (form.newPassword && form.newPassword.length < 8) { toast.error(t('ac.passwordTooShort')); return; }
    setSaving(true);
    try {
      await updateCustomer({
        sessionToken,
        userId: customer._id,
        name: form.name,
        phone: form.phone || undefined,
        address: form.address || undefined,
        isActive: form.isActive,
        ...(form.role === 'customer' ? { customerType: form.customerType, discountPercent: form.discountPercent } : {}),
        ...(canManageStaff ? {
          ...(form.role !== customer.role ? { role: form.role } : {}),
          ...(form.newPassword ? { newPassword: form.newPassword } : {}),
        } : {}),
      });
      toast.success(t('ac.saved'));
      onClose();
    } catch { toast.error(t('ac.error')); } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{t('ac.editUser')}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2 max-h-[70vh] overflow-y-auto px-1">
          <div><Label>{t('ac.name')}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-10 mt-1" /></div>
          <div><Label>{t('ac.email')}</Label><Input value={customer.email} disabled className="h-10 mt-1 opacity-60" /></div>
          <div><Label>{t('ac.phoneLabel')}</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+374 XX XXX XXX" className="h-10 mt-1" /></div>
          <div><Label>{t('ac.address')}</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder={t('ac.addressPlaceholder')} className="h-10 mt-1" /></div>

          {canManageStaff && (
            <div>
              <Label>{t('ac.role')}</Label>
              <div className="mt-1 grid grid-cols-3 gap-2">
                {(['customer', 'manager', 'admin'] as const).map((r) => (
                  <button key={r} type="button" onClick={() => setForm({ ...form, role: r })}
                    className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${form.role === r ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent text-muted-foreground'}`}>
                    {t(r === 'customer' ? 'ac.roleCustomer' : r === 'manager' ? 'ac.roleManager' : 'ac.roleAdmin')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {form.role === 'customer' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('ac.customerTypeLabel')}</Label>
                <select value={form.customerType} onChange={(e) => setForm({ ...form, customerType: e.target.value as 'retail' | 'wholesale' })} className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                  <option value="retail">{t('ac.retail')}</option>
                  <option value="wholesale">{t('ac.wholesale')}</option>
                </select>
              </div>
              <div>
                <Label>{t('ac.discountLabel')}</Label>
                <Input {...numericInputProps(false)} value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: Number(e.target.value) })} className="h-10 mt-1" />
              </div>
            </div>
          )}

          {canManageStaff && !isTelegram && (
            <div>
              <Label>{t('ac.newPassword')}</Label>
              <Input type="password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} placeholder={t('ac.leaveBlankKeepPassword')} className="h-10 mt-1" autoComplete="new-password" />
            </div>
          )}

          <label className="flex items-center gap-2 pt-1 text-sm">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4" />
            {t('ac.accountActive')}
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('ac.cancel')}</Button>
          <Button onClick={save} disabled={saving}>{saving ? t('ac.saving') : t('ac.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const WIZARD_STEPS = ['stepRole', 'stepIdentity', 'stepCredentials', 'stepReview'] as const;

function CreateUserWizard({ sessionToken, onClose, onCreated }: { sessionToken: string; onClose: () => void; onCreated: () => void }) {
  const { t } = useAdminT();
  const createUser = useMutation(api.customers.createUser);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    role: 'customer' as 'customer' | 'manager' | 'admin',
    customerType: 'retail' as 'retail' | 'wholesale',
    discountPercent: 0,
    name: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    isActive: true,
  });

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());

  const canNext = () => {
    if (step === 0) return !!form.role;
    if (step === 1) return form.name.trim().length > 0 && emailValid;
    if (step === 2) return form.password.length >= 8;
    return true;
  };

  const handleNext = () => {
    if (!canNext()) {
      if (step === 1) toast.error(emailValid ? t('ac.fillRequired') : t('ac.invalidEmail'));
      else if (step === 2) toast.error(t('ac.passwordTooShort'));
      else toast.error(t('ac.fillRequired'));
      return;
    }
    setStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1));
  };

  const submit = async () => {
    setSaving(true);
    try {
      await createUser({
        sessionToken,
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        phone: form.phone || undefined,
        address: form.address || undefined,
        customerType: form.role === 'customer' ? form.customerType : undefined,
        discountPercent: form.role === 'customer' ? form.discountPercent : undefined,
        isActive: form.isActive,
      });
      toast.success(t('ac.userCreated'));
      onCreated();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('ac.error'));
    } finally { setSaving(false); }
  };

  const roleCards: { role: 'customer' | 'manager' | 'admin'; label: string; desc: string }[] = [
    { role: 'customer', label: t('ac.roleCustomer'), desc: t('ac.roleCustomerDesc') },
    { role: 'manager', label: t('ac.roleManager'), desc: t('ac.roleManagerDesc') },
    { role: 'admin', label: t('ac.roleAdmin'), desc: t('ac.roleAdminDesc') },
  ];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('ac.createUser')}</DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 py-1">
          {WIZARD_STEPS.map((s, i) => (
            <div key={s} className="flex flex-1 items-center gap-2">
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${i <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{i + 1}</div>
              {i < WIZARD_STEPS.length - 1 && <div className={`h-0.5 flex-1 rounded ${i < step ? 'bg-primary' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>
        <p className="text-sm font-medium text-muted-foreground">{t('ac.stepOf')} {step + 1} {t('ac.of')} {WIZARD_STEPS.length} · {t(`ac.${WIZARD_STEPS[step]}`)}</p>

        <div className="min-h-[240px] space-y-3 py-2 max-h-[60vh] overflow-y-auto px-1">
          {step === 0 && (
            <div className="space-y-3">
              <div className="grid gap-2">
                {roleCards.map((rc) => (
                  <button key={rc.role} type="button" onClick={() => setForm({ ...form, role: rc.role })}
                    className={`flex items-center justify-between rounded-xl border p-3 text-left transition-colors ${form.role === rc.role ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-accent'}`}>
                    <div>
                      <p className="font-semibold text-sm">{rc.label}</p>
                      <p className="text-xs text-muted-foreground">{rc.desc}</p>
                    </div>
                    <div className={`h-4 w-4 rounded-full border-2 ${form.role === rc.role ? 'border-primary bg-primary' : 'border-muted-foreground/40'}`} />
                  </button>
                ))}
              </div>
              {form.role === 'customer' && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <Label>{t('ac.customerTypeLabel')}</Label>
                    <select value={form.customerType} onChange={(e) => setForm({ ...form, customerType: e.target.value as 'retail' | 'wholesale' })} className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                      <option value="retail">{t('ac.retail')}</option>
                      <option value="wholesale">{t('ac.wholesale')}</option>
                    </select>
                  </div>
                  <div>
                    <Label>{t('ac.discountLabel')}</Label>
                    <Input {...numericInputProps(false)} value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: Number(e.target.value) })} className="h-10 mt-1" />
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <div><Label>{t('ac.name')}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('ac.namePlaceholder')} className="h-10 mt-1" /></div>
              <div><Label>{t('ac.email')}</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder={t('ac.emailPlaceholder')} className="h-10 mt-1" autoComplete="off" /></div>
              <div><Label>{t('ac.phoneLabel')}</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+374 XX XXX XXX" className="h-10 mt-1" /></div>
              <div><Label>{t('ac.address')}</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder={t('ac.addressPlaceholder')} className="h-10 mt-1" /></div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div>
                <Label>{t('ac.password')}</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="h-10 mt-1" autoComplete="new-password" />
                <p className="mt-1 text-xs text-muted-foreground">{t('ac.passwordHint')}</p>
              </div>
              <label className="flex items-center gap-2 pt-1 text-sm">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4" />
                {t('ac.accountActive')}
              </label>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-2 rounded-xl border bg-muted/30 p-4 text-sm">
              <Row label={t('ac.role')} value={t(form.role === 'customer' ? 'ac.roleCustomer' : form.role === 'manager' ? 'ac.roleManager' : 'ac.roleAdmin')} />
              {form.role === 'customer' && <Row label={t('ac.customerTypeLabel')} value={form.customerType === 'wholesale' ? t('ac.wholesale') : t('ac.retail')} />}
              {form.role === 'customer' && form.discountPercent > 0 && <Row label={t('ac.discountLabel')} value={`${form.discountPercent}%`} />}
              <Row label={t('ac.name')} value={form.name} />
              <Row label={t('ac.email')} value={form.email} />
              {form.phone && <Row label={t('ac.phoneLabel')} value={form.phone} />}
              {form.address && <Row label={t('ac.address')} value={form.address} />}
              <Row label={t('ac.statusCol')} value={form.isActive ? t('ac.active') : t('ac.blockedFull')} />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={() => (step === 0 ? onClose() : setStep((s) => s - 1))} disabled={saving}>
            {step === 0 ? t('ac.cancel') : t('ac.back')}
          </Button>
          {step < WIZARD_STEPS.length - 1 ? (
            <Button onClick={handleNext}>{t('ac.next')}</Button>
          ) : (
            <Button onClick={submit} disabled={saving}>{saving ? t('ac.creating') : t('ac.create')}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right truncate max-w-[60%]">{value}</span>
    </div>
  );
}

/** Small badge shown for staff accounts (manager/admin); nothing for customers. */
function RoleBadge({ role }: { role: string }) {
  const { t } = useAdminT();
  if (role === 'admin') return <Badge className="gap-1 bg-purple-600 text-[10px] text-white hover:bg-purple-600"><ShieldCheck className="h-3 w-3" />{t('ac.roleAdmin')}</Badge>;
  if (role === 'manager') return <Badge className="gap-1 bg-blue-600 text-[10px] text-white hover:bg-blue-600"><Shield className="h-3 w-3" />{t('ac.roleManager')}</Badge>;
  return null;
}

export default function AdminCustomersPage() {
  const { t } = useAdminT();
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const [search, setSearch] = useState(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('q') ?? '';
  });
  const [typeFilter, setTypeFilter] = useState<'all' | 'retail' | 'wholesale'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'customers' | 'staff'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ConfirmState>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const PAGE_SIZE = 24;

  const customers = useQuery(api.customers.list, sessionToken ? {
    sessionToken,
    search: search || undefined,
    customerType: typeFilter !== 'all' ? typeFilter : undefined,
    role: roleFilter === 'customers' ? 'customer' : roleFilter === 'staff' ? 'staff' : undefined,
    paginationOpts: { numItems: PAGE_SIZE, cursor: null },
  } : 'skip');

  const isSuperAdmin = customers?.callerRole === 'superadmin';

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
        <EditDialog customer={editingCustomer} sessionToken={sessionToken!} canManageStaff={!!isSuperAdmin} onClose={() => setEditingCustomer(null)} />
      )}
      {createOpen && sessionToken && (
        <CreateUserWizard sessionToken={sessionToken} onClose={() => setCreateOpen(false)} onCreated={() => { /* list is reactive */ }} />
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
          {isSuperAdmin && (
            <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
              <UserPlus className="h-4 w-4" /> {t('ac.addUser')}
            </Button>
          )}
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
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as 'all' | 'customers' | 'staff')} className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
          <option value="all">{t('ac.filterAllRoles')}</option>
          <option value="customers">{t('ac.filterCustomers')}</option>
          <option value="staff">{t('ac.filterStaff')}</option>
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
                    <div className="text-xs text-muted-foreground sm:hidden">{customerContact(c).text}</div>
                  </td>
                  <td className="p-3 text-muted-foreground hidden sm:table-cell">{customerContact(c).text}</td>
                  <td className="p-3 text-muted-foreground hidden md:table-cell">{c.phone || '—'}</td>
                  <td className="p-3 text-muted-foreground max-w-[140px] truncate hidden lg:table-cell">{c.address || '—'}</td>
                  <td className="p-3">
                    {c.role === 'customer' ? (
                      <Badge variant={c.customerType === 'wholesale' ? 'default' : 'secondary'} className="text-[10px] cursor-pointer" onClick={() => toggleType(c._id, c.customerType)}>
                        {c.customerType === 'wholesale' ? t('ac.wholesaleShort') : t('ac.retailShort')}
                      </Badge>
                    ) : (
                      <RoleBadge role={c.role} />
                    )}
                  </td>
                  <td className="p-3 hidden sm:table-cell">
                    {c.role === 'customer' ? (
                      <>
                        <input {...numericInputProps(false)} className="h-7 w-16 rounded border border-input bg-background px-2 text-xs" defaultValue={c.discountPercent ?? 0} onBlur={(e) => setDiscount(c._id, Number(e.target.value))} />
                        <span className="text-xs text-muted-foreground ml-1">%</span>
                      </>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
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
            {customer.role === 'customer' ? (
              <Badge variant={customer.customerType === 'wholesale' ? 'default' : 'secondary'} className="cursor-pointer text-[10px]" onClick={onToggleType}>
                {customer.customerType === 'wholesale' ? t('ac.wholesale') : t('ac.retail')}
              </Badge>
            ) : (
              <RoleBadge role={customer.role} />
            )}
            <button onClick={onEdit} className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
            <button onClick={onToggleBlock} className={`rounded p-1 transition-colors ${customer.isActive ? 'text-amber-500 hover:bg-amber-500/10' : 'text-green-500 hover:bg-green-500/10'}`}><Ban className="h-3.5 w-3.5" /></button>
            <button onClick={onDelete} className="rounded p-1 text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        </div>
        <h3 className="mt-2 font-semibold truncate">{customer.name}</h3>
        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
          {(() => {
            const contact = customerContact(customer);
            return (
              <div className="flex items-center gap-1.5">
                <Mail className="h-3 w-3" />
                {contact.href
                  ? <a href={contact.href} target="_blank" rel="noopener noreferrer" className="truncate hover:text-primary hover:underline">{contact.text}</a>
                  : <span className="truncate">{contact.text}</span>}
              </div>
            );
          })()}
          {customer.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {customer.phone}</div>}
          {customer.address && <div className="flex items-center gap-1.5 truncate">📍 {customer.address}</div>}
        </div>
        <div className="mt-3 flex items-center justify-between">
          {customer.role === 'customer' ? (
            <div className="flex items-center gap-1.5">
              <Percent className="h-3.5 w-3.5 text-muted-foreground" />
              <input {...numericInputProps(false)} className="h-7 w-14 rounded border border-input bg-background px-2 text-xs" defaultValue={customer.discountPercent ?? 0} onBlur={(e) => onSetDiscount(Number(e.target.value))} />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          ) : <span />}
          <Badge variant={customer.isActive ? 'default' : 'secondary'} className="text-[10px]">
            {customer.isActive ? t('ac.active') : t('ac.blockedFull')}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
