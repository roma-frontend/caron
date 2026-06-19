import * as Sentry from '@sentry/nextjs';

/**
 * Client-side observability. No-op unless NEXT_PUBLIC_SENTRY_DSN is set.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    // Session Replay is left off: it needs `worker-src blob:` in the CSP and
    // records user sessions (privacy-sensitive on an e-commerce site). Enable
    // by raising these and adding `worker-src 'self' blob:` to the CSP.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
  });
}

// Instruments client-side navigations for performance tracing.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
