import PrivacyPageClient from './_client';
import { localizedMetadata } from '@/lib/i18n/metadata';

export const generateMetadata = () =>
  localizedMetadata('/privacy', {
    hy: { title: 'Գաղտնիության քաղաքականություն', description: 'Caron-ի գաղտնիության քաղաքականությունը:' },
    ru: { title: 'Политика конфиденциальности', description: 'Политика конфиденциальности Caron.' },
    en: { title: 'Privacy Policy', description: 'Caron privacy policy.' },
  });

export default function Page() {
  return <PrivacyPageClient />;
}
