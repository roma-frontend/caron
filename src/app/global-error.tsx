'use client';

import { useEffect } from 'react';
import { captureError } from '@/lib/observability';
import { useT } from '@/lib/i18n/admin';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useT();
  useEffect(() => {
    captureError(error, { boundary: 'global-error' });
  }, [error]);

  return (
    <html lang="hy">
      <body>
        <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', textAlign: 'center', padding: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{t('cmp.error_title')}</h2>
          <button onClick={reset} style={{ marginTop: '1.5rem', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', background: '#0066ae', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>
            {t('cmp.try_again')}
          </button>
          {error.digest && (
            <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#888' }}>{t('cmp.code')}: {error.digest}</p>
          )}
        </div>
      </body>
    </html>
  );
}
