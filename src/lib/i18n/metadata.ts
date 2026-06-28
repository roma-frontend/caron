import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { isLocale, DEFAULT_LOCALE, localizedPath, type Locale } from './locale';

export type LocalizedMeta = Record<Locale, { title: string; description: string }>;

/**
 * Build locale-aware Metadata for a static storefront page. Reads the locale
 * from the `x-locale` header (set by proxy.ts), returning a translated
 * title/description plus canonical + hy/ru/en hreflang alternates for the page.
 *
 * Usage in a server page:
 *   export const generateMetadata = () => localizedMetadata('/about', TEXT);
 */
export async function localizedMetadata(basePath: string, text: LocalizedMeta): Promise<Metadata> {
  const h = await headers();
  const hl = h.get('x-locale');
  const locale: Locale = isLocale(hl) ? hl : DEFAULT_LOCALE;
  const t = text[locale];
  return {
    title: t.title,
    description: t.description,
    alternates: {
      canonical: localizedPath(basePath, locale),
      languages: {
        'hy-AM': localizedPath(basePath, 'hy'),
        'ru-RU': localizedPath(basePath, 'ru'),
        'en-US': localizedPath(basePath, 'en'),
      },
    },
    openGraph: { type: 'website', title: t.title, description: t.description },
  };
}
