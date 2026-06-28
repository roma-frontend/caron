import DeliveryPage from './_client';
import { localizedMetadata } from '@/lib/i18n/metadata';

export const generateMetadata = () =>
  localizedMetadata('/delivery', {
    hy: { title: 'Առաքում', description: 'Առաքման պայմաններ և ժամկետներ՝ արագ առաքում Հայաստանով:' },
    ru: { title: 'Доставка', description: 'Условия и сроки доставки — быстрая доставка по всей Армении.' },
    en: { title: 'Delivery', description: 'Delivery terms and times — fast delivery across Armenia.' },
  });

export default function Page() {
  return <DeliveryPage />;
}
