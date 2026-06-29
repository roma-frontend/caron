'use client';

import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import Image from 'next/image';
import Link from '@/components/LocalizedLink';
import { Award } from 'lucide-react';
import { useT } from '@/lib/i18n/admin';

export default function BrandsPage() {
  const { t } = useT();
  const brands = useQuery(api.brands.list, {});
  const counts = useQuery(api.products.getBrandCounts, {});

  return (
    <div className="mx-auto max-w-[var(--container-max)] px-4 py-[var(--space-section)] sm:px-[var(--space-container)]">
      <h1 className="mb-2 text-center text-3xl font-bold tracking-tight">{t('pg.home.brands')}</h1>
      <p className="mb-8 text-center text-muted-foreground">{t('pg.brands.subtitle')}</p>

      {brands === undefined && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-3/2 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      )}

      {brands && brands.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
          <Award className="h-14 w-14 text-muted-foreground/30" />
          <p>{t('pg.brands.empty')}</p>
        </div>
      )}

      {brands && brands.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {brands.map((b) => (
            <Link
              key={b._id}
              href={`/products?brand=${encodeURIComponent(b.name)}`}
              className="group overflow-hidden rounded-2xl border bg-white shadow-xs transition-all duration-300 hover:shadow-lg"
            >
              <div className="relative aspect-square w-full bg-white">
                {b.logoUrl ? (
                  <Image
                    src={b.logoUrl}
                    alt={b.name}
                    fill
                    sizes="220px"
                    className="object-cover transition-transform duration-300"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center px-2 text-center text-lg font-bold text-foreground/80">
                    {b.name}
                  </span>
                )}
              </div>
              <div className="px-2 py-2 text-center">
                <p className="line-clamp-1 text-xs font-medium text-foreground transition-colors group-hover:text-primary">
                  {b.name}
                </p>
                {counts?.[b.name.toLowerCase()] !== undefined && (
                  <p className="text-[11px] text-muted-foreground/70">
                    {counts[b.name.toLowerCase()]} {t('pg.common.products')}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
