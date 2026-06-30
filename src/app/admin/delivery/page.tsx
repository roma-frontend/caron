'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DatePicker } from '@/components/ui/DatePicker';
import { Badge } from '@/components/ui/badge';
import { Truck, Trash2, Plus, Save, Sparkles, Tag, Pencil, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth';
import { useAdminT } from '@/lib/i18n/admin';

type Zone = {
  _id: Id<'deliveryZones'>;
  group: 'yerevan' | 'region';
  name: string;
  schedule: string;
  order: number;
  isActive: boolean;
  price?: number;
  freeThreshold?: number;
  etaText?: string;
  keywords?: string[];
};

type Rule = {
  _id: Id<'deliveryRules'>;
  name: string;
  isActive: boolean;
  priority: number;
  group?: 'yerevan' | 'region';
  zoneIds?: Id<'deliveryZones'>[];
  weekdays?: number[];
  dateFrom?: number;
  dateTo?: number;
  minOrderTotal?: number;
  effectType: 'free' | 'fixed' | 'percent';
  effectValue?: number;
  note?: string;
  noteRu?: string;
  noteEn?: string;
};

const numOrUndef = (s: string): number | undefined => {
  const n = Number(s);
  return s.trim() === '' || !Number.isFinite(n) ? undefined : n;
};
const toDateInput = (ts?: number) => (ts ? new Date(ts).toISOString().slice(0, 10) : '');

// ─── Zones ───────────────────────────────────────────────────────────────────

function ZoneRow({ zone, sessionToken }: { zone: Zone; sessionToken: string }) {
  const { t } = useAdminT();
  const upsert = useMutation(api.delivery.upsert);
  const remove = useMutation(api.delivery.remove);
  const [name, setName] = useState(zone.name);
  const [schedule, setSchedule] = useState(zone.schedule);
  const [isActive, setIsActive] = useState(zone.isActive);
  const [price, setPrice] = useState(zone.price?.toString() ?? '');
  const [freeThreshold, setFreeThreshold] = useState(zone.freeThreshold?.toString() ?? '');
  const [etaText, setEtaText] = useState(zone.etaText ?? '');
  const [keywords, setKeywords] = useState((zone.keywords ?? []).join(', '));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setName(zone.name); setSchedule(zone.schedule); setIsActive(zone.isActive);
    setPrice(zone.price?.toString() ?? ''); setFreeThreshold(zone.freeThreshold?.toString() ?? '');
    setEtaText(zone.etaText ?? ''); setKeywords((zone.keywords ?? []).join(', '));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [zone._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = name !== zone.name || schedule !== zone.schedule || isActive !== zone.isActive
    || price !== (zone.price?.toString() ?? '') || freeThreshold !== (zone.freeThreshold?.toString() ?? '')
    || etaText !== (zone.etaText ?? '') || keywords !== (zone.keywords ?? []).join(', ');

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsert({
        sessionToken, id: zone._id, group: zone.group, name: name.trim(), schedule, isActive,
        price: numOrUndef(price), freeThreshold: numOrUndef(freeThreshold),
        etaText: etaText.trim() || undefined,
        keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
      });
      toast.success(t('as.saved'));
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm(`${t('as.confirmDel')} "${zone.name}"?`)) return;
    await remove({ sessionToken, id: zone._id });
    toast.success(t('as.deleted'));
  };

  return (
    <div className="rounded-xl border bg-background p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} className="font-medium" />
        <label className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
          <Switch checked={isActive} onCheckedChange={setIsActive} />
          {t('as.active')}
        </label>
        <Button size="icon" variant="ghost" onClick={handleDelete} aria-label={t('as.del')}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="text-xs text-muted-foreground">{t('ad.price')}</label>
          <Input value={price} inputMode="numeric" onChange={(e) => setPrice(e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">{t('ad.freeThreshold')}</label>
          <Input value={freeThreshold} inputMode="numeric" onChange={(e) => setFreeThreshold(e.target.value)} placeholder={t('ad.freeThresholdPh')} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">{t('ad.eta')}</label>
          <Input value={etaText} onChange={(e) => setEtaText(e.target.value)} placeholder={t('ad.etaPh')} />
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground">{t('ad.keywords')}</label>
        <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder={t('ad.keywordsPh')} />
      </div>
      <Textarea value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder={t('as.schedulePh')} rows={2} className="resize-y" />
      <div className="flex justify-end">
        <Button size="sm" onClick={handleSave} disabled={!dirty || saving}>
          <Save className="mr-2 h-4 w-4" /> {t('as.save')}
        </Button>
      </div>
    </div>
  );
}

function GroupSection({ title, group, zones, sessionToken }: { title: string; group: 'yerevan' | 'region'; zones: Zone[]; sessionToken: string }) {
  const { t } = useAdminT();
  const upsert = useMutation(api.delivery.upsert);
  const [newName, setNewName] = useState('');

  const handleAdd = async () => {
    const n = newName.trim();
    if (!n) return;
    await upsert({ sessionToken, group, name: n, schedule: '' });
    setNewName('');
    toast.success(t('as.saved'));
  };

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-xl font-bold text-primary">
        <Truck className="h-5 w-5" /> {title}
      </h2>
      <div className="space-y-3">
        {zones.map((z) => <ZoneRow key={z._id} zone={z} sessionToken={sessionToken} />)}
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }} placeholder={t('as.zoneName')} className="max-w-xs" />
        <Button variant="outline" size="sm" onClick={handleAdd} disabled={!newName.trim()}>
          <Plus className="mr-2 h-4 w-4" /> {t('as.addZone')}
        </Button>
      </div>
    </section>
  );
}

