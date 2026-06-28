import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { fetchQuery } from 'convex/nextjs';
import { api } from '../../../../../convex/_generated/api';
import { isLocale, DEFAULT_LOCALE, localizedPath, type Locale } from '@/lib/i18n/locale';

const SUFFIX: Record<Locale, '' | 'Ru' | 'En'> = { hy: '', ru: 'Ru', en: 'En' };

function pick(obj: Record<string, unknown>, base: string, locale: Locale): string {
  const loc = obj[`${base}${SUFFIX[locale]}`];
  if (typeof loc === 'string' && loc.trim()) return loc;
  const fb = obj[base];
  return typeof fb === 'string' ? fb : '';
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const h = await headers();
  const hl = h.get('x-locale');
  const locale: Locale = isLocale(hl) ? hl : DEFAULT_LOCALE;

  let cat: Record<string, unknown> | null = null;
  try {
    cat = (await fetchQuery(api.categories.getBySlug, { slug })) as Record<string, unknown> | null;
  } catch {
    cat = null;
  }

  if (!cat) return {};

  const name = pick(cat, 'name', locale);
  const desc = pick(cat, 'description', locale) || name;
  const base = `/categories/${slug}`;

  return {
    title: name,
    description: desc.slice(0, 300),
    alternates: {
      canonical: localizedPath(base, locale),
      languages: {
        'hy-AM': localizedPath(base, 'hy'),
        'ru-RU': localizedPath(base, 'ru'),
        'en-US': localizedPath(base, 'en'),
      },
    },
    openGraph: { type: 'website', title: name, description: desc.slice(0, 300) },
  };
}

export default function CategoryDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
