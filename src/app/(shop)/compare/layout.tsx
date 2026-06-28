import { localizedMetadata } from '@/lib/i18n/metadata';

export const generateMetadata = () =>
  localizedMetadata('/compare', {
    hy: { title: 'Համեմատել', description: 'Համեմատեք ապրանքները կողք կողքի:' },
    ru: { title: 'Сравнение', description: 'Сравните товары между собой.' },
    en: { title: 'Compare', description: 'Compare products side by side.' },
  }, { noIndex: true });

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
