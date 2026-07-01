import { localizedMetadata } from '@/lib/i18n/metadata';

export const generateMetadata = () =>
  localizedMetadata('/forgot-password', {
    hy: { title: 'Վերականգնել գաղտնաբառը', description: 'Վերականգնեք ձեր գաղտնաբառը:' },
    ru: { title: 'Восстановление пароля', description: 'Восстановите пароль от вашей учётной записи.' },
    en: { title: 'Reset password', description: 'Reset your account password.' },
  }, { noIndex: true });

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
