import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { HOME, CATEGORIES_DATA, PRODUCT } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Կատեգորիաներ',
  description: 'Ավտոպահեստամասերի կատեգորիաներ՝ գտեք ձեր մեքենայի համար անհրաժեստ պահեստամասերը:',
};


export default function CategoriesPage() {
  return (
    <div className="mx-auto" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingBlock: 'var(--space-8)' }}>
      <h1 className="font-bold" style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-8)' }}>{HOME.categoriesTitle}</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4" style={{ gap: 'var(--space-6)' }}>
        {CATEGORIES_DATA.map((cat) => (
          <Link key={cat.slug} href={`/categories/${cat.slug}`}>
            <Card className="group h-full cursor-pointer hover:-translate-y-1" style={{ transition: 'transform var(--transition-base), box-shadow var(--transition-base)', boxShadow: 'var(--shadow-card)' }}>
              <CardContent className="flex flex-col items-center justify-center text-center" style={{ padding: 'var(--space-8)' }}>
                <span className="group-hover:scale-110" style={{ fontSize: '3rem', marginBottom: 'var(--space-4)', transition: 'transform var(--transition-spring)' }}>{cat.icon}</span>
                <h3 className="font-semibold" style={{ marginBottom: 'var(--space-1)' }}>{cat.name}</h3>
                <p className="text-muted-foreground" style={{ fontSize: 'var(--text-sm)' }}>{cat.count} {PRODUCT.items}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
