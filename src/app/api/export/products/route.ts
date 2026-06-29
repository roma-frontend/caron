import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/adminAuth';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';

function escapeCsv(value: unknown): string {
  const text = String(value ?? '');
  // Guard against CSV/formula injection in spreadsheet apps.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
}

/** Join an attribute value (string | string[] | other) for a CSV cell. */
function attrCell(value: unknown): string {
  if (Array.isArray(value)) return value.map((v) => String(v)).join('; ');
  if (value === null || value === undefined) return '';
  return String(value);
}

type FilterDef = { _id: string; categoryId: string; slug: string; name: string };
type VehicleCompatEntry = { brand?: string; model?: string; yearFrom?: number; yearTo?: number };

export async function GET(req: NextRequest) {
  if (!(await requireAdminAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return NextResponse.json({ error: 'No Convex URL' }, { status: 500 });

  const categoryParam = req.nextUrl.searchParams.get('category');

  try {
    const client = new ConvexHttpClient(url);
    const [products, categories, filterDefs] = await Promise.all([
      client.query(api.products.listAll),
      client.query(api.categories.list, {}),
      client.query(api.filters.listAll, {}),
    ]);
    const catName = new Map((categories as Array<{ _id: string; name: string }>).map((c) => [c._id, c.name]));

    // Optionally narrow to a single category (round-trip export of one category).
    let list = products as Array<Record<string, unknown>>;
    if (categoryParam && categoryParam !== 'all') {
      list = list.filter((p) => p.categoryId === categoryParam);
    }

    // Build dynamic attr_<slug> columns from the filter definitions of the
    // categories actually present in this export.
    const presentCategoryIds = new Set(list.map((p) => String(p.categoryId)));
    const defs = (filterDefs as FilterDef[]).filter((d) => presentCategoryIds.has(String(d.categoryId)));
    // De-duplicate slugs (different categories can share a slug like "brand").
    const attrSlugs: string[] = [];
    const seenSlug = new Set<string>();
    const defsBySlug = new Map<string, FilterDef[]>();
    for (const d of defs) {
      if (!seenSlug.has(d.slug)) { seenSlug.add(d.slug); attrSlugs.push(d.slug); }
      const arr = defsBySlug.get(d.slug) ?? [];
      arr.push(d);
      defsBySlug.set(d.slug, arr);
    }

    const baseColumns = [
      'id', 'sku', 'name', 'nameRu', 'nameEn', 'category', 'brand',
      'price', 'wholesalePrice', 'costPrice', 'compareAtPrice',
      'retailDiscount', 'wholesaleDiscount', 'stock', 'qtyStep',
      'atgCode', 'variantGroup', 'isActive', 'isFeatured', 'showInPromotions',
      'seoTitle', 'seoDescription', 'images', 'oem', 'vehicleCompat',
      'description', 'descriptionRu', 'descriptionEn',
    ];
    const columns = [...baseColumns, ...attrSlugs.map((s) => `attr_${s}`)];
    const header = columns.map(escapeCsv).join(',') + '\n';

    const rows = list
      .map((p) => {
        const attrs = (p.attributes as Record<string, unknown> | undefined) ?? {};
        const oem = (p.oemNumbers as Array<{ manufacturer?: string; code: string }> | undefined)
          ?.map((o) => (o.manufacturer ? `${o.manufacturer}=${o.code}` : o.code))
          .join('; ') ?? '';
        const images = (p.images as string[] | undefined)?.join('; ') ?? '';
        const compat = (attrs.vehicleCompat as VehicleCompatEntry[] | undefined)
          ?.map((c) => `${c.brand ?? ''}|${c.model ?? ''}|${c.yearFrom ?? ''}|${c.yearTo ?? ''}`)
          .join('; ') ?? '';

        const base = [
          p._id, p.sku ?? '', p.name ?? '', p.nameRu ?? '', p.nameEn ?? '',
          catName.get(p.categoryId as string) ?? '', p.brand ?? '',
          p.price ?? '', p.wholesalePrice ?? '', p.costPrice ?? '', p.compareAtPrice ?? '',
          p.retailDiscount ?? '', p.wholesaleDiscount ?? '', p.stock ?? '', p.qtyStep ?? '',
          p.atgCode ?? '', p.variantGroup ?? '',
          p.isActive ? '1' : '0', p.isFeatured ? '1' : '0', p.showInPromotions ? '1' : '0',
          p.seoTitle ?? '', p.seoDescription ?? '', images, oem, compat,
          p.description ?? '', p.descriptionRu ?? '', p.descriptionEn ?? '',
        ];

        const attrCells = attrSlugs.map((slug) => {
          // Value may be keyed by filter _id or by slug — check both.
          const idsForSlug = (defsBySlug.get(slug) ?? [])
            .filter((d) => String(d.categoryId) === String(p.categoryId))
            .map((d) => d._id);
          let value: unknown = attrs[slug];
          for (const idKey of idsForSlug) {
            if (value !== undefined && value !== '') break;
            value = attrs[idKey];
          }
          return attrCell(value);
        });

        return [...base, ...attrCells].map(escapeCsv).join(',');
      })
      .join('\n');

    const catSuffix = categoryParam && categoryParam !== 'all'
      ? `-${(catName.get(categoryParam) ?? 'category').replace(/[^a-zA-Z0-9_-]+/g, '_')}`
      : '';

    return new NextResponse('\ufeff' + header + rows, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=products${catSuffix}-${new Date().toISOString().slice(0, 10)}.csv`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