// ─── Rules ─────────────────────────────────────────────────────────────────

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon … Sun

function RuleDialog({ rule, zones, sessionToken, open, onClose }: { rule: Rule | null; zones: Zone[]; sessionToken: string; open: boolean; onClose: () => void }) {
  const { t } = useAdminT();
  const upsert = useMutation(api.delivery.ruleUpsert);
  const [form, setForm] = useState(() => blank(rule));
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);

  function blank(r: Rule | null) {
    return {
      name: r?.name ?? '',
      isActive: r?.isActive ?? true,
      priority: r?.priority?.toString() ?? '0',
      group: (r?.group ?? 'any') as 'any' | 'yerevan' | 'region',
      zoneIds: new Set<string>((r?.zoneIds ?? []).map(String)),
      weekdays: new Set<number>(r?.weekdays ?? []),
      dateFrom: toDateInput(r?.dateFrom),
      dateTo: toDateInput(r?.dateTo),
      minOrderTotal: r?.minOrderTotal?.toString() ?? '',
      effectType: (r?.effectType ?? 'free') as 'free' | 'fixed' | 'percent',
      effectValue: r?.effectValue?.toString() ?? '',
      note: r?.note ?? '', noteRu: r?.noteRu ?? '', noteEn: r?.noteEn ?? '',
    };
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setForm(blank(rule)); setStep(0); }, [rule, open]);

  const toggleSet = <T,>(set: Set<T>, v: T): Set<T> => {
    const n = new Set(set); if (n.has(v)) n.delete(v); else n.add(v); return n;
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error(t('ad.ruleNameRequired')); return; }
    setSaving(true);
    try {
      await upsert({
        sessionToken,
        id: rule?._id,
        name: form.name.trim(),
        isActive: form.isActive,
        priority: numOrUndef(form.priority) ?? 0,
        group: form.group === 'any' ? undefined : form.group,
        zoneIds: form.zoneIds.size ? (Array.from(form.zoneIds) as Id<'deliveryZones'>[]) : undefined,
        weekdays: form.weekdays.size ? Array.from(form.weekdays) : undefined,
        dateFrom: form.dateFrom ? new Date(form.dateFrom + 'T00:00:00').getTime() : undefined,
        dateTo: form.dateTo ? new Date(form.dateTo + 'T23:59:59').getTime() : undefined,
        minOrderTotal: numOrUndef(form.minOrderTotal),
        effectType: form.effectType,
        effectValue: form.effectType === 'free' ? undefined : numOrUndef(form.effectValue),
        note: form.note.trim() || undefined,
        noteRu: form.noteRu.trim() || undefined,
        noteEn: form.noteEn.trim() || undefined,
      });
      toast.success(t('as.saved'));
      onClose();
    } finally { setSaving(false); }
  };

  const STEP_TITLES = [t('ad.step.basics'), t('ad.step.scope'), t('ad.step.note')];
  const goNext = () => {
    if (step === 0 && !form.name.trim()) { toast.error(t('ad.ruleNameRequired')); return; }
    setStep((s) => Math.min(s + 1, 2));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{rule ? t('ad.editRule') : t('ad.newRule')}</DialogTitle></DialogHeader>

        {/* Stepper */}
        <div className="mb-4 flex items-center">
          {STEP_TITLES.map((title, i) => (
            <div key={i} className="flex flex-1 items-center last:flex-none">
              <button type="button" onClick={() => (i < step ? setStep(i) : undefined)} className="flex items-center gap-2">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${
                  i < step ? 'border-primary bg-primary text-primary-foreground'
                    : i === step ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground'}`}>
                  {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className={`hidden text-xs font-medium sm:inline ${i === step ? 'text-foreground' : 'text-muted-foreground'}`}>{title}</span>
              </button>
              {i < STEP_TITLES.length - 1 && <div className={`mx-2 h-0.5 flex-1 rounded-full ${i < step ? 'bg-primary' : 'bg-border'}`} />}
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {/* Step 1 — Basics */}
          {step === 0 && (
            <>
              <div className="flex items-center gap-3">
                <Input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('ad.ruleName')} className="font-medium" />
                <label className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                  <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} /> {t('as.active')}
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="text-xs text-muted-foreground">{t('ad.effect')}</label>
                  <Select value={form.effectType} onValueChange={(v) => setForm({ ...form, effectType: v as typeof form.effectType })}>
                    <SelectTrigger><SelectValue>{{ free: t('ad.effect.free'), fixed: t('ad.effect.fixed'), percent: t('ad.effect.percent') }[form.effectType]}</SelectValue></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">{t('ad.effect.free')}</SelectItem>
                      <SelectItem value="fixed">{t('ad.effect.fixed')}</SelectItem>
                      <SelectItem value="percent">{t('ad.effect.percent')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.effectType !== 'free' && (
                  <div>
                    <label className="text-xs text-muted-foreground">{form.effectType === 'percent' ? t('ad.percentOff') : t('ad.fixedPrice')}</label>
                    <Input value={form.effectValue} inputMode="numeric" onChange={(e) => setForm({ ...form, effectValue: e.target.value })} placeholder="0" />
                  </div>
                )}
                <div>
                  <label className="text-xs text-muted-foreground">{t('ad.priority')}</label>
                  <Input value={form.priority} inputMode="numeric" onChange={(e) => setForm({ ...form, priority: e.target.value })} placeholder="0" />
                </div>
              </div>
            </>
          )}

          {/* Step 2 — Scope */}
          {step === 1 && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-muted-foreground">{t('ad.group')}</label>
                  <Select value={form.group} onValueChange={(v) => setForm({ ...form, group: v as typeof form.group })}>
                    <SelectTrigger><SelectValue>{{ any: t('ad.anyGroup'), yerevan: t('as.yerevanCommunities'), region: t('as.regions') }[form.group]}</SelectValue></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">{t('ad.anyGroup')}</SelectItem>
                      <SelectItem value="yerevan">{t('as.yerevanCommunities')}</SelectItem>
                      <SelectItem value="region">{t('as.regions')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">{t('ad.minOrder')}</label>
                  <Input value={form.minOrderTotal} inputMode="numeric" onChange={(e) => setForm({ ...form, minOrderTotal: e.target.value })} placeholder={t('ad.anyAmount')} />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">{t('ad.weekdays')}</label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {WEEKDAY_ORDER.map((d) => (
                    <button key={d} type="button" onClick={() => setForm({ ...form, weekdays: toggleSet(form.weekdays, d) })}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${form.weekdays.has(d) ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent'}`}>
                      {t(`ad.dow.${d}`)}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">{t('ad.weekdaysHint')}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-muted-foreground">{t('ad.dateFrom')}</label>
                  <DatePicker value={form.dateFrom} onChange={(v) => setForm({ ...form, dateFrom: v })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">{t('ad.dateTo')}</label>
                  <DatePicker value={form.dateTo} onChange={(v) => setForm({ ...form, dateTo: v })} />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">{t('ad.specificZones')}</label>
                <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border p-2">
                  <div className="flex flex-wrap gap-1.5">
                    {zones.map((z) => (
                      <button key={z._id} type="button" onClick={() => setForm({ ...form, zoneIds: toggleSet(form.zoneIds, String(z._id)) })}
                        className={`rounded-lg border px-2 py-1 text-xs transition-colors ${form.zoneIds.has(String(z._id)) ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent'}`}>
                        {z.name}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">{t('ad.zonesHint')}</p>
              </div>
            </>
          )}

          {/* Step 3 — Customer-facing note */}
          {step === 2 && (
            <div className="grid gap-2">
              <label className="text-xs text-muted-foreground">{t('ad.note')}</label>
              <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Հայերեն" />
              <Input value={form.noteRu} onChange={(e) => setForm({ ...form, noteRu: e.target.value })} placeholder="Русский" />
              <Input value={form.noteEn} onChange={(e) => setForm({ ...form, noteEn: e.target.value })} placeholder="English" />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {step > 0
            ? <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={saving} className="gap-1.5"><ArrowLeft className="h-4 w-4" /> {t('ad.back')}</Button>
            : <Button variant="outline" onClick={onClose} disabled={saving}>{t('as.cancel')}</Button>}
          {step < 2
            ? <Button onClick={goNext} className="gap-1.5">{t('ad.next')} <ArrowRight className="h-4 w-4" /></Button>
            : <Button onClick={handleSave} disabled={saving} className="gap-1.5"><Save className="h-4 w-4" /> {t('as.save')}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RulesTab({ sessionToken, zones }: { sessionToken: string; zones: Zone[] }) {
  const { t } = useAdminT();
  const rules = useQuery(api.delivery.rulesListAdmin, { sessionToken }) as Rule[] | undefined;
  const remove = useMutation(api.delivery.ruleRemove);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [open, setOpen] = useState(false);

  const effectLabel = (r: Rule) =>
    r.effectType === 'free' ? t('ad.effect.free')
      : r.effectType === 'fixed' ? `${r.effectValue ?? 0} ֏`
      : `−${r.effectValue ?? 0}%`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t('ad.rulesHint')}</p>
        <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> {t('ad.newRule')}
        </Button>
      </div>

      {rules?.length === 0 && (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          <Tag className="mx-auto mb-3 h-8 w-8 opacity-50" />
          <p>{t('ad.noRules')}</p>
        </div>
      )}

      <div className="space-y-2">
        {rules?.map((r) => (
          <div key={r._id} className="flex items-center justify-between gap-3 rounded-xl border bg-background p-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">{r.name}</span>
                <Badge variant={r.isActive ? 'default' : 'secondary'} className="text-[10px]">{r.isActive ? t('as.active') : t('ad.inactive')}</Badge>
                <Badge variant="outline" className="text-[10px]">{effectLabel(r)}</Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {r.weekdays?.length ? r.weekdays.map((d) => t(`ad.dow.${d}`)).join(', ') + ' · ' : ''}
                {r.group ? (r.group === 'yerevan' ? t('as.yerevanCommunities') : t('as.regions')) : t('ad.anyGroup')}
                {r.zoneIds?.length ? ` · ${r.zoneIds.length} ${t('ad.zonesShort')}` : ''}
                {typeof r.minOrderTotal === 'number' ? ` · ≥ ${r.minOrderTotal} ֏` : ''}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }} aria-label={t('ad.editRule')}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={async () => { if (confirm(`${t('as.confirmDel')} "${r.name}"?`)) { await remove({ sessionToken, id: r._id }); toast.success(t('as.deleted')); } }} aria-label={t('as.del')}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <RuleDialog rule={editing} zones={zones} sessionToken={sessionToken} open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function AdminDeliveryPage() {
  const { t } = useAdminT();
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const zones = useQuery(api.delivery.listAdmin, sessionToken ? { sessionToken } : 'skip') as Zone[] | undefined;
  const seed = useMutation(api.delivery.seed);

  const handleSeed = async () => {
    if (!sessionToken) return;
    await seed({ sessionToken });
    toast.success(t('as.saved'));
  };

  const yerevan = useMemo(() => (zones ?? []).filter((z) => z.group === 'yerevan'), [zones]);
  const regions = useMemo(() => (zones ?? []).filter((z) => z.group === 'region'), [zones]);
  const isEmpty = zones !== undefined && zones.length === 0;

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold">{t('as.deliveryScheduleTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('as.deliverySubtitle')}</p>
        </div>
        {isEmpty && (
          <Button onClick={handleSeed}><Sparkles className="mr-2 h-4 w-4" /> {t('as.seed')}</Button>
        )}
      </div>

      {isEmpty ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          <Truck className="mx-auto mb-3 h-10 w-10 opacity-50" />
          <p>{t('as.noZones')}</p>
        </div>
      ) : sessionToken ? (
        <Tabs defaultValue="zones">
          <TabsList className="mb-6">
            <TabsTrigger value="zones"><Truck className="mr-2 h-4 w-4" /> {t('ad.tabZones')}</TabsTrigger>
            <TabsTrigger value="rules"><Tag className="mr-2 h-4 w-4" /> {t('ad.tabRules')}</TabsTrigger>
          </TabsList>
          <TabsContent value="zones">
            <div className="space-y-10">
              <GroupSection title={t('as.yerevanCommunities')} group="yerevan" zones={yerevan} sessionToken={sessionToken} />
              <GroupSection title={t('as.regions')} group="region" zones={regions} sessionToken={sessionToken} />
            </div>
          </TabsContent>
          <TabsContent value="rules">
            <RulesTab sessionToken={sessionToken} zones={zones ?? []} />
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}
