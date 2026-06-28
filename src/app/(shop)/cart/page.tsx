import CartPage from './_client';
import { localizedMetadata } from '@/lib/i18n/metadata';

export const generateMetadata = () =>
  localizedMetadata('/cart', {
    hy: { title: 'Զամբյուղ', description: 'Ձեր գնումների զամբյուղը: Ավելացրեք պատվերը և ձեռքեք:' },
    ru: { title: 'Корзина', description: 'Ваша корзина покупок. Добавьте товары и оформите заказ.' },
    en: { title: 'Cart', description: 'Your shopping cart. Add items and check out.' },
  });

export default function Page() {
  return <CartPage />;
}
