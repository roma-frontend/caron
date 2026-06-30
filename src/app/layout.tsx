import type { Metadata, Viewport } from 'next';
import { Inter, Noto_Sans_Armenian, Playfair_Display } from 'next/font/google';
import React from 'react';
import { headers } from 'next/headers';
import './globals.css';
import { ConvexClientProvider } from '@/lib/convex';
import { SITE } from '@/lib/constants';
import { isLocale, DEFAULT_LOCALE, type Locale } from '@/lib/i18n/locale';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';
import { ThemeProvider } from 'next-themes';
import { ThemedToaster } from '@/components/ThemedToaster';
import { BrandTheme } from '@/components/BrandTheme';
import { SettingsProvider } from '@/components/SettingsProvider';
import { AnalyticsInjector } from '@/components/AnalyticsInjector';
import { FloatingActions } from '@/components/FloatingActions';
import { CartSync } from '@/components/CartSync';
import { SessionSync } from '@/components/SessionSync';
import { AdminOrderWatcher } from '@/components/AdminOrderWatcher';
import { AdminReturnWatcher } from '@/components/AdminReturnWatcher';
import { CustomerReturnWatcher } from '@/components/CustomerReturnWatcher';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { CookieConsentWrapper } from '@/components/CookieConsentWrapper';
import { ScrollToTop } from '@/components/ScrollToTop';
import { toR2MediaProxyUrl } from '@/lib/r2Media';

// Hero poster (home page LCP element) — resolved to the same delivery URL the
// home page <img> uses, so the document-level preload actually matches it.
const HERO_POSTER_URL = toR2MediaProxyUrl(
  process.env.NEXT_PUBLIC_HERO_POSTER_URL || 'products/hero-poster.jpg',
);
// Primary UI font
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  preload: true,
  weight: ['400', '500', '600', '700'],
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
  adjustFontFallback: true,
});

// Luxury serif font for brand logos
const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
  display: 'swap',
  preload: false,
  weight: ['700', '900'],
});

// Armenian language support
const notoSansArmenian = Noto_Sans_Armenian({
  variable: '--font-armenian',
  subsets: ['armenian'],
  display: 'swap',
  preload: true,
  weight: ['400', '500', '600', '700'],
  fallback: ['sans-serif'],
});

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://caron.group').trim().replace(/\/+$/, '');

// Locale-specific default title/description for the storefront. Per-page
// metadata (products, categories) overrides these via their own generateMetadata.
const META_TEXT: Record<Locale, { title: string; description: string; ogLocale: string }> = {
  hy: {
    title: `${SITE.fullName} | Ավտոպահեստամասերի առցանց խանութ`,
    description: SITE.description,
    ogLocale: 'hy_AM',
  },
  ru: {
    title: `${SITE.fullName} | Интернет-магазин автозапчастей`,
    description: 'Интернет-магазин автозапчастей в Армении. Качественные автозапчасти по доступным ценам с быстрой доставкой.',
    ogLocale: 'ru_RU',
  },
  en: {
    title: `${SITE.fullName} | Online auto parts store`,
    description: 'Online auto parts store in Armenia. Quality car parts at affordable prices with fast delivery.',
    ogLocale: 'en_US',
  },
};

/** hreflang alternates for the home page (per-page metadata sets its own). */
const HOME_LANGUAGES = { 'hy-AM': '/', 'ru-RU': '/ru', 'en-US': '/en' } as const;

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F4F5F6' },
    { media: '(prefers-color-scheme: dark)', color: '#202225' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  colorScheme: 'light dark',
};

