import type { Metadata } from 'next';
import DeliveryPage from './_client';

export const metadata: Metadata = {
  title: 'Առաքում',
  description: 'Առաքման պայմաններ և ժամկետներ՝ արագ առաքում Հայաստանով:',
};

export default function Page() {
  return <DeliveryPage />;
}
