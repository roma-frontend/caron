import type { Metadata, Viewport } from 'next';
import { Inter, Noto_Sans_Armenian, Playfair_Display } from 'next/font/google';
import React from 'react';
import './globals.css';
import { ConvexClientProvider } from '@/lib/convex';
import { SITE } from '@/lib/constants';
import { ThemeProvider } from 'next-themes';
import { ThemedToaster } from '@/components/ThemedToaster';
import { BrandTheme } from '@/components/BrandTheme';
import { SettingsProvider } from '@/components/SettingsProvider';
import { AnalyticsInjector } from '@/components/AnalyticsInjector';
import { CookieConsent } from '@/components/CookieConsent';
import { FloatingActions } from '@/components/FloatingActions';
import { CartSync } from '@/components/CartSync';
import { AdminOrderWatcher } from '@/components/AdminOrderWatcher';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { CookieConsentWrapper } from '@/components/CookieConsentWrapper';

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
  preload: true,
  weight: ['400', '700', '900'],
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

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://caron.am';

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

export const metadata: Metadata = {
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
    'caron.am',
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
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'Caron Armenia — Ավտոպահեստամասերի առցանց խանութ',
        type: 'image/svg+xml',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Caron Armenia | Ավտոպահեստամասերի առցանց խանութ',
    description: 'Ավտոպահեստամասերի առցանց խանութ Հայաստանում',
    images: ['/og-image.svg'],
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
    other: [{ rel: 'mask-icon', url: '/favicon.svg', color: '#0F6CBD' }],
  },

  manifest: '/site.webmanifest',

  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hy" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        {/* Safari pinned tab */}
        <link rel="mask-icon" href="/favicon.svg" color="#0F6CBD" />

        <link rel="dns-prefetch" href="https://pub-*.r2.dev" />
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
              <main id="main-content" className="min-h-dvh">{children}</main>
              <CookieConsentWrapper />
              <AdminOrderWatcher />
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
