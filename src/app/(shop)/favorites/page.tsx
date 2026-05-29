import type { Metadata } from 'next';
import FavoritesPage from './_client';

export const metadata: Metadata = {
  title: 'Նախընտրածներ',
  description: 'Ձեր նախընտրած ապրանքների ցանկը:',
};

export default function Page() {
  return <FavoritesPage />;
}
