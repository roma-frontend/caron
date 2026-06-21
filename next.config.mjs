import { withSentryConfig } from '@sentry/nextjs';
/** @type {import('next').NextConfig} */
import path from 'node:path';
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
  `media-src 'self' blob: https://*.r2.dev https://*.r2.cloudflarestorage.com`,
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
  turbopack: {
    root: path.resolve(process.cwd()),
  },

  images: {
    // Allow the local R2 proxy route to pass dynamic encoded URLs via query string.
    localPatterns: [
      { pathname: '/api/r2-image' },
      { pathname: '/og-image.png' },
    ],
    remotePatterns: [
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com', pathname: '/**' },
      { protocol: 'https', hostname: 'pub-*.r2.dev', pathname: '/**' },
      { protocol: 'https', hostname: 'drive.google.com', pathname: '/uc' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/**' },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    deviceSizes: [320, 480, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 320, 480],
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
      '@base-ui/react',
      'embla-carousel-react',
      'react-hook-form',
      'cmdk',
      'next-themes',
      'jose',
      'zod',
      'tw-animate-css',
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
        has: [{ type: 'host', value: 'www.caron.am' }],
        destination: 'https://caron.am/:path*',
        permanent: true,
      },
      // Fix accidental /promotion (singular) → /promotions (plural)
      {
        source: '/promotion',
        destination: '/promotions',
        permanent: true,
      },
    ];
  },
};

export default withSentryConfig(withAnalyzer(nextConfig), {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "adb-arrm",

  project: "caron",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
