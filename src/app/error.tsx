'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { captureError } from '@/lib/observability';
import { useT } from '@/lib/i18n/admin';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useT();
  useEffect(() => {
    captureError(error, { boundary: 'app/error' });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center" style={{ paddingInline: 'var(--space-container)' }}>
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-destructive/10">
        <AlertTriangle className="h-10 w-10 text-destructive" />
      </div>
      <h2 className="text-2xl font-bold">{t('cmp.error_title')}</h2>
      <p className="mt-2 text-muted-foreground">{t('cmp.error_desc')}</p>
      <Button onClick={reset} size="lg" className="mt-8 gap-2">
        <RotateCcw className="h-4 w-4" /> {t('cmp.try_again')}
      </Button>
      {error.digest && (
        <p className="mt-4 text-xs text-muted-foreground/60">{t('cmp.code')}: {error.digest}</p>
      )}
    </div>
  );
}
