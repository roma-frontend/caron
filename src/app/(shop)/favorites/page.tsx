import FavoritesPage from './_client';
import { localizedMetadata } from '@/lib/i18n/metadata';

export const generateMetadata = () =>
  localizedMetadata('/favorites', {
    hy: { title: 'Նախընտրածներ', description: 'Ձեր նախընտրած ապրանքների ցանկը:' },
    ru: { title: 'Избранное', description: 'Список ваших избранных товаров.' },
    en: { title: 'Favorites', description: 'Your list of favorite products.' },
  });

export default function Page() {
  return <FavoritesPage />;
}
