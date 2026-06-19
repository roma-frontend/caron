'use client';

import { useEffect } from 'react';
import { captureError } from '@/lib/observability';

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    captureError(error, { boundary: 'admin/error' });
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center" style={{ paddingInline: 'var(--space-container)' }}>
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-destructive/10">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-destructive"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
      </div>
      <h2 className="mb-2 text-xl font-bold">Սխալ ադմինիստրատորի էջում</h2>
      <p className="mb-6 max-w-md text-muted-foreground">{error.message || 'Խնդրում ենք փորձել կրկին'}</p>
      <button onClick={reset} className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
        Փորձել կրկին
      </button>
    </div>
  );
}
