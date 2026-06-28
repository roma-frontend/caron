import { localizedMetadata } from '@/lib/i18n/metadata';

export const generateMetadata = () =>
  localizedMetadata('/dashboard', {
    hy: { title: 'Իմ էջը', description: 'Ձեր անձնական էջը:' },
    ru: { title: 'Личный кабинет', description: 'Ваш личный кабинет.' },
    en: { title: 'Dashboard', description: 'Your personal dashboard.' },
  }, { noIndex: true });

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
