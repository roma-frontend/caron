import { localizedMetadata } from '@/lib/i18n/metadata';

export const generateMetadata = () =>
  localizedMetadata('/car-selector', {
    hy: { title: 'Ընտրել ըստ մեքենայի', description: 'Գտեք ձեր մեքենային համապատասխան ավտոպահեստամասերը:' },
    ru: { title: 'Подбор по автомобилю', description: 'Найдите автозапчасти, подходящие вашему автомобилю.' },
    en: { title: 'Select by car', description: 'Find auto parts that fit your car.' },
  });

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
