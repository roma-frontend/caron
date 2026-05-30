import type { Metadata } from 'next';
import PrivacyPageClient from './_client';

export const metadata: Metadata = { title: 'Գաղտնիության քաղաքականություն', description: 'AutoParts-ի գաղտնիության քաղաքականությունը’' };

export default function Page() {
  return <PrivacyPageClient />;
}
