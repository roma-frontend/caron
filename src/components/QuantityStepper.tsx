'use client';

import { useState } from 'react';

interface Props {
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  max?: number;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  /** Called when "−" is pressed at the minimum (e.g. remove item). If omitted, "−" is disabled at min. */
  onRemove?: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
}

const SIZES = {
  xs: { h: 'h-7', btn: 'w-6 text-xs', inp: 'w-7 text-[10px]' },
  sm: { h: 'h-8', btn: 'w-7 text-sm', inp: 'w-8 text-xs' },
  md: { h: 'h-10', btn: 'w-10 text-lg', inp: 'w-12 text-base' },
};

/**
 * Quantity control with an editable middle field. You can type a number
 * directly; on blur/Enter it is validated against [min, max] and the step —
 * if it doesn't fit (e.g. exceeds stock), it reverts to the last valid value.
 */
export function QuantityStepper({ value, onChange, step = 1, min = step, max = Infinity, size = 'md', className, onRemove, disabled, fullWidth }: Props) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState('');
  const s = SIZES[size];
  const display = focused ? draft : String(value);

  const commit = () => {
    setFocused(false);
    const parsed = Number.parseInt(draft, 10);
    if (!Number.isFinite(parsed)) return;                 // not a number → keep last valid
    // Largest valid quantity: a multiple of `step`, ≥ min, ≤ max (stock).
    const maxValid = Number.isFinite(max) ? Math.max(min, Math.floor(max / step) * step) : Infinity;
    let next: number;
    if (parsed >= max) {
      next = maxValid;                                    // exceeds stock → snap to max
    } else {
      next = Math.floor(parsed / step) * step;            // snap down to the step grid (13,step 6 → 12)
      if (next < min) next = min;
      if (next > maxValid) next = maxValid;
    }
    if (next !== value) onChange(next);
  };

  const dec = () => {
    if (value - step < min) { onRemove?.(); return; }
    onChange(value - step);
  };
  const inc = () => { if (value + step <= max) onChange(value + step); };

  return (
    <div className={`flex items-center rounded-lg border ${s.h} ${fullWidth ? 'w-full justify-between' : ''} ${className ?? ''}`}>
      <button type="button" aria-label="Պակասեցնել" onClick={(e) => { e.preventDefault(); e.stopPropagation(); dec(); }}
        disabled={disabled || (value <= min && !onRemove)}
        className={`flex ${s.h} ${s.btn} items-center justify-center rounded-l-lg transition-colors hover:bg-muted disabled:opacity-30`}>−</button>
      <input
        value={display}
        inputMode="numeric"
        onClick={(e) => e.stopPropagation()}
        onFocus={() => { setFocused(true); setDraft(String(value)); }}
        onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ''))}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.currentTarget as HTMLInputElement).blur(); } }}
        className={`${s.h} ${fullWidth ? 'flex-1 min-w-0' : s.inp} border-x bg-transparent text-center font-semibold outline-none`}
        aria-label="Քանակ"
      />
      <button type="button" aria-label="Ավելացնել" onClick={(e) => { e.preventDefault(); e.stopPropagation(); inc(); }}
        disabled={disabled || value + step > max}
        className={`flex ${s.h} ${s.btn} items-center justify-center rounded-r-lg transition-colors hover:bg-muted disabled:opacity-30`}>+</button>
    </div>
  );
}
