import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ProductOemResults } from './client';

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
      description: `${decoded} OEM համարով ապրանքներ չեն գտնվել Caron.am խանութում:`,
      robots: { index: false },
    };
  }

  const productNames = products.slice(0, 3).map((p: { name: string }) => p.name).join(', ');
  const title = `OEM ${decoded} — ${count} ապրանք Caron.am`;
  const description =
    count === 1
      ? `${decoded} OEM համար — ${products[0].name}։ Գնել Caron.am առցանց խանութում։`
      : `${decoded} OEM համար — գտնվել է ${count} ապրանք (${productNames}...)։ Գնել Caron.am առցանց խանութում։`;

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

  if (!decoded || decoded.length < 3) {
    return (
      <div className="mx-auto py-16 text-center" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)' }}>
        <h1 className="text-2xl font-bold">OEM որոնում</h1>
        <p className="mt-3 text-muted-foreground">Մուտքագրեք OEM համարը որոնման համար</p>
        <Link href="/products" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
          Դիտել բոլոր ապրանքները
        </Link>
      </div>
    );
  }

  const products = await fetchOemProducts(decoded);

  return (
    <div className="mx-auto" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingBlock: 'var(--space-8)' }}>
      <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors">Գլխավոր</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-foreground transition-colors">Ապրանքներ</Link>
        <span>/</span>
        <span className="font-medium text-foreground">OEM {decoded}</span>
      </nav>

      <h1 className="text-2xl font-bold">OEM {decoded}</h1>
      <p className="mt-2 text-muted-foreground">
        {products.length > 0
          ? `Գտնվել է ${products.length} ապրանք`
          : 'Ապրանքներ չեն գտնվել'}
      </p>

      {products.length > 0 && (
        <div className="mt-4 rounded-2xl border bg-card">
          <ProductOemResults products={products} decoded={decoded} />
        </div>
      )}

      {products.length === 0 && (
        <div className="mt-8 py-12 text-center">
          <p className="text-lg text-muted-foreground">{decoded} OEM համարով ապրանքներ չեն գտնվել</p>
          <Link href="/products" className="mt-4 inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold hover:bg-accent transition-colors">
            Դիտել բոլոր ապրանքները
          </Link>
        </div>
      )}

      {products.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-4 text-lg font-semibold">Նմանատիպ որոնումներ</h2>
          <p className="text-sm text-muted-foreground">
            OEM (Original Equipment Manufacturer) համարը թույլ է տալիս գտնել ճշգրիտ պահեստամասը ձեր մեքենայի համար:
            Որոնեք նաև{' '}
            <Link href="/vin-decoder" className="text-primary underline underline-offset-2 hover:text-primary/80">
              VIN ապակոդավորում
            </Link>{' '}
            կամ{' '}
            <Link href="/products" className="text-primary underline underline-offset-2 hover:text-primary/80">
              ընտրեք մակնիշ
            </Link>:
          </p>
        </div>
      )}
    </div>
  );
}
