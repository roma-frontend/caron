'use client';

import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { CategoryCard } from '@/components/cards/CategoryCard';
import { Loader } from '@/components/ui/loader';
import { useT } from '@/lib/i18n/admin';

export default function CategoriesPage() {
  const { t } = useT();
  const categories = useQuery(api.categories.listWithCounts, {});

  if (categories === undefined) return <Loader />;

  return (
    <div className="mx-auto max-w-[var(--container-max)] px-4 sm:px-[var(--space-container)] py-[var(--space-8)]">
      <h1 className="font-bold mx-4 sm:mx-0" style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-8)' }}>{t('pg.home.categoriesTitle')}</h1>
      <div className="grid" style={{ gap: 'var(--space-6)', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
        {categories.map((cat, i) => (
          <CategoryCard
            key={cat._id}
            id={cat._id}
            name={cat.name}
            nameRu={cat.nameRu}
            nameEn={cat.nameEn}
            slug={cat.slug}
            productCount={cat.count}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}
