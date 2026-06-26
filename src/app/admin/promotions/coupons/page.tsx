'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Tag, Clock } from 'lucide-react';
import { formatDateLocalized } from '@/lib/formatters';
import { toast } from 'sonner';
import { numericInputProps } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { useAdminT } from '@/lib/i18n/admin';

export default function AdminCouponsPage() {
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const { t } = useAdminT();
  const coupons = useQuery(api.coupons.list, sessionToken ? { sessionToken } : 'skip');
  const create = useMutation(api.coupons.create);
  const remove = useMutation(api.coupons.remove);
  const [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState('');
  const [type, setType] = useState<'percent' | 'fixed'>('percent');
  const [value, setValue] = useState(0);
  const [minAmount, setMinAmount] = useState(0);
  const [maxUses, setMaxUses] = useState(0);
  const [expiresAt, setExpiresAt] = useState('');

  const handleCreate = async () => {
    if (!code.trim() || !value) return;
    await create({
      sessionToken: sessionToken!,
      code: code.trim().toUpperCase(),
      type,
      value,
      minOrderAmount: minAmount || undefined,
      maxUses: maxUses || undefined,
      isActive: true,
      expiresAt: expiresAt ? new Date(expiresAt).getTime() : undefined,
    });
    toast.success(t('acat.couponCreated'));
    setShowForm(false); setCode(''); setValue(0); setMinAmount(0); setMaxUses(0); setExpiresAt('');
  };

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{t('acat.coupons')}</h1>
          <p className="text-muted-foreground">{coupons?.length ?? 0} {t('acat.couponWord')}</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2"><Plus className="h-4 w-4" /> {t('acat.newCoupon')}</Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardContent className="p-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div><Label>{t('acat.code')}</Label><Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="SALE20" className="h-10 font-mono" /></div>
              <div>
                <Label>{t('acat.type')}</Label>
                <div className="flex gap-2 mt-1">
                  <button onClick={() => setType('percent')} className={`flex-1 rounded-xl border py-2 text-sm transition-all ${type === 'percent' ? 'border-primary bg-primary/10 text-primary' : 'hover:border-primary/40'}`}>%</button>
                  <button onClick={() => setType('fixed')} className={`flex-1 rounded-xl border py-2 text-sm transition-all ${type === 'fixed' ? 'border-primary bg-primary/10 text-primary' : 'hover:border-primary/40'}`}>֏</button>
                </div>
              </div>
              <div><Label>{t('acat.value')}</Label><Input {...numericInputProps(false)} value={value} onChange={(e) => setValue(Number(e.target.value))} placeholder={type === 'percent' ? '10' : '5000'} className="h-10" /></div>
              <div><Label>{t('acat.minOrder')}</Label><Input {...numericInputProps(false)} value={minAmount} onChange={(e) => setMinAmount(Number(e.target.value))} className="h-10" /></div>
              <div><Label>{t('acat.maxUses')}</Label><Input {...numericInputProps(false)} value={maxUses} onChange={(e) => setMaxUses(Number(e.target.value))} className="h-10" /></div>
              <div className="sm:col-span-3">
                <Label>{t('acat.expiry')}</Label>
                <div className="flex gap-2 mt-1">
                  <select value={expiresAt ? new Date(expiresAt).getDate() : ''} onChange={(e) => { const d = new Date(expiresAt || Date.now()); d.setDate(Number(e.target.value)); setExpiresAt(d.toISOString().slice(0,10)); }}
                    className="h-10 flex-1 rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">{t('acat.day')}</option>
                    {Array.from({ length: 31 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
                  </select>
                  <select value={expiresAt ? new Date(expiresAt).getMonth() : ''} onChange={(e) => { const d = new Date(expiresAt || Date.now()); d.setMonth(Number(e.target.value)); setExpiresAt(d.toISOString().slice(0,10)); }}
                    className="h-10 flex-1 rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">{t('acat.month')}</option>
                    {[t('acat.monthJan'),t('acat.monthFeb'),t('acat.monthMar'),t('acat.monthApr'),t('acat.monthMay'),t('acat.monthJun'),t('acat.monthJul'),t('acat.monthAug'),t('acat.monthSep'),t('acat.monthOct'),t('acat.monthNov'),t('acat.monthDec')].map((m, i) => <option key={m} value={i}>{m}</option>)}
                  </select>
                  <select value={expiresAt ? new Date(expiresAt).getFullYear() : ''} onChange={(e) => { const d = new Date(expiresAt || Date.now()); d.setFullYear(Number(e.target.value)); setExpiresAt(d.toISOString().slice(0,10)); }}
                    className="h-10 w-20 rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">{t('acat.year')}</option>
                    {Array.from({ length: 5 }, (_, i) => <option key={i} value={2025 + i}>{2025 + i}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <Button onClick={handleCreate} disabled={!code.trim() || !value}>{t('acat.create')}</Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {coupons?.map((c) => (
          <div key={c._id} className="flex items-center justify-between rounded-xl border bg-background p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Tag className="h-5 w-5 text-primary" />
              <div>
                <span className="font-mono font-bold">{c.code}</span>
                <span className="ml-2 text-sm text-muted-foreground">{c.type === 'percent' ? `${c.value}%` : `${c.value.toLocaleString()} ֏`}</span>
                {c.minOrderAmount ? <span className="ml-2 text-xs text-muted-foreground">{c.minOrderAmount.toLocaleString()} {t('acat.amdFrom')}</span> : null}
              </div>
              <Badge variant={c.isActive ? 'default' : 'secondary'} className="text-[10px]">{c.isActive ? t('acat.active') : t('acat.passive')}</Badge>
              {c.expiresAt && <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{formatDateLocalized(c.expiresAt, t)}</span>}
              {c.maxUses ? <span className="text-xs text-muted-foreground">{t('acat.used')} {c.usedCount}/{c.maxUses}</span> : null}
            </div>
            <Button variant="ghost" size="icon" onClick={async () => { await remove({ sessionToken: sessionToken!, id: c._id }); toast.success(t('acat.deleted')); }}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
        {coupons?.length === 0 && <p className="py-8 text-center text-muted-foreground">{t('acat.noCoupons')}</p>}
      </div>
    </div>
  );
}
