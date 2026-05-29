import Script from 'next/script';

export function JsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: 'AutoParts Armenia',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://autoparts.am',
    logo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://autoparts.am'}/favicon.svg`,
    description: 'Ավտոպահեստամասերի առցանց խանութ Հայաստանում',
    address: { '@type': 'PostalAddress', addressLocality: 'Yerevan', addressCountry: 'AM' },
    priceRange: '$$',
    currenciesAccepted: 'AMD',
    paymentAccepted: 'Cash',
  };

  return (
    <Script id="json-ld" type="application/ld+json" strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
