import PromotionsPage from './_client';
import { localizedMetadata } from '@/lib/i18n/metadata';

export const generateMetadata = () =>
  localizedMetadata('/promotions', {
    hy: { title: 'Ակցիաներ', description: 'Հատուկ զեղչեր և ակցիաներ ավտոպահեստամասերի վրա:' },
    ru: { title: 'Акции', description: 'Специальные скидки и акции на автозапчасти.' },
    en: { title: 'Promotions', description: 'Special discounts and promotions on auto parts.' },
  });

export default function Page() {
  return <PromotionsPage />;
}
