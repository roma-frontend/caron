'use client';

import { useEffect, useRef } from 'react';

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js';

let scriptPromise: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Turnstile script failed to load'));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/** True when Turnstile is configured (client-visible site key present). */
export const turnstileEnabled = (): boolean => !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/**
 * Cloudflare Turnstile widget. Renders nothing when
 * `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is unset, so it stays inert until configured
 * and never blocks the form. Calls `onVerify` with the token (or '' on
 * expiry/error). Remount (e.g. via a changing `key`) to request a fresh token.
 */
export function Turnstile({
  onVerify,
  className,
}: {
  onVerify: (token: string) => void;
  className?: string;
}) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  // Keep the latest callback without re-rendering / re-creating the widget.
  const cbRef = useRef(onVerify);
  useEffect(() => {
    cbRef.current = onVerify;
  }, [onVerify]);

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: 'auto',
          callback: (t: string) => cbRef.current(t),
          'expired-callback': () => cbRef.current(''),
          'error-callback': () => cbRef.current(''),
        });
      })
      .catch(() => {
        /* network/script error — server still enforces, fail open on client */
      });
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetId.current);
        } catch {
          /* ignore */
        }
        widgetId.current = null;
      }
    };
  }, [siteKey]);

  if (!siteKey) return null;
  return <div ref={containerRef} className={className} />;
}
