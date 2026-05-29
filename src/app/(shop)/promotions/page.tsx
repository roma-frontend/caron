import type { Metadata } from 'next';
import PromotionsPage from './_client';

export const metadata: Metadata = {
  title: 'Ակցիաներ',
  description: 'Հատուկ զեղչեր և ակցիաներ ավտոպահեստամասերի վրա: Խնայեք և խնայեք:',
};

export default function Page() {
  return <PromotionsPage />;
}
