import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/adminAuth';
import { ConvexHttpClient } from 'convex/browser';
import * as XLSX from 'xlsx';
import { api } from '../../../../../convex/_generated/api';

export const runtime = 'nodejs';

/** Join an attribute value (string | string[] | other) for one cell. */
function attrCell(value: unknown): string {
  if (Array.isArray(value)) return value.map((v) => String(v)).join('; ');
  if (value === null || value === undefined) return '';
  return String(value);
}

/** Numeric cell or '' (so empty stays blank instead of 0 in Excel). */
function numCell(value: unknown): number | string {
  return typeof value === 'number' && Number.isFinite(value) ? value : '';
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

    // Dynamic attr_<slug> columns from the filter definitions of the categories
    // actually present in this export.
    const presentCategoryIds = new Set(list.map((p) => String(p.categoryId)));
    const defs = (filterDefs as FilterDef[]).filter((d) => presentCategoryIds.has(String(d.categoryId)));
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

    const dataRows = list.map((p) => {
      const attrs = (p.attributes as Record<string, unknown> | undefined) ?? {};
      const oem = (p.oemNumbers as Array<{ manufacturer?: string; code: string }> | undefined)
        ?.map((o) => (o.manufacturer ? `${o.manufacturer}=${o.code}` : o.code))
        .join('; ') ?? '';
      const images = (p.images as string[] | undefined)?.join('; ') ?? '';
      const compat = (attrs.vehicleCompat as VehicleCompatEntry[] | undefined)
        ?.map((c) => `${c.brand ?? ''}|${c.model ?? ''}|${c.yearFrom ?? ''}|${c.yearTo ?? ''}`)
        .join('; ') ?? '';

      const base: Array<string | number> = [
        String(p._id), String(p.sku ?? ''), String(p.name ?? ''), String(p.nameRu ?? ''), String(p.nameEn ?? ''),
        catName.get(p.categoryId as string) ?? '', String(p.brand ?? ''),
        numCell(p.price), numCell(p.wholesalePrice), numCell(p.costPrice), numCell(p.compareAtPrice),
        numCell(p.retailDiscount), numCell(p.wholesaleDiscount), numCell(p.stock), numCell(p.qtyStep),
        String(p.atgCode ?? ''), String(p.variantGroup ?? ''),
        p.isActive ? 1 : 0, p.isFeatured ? 1 : 0, p.showInPromotions ? 1 : 0,
        String(p.seoTitle ?? ''), String(p.seoDescription ?? ''), images, oem, compat,
        String(p.description ?? ''), String(p.descriptionRu ?? ''), String(p.descriptionEn ?? ''),
      ];

      const attrCells = attrSlugs.map((slug) => {
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

      return [...base, ...attrCells];
    });

    const aoa = [columns, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

    const catSuffix = categoryParam && categoryParam !== 'all'
      ? `-${(catName.get(categoryParam) ?? 'category').replace(/[^a-zA-Z0-9_-]+/g, '_')}`
      : '';

    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=products${catSuffix}-${new Date().toISOString().slice(0, 10)}.xlsx`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
