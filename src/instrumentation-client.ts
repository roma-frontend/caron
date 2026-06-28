import * as Sentry from '@sentry/nextjs';

/**
 * Client-side observability. No-op unless NEXT_PUBLIC_SENTRY_DSN is set.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    // Performance tracing disabled in production to stay within Sentry's free
    // event quota (and to avoid routing trace events through the /monitoring
    // tunnel, which costs Vercel function invocations). Error reporting — the
    // valuable part — is unaffected by this.
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0 : 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
  });
}

// Instruments client-side navigations for performance tracing.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
