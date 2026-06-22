'use client';

import { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { Truck, Search, MapPin, CalendarDays, X } from 'lucide-react';
import { api } from '../../convex/_generated/api';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Zone = {
  _id: string;
  group: 'yerevan' | 'region';
  name: string;
  schedule: string;
  order: number;
  isActive: boolean;
};

type GroupFilter = 'all' | 'yerevan' | 'region';

/** Armenian weekday labels (short) in Mon..Sun order. */
const WEEK = [
  { short: 'Երկ', long: ['երկուշաբթի', 'երկ'] },
  { short: 'Երք', long: ['երեքշաբթի', 'երեք', 'երք'] },
  { short: 'Չրք', long: ['չորեքշաբթի', 'չորեք', 'չրք'] },
  { short: 'Հնգ', long: ['հինգշաբթի', 'հինգ', 'հնգ'] },
  { short: 'Ուր', long: ['ուրբաթ', 'ուր'] },
  { short: 'Շբթ', long: ['շաբաթ', 'շբթ'] },
  { short: 'Կիր', long: ['կիրակի', 'կիր'] },
];

const EVERYDAY_HINTS = ['ամեն օր', 'ամենօր', 'բոլոր օր', 'ամեն'];

/**
 * Parse a free-form schedule string into a set of active weekday indices.
 * Returns null when the text doesn't look like a weekday list (free-form text).
 */
function parseDays(schedule: string): boolean[] | null {
  const text = schedule.toLowerCase();
  if (!text.trim()) return null;

  if (EVERYDAY_HINTS.some((h) => text.includes(h))) {
    return WEEK.map(() => true);
  }

  const active = WEEK.map((d) => d.long.some((token) => text.includes(token)));
  return active.some(Boolean) ? active : null;
}

function WeekStrip({ days }: { days: boolean[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {WEEK.map((d, i) => (
        <span
          key={d.short}
          className={cn(
            'flex h-7 min-w-9 items-center justify-center rounded-md px-1.5 text-xs font-semibold transition-colors',
            days[i]
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground/50',
          )}
        >
          {d.short}
        </span>
      ))}
    </div>
  );
}

function ZoneCard({ zone }: { zone: Zone }) {
  const days = useMemo(() => parseDays(zone.schedule), [zone.schedule]);
  const hasSchedule = zone.schedule.trim().length > 0;

  return (
    <div className="group flex flex-col gap-3 rounded-xl border bg-card/40 p-4 transition-all hover:border-primary/30 hover:shadow-sm">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 shrink-0 text-primary" />
        <h4 className="font-semibold leading-tight">{zone.name}</h4>
      </div>

      {!hasSchedule ? (
        <p className="text-sm text-muted-foreground/60">Ճշտել հեռախոսով</p>
      ) : days ? (
        <WeekStrip days={days} />
      ) : (
        <p className="flex items-start gap-1.5 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" />
          {zone.schedule}
        </p>
      )}
    </div>
  );
}

export function DeliverySchedule() {
  const zones = useQuery(api.delivery.list, {}) as Zone[] | undefined;
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<GroupFilter>('all');

  const counts = useMemo(() => {
    const list = zones ?? [];
    return {
      all: list.length,
      yerevan: list.filter((z) => z.group === 'yerevan').length,
      region: list.filter((z) => z.group === 'region').length,
    };
  }, [zones]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (zones ?? [])
      .filter((z) => (group === 'all' ? true : z.group === group))
      .filter((z) => (q ? z.name.toLowerCase().includes(q) : true))
      .sort((a, b) => a.order - b.order);
  }, [zones, group, query]);

  if (!zones || zones.length === 0) return null;

  const tabs: { key: GroupFilter; label: string; count: number }[] = [
    { key: 'all', label: 'Բոլորը', count: counts.all },
    { key: 'yerevan', label: 'Երևան', count: counts.yerevan },
    { key: 'region', label: 'Մարզեր', count: counts.region },
  ];

  return (
    <section className="mt-16">
      <div className="mb-2 flex items-center justify-center gap-2">
        <Truck className="h-5 w-5 text-primary" />
        <h2 className="text-center text-2xl font-bold">Առաքման գրաֆիկ</h2>
      </div>
      <p className="mx-auto mb-8 max-w-xl text-center text-sm text-muted-foreground">
        Գտեք ձեր համայնքը կամ մարզը՝ տեսնելու առաքման օրերը
      </p>

      {/* Controls */}
      <div className="mx-auto mb-8 flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Փնտրել վայր..."
            className="h-10 pl-9 pr-9"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Մաքրել"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Group toggle */}
        <div className="inline-flex shrink-0 rounded-lg border bg-muted/40 p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setGroup(t.key)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                group === t.key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
              <span className="ml-1.5 text-xs opacity-60">{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed py-12 text-center text-muted-foreground">
          <Search className="mx-auto mb-3 h-8 w-8 opacity-40" />
          <p>Ոչինչ չի գտնվել «{query}» հարցմամբ</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((z) => (
            <ZoneCard key={z._id} zone={z} />
          ))}
        </div>
      )}
    </section>
  );
}
