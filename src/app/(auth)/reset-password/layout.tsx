import { localizedMetadata } from '@/lib/i18n/metadata';

export const generateMetadata = () =>
  localizedMetadata('/reset-password', {
    hy: { title: 'Նոր գաղտնաբառ', description: 'Սահմանեք նոր գաղտնաբառ:' },
    ru: { title: 'Новый пароль', description: 'Задайте новый пароль.' },
    en: { title: 'New password', description: 'Set a new password.' },
  }, { noIndex: true });

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
