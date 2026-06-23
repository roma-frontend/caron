'use client';

import Script from 'next/script';
import { useSettings } from '@/hooks/useSettings';

function socialUrl(key: string, value: string): string {
  switch (key) {
    case 'instagram': return value.startsWith('http') ? value : `https://instagram.com/${value.replace(/^@/, '')}`;
    case 'facebook': return value.startsWith('http') ? value : `https://facebook.com/${value.replace(/^@/, '')}`;
    case 'telegram': return value.startsWith('http') ? value : `https://t.me/${value.replace(/^@/, '')}`;
    case 'whatsapp': return value.startsWith('http') ? value : `https://wa.me/${value.replace(/[^0-9]/g, '')}`;
    default: return value;
  }
}

export function JsonLd() {
  const settings = useSettings();

  const sameAs: string[] = [];
  if (settings?.instagram) sameAs.push(socialUrl('instagram', settings.instagram));
  if (settings?.facebook) sameAs.push(socialUrl('facebook', settings.facebook));
  if (settings?.telegram) sameAs.push(socialUrl('telegram', settings.telegram));
  if (settings?.whatsapp) sameAs.push(socialUrl('whatsapp', settings.whatsapp));

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://caron.am').trim().replace(/\/+$/, '');
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: settings?.storeName || 'Caron Armenia',
    url: baseUrl,
    logo: `${baseUrl}/favicon.svg`,
    description: 'Ավտոպահեստամասերի առցանց խանութ Հայաստանում',
    address: { '@type': 'PostalAddress', addressLocality: 'Yerevan', addressCountry: 'AM' },
    priceRange: '$$',
    currenciesAccepted: 'Դ',
    paymentAccepted: 'Cash',
  };

  if (sameAs.length > 0) jsonLd.sameAs = sameAs;

  return (
    <Script id="json-ld" type="application/ld+json" strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
