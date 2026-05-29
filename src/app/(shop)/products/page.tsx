import type { Metadata } from 'next';
import { Suspense } from 'react';
import ProductsPage from './_client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Ապրանքներ',
  description: 'Դիտեք մեր ապրանքների լայն տեսականին՝ տարբեր կատեգորիաներում և գներով։ Գտեք կատարյալ ապրանքը ձեր կարիքների համար մեր բազմազան ընտրությունից։',
};

export default function Page() {
  return (
    <Suspense>
      <ProductsPage />
    </Suspense>
  );
}
