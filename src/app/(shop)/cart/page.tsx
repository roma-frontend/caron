import type { Metadata } from 'next';
import CartPage from './_client';

export const metadata: Metadata = {
  title: 'Զամբյուղ',
  description: 'Ձեր գնումների զամբյուղը: Ավելացրեք պատվերը և ձեռքեք:',
};

export default function Page() {
  return <CartPage />;
}
