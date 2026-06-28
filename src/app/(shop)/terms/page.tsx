import TermsPageClient from './_client';
import { localizedMetadata } from '@/lib/i18n/metadata';

export const generateMetadata = () =>
  localizedMetadata('/terms', {
    hy: { title: 'Պայմաններ և դրույթներ', description: 'Caron-ի օգտագործման պայմանները:' },
    ru: { title: 'Условия и положения', description: 'Условия использования Caron.' },
    en: { title: 'Terms & Conditions', description: 'Caron terms of use.' },
  });

export default function Page() {
  return <TermsPageClient />;
}
