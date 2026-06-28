'use client';

import { createContext, useContext } from 'react';
import type { Locale } from './locale';

/**
 * Provides the URL-resolved storefront locale (from the `x-locale` header set
 * by middleware) to client components. Admin pages are rendered OUTSIDE this
 * provider, so `useLocale()` returns null there and i18n falls back to the
 * admin language store.
 */
const LocaleContext = createContext<Locale | null>(null);

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

/** Current storefront locale, or null when outside a LocaleProvider (admin). */
export function useLocale(): Locale | null {
  return useContext(LocaleContext);
}
