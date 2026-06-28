'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { splitLocale, type Locale } from './locale';

/**
 * Provides the current storefront locale to client components.
 *
 * The locale is derived from the URL (`/ru`, `/en`, otherwise hy). On the
 * server / first client render we use `initial` (resolved from the `x-locale`
 * header) so SSR HTML matches and there is no hydration mismatch; after mount
 * we derive it from `usePathname()`, which updates on client-side (soft)
 * navigation — so switching language no longer requires a full page reload.
 *
 * Admin pages render OUTSIDE this provider, so `useLocale()` returns null there
 * and i18n falls back to the admin language store.
 */
const LocaleContext = createContext<Locale | null>(null);

export function LocaleProvider({ initial, children }: { initial: Locale; children: React.ReactNode }) {
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setHydrated(true), []);
  const locale = hydrated ? splitLocale(pathname || '/').locale : initial;
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

/** Current storefront locale, or null when outside a LocaleProvider (admin). */
export function useLocale(): Locale | null {
  return useContext(LocaleContext);
}
