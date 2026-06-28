import { MetadataRoute } from 'next';
import { fetchQuery } from 'convex/nextjs';
import { api } from '../../convex/_generated/api';

const BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://caron.group').trim().replace(/\/+$/, '');

export const revalidate = 3600; // regenerate every hour

/** Build a sitemap entry with hy/ru/en hreflang alternates for a base path. */
function entry(
  path: string,
  opts: { lastModified?: Date; changeFrequency?: MetadataRoute.Sitemap[number]['changeFrequency']; priority?: number } = {},
): MetadataRoute.Sitemap[number] {
  const clean = path === '/' ? '' : path;
  return {
    url: `${BASE_URL}${clean || '/'}`,
    lastModified: opts.lastModified,
    changeFrequency: opts.changeFrequency,
    priority: opts.priority,
    alternates: {
      languages: {
        'hy-AM': `${BASE_URL}${clean || '/'}`,
        'ru-RU': `${BASE_URL}/ru${clean}`,
        'en-US': `${BASE_URL}/en${clean}`,
      },
    },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

    const staticRoutes: MetadataRoute.Sitemap = [
    entry('/', { lastModified: now, changeFrequency: 'daily', priority: 1 }),
    entry('/products', { lastModified: now, changeFrequency: 'daily', priority: 0.9 }),
    entry('/categories', { lastModified: now, changeFrequency: 'weekly', priority: 0.8 }),
    entry('/promotions', { lastModified: now, changeFrequency: 'weekly', priority: 0.7 }),
    entry('/about', { lastModified: now, changeFrequency: 'monthly', priority: 0.6 }),
    entry('/contact', { lastModified: now, changeFrequency: 'monthly', priority: 0.6 }),
    entry('/delivery', { lastModified: now, changeFrequency: 'monthly', priority: 0.5 }),
    entry('/car-selector', { lastModified: now, changeFrequency: 'weekly', priority: 0.7 }),
    entry('/vin-decoder', { lastModified: now, changeFrequency: 'weekly', priority: 0.7 }),
    entry('/oem', { lastModified: now, changeFrequency: 'weekly', priority: 0.7 }),
  ];

  try {
    const [products, categories] = await Promise.all([
      fetchQuery(api.products.list, { limit: 100 }),
      fetchQuery(api.categories.list, {}),
    ]);

    const productRoutes: MetadataRoute.Sitemap = (products ?? []).map((p) =>
      entry(`/products/${p.slug}`, { lastModified: new Date(p.updatedAt), changeFrequency: 'weekly', priority: 0.8 }),
    );

    const categoryRoutes: MetadataRoute.Sitemap = (categories ?? [])
      .filter((c: { isActive: boolean }) => c.isActive)
      .map((c: { slug: string; createdAt: number }) =>
        entry(`/categories/${c.slug}`, { lastModified: new Date(c.createdAt), changeFrequency: 'weekly', priority: 0.7 }),
      );

    // Collect unique OEM numbers from all products
    const oemSet = new Set<string>();
    for (const p of products ?? []) {
      if (p.oemNumbers) {
        for (const oem of p.oemNumbers) {
          const code = typeof oem === 'string' ? oem : oem.code;
          oemSet.add(code.trim());
        }
      }
    }
    const oemRoutes: MetadataRoute.Sitemap = Array.from(oemSet).map((oem) =>
      entry(`/oem/${encodeURIComponent(oem)}`, { lastModified: now, changeFrequency: 'weekly', priority: 0.6 }),
    );

    return [...staticRoutes, ...productRoutes, ...categoryRoutes, ...oemRoutes];
  } catch {
    // Fallback to static if Convex is unavailable
    return staticRoutes;
  }
}
