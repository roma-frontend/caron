/**
 * Locale-routing primitives shared by middleware, server components and client
 * components. The storefront uses URL-prefixed locales:
 *   - hy (Armenian) is the DEFAULT and has NO prefix:     /products
 *   - ru / en are prefixed:                                /ru/products, /en/products
 *
 * This module is framework-agnostic (no 'use client', no next imports) so it
 * can be imported from `middleware.ts`, server layouts and client hooks alike.
 */

export type Locale = 'hy' | 'ru' | 'en';

export const LOCALES: Locale[] = ['hy', 'ru', 'en'];
export const DEFAULT_LOCALE: Locale = 'hy';
/** Locales that carry a URL prefix (everything except the default). */
export const PREFIXED_LOCALES: Exclude<Locale, 'hy'>[] = ['ru', 'en'];

/** BCP-47 tags for hreflang / OpenGraph. */
export const LOCALE_HREFLANG: Record<Locale, string> = {
  hy: 'hy-AM',
  ru: 'ru-RU',
  en: 'en-US',
};

export const LOCALE_OG: Record<Locale, string> = {
  hy: 'hy_AM',
  ru: 'ru_RU',
  en: 'en_US',
};

export function isLocale(value: string | null | undefined): value is Locale {
  return value === 'hy' || value === 'ru' || value === 'en';
}

/**
 * Split a pathname into its leading locale (if any) and the remaining path.
 * `/ru/products` → { locale: 'ru', path: '/products' }
 * `/products`    → { locale: 'hy', path: '/products' }
 */
export function splitLocale(pathname: string): { locale: Locale; path: string } {
  const segments = pathname.split('/');
  // segments[0] is '' because pathname starts with '/'
  const first = segments[1];
  if (first === 'ru' || first === 'en') {
    const rest = '/' + segments.slice(2).join('/');
    return { locale: first, path: rest === '/' ? '/' : rest.replace(/\/$/, '') || '/' };
  }
  return { locale: DEFAULT_LOCALE, path: pathname };
}

/**
 * Build a locale-prefixed href from a base (locale-neutral) path. The default
 * locale (hy) stays unprefixed. External, hash and non-string hrefs are
 * returned untouched by callers before reaching this function.
 */
export function localizedPath(path: string, locale: Locale): string {
  // Normalize to a leading-slash, locale-stripped base first.
  const { path: base } = splitLocale(path.startsWith('/') ? path : `/${path}`);
  if (locale === DEFAULT_LOCALE) return base;
  if (base === '/') return `/${locale}`;
  return `/${locale}${base}`;
}
