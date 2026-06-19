/**
 * Central error sink used by error boundaries. Always logs to the console
 * (kept in production via next.config `removeConsole` exclude) and forwards to
 * Sentry, which is a no-op when no DSN is configured.
 *
 * Sentry is loaded via a dynamic import (not a static top-level import) so the
 * heavy `@sentry/*` modules never become part of the synchronous module graph
 * of the error boundaries — a static import there triggers Turbopack HMR
 * "module factory is not available" errors, especially from global-error.tsx.
 */
export function captureError(error: unknown, context?: Record<string, unknown>): void {
  console.error(error);

  // Skip entirely when monitoring isn't configured — avoids loading Sentry.
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;

  void import('@sentry/nextjs')
    .then((Sentry) => {
      Sentry.captureException(error, context ? { extra: context } : undefined);
    })
    .catch(() => {
      /* monitoring is best-effort; never let it surface a new error */
    });
}
