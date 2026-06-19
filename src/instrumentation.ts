import * as Sentry from '@sentry/nextjs';

/**
 * Server/edge observability. Sentry only initializes when SENTRY_DSN (or the
 * public DSN) is present, so this is a complete no-op in environments without
 * monitoring configured — no behavior change, no build impact.
 */
export async function register() {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  if (process.env.NEXT_RUNTIME === 'nodejs' || process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn,
      tracesSampleRate: 0.1,
      enableLogs: true,
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
    });
  }
}

// Captures errors thrown in React Server Components, route handlers, etc.
export const onRequestError = Sentry.captureRequestError;