const BASE_META: Metadata = {
  metadataBase: new URL(APP_URL),

  title: {
    default: `${SITE.fullName} | Ավտոպահեստամասերի առցանց խանութ`,
    template: `%s | ${SITE.fullName}`,
  },

  description:
    SITE.description,

  keywords: [
    'ավտոպահեստամասեր',
    'ավտոպահեստամասեր Հայաստան',
    'անվադողեր Հայաստան',
    'դիսկեր Հայաստան',
    'յուղեր մեքենայի',
    'ֆիլտրեր ավտո',
    'ավտոպարագաներ',
    'ավտոմեքենայի պարագաներ',
    'auto parts Armenia',
    'ավտոպահեստ Երևան',
    'Caron',
    'caron.group',
  ],

  authors: [{ name: SITE.fullName, url: APP_URL }],
  creator: SITE.fullName,
  publisher: SITE.fullName,
  category: 'shopping',

  alternates: {
    canonical: '/',
    languages: {
      'hy-AM': '/',
      'ru-RU': '/',
    },
  },

  openGraph: {
    type: 'website',
    locale: 'hy_AM',
    url: APP_URL,
    siteName: SITE.fullName,
    title: 'Caron Armenia | Ավտոպահեստամասերի առցանց խանութ',
    description:
      'Ավտոպահեստամասերի առցանց խանութ Հայաստանում։ Գնեք բարձրորակ ավտոպահեստամասեր ձեր մեքենայի համար՝ մատչելի գներով և արագ առաքմամբ։',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Caron Armenia — Ավտոպահեստամասերի առցանց խանութ',
        type: 'image/png',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Caron Armenia | Ավտոպահեստամասերի առցանց խանութ',
    description: 'Ավտոպահեստամասերի առցանց խանութ Հայաստանում',
    images: ['/og-image.png'],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    other: [{ rel: 'mask-icon', url: '/favicon.svg', color: '#0066AE' }],
  },

  manifest: '/site.webmanifest',

  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const hl = h.get('x-locale');
  const locale: Locale = isLocale(hl) ? hl : DEFAULT_LOCALE;
  const text = META_TEXT[locale];
  const canonical = locale === DEFAULT_LOCALE ? '/' : `/${locale}`;

  return {
    ...BASE_META,
    title: {
      default: text.title,
      template: `%s | ${SITE.fullName}`,
    },
    description: text.description,
    alternates: {
      canonical,
      languages: HOME_LANGUAGES,
    },
    openGraph: {
      ...BASE_META.openGraph,
      locale: text.ogLocale,
      title: text.title,
      description: text.description,
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const hl = h.get('x-locale');
  const htmlLang: Locale = isLocale(hl) ? hl : DEFAULT_LOCALE;
  // The storefront is served with an `x-locale` header (set by middleware);
  // the admin panel is not, so it stays on the language store.
  const isStorefront = hl !== null;
  const content = isStorefront ? <LocaleProvider initial={htmlLang}>{children}</LocaleProvider> : children;
  // Home page only: preload the hero poster (the LCP element) at the document
  // level so the browser discovers it from the initial HTML, instead of waiting
  // for the client component tree to render the <img>.
  const isHome = h.get('x-pathname') === '/';
  return (
    <html lang={htmlLang} suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        {/* Safari pinned tab */}
        <link rel="mask-icon" href="/favicon.svg" color="#0066AE" />

        {isHome && (
          <link
            rel="preload"
            as="image"
            href={HERO_POSTER_URL}
            fetchPriority="high"
          />
        )}

        {/* Image CDN (R2 proxy) — establish the connection early so the hero
            poster and product images (LCP candidates) start downloading sooner. */}
        <link rel="preconnect" href="https://img.caron.group" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://img.caron.group" />

        {process.env.NEXT_PUBLIC_CONVEX_URL && (
          <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_CONVEX_URL} />
        )}
      </head>
      <body
        className={`${inter.variable} ${playfair.variable} ${notoSansArmenian.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        {/* Accessibility: skip to main content */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
        >
          Անցնել հիմնական բովանդակությանը
        </a>

        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <ConvexClientProvider>
            <SettingsProvider>
              <BrandTheme />
              <AnalyticsInjector />
              <main id="main-content" className="min-h-dvh">{content}</main>
              <CookieConsentWrapper />
              <CartSync />
              <SessionSync />
              <ScrollToTop />
              <AdminOrderWatcher />
              <AdminReturnWatcher />
              <CustomerReturnWatcher />
            </SettingsProvider>
            <ThemedToaster />
            <FloatingActions />
          </ConvexClientProvider>
        </ThemeProvider>

        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
