import { localizedMetadata } from '@/lib/i18n/metadata';

export const generateMetadata = () =>
  localizedMetadata('/checkout', {
    hy: { title: 'Պատվերի ձևակերպում', description: 'Ձևակերպեք ձեր պատվերը:' },
    ru: { title: 'Оформление заказа', description: 'Оформите ваш заказ.' },
    en: { title: 'Checkout', description: 'Complete your order.' },
  }, { noIndex: true });

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
