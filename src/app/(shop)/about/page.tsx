import AboutPage from './_client';
import { SITE } from '@/lib/constants';
import { localizedMetadata } from '@/lib/i18n/metadata';

export const generateMetadata = () =>
  localizedMetadata('/about', {
    hy: { title: 'Մեր մասին', description: SITE.heroDesc },
    ru: { title: 'О нас', description: 'Caron — ведущий интернет-магазин автозапчастей в Армении.' },
    en: { title: 'About us', description: 'Caron — the leading online auto parts store in Armenia.' },
  });

export default function Page() {
  return <AboutPage />;
}
