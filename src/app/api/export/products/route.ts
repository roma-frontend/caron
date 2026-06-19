import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/adminAuth';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';

function escapeCsv(value: unknown): string {
  const text = String(value ?? '');
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
}

export async function GET() {
  if (!(await requireAdminAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return NextResponse.json({ error: 'No Convex URL' }, { status: 500 });

  try {
    const client = new ConvexHttpClient(url);
    const [products, categories] = await Promise.all([
      client.query(api.products.listAll),
      client.query(api.categories.list, {}),
    ]);
    const catName = new Map((categories as Array<{ _id: string; name: string }>).map((c) => [c._id, c.name]));

    const columns = [
      'name', 'slug', 'sku', 'category', 'brand', 'price', 'costPrice',
      'wholesalePrice', 'compareAtPrice', 'retailDiscount', 'stock', 'atgCode',
      'oemNumbers', 'isActive', 'isFeatured', 'showInPromotions',
      'seoTitle', 'seoDescription', 'images', 'description',
    ];
    const header = columns.map(escapeCsv).join(',') + '\n';

    const rows = (products as Array<Record<string, unknown>>)
      .map((p) => {
        const oem = (p.oemNumbers as Array<{ code: string }> | undefined)?.map((o) => o.code).join('; ') ?? '';
        const images = (p.images as string[] | undefined)?.join('; ') ?? '';
        return [
          p.name, p.slug, p.sku ?? '', catName.get(p.categoryId as string) ?? '',
          p.brand ?? '', p.price, p.costPrice ?? '', p.wholesalePrice ?? '',
          p.compareAtPrice ?? '', p.retailDiscount ?? '', p.stock, p.atgCode ?? '',
          oem, p.isActive ? '1' : '0', p.isFeatured ? '1' : '0', p.showInPromotions ? '1' : '0',
          p.seoTitle ?? '', p.seoDescription ?? '', images, p.description ?? '',
        ].map(escapeCsv).join(',');
      })
      .join('\n');

    return new NextResponse('\ufeff' + header + rows, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=products-${new Date().toISOString().slice(0, 10)}.csv`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
