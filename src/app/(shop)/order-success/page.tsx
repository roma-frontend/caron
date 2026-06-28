import { Suspense } from 'react';
import OrderSuccessContent from './content';
import { localizedMetadata } from '@/lib/i18n/metadata';

export const generateMetadata = () =>
  localizedMetadata('/order-success', {
    hy: { title: 'Պատվերը հաջողված է', description: 'Ձեր պատվերը հաջողությամբ ձևակերպվեց:' },
    ru: { title: 'Заказ оформлен', description: 'Ваш заказ успешно оформлен.' },
    en: { title: 'Order placed', description: 'Your order has been placed successfully.' },
  }, { noIndex: true });

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center">Բեռնվում է․․․Ս</div>}>
      <OrderSuccessContent />
    </Suspense>
  );
}
