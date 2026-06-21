'use client';

import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';

function msUntilEndOfDay(): number {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return end.getTime() - now.getTime();
}

function format(ms: number): { h: string; m: string; s: string } {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return { h: pad(h), m: pad(m), s: pad(s) };
}

function Cell({ v }: { v: string }) {
  return (
    <span className="min-w-[2ch] rounded-md bg-destructive px-1.5 py-0.5 text-center font-mono text-sm font-bold tabular-nums text-white">
      {v}
    </span>
  );
}

/**
 * "Sale ends in" countdown to the end of the current day — creates urgency on
 * the discounts shelf (WB/OZON flash-sale pattern). Client-only to avoid SSR
 * hydration mismatch on the live clock.
 */
export function FlashCountdown({ className }: { className?: string }) {
  const [ms, setMs] = useState<number | null>(null);

  useEffect(() => {
    // Set the first value off the render path (rAF) to avoid a synchronous
    // setState in the effect body, then tick every second.
    const raf = requestAnimationFrame(() => setMs(msUntilEndOfDay()));
    const t = setInterval(() => setMs(msUntilEndOfDay()), 1000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(t);
    };
  }, []);

  if (ms === null) return null;
  const { h, m, s } = format(ms);

  return (
    <div className={`flex items-center gap-1.5 ${className ?? ''}`}>
      <Timer className="h-4 w-4 text-destructive" />
      <span className="hidden text-xs font-medium text-muted-foreground sm:inline">Ավարտվում է՝</span>
      <div className="flex items-center gap-1">
        <Cell v={h} />
        <span className="font-bold text-destructive">:</span>
        <Cell v={m} />
        <span className="font-bold text-destructive">:</span>
        <Cell v={s} />
      </div>
    </div>
  );
}
