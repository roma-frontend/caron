import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';
import type { Metadata } from 'next';
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

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const decoded = decodeURIComponent(code).trim();

  if (!decoded || decoded.length < 3) {
    return {
      title: 'OEM որոնում',
      description: 'Որոնել ավտոպահեստամասեր OEM համարով',
    };
  }

  const products = await fetchOemProducts(decoded);
  const count = products.length;

  if (count === 0) {
    return {
      title: `OEM ${decoded} — ապրանքներ չեն գտնվել`,
      description: `${decoded} OEM համարով ապրանքներ չեն գտնվել Caron.group խանութում:`,
      robots: { index: false },
    };
  }

  const productNames = products.slice(0, 3).map((p: { name: string }) => p.name).join(', ');
  const title = `OEM ${decoded} — ${count} ապրանք Caron.group`;
  const description =
    count === 1
      ? `${decoded} OEM համար — ${products[0].name}։ Գնել Caron.group առցանց խանութում։`
      : `${decoded} OEM համար — գտնվել է ${count} ապրանք (${productNames}...)։ Գնել Caron.group առցանց խանութում։`;

  return {
    title,
    description,
    alternates: { canonical: `/oem/${encodeURIComponent(decoded)}` },
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
