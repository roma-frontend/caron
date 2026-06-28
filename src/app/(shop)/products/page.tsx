import { Suspense } from 'react';
import ProductsPage from './_client';
import { localizedMetadata } from '@/lib/i18n/metadata';

export const dynamic = 'force-dynamic';

export const generateMetadata = () =>
  localizedMetadata('/products', {
    hy: { title: 'Ապրանքներ', description: 'Դիտեք մեր ապրանքների լայն տեսականին՝ տարբեր կատեգորիաներում և գներով։' },
    ru: { title: 'Товары', description: 'Широкий ассортимент автозапчастей в разных категориях и ценовых диапазонах.' },
    en: { title: 'Products', description: 'Browse our wide range of auto parts across categories and price ranges.' },
  });

export default function Page() {
  return (
    <Suspense>
      <ProductsPage />
    </Suspense>
  );
}
