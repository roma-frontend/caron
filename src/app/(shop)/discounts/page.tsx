import DiscountsClient from './_client';
import { localizedMetadata } from '@/lib/i18n/metadata';

export const generateMetadata = () =>
  localizedMetadata('/discounts', {
    hy: { title: 'Զեղչեր', description: 'Բոլոր զեղչված ապրանքները մեկ տեղում։ Ամենաշահավետ գները ձեզ համար։' },
    ru: { title: 'Скидки', description: 'Все товары со скидкой в одном месте. Самые выгодные цены для вас.' },
    en: { title: 'Discounts', description: 'All discounted products in one place. The best prices for you.' },
  });

export default function Page() {
  return <DiscountsClient />;
}
