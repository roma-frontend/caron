'use client';

import { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { Calculator, Gift, Sparkles } from 'lucide-react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatPrice } from '@/lib/formatters';
import { useT } from '@/lib/i18n/admin';
import { useZoneName } from '@/lib/i18n/zoneNames';

type Zone = { _id: string; group: 'yerevan' | 'region'; name: string; isActive: boolean; order: number };
type Rule = { _id: string; name: string; note?: string; noteRu?: string; noteEn?: string };

function pickNote(r: Rule, lang: string): string {
  if (lang === 'ru') return r.noteRu || r.note || '';
  if (lang === 'en') return r.noteEn || r.note || '';
  return r.note || r.noteRu || r.noteEn || '';
}

/**
 * Public delivery cost calculator + active-rules notes. Uses the same
 * server-side `quoteDelivery` as checkout, so what customers see here is exactly
 * what they'll be charged.
 */
export function DeliveryCalculator() {
  const { t, lang } = useT();
  const zoneName = useZoneName();
  const zones = useQuery(api.delivery.list, {}) as Zone[] | undefined;
  const rules = useQuery(api.delivery.rulesList, {}) as Rule[] | undefined;

  const [zoneId, setZoneId] = useState('');
  const [amount, setAmount] = useState('');
  const subtotal = Number(amount) || 0;

  const quote = useQuery(
    api.delivery.quoteDelivery,
    zoneId ? { zoneId: zoneId as Id<'deliveryZones'>, subtotal, lang } : 'skip',
  );

  const yerevan = useMemo(() => (zones ?? []).filter((z) => z.group === 'yerevan'), [zones]);
  const regions = useMemo(() => (zones ?? []).filter((z) => z.group === 'region'), [zones]);
  const noteRules = (rules ?? []).filter((r) => pickNote(r, lang));

  if (!zones || zones.length === 0) return null;

  return (
    <section className="mt-16">
      <div className="mb-6 flex items-center justify-center gap-2">
        <Calculator className="h-5 w-5 text-primary" />
        <h2 className="text-center text-2xl font-bold">{t('pg.delivery.calcTitle')}</h2>
      </div>

      <div className="mx-auto max-w-2xl rounded-2xl border bg-card/40 p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">{t('sc.zone')}</label>
            <Select value={zoneId} onValueChange={(v) => setZoneId(v ?? '')}>
              <SelectTrigger className="h-11"><SelectValue placeholder={t('sc.selectZone')}>{zoneId ? zoneName(zones.find((z) => z._id === zoneId)?.name ?? '') : t('sc.selectZone')}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>{t('sc.yerevanGroup')}</SelectLabel>
                  {yerevan.map((z) => <SelectItem key={z._id} value={z._id}>{zoneName(z.name)}</SelectItem>)}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>{t('sc.regionsGroup')}</SelectLabel>
                  {regions.map((z) => <SelectItem key={z._id} value={z._id}>{zoneName(z.name)}</SelectItem>)}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t('pg.delivery.orderAmount')}</label>
            <Input value={amount} inputMode="numeric" onChange={(e) => setAmount(e.target.value)} placeholder="0 ֏" className="h-11" />
          </div>
        </div>

        {zoneId && quote && (
          <div className="mt-5 flex flex-col items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-5 text-center">
            <span className="text-sm text-muted-foreground">{t('pg.delivery.calcResult')}</span>
            <span className={`text-3xl font-extrabold ${quote.free ? 'text-green-600' : 'text-primary'}`}>
              {quote.free ? t('pg.delivery.free') : formatPrice(quote.price)}
            </span>
            {quote.appliedRuleNote && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-600/10 px-3 py-1 text-xs font-medium text-green-700 dark:text-green-400">
                <Gift className="h-3.5 w-3.5" /> {quote.appliedRuleNote}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Active rules / promotions */}
      {noteRules.length > 0 && (
        <div className="mx-auto mt-6 grid max-w-2xl gap-2">
          {noteRules.map((r) => (
            <div key={r._id} className="flex items-start gap-2.5 rounded-xl border border-green-600/20 bg-green-600/5 p-3 text-sm text-green-800 dark:text-green-300">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
              <span>{pickNote(r, lang)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
