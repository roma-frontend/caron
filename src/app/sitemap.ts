import { MetadataRoute } from 'next';
import { fetchQuery } from 'convex/nextjs';
import { api } from '../../convex/_generated/api';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://caron.am';

export const revalidate = 3600; // regenerate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

    const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/products`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/categories`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/promotions`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/delivery`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/car-selector`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/vin-decoder`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/oem`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
  ];

  try {
    const [products, categories] = await Promise.all([
      fetchQuery(api.products.list, { limit: 100 }),
      fetchQuery(api.categories.list, {}),
    ]);

    const productRoutes: MetadataRoute.Sitemap = (products ?? []).map((p) => ({
      url: `${BASE_URL}/products/${p.slug}`,
      lastModified: new Date(p.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    const categoryRoutes: MetadataRoute.Sitemap = (categories ?? [])
      .filter((c: { isActive: boolean }) => c.isActive)
      .map((c: { slug: string; createdAt: number }) => ({
        url: `${BASE_URL}/categories/${c.slug}`,
        lastModified: new Date(c.createdAt),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));

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
    const oemRoutes: MetadataRoute.Sitemap = Array.from(oemSet).map((oem) => ({
      url: `${BASE_URL}/oem/${encodeURIComponent(oem)}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));

    return [...staticRoutes, ...productRoutes, ...categoryRoutes, ...oemRoutes];
  } catch {
    // Fallback to static if Convex is unavailable
    return staticRoutes;
  }
}
