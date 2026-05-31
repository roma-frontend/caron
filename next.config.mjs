/** @type {import('next').NextConfig} */
import withBundleAnalyzer from '@next/bundle-analyzer';

const withAnalyzer = withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });

const isDev = process.env.NODE_ENV === 'development';

// Content-Security-Policy without a nonce, so pages stay statically cacheable
// (ISR/CDN). 'unsafe-inline' is required for styled-jsx, next-themes and the
// app's inline styles; script eval is only allowed in dev for React DX.
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com${isDev ? " 'unsafe-eval'" : ''}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: https:`,
  `font-src 'self' data:`,
  `connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://*.convex.site https://*.r2.dev https://*.r2.cloudflarestorage.com https://vitals.vercel-insights.com`,
  `frame-src 'self' https://www.google.com https://maps.google.com`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `object-src 'none'`,
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  { key: 'Content-Security-Policy', value: csp },
];

const nextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  typescript: { ignoreBuildErrors: false },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com', pathname: '/**' },
      { protocol: 'https', hostname: 'pub-*.r2.dev', pathname: '/**' },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },

  compiler: {
    removeConsole: !isDev ? { exclude: ['error', 'warn'] } : false,
  },

  experimental: {
    viewTransition: true,
    serverActions: { bodySizeLimit: '2mb' },
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-icons',
      'convex',
      'framer-motion',
      'sonner',
      'zustand',
      'class-variance-authority',
      'clsx',
      'tailwind-merge',
      '@vercel/analytics',
      '@vercel/speed-insights',
    ],
  },

  async headers() {
    return [
      // Security headers on all routes
      { source: '/(.*)', headers: securityHeaders },
      // Static assets — long cache
      {
        source: '/:path*\\.{png,jpg,jpeg,gif,webp,avif,svg,ico,woff,woff2}',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      // Home page — ISR-friendly
      {
        source: '/',
        headers: [{ key: 'Cache-Control', value: 'public, s-maxage=3600, stale-while-revalidate=86400' }],
      },
      // API routes — no cache
      {
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0' }],
      },
    ];
  },

  async redirects() {
    return [
      // Redirect www to non-www (handled by Vercel, but good to have)
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.autoparts.am' }],
        destination: 'https://autoparts.am/:path*',
        permanent: true,
      },
    ];
  },
};

export default withAnalyzer(nextConfig);
