import type { Metadata } from 'next';
import AboutPage from './_client';
import { SITE } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Մեր մասին',
  description: SITE.heroDesc,
};
  
export default function Page() {
  return <AboutPage />;
}
