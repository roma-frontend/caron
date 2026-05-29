import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ConvexClientProvider } from '@/lib/convex';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Caroon Armenia | Ավտոպահեստամասերի առցանց խանութ',
    template: '%s | Caroon Armenia',
  },

  description:
    'Caroon-ը Հայաստանի առաջատար ավտոպահեստամասերի առցանց խանութն է։ Այստեղ կարող եք գտնել անվադողեր, դիսկեր, յուղեր, ֆիլտրեր և ավտոմեքենայի այլ պարագաներ՝ մատչելի գներով և արագ առաքմամբ։',

  keywords: [
    'ավտոպահեստամասեր',
    'ավտոպահեստամասեր Հայաստան',
    'անվադողեր',
    'դիսկեր',
    'յուղեր',
    'ֆիլտրեր',
    'ավտոպարագաներ',
    'ավտոմեքենայի պարագաներ',
    'auto parts Armenia',
    'ավտոպահեստ Երևան',
  ],

  authors: [{ name: 'Caroon Armenia' }],
  creator: 'Caroon Armenia',
  publisher: 'Caroon Armenia',

  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  ),

  alternates: {
    canonical: '/',
  },

  openGraph: {
    type: 'website',
    locale: 'hy_AM',
    siteName: 'Caroon Armenia',

    title: 'Caroon Armenia | Ավտոպահեստամասերի առցանց խանութ',

    description:
      'Ավտոպահեստամասերի առցանց խանութ Հայաստանում։ Գնեք բարձրորակ ավտոպահեստամասեր ձեր մեքենայի համար՝ մատչելի գներով և արագ առաքմամբ։',

    url: '/',
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Caroon Armenia',

    description:
      'Ավտոպահեստամասերի առցանց խանութ Հայաստանում',
  },

  robots: {
    index: true,
    follow: true,

    googleBot: {
      index: true,
      follow: true,
    },
  },

  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'mask-icon', url: '/favicon.svg', color: '#5B21B6' },
    ],
  },

  manifest: '/site.webmanifest',

  category: 'shopping',
};

export const viewport: Viewport = {
  themeColor: [
    {
      media: '(prefers-color-scheme: light)',
      color: '#ffffff',
    },
    {
      media: '(prefers-color-scheme: dark)',
      color: '#0f0f14',
    },
  ],

  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hy" suppressHydrationWarning>
      <head>
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <ConvexClientProvider>
            {children}

            <Toaster
              richColors
              position="top-center"
            />
          </ConvexClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}