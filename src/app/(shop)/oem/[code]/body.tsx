'use client';

import Link from 'next/link';
import { useT } from '@/lib/i18n/admin';
import { ProductOemResults } from './client';

type OemProduct = Parameters<typeof ProductOemResults>[0]['products'];

export function OemPageBody({
  decoded,
  valid,
  products,
}: {
  decoded: string;
  valid: boolean;
  products: OemProduct;
}) {
  const { t } = useT();

  if (!valid) {
    return (
      <div className="mx-auto py-16 text-center max-w-[var(--container-max)] px-[var(--space-container)]">
        <h1 className="text-2xl font-bold">{t('misc.oemSearch')}</h1>
        <p className="mt-3 text-muted-foreground">{t('misc.oemEnterCode')}</p>
        <Link href="/products" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
          {t('misc.viewAllProducts')}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[var(--container-max)] sm:px-[var(--space-container)] py-[var(--space-8)]">
      <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors">{t('misc.breadcrumbHome')}</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-foreground transition-colors">{t('misc.breadcrumbProducts')}</Link>
        <span>/</span>
        <span className="font-medium text-foreground">OEM {decoded}</span>
      </nav>

      <h1 className="text-2xl font-bold">OEM {decoded}</h1>
      <p className="mt-2 text-muted-foreground">
        {products.length > 0
          ? `${t('misc.foundPrefix')} ${products.length} ${t('misc.productWord')}`
          : t('misc.noProductsFound')}
      </p>

      {products.length > 0 && (
        <div className="mt-4 rounded-2xl border bg-card">
          <ProductOemResults products={products} decoded={decoded} />
        </div>
      )}

      {products.length === 0 && (
        <div className="mt-8 py-12 text-center">
          <p className="text-lg text-muted-foreground">{decoded} {t('misc.oemNotFoundSuffix')}</p>
          <Link href="/products" className="mt-4 inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold hover:bg-accent transition-colors">
            {t('misc.viewAllProducts')}
          </Link>
        </div>
      )}

      {products.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-4 text-lg font-semibold">{t('misc.similarSearches')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('misc.oemInfoText')}{' '}
            <Link href="/vin-decoder" className="text-primary underline underline-offset-2 hover:text-primary/80">
              {t('misc.oemInfoVin')}
            </Link>{' '}
            {t('misc.oemInfoOr')}{' '}
            <Link href="/products" className="text-primary underline underline-offset-2 hover:text-primary/80">
              {t('misc.oemInfoSelectMake')}
            </Link>:
          </p>
        </div>
      )}
    </div>
  );
}
