'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useT } from '@/lib/i18n/admin';

const MONTHS = ['cmp.month_1', 'cmp.month_2', 'cmp.month_3', 'cmp.month_4', 'cmp.month_5', 'cmp.month_6', 'cmp.month_7', 'cmp.month_8', 'cmp.month_9', 'cmp.month_10', 'cmp.month_11', 'cmp.month_12'];
const WEEKDAYS = ['cmp.weekday_1', 'cmp.weekday_2', 'cmp.weekday_3', 'cmp.weekday_4', 'cmp.weekday_5', 'cmp.weekday_6', 'cmp.weekday_7']; // Monday-first

const pad = (n: number) => String(n).padStart(2, '0');
const toValue = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const CAL_W = 288;
const CAL_H = 330;

/** Fully Armenian date picker. Value is an ISO date string `YYYY-MM-DD`. */
export function DatePicker({ value, onChange, placeholder, className }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const { t } = useT();
  const ph = placeholder ?? t('cmp.pick_date');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const parsed = value ? value.split('-').map(Number) : null;
  const selected = parsed && parsed.length === 3 ? { y: parsed[0], m: parsed[1] - 1, d: parsed[2] } : null;

  const today = new Date();
  const [view, setView] = useState({ y: selected?.y ?? today.getFullYear(), m: selected?.m ?? today.getMonth() });

  const reposition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const openUp = r.bottom + CAL_H + 8 > window.innerHeight && r.top > CAL_H;
    const top = openUp ? Math.max(8, r.top - CAL_H - 8) : r.bottom + 8;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - CAL_W - 8));
    setPos({ top, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    reposition();
    const onScroll = () => reposition();
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
    };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    document.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open, reposition]);

  const label = selected ? `${selected.d} ${t(MONTHS[selected.m])} ${selected.y}` : '';
  const firstDow = (new Date(view.y, view.m, 1).getDay() + 6) % 7; // Monday-first offset
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const prevMonth = () => setView((v) => v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 });
  const nextMonth = () => setView((v) => v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 });
  const pick = (d: number) => { onChange(toValue(view.y, view.m, d)); setOpen(false); };
  const isToday = (d: number) => view.y === today.getFullYear() && view.m === today.getMonth() && d === today.getDate();
  const isSelected = (d: number) => selected && selected.y === view.y && selected.m === view.m && selected.d === d;

  return (
    <>
      <button ref={triggerRef} type="button" onClick={() => setOpen((o) => !o)}
        className={`flex h-11 w-full items-center gap-2 rounded-lg border border-input bg-background px-3 text-left text-sm transition-colors hover:border-primary/40 ${className ?? ''}`}>
        <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className={label ? '' : 'text-muted-foreground'}>{label || ph}</span>
        {value && (
          <span role="button" tabIndex={0} aria-label={t('cmp.clear')} onClick={(e) => { e.stopPropagation(); onChange(''); }}
            className="ml-auto rounded-full p-0.5 text-muted-foreground hover:text-destructive">
            <X className="h-3.5 w-3.5" />
          </span>
        )}
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div ref={popRef} className="fixed z-[1000] rounded-xl border bg-popover p-3 shadow-2xl" style={{ top: pos.top, left: pos.left, width: CAL_W }}>
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={prevMonth} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent"><ChevronLeft className="h-4 w-4" /></button>
            <span className="text-sm font-semibold">{t(MONTHS[view.m])} {view.y}</span>
            <button type="button" onClick={nextMonth} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium text-muted-foreground">
            {WEEKDAYS.map((w) => <div key={w} className="py-1">{t(w)}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((d, i) => d === null ? <div key={i} /> : (
              <button key={i} type="button" onClick={() => pick(d)}
                className={`flex h-8 w-full items-center justify-center rounded-lg text-sm transition-colors ${
                  isSelected(d) ? 'bg-primary font-bold text-primary-foreground'
                    : isToday(d) ? 'bg-primary/10 font-semibold text-primary'
                      : 'hover:bg-accent'}`}>
                {d}
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between border-t pt-2 text-xs">
            <button type="button" onClick={() => { onChange(''); setOpen(false); }} className="text-muted-foreground hover:text-destructive">{t('cmp.clear')}</button>
            <button type="button" onClick={() => { const n = new Date(); onChange(toValue(n.getFullYear(), n.getMonth(), n.getDate())); setOpen(false); }} className="font-medium text-primary hover:underline">{t('cmp.today')}</button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
