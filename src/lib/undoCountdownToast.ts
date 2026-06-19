import { toast } from 'sonner';
import { createElement, useState, useEffect, useRef } from 'react';

interface UndoCountdownOptions {
  message: string;
  onUndo: () => void;
  durationMs?: number;
  undoLabel?: string;
  description?: string;
}

export function showUndoCountdownToast(options: UndoCountdownOptions) {
  const {
    message,
    onUndo,
    durationMs = 4000,
    undoLabel = 'Չեղարկել',
    description,
  } = options;

  let undone = false;
  const toastId = `undo-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const undo = () => {
    if (undone) return;
    undone = true;
    onUndo();
    toast.dismiss(toastId);
  };

  // Geometry for the circular ring
  const SIZE = 38;
  const STROKE = 3.5;
  const R = (SIZE - STROKE) / 2;
  const CIRCUMFERENCE = 2 * Math.PI * R;

  function CircularCountdown() {
    // progress goes 1 -> 0 smoothly via requestAnimationFrame
    const [progress, setProgress] = useState(1);
    const [secondsLeft, setSecondsLeft] = useState(Math.ceil(durationMs / 1000));
    const rafRef = useRef<number | undefined>(undefined);

    useEffect(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const elapsed = now - start;
        const p = Math.max(0, 1 - elapsed / durationMs);
        setProgress(p);
        setSecondsLeft(Math.ceil((durationMs - elapsed) / 1000));
        if (p > 0) {
          rafRef.current = requestAnimationFrame(tick);
        }
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }, []);

    const offset = CIRCUMFERENCE * (1 - progress);

    return createElement(
      'div',
      {
        className: 'relative shrink-0',
        style: { width: SIZE, height: SIZE },
      },
      createElement(
        'svg',
        {
          width: SIZE,
          height: SIZE,
          viewBox: `0 0 ${SIZE} ${SIZE}`,
          style: { transform: 'rotate(-90deg)', display: 'block' },
        },
        // Track
        createElement('circle', {
          cx: SIZE / 2,
          cy: SIZE / 2,
          r: R,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: STROKE,
          className: 'text-muted-foreground/20',
        }),
        // Progress arc
        createElement('circle', {
          cx: SIZE / 2,
          cy: SIZE / 2,
          r: R,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: STROKE,
          strokeLinecap: 'round',
          strokeDasharray: CIRCUMFERENCE,
          strokeDashoffset: offset,
          className: 'text-primary',
          style: {
            filter: 'drop-shadow(0 0 3px hsl(var(--primary) / 0.5))',
          },
        })
      ),
      // Number in the middle
      createElement(
        'div',
        {
          className:
            'absolute inset-0 flex items-center justify-center text-[11px] font-bold tabular-nums text-primary',
        },
        String(secondsLeft)
      )
    );
  }

  toast.custom(
    () =>
      createElement(
        'div',
        {
          className:
            'flex w-full items-start gap-3 rounded-xl border bg-card p-4 shadow-xl',
        },
        // Animated circular countdown (top-aligned, does not affect column layout)
        createElement(CircularCountdown),
        // Content column (restored flex column structure)
        createElement(
          'div',
          { className: 'flex min-w-0 flex-1 flex-col gap-2' },
          createElement('p', { className: 'text-sm font-semibold' }, message),
          description &&
            createElement(
              'p',
              { className: 'text-xs text-muted-foreground line-clamp-2' },
              description
            ),
          createElement(
            'button',
            {
              onClick: undo,
              className:
                'self-start rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition-all hover:scale-105 active:scale-95 hover:shadow-lg',
            },
            undoLabel
          )
        )
      ),
    {
      id: toastId,
      duration: durationMs,
    }
  );
}
