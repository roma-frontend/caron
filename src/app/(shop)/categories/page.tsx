import type { Metadata } from 'next';
import { HOME, CATEGORIES_DATA } from '@/lib/constants';
import { CategoryCard } from '@/components/cards/CategoryCard';

export const metadata: Metadata = {
  title: 'Կատեգորիաներ',
  description: 'Ավտոպահեստամասերի կատեգորիաներ՝ գտեք ձեր մեքենայի համար անհրաժեստ պահեստամասերը:',
};

export default function CategoriesPage() {
  return (
    <div className="mx-auto" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingBlock: 'var(--space-8)' }}>
      <h1 className="font-bold" style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-8)' }}>{HOME.categoriesTitle}</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4" style={{ gap: 'var(--space-6)' }}>
        {CATEGORIES_DATA.map((cat, i) => (
          <CategoryCard
            key={cat.slug}
            id={cat.slug}
            name={cat.name}
            slug={cat.slug}
            productCount={cat.count}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}
