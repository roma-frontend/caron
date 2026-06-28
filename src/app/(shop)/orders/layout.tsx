import { localizedMetadata } from '@/lib/i18n/metadata';

export const generateMetadata = () =>
  localizedMetadata('/orders', {
    hy: { title: 'Իմ պատվերները', description: 'Ձեր պատվերների պատմությունը:' },
    ru: { title: 'Мои заказы', description: 'История ваших заказов.' },
    en: { title: 'My orders', description: 'Your order history.' },
  }, { noIndex: true });

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
