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
              className="group flex aspect-3/2 flex-col items-center justify-center gap-2 rounded-2xl border bg-white p-4 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              {b.logoUrl ? (
                <div className="relative flex h-14 w-full items-center justify-center">
                  <Image src={b.logoUrl} alt={b.name} fill sizes="200px" className="object-contain" />
                </div>
              ) : (
                <span className="text-lg font-bold text-foreground/80">{b.name}</span>
              )}
              <span className="line-clamp-1 text-center text-xs font-medium text-muted-foreground transition-colors group-hover:text-primary">
                {b.name}
              </span>
              {counts?.[b.name.toLowerCase()] !== undefined && (
                <span className="text-[11px] text-muted-foreground/70">
                  {counts[b.name.toLowerCase()]} {t('pg.common.products')}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
