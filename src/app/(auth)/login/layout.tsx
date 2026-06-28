import { localizedMetadata } from '@/lib/i18n/metadata';

export const generateMetadata = () =>
  localizedMetadata('/login', {
    hy: { title: 'Մուտք', description: 'Մուտք գործեք ձեր հաշիվ:' },
    ru: { title: 'Вход', description: 'Войдите в свою учётную запись.' },
    en: { title: 'Sign in', description: 'Sign in to your account.' },
  }, { noIndex: true });

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
