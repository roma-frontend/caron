'use client';

import { VinDecoder } from '@/components/VinDecoder';
import { useSettings } from '@/hooks/useSettings';
import Link from 'next/link';
import { useT } from '@/lib/i18n/admin';

export default function VinDecoderPage() {
  const { t } = useT();
  const settings = useSettings();
  if (settings && !settings.enableVinDecoder) {
    return (
      <div className="mx-auto py-16 text-center max-w-[var(--container-max)] px-[var(--space-container)]">
        <h1 className="text-2xl font-bold">{t('pg.vin.title')}</h1>
        <p className="mt-3 text-muted-foreground">{t('pg.common.featureUnavailable')}</p>
        <Link href="/products" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
          {t('pg.common.allProducts')}
        </Link>
      </div>
    );
  }
  return (
    <div className="mx-auto py-12 max-w-[var(--container-max)] px-[var(--space-container)]">
      <VinDecoder />
    </div>
  );
}
