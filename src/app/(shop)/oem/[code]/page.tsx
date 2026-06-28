import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { isLocale, DEFAULT_LOCALE, localizedPath, type Locale } from '@/lib/i18n/locale';
import { OemPageBody } from './body';

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;

async function fetchOemProducts(oem: string) {
  const client = new ConvexHttpClient(CONVEX_URL);
  try {
    return await client.query(api.products.searchByOem, { oem: oem.trim(), limit: 50 });
  } catch {
    return [];
  }
}

const OEM_T: Record<Locale, {
  searchTitle: string; searchDesc: string;
  notFoundTitle: (c: string) => string; notFoundDesc: (c: string) => string;
  foundTitle: (c: string, n: number) => string;
  oneDesc: (c: string, name: string) => string;
  manyDesc: (c: string, n: number, names: string) => string;
}> = {
  hy: {
    searchTitle: 'OEM որոնում',
    searchDesc: 'Որոնել ավտոպահեստամասեր OEM համարով',
    notFoundTitle: (c) => `OEM ${c} — ապրանքներ չեն գտնվել`,
    notFoundDesc: (c) => `${c} OEM համարով ապրանքներ չեն գտնվել Caron.group խանութում:`,
    foundTitle: (c, n) => `OEM ${c} — ${n} ապրանք Caron.group`,
    oneDesc: (c, name) => `${c} OEM համար — ${name}։ Գնել Caron.group առցանց խանութում։`,
    manyDesc: (c, n, names) => `${c} OEM համար — գտնվել է ${n} ապրանք (${names}...)։ Գնել Caron.group առցանց խանութում։`,
  },
  ru: {
    searchTitle: 'Поиск по OEM',
    searchDesc: 'Поиск автозапчастей по OEM-номеру',
    notFoundTitle: (c) => `OEM ${c} — товары не найдены`,
    notFoundDesc: (c) => `По OEM-номеру ${c} товары в магазине Caron.group не найдены.`,
    foundTitle: (c, n) => `OEM ${c} — ${n} товаров на Caron.group`,
    oneDesc: (c, name) => `OEM-номер ${c} — ${name}. Купить в интернет-магазине Caron.group.`,
    manyDesc: (c, n, names) => `OEM-номер ${c} — найдено ${n} товаров (${names}...). Купить в интернет-магазине Caron.group.`,
  },
  en: {
    searchTitle: 'OEM search',
    searchDesc: 'Search auto parts by OEM number',
    notFoundTitle: (c) => `OEM ${c} — no products found`,
    notFoundDesc: (c) => `No products found for OEM number ${c} at Caron.group.`,
    foundTitle: (c, n) => `OEM ${c} — ${n} products at Caron.group`,
    oneDesc: (c, name) => `OEM number ${c} — ${name}. Buy at the Caron.group online store.`,
    manyDesc: (c, n, names) => `OEM number ${c} — ${n} products found (${names}...). Buy at the Caron.group online store.`,
  },
};

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const decoded = decodeURIComponent(code).trim();
  const h = await headers();
  const hl = h.get('x-locale');
  const locale: Locale = isLocale(hl) ? hl : DEFAULT_LOCALE;
  const tr = OEM_T[locale];
  const base = `/oem/${encodeURIComponent(decoded)}`;
  const languages = {
    'hy-AM': localizedPath(base, 'hy'),
    'ru-RU': localizedPath(base, 'ru'),
    'en-US': localizedPath(base, 'en'),
  };

  if (!decoded || decoded.length < 3) {
    return { title: tr.searchTitle, description: tr.searchDesc };
  }

  const products = await fetchOemProducts(decoded);
  const count = products.length;

  if (count === 0) {
    return {
      title: tr.notFoundTitle(decoded),
      description: tr.notFoundDesc(decoded),
      robots: { index: false },
    };
  }

  const productNames = products.slice(0, 3).map((p: { name: string }) => p.name).join(', ');
  const title = tr.foundTitle(decoded, count);
  const description =
    count === 1
      ? tr.oneDesc(decoded, products[0].name)
      : tr.manyDesc(decoded, count, productNames);

  return {
    title,
    description,
    alternates: { canonical: localizedPath(base, locale), languages },
    openGraph: {
      title,
      description,
      type: 'website',
    },
  };
}

export default async function OemCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const decoded = decodeURIComponent(code).trim();
  const valid = Boolean(decoded && decoded.length >= 3);
  const products = valid ? await fetchOemProducts(decoded) : [];

  return <OemPageBody decoded={decoded} valid={valid} products={products} />;
}
