import type { Metadata } from 'next';
import AboutPage from './_client';

export const metadata: Metadata = {
  title: 'Մեր մասին',
  description: 'Caroon Armenia-ի պատմությունը՝ Հայաստանի առաջատար ավտոպահեստամասերի առցանց խանութ:',
};

export default function Page() {
  return <AboutPage />;
}
