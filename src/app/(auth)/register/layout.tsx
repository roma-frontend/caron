import { localizedMetadata } from '@/lib/i18n/metadata';

export const generateMetadata = () =>
  localizedMetadata('/register', {
    hy: { title: 'Գրանցում', description: 'Ստեղծեք նոր հաշիվ:' },
    ru: { title: 'Регистрация', description: 'Создайте новую учётную запись.' },
    en: { title: 'Sign up', description: 'Create a new account.' },
  }, { noIndex: true });

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
