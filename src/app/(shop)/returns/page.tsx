import type { Metadata } from 'next';
import { ReturnsContent } from './_client';

export const metadata: Metadata = {
  title: 'Վերադարձ և փոխանակում',
  description: 'Ապրանքների վերադարձի և փոխանակման պայմաններ',
};

export default function ReturnsPage() {
  return <ReturnsContent />;
}
