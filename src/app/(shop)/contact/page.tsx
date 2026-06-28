import ContactPage from './_client';
import { localizedMetadata } from '@/lib/i18n/metadata';

export const generateMetadata = () =>
  localizedMetadata('/contact', {
    hy: { title: 'Կապ', description: 'Կապվեք մեզ հեռախոսով, էլ. փոստով կամ այցելեք մեր խանութը: Caron Armenia:' },
    ru: { title: 'Контакты', description: 'Свяжитесь с нами по телефону, эл. почте или посетите наш магазин. Caron Armenia.' },
    en: { title: 'Contact', description: 'Contact us by phone, email or visit our store. Caron Armenia.' },
  });

export default function Page() {
  return <ContactPage />;
}
