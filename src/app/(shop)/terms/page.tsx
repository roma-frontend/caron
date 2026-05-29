import type { Metadata } from 'next';
import TermsPageClient from './_client';

export const metadata: Metadata = { title: 'Պայմաններ և դրույթներ', description: 'Caroon Armenia-ի օգտագործման պայմանները’' };

export default function Page() {
  return <TermsPageClient />;
}
