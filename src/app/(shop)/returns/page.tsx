import { ReturnsContent } from './_client';
import { localizedMetadata } from '@/lib/i18n/metadata';

export const generateMetadata = () =>
  localizedMetadata('/returns', {
    hy: { title: 'Վերադարձ և փոխանակում', description: 'Ապրանքների վերադարձի և փոխանակման պայմաններ' },
    ru: { title: 'Возврат и обмен', description: 'Условия возврата и обмена товаров.' },
    en: { title: 'Returns & Exchanges', description: 'Product return and exchange terms.' },
  });

export default function ReturnsPage() {
  return <ReturnsContent />;
}
