import { localizedMetadata } from '@/lib/i18n/metadata';

export const generateMetadata = () =>
  localizedMetadata('/vin-decoder', {
    hy: { title: 'VIN վերծանիչ', description: 'Վերծանեք ձեր մեքենայի VIN կոդը և գտեք համապատասխան մասերը:' },
    ru: { title: 'VIN-декодер', description: 'Расшифруйте VIN-код вашего автомобиля и найдите подходящие запчасти.' },
    en: { title: 'VIN decoder', description: 'Decode your car VIN and find matching parts.' },
  });

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
