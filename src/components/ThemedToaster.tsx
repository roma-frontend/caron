'use client';

import { Toaster } from 'sonner';
import { useTheme } from 'next-themes';

export function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      richColors={false}
      position="top-right"
      theme={(resolvedTheme as 'light' | 'dark') || 'dark'}
      expand
      visibleToasts={5}
      toastOptions={{
        unstyled: false,
        classNames: {
          toast:
            'group pointer-events-auto rounded-xl border border-border bg-card text-card-foreground shadow-lg ring-1 ring-border/60',
          title: 'text-sm font-semibold text-card-foreground',
          description: 'text-xs text-muted-foreground',
          actionButton:
            'rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90',
          cancelButton:
            'rounded-md border border-border bg-muted px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent',
          success:
            'border-emerald-500/35 ring-1 ring-emerald-500/25 bg-card text-card-foreground',
          error:
            'border-destructive/45 ring-1 ring-destructive/25 bg-card text-card-foreground',
          warning:
            'border-amber-500/45 ring-1 ring-amber-500/25 bg-card text-card-foreground',
          info:
            'border-primary/45 ring-1 ring-primary/25 bg-card text-card-foreground',
        },
        style: {
          background: 'var(--card)',
          color: 'var(--card-foreground)',
          borderColor: 'var(--border)',
        },
      }}
    />
  );
}
