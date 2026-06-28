import { localizedMetadata } from '@/lib/i18n/metadata';

export const generateMetadata = () =>
  localizedMetadata('/order-status', {
    hy: { title: 'Պատվերի կարգավիճակ', description: 'Ստուգեք ձեր պատվերի կարգավիճակը:' },
    ru: { title: 'Статус заказа', description: 'Проверьте статус вашего заказа.' },
    en: { title: 'Order status', description: 'Check the status of your order.' },
  }, { noIndex: true });

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
