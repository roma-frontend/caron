import { v } from 'convex/values';
import { query, mutation, internalMutation, internalQuery } from './_generated/server';
import type { MutationCtx } from './_generated/server';
import { paginationOptsValidator } from 'convex/server';
import { getAdminCaller } from './lib/auth';
import { internal } from './_generated/api';
import { normalizeImageUrls } from './lib/imageUrl';
import type { Doc, Id } from './_generated/dataModel';

type ProductInsert = Omit<Doc<'products'>, '_id' | '_creationTime'>;

/** Normalize an OEM code for indexing/lookup: lowercase, strip separators. */
function normalizeOemCode(code: string): string {
  return code.toLowerCase().replace(/[\s\-_/.]+/g, '');
}

/**
 * Rebuild the denormalized oemIndex rows for a single product. Called from
 * every product write path (create/update/bulk/delete) so OEM search stays
 * consistent without scanning the whole products table.
 */
async function syncOemIndex(
  ctx: MutationCtx,
  productId: Id<'products'>,
  oemNumbers?: Array<{ manufacturer: string; code: string }> | undefined,
): Promise<void> {
  const existing = await ctx.db
    .query('oemIndex')
    .withIndex('by_product', (q) => q.eq('productId', productId))
    .collect();
  for (const row of existing) await ctx.db.delete(row._id);

  if (!oemNumbers || oemNumbers.length === 0) return;
  const seen = new Set<string>();
  for (const o of oemNumbers) {
    const code = normalizeOemCode(o.code ?? '');
    if (!code || seen.has(code)) continue;
    seen.add(code);
    await ctx.db.insert('oemIndex', {
      productId,
      code,
      manufacturer: (o.manufacturer ?? '').toLowerCase().trim(),
    });
  }
}


function normalizeProductImages<T extends { images?: string[] }>(product: T): T {
  if (!product.images || product.images.length === 0) return product;

  const normalized = normalizeImageUrls(product.images) as string[];
  const changed = normalized.some((img, index) => img !== product.images![index]);

  return changed ? { ...product, images: normalized } : product;
}

function normalizeFilterValue(value: string): string {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function filterValuesEqual(expected: unknown, actual: unknown): boolean {
  if (expected === actual) return true;
  if (typeof expected === 'string' && typeof actual === 'string') {
    const a = normalizeFilterValue(expected);
    const b = normalizeFilterValue(actual);
    if (!a || !b) return false;
    return a === b;
  }
  return false;
}

function normalizeSlugValue(value: string): string {
  return value
    .normalize('NFC')
    .toLowerCase()
    .trim()
    .replace(/%20/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const listPaginated = query({
  args: {
    categoryId: v.optional(v.id('categories')),
    search: v.optional(v.string()),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    inStockOnly: v.optional(v.boolean()),
    onSale: v.optional(v.boolean()),
    minRating: v.optional(v.number()),
    brand: v.optional(v.string()),
    sort: v.optional(v.union(v.literal('newest'), v.literal('priceAsc'), v.literal('priceDesc'), v.literal('popular'))),
    attributes: v.optional(v.any()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const hasFilters = !!(args.minPrice || args.maxPrice || args.inStockOnly || args.onSale || args.minRating || args.brand || args.attributes);
    // When attribute filters are active we must over-fetch because filtering happens in-memory
    // after the DB query. Fetch up to 2000 so we don't miss products beyond position 200.
    // Also over-fetch for brand filter to capture all matching products across the full set.
    const paginationOpts = hasFilters
      ? { ...args.paginationOpts, numItems: Math.max(args.paginationOpts.numItems ?? 20, args.attributes ? 2000 : 200) }
      : args.paginationOpts;

    const byPrice = args.sort === 'priceAsc' || args.sort === 'priceDesc';
    const priceDir = args.sort === 'priceAsc' ? 'asc' : 'desc';
    let result;

    if (args.search) {
      // Search by name (full-text) + SKU (exact) + OEM numbers
      const nameResults = await ctx.db
        .query('products')
        .withSearchIndex('search_products', (q) => {
          let s = q.search('name', args.search!);
          if (args.categoryId) s = s.eq('categoryId', args.categoryId);
          return s.eq('isActive', true);
        })
        .paginate(paginationOpts);
      // Also try exact SKU match
      const skuResults = await ctx.db.query('products').filter((q) => q.eq(q.field('sku'), args.search!)).take(50);
      // Also try OEM number match (partial, case-insensitive)
      const searchLower = args.search!.toLowerCase();
      const oemResults = await ctx.db.query('products')
        .withIndex('by_active', (q) => q.eq('isActive', true))
        .take(200);
      const oemMatches = oemResults.filter((p) =>
        p.oemNumbers?.some((o) => {
          const code = typeof o === 'string' ? o : o.code;
          const manufacturer = typeof o === 'string' ? '' : o.manufacturer;
          return code.toLowerCase().includes(searchLower) || manufacturer.toLowerCase().includes(searchLower);
        })
      );
      const merged = new Map<string, typeof nameResults.page[number]>();
      for (const p of nameResults.page) merged.set(p._id, p);
      for (const p of skuResults) { if (!merged.has(p._id) && p.isActive && (!args.categoryId || p.categoryId === args.categoryId)) merged.set(p._id, p); }
      for (const p of oemMatches) { if (!merged.has(p._id) && p.isActive && (!args.categoryId || p.categoryId === args.categoryId)) merged.set(p._id, p); }
      result = { ...nameResults, page: Array.from(merged.values()).slice(0, paginationOpts.numItems) };
    } else if (byPrice && args.categoryId) {
      result = await ctx.db.query('products').withIndex('by_category_price', (q) => q.eq('categoryId', args.categoryId!)).order(priceDir).paginate(paginationOpts);
    } else if (byPrice) {
      result = await ctx.db.query('products').withIndex('by_active_price', (q) => q.eq('isActive', true)).order(priceDir).paginate(paginationOpts);
    } else if (args.categoryId) {
      result = await ctx.db.query('products').withIndex('by_category', (q) => q.eq('categoryId', args.categoryId!)).order('desc').paginate(paginationOpts);
    } else {
      result = await ctx.db.query('products').withIndex('by_active', (q) => q.eq('isActive', true)).order('desc').paginate(paginationOpts);
    }

    // Order-preserving filters (the DB already ordered the page)
    let filtered = result.page.filter((p) => p.isActive);
    // Exclude products from inactive categories
    const cats = await ctx.db.query('categories').withIndex('by_active', (q) => q.eq('isActive', false)).take(200);
    if (cats.length > 0) {
      const inactiveIds = new Set(cats.map((c) => c._id));
      filtered = filtered.filter((p) => !inactiveIds.has(p.categoryId));
    }
    if (args.minPrice) filtered = filtered.filter((p) => p.price >= args.minPrice!);
    if (args.maxPrice) filtered = filtered.filter((p) => p.price <= args.maxPrice!);
    if (args.inStockOnly) filtered = filtered.filter((p) => p.stock > 0);
    if (args.onSale) filtered = filtered.filter((p) =>
      (p.compareAtPrice != null && p.compareAtPrice > p.price) ||
      (p.retailDiscount != null && p.retailDiscount > 0)
    );
    if (args.minRating) filtered = filtered.filter((p) => (p.rating ?? 0) >= args.minRating!);
    if (args.brand) filtered = filtered.filter((p) => {
      const attrBrand = ((p.attributes ?? {}) as Record<string, unknown>).brand as string | undefined;
      const topBrand = p.brand as string | undefined;
      const brand = attrBrand ?? topBrand;
      return typeof brand === 'string' && brand.toLowerCase() === args.brand!.toLowerCase();
    });

    // Attribute filtering (arbitrary keys can't be indexed)
    if (args.attributes && typeof args.attributes === 'object') {
      const attrs = args.attributes as Record<string, unknown>;
      const filterDefs = await ctx.db.query('filterDefinitions').take(500);
      const idToSlug = new Map(filterDefs.map((f) => [f._id as string, f.slug]));
      const slugToId = new Map(filterDefs.map((f) => [f.slug, f._id as string]));
      filtered = filtered.filter((p) => {
        const pa = (p.attributes ?? {}) as Record<string, unknown>;
        for (const [key, val] of Object.entries(attrs)) {
          if (val === null || val === undefined || val === '') continue;

          // Special handling for carBrand — also check vehicleCompat
          if (key === 'carBrand' && typeof val === 'string') {
            const compat = pa.vehicleCompat as Array<{ brand: string }> | undefined;
            if (compat && compat.length > 0) {
              if (!compat.some((c) => c.brand === val)) return false;
              continue;
            }
          }
          // Check both attributes[key] and matching top-level field (e.g., brand, stock)
          const topLevel = (p as Record<string, unknown>)[key];
          const aliasKeys = new Set<string>([key]);
          const slugKey = idToSlug.get(key);
          if (slugKey) aliasKeys.add(slugKey);
          const idKey = slugToId.get(key);
          if (idKey) aliasKeys.add(idKey);
          const checkVal = (check: unknown) => {
            if (Array.isArray(val)) {
              if (val.length === 0) return true;
              if (Array.isArray(check)) return val.some((v) => (check as unknown[]).some((c) => filterValuesEqual(v, c)));
              return val.some((v) => filterValuesEqual(v, check));
            }
            if (typeof val === 'boolean') return check === val;
            return filterValuesEqual(val, check);
          };
          const attrMatch = Array.from(aliasKeys).some((k) => checkVal(pa[k]));

          if (!checkVal(topLevel) && !attrMatch) return false;
        }
        return true;
      });
    }

    // Search is relevance-ordered: honor price sort within page. Popular: featured first.
    if (args.search && byPrice) filtered = [...filtered].sort((a, b) => (priceDir === 'asc' ? a.price - b.price : b.price - a.price));
    else if (args.sort === 'popular') filtered = [...filtered].sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));

    return { ...result, page: filtered.map(normalizeProductImages) };
  },
});

export const list = query({
  args: {
    categoryId: v.optional(v.id('categories')),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (args.search) {
      let results = await ctx.db
        .query('products')
        .withSearchIndex('search_products', (q) => {
          let search = q.search('name', args.search!);
          if (args.categoryId) search = search.eq('categoryId', args.categoryId);
          return search.eq('isActive', true);
        })
        .take(Math.min(args.limit ?? 20, 500));
      // Also try SKU match
      const skuMatch = await ctx.db.query('products').filter((q) => q.eq(q.field('sku'), args.search!)).take(50);
      for (const p of skuMatch) {
        if (p.isActive && (!args.categoryId || p.categoryId === args.categoryId) && !results.find((r) => r._id === p._id)) results.push(p);
      }
      // Also try OEM number match (partial, case-insensitive)
      const searchLower = args.search!.toLowerCase();
      const oemResults = await ctx.db.query('products')
        .withIndex('by_active', (q) => q.eq('isActive', true))
        .take(200);
      const oemMatches = oemResults.filter((p) =>
        p.oemNumbers?.some((o) => {
          const code = typeof o === 'string' ? o : o.code;
          const manufacturer = typeof o === 'string' ? '' : o.manufacturer;
          return code.toLowerCase().includes(searchLower) || manufacturer.toLowerCase().includes(searchLower);
        })
      );
      for (const p of oemMatches) {
        if (p.isActive && (!args.categoryId || p.categoryId === args.categoryId) && !results.find((r) => r._id === p._id)) results.push(p);
      }
      if (args.minPrice) results = results.filter((p) => p.price >= args.minPrice!);
      if (args.maxPrice) results = results.filter((p) => p.price <= args.maxPrice!);
      const inactiveCats = await ctx.db.query('categories').withIndex('by_active', (q) => q.eq('isActive', false)).take(200);
      if (inactiveCats.length > 0) { const ids = new Set(inactiveCats.map((c) => c._id)); results = results.filter((p) => !ids.has(p.categoryId)); }
      return results.map(normalizeProductImages);
    }
    let products;
    if (args.categoryId) {
      products = await ctx.db
        .query('products')
        .withIndex('by_category', (q) => q.eq('categoryId', args.categoryId!))
        .order('desc')
        .take(Math.min(args.limit ?? 20, 500));
      products = products.filter((p) => p.isActive);
    } else {
      products = await ctx.db
        .query('products')
        .withIndex('by_active', (q) => q.eq('isActive', true))
        .order('desc')
        .take(Math.min(args.limit ?? 20, 500));
    }
    if (args.minPrice) products = products.filter((p) => p.price >= args.minPrice!);
    if (args.maxPrice) products = products.filter((p) => p.price <= args.maxPrice!);
    // Exclude inactive categories
    const cats = await ctx.db.query('categories').withIndex('by_active', (q) => q.eq('isActive', false)).take(200);
    if (cats.length > 0) {
      const inactiveIds = new Set(cats.map((c) => c._id));
      products = products.filter((p) => !inactiveIds.has(p.categoryId));
    }
    return products.map(normalizeProductImages);
  },
});

export const getBrands = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query('products').withIndex('by_active', (q) => q.eq('isActive', true)).take(5000);
    const brands = new Set<string>();
    for (const p of products) {
      const b = ((p.attributes ?? {}) as Record<string, unknown>).brand as string | undefined ?? p.brand;
      if (b) brands.add(b);
    }
    return [...brands].sort();
  },
});

export const getById = query({
  args: { id: v.id('products') },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    return product ? normalizeProductImages(product) : null;
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const raw = args.slug.trim();
    let decoded = raw;
    try {
      decoded = decodeURIComponent(raw);
    } catch {}

    const candidates = Array.from(new Set([raw, decoded].map((s) => s.trim()).filter(Boolean)));

    let product = null;
    for (const candidate of candidates) {
      product = await ctx.db.query('products').withIndex('by_slug', (q) => q.eq('slug', candidate)).unique();
      if (product) break;
    }
    if (!product) {
      for (const candidate of candidates) {
        product = await ctx.db.query('products').withIndex('by_sku', (q) => q.eq('sku', candidate)).unique();
        if (product) break;
      }
    }
    const idCandidate = candidates.find((s) => /^j[0-9a-z]{12,}$/i.test(s));
    if (!product && idCandidate) {
      product = await ctx.db.get(idCandidate as Id<'products'>);
    }

    if (!product) {
      const targetNorm = normalizeSlugValue(decoded);
      if (targetNorm) {
        const recent = await ctx.db
          .query('products')
          .withIndex('by_active', (q) => q.eq('isActive', true))
          .take(5000);
        product = recent.find((p) => normalizeSlugValue(p.slug) === targetNorm) ?? null;
      }
    }
    if (!product) return null;
    if (!product.isActive) return null;
    const cat = await ctx.db.get(product.categoryId);
    if (!cat?.isActive) return null;
    return normalizeProductImages(product);
  },
});

export const searchByOem = query({
  args: {
    oem: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const term = normalizeOemCode(args.oem);
    if (!term) return [];

    const inactiveCats = await ctx.db.query('categories').withIndex('by_active', (q) => q.eq('isActive', false)).take(200);
    const inactiveIds = new Set(inactiveCats.map((c) => c._id));

    // Fast path: prefix lookup on the denormalized oemIndex (scales to any
    // catalog size). Codes are stored normalized, so a prefix range scan
    // matches "0986…" when the user types the leading digits.
    const rows = await ctx.db
      .query('oemIndex')
      .withIndex('by_code', (q) => q.gte('code', term).lt('code', term + '\uffff'))
      .take(500);

    if (rows.length > 0) {
      const productIds = [...new Set(rows.map((r) => r.productId))];
      const products = await Promise.all(productIds.map((id) => ctx.db.get(id)));
      return products
        .filter((p): p is Doc<'products'> => !!p && p.isActive && !inactiveIds.has(p.categoryId))
        .slice(0, limit)
        .map(normalizeProductImages);
    }

    // Fallback for legacy data before the index was built: bounded scan with
    // substring matching (also covers manufacturer text).
    const scanned = await ctx.db.query('products')
      .withIndex('by_active', (q) => q.eq('isActive', true))
      .take(300);
    return scanned
      .filter((p) => p.oemNumbers?.some((o) => normalizeOemCode(o.code).includes(term) || o.manufacturer.toLowerCase().includes(term)))
      .filter((p) => !inactiveIds.has(p.categoryId))
      .slice(0, limit)
      .map(normalizeProductImages);
  },
});

/**
 * One-time / maintenance backfill: rebuild the entire oemIndex from products.
 * Safe to re-run; it clears and recreates rows per product. Admin-only.
 */
export const rebuildOemIndex = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    // Clear existing index.
    const all = await ctx.db.query('oemIndex').take(100000);
    for (const row of all) await ctx.db.delete(row._id);
    // Rebuild from products that have OEM numbers.
    const products = await ctx.db.query('products').take(50000);
    let indexed = 0;
    for (const p of products) {
      if (p.oemNumbers && p.oemNumbers.length > 0) {
        await syncOemIndex(ctx, p._id, p.oemNumbers);
        indexed++;
      }
    }
    return `OEM ինդեքսը վերակառուցվեց՝ ${indexed} ապրանք`;
  },
});

/**
 * Idempotent, self-healing OEM-index backfill, run automatically by the daily
 * cron (convex/crons.ts). It only indexes products that have OEM numbers but no
 * index rows yet, so once the catalog is fully indexed this becomes a cheap
 * read-only pass. This also covers products created before the index existed
 * without requiring a manual rebuild. Internal (no auth) — cron-invoked only.
 */
export const backfillOemIndex = internalMutation({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query('products').take(50000);
    let healed = 0;
    for (const p of products) {
      if (!p.oemNumbers || p.oemNumbers.length === 0) continue;
      const existing = await ctx.db
        .query('oemIndex')
        .withIndex('by_product', (q) => q.eq('productId', p._id))
        .first();
      if (!existing) {
        await syncOemIndex(ctx, p._id, p.oemNumbers);
        healed++;
      }
    }
    return healed;
  },
});

/**
 * Collect every image URL referenced anywhere in the database, so an R2
 * cleanup can determine which stored objects are orphaned. Returns raw URL
 * strings plus CMS page HTML (image URLs are extracted from it by the caller).
 */
export const imageReferences = internalQuery({
  args: {},
  handler: async (ctx): Promise<{ urls: string[]; html: string[] }> => {
    const urls: string[] = [];
    const html: string[] = [];

    const products = await ctx.db.query('products').take(50000);
    for (const p of products) if (p.images) urls.push(...p.images);

    const reviews = await ctx.db.query('reviews').take(50000);
    for (const r of reviews) if (r.photos) urls.push(...r.photos);

    const promos = await ctx.db.query('promotions').take(5000);
    for (const pr of promos) {
      if (pr.imageUrl) urls.push(pr.imageUrl);
      if (pr.images) urls.push(...pr.images);
    }

    const cats = await ctx.db.query('categories').take(5000);
    for (const c of cats) if (c.imageUrl) urls.push(c.imageUrl);

    const settings = await ctx.db.query('settings').first();
    if (settings?.logoUrl) urls.push(settings.logoUrl);

    const pages = await ctx.db.query('pages').take(5000);
    for (const pg of pages) if (pg.content) html.push(pg.content);

    return { urls, html };
  },
});

/**
 * Catalog data-quality snapshot for the admin home panel. Admin-only.
 */
export const dataHealth = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args): Promise<{
    total: number; active: number; inactive: number;
    activeNoImage: number; activeNoDescription: number; activeZeroStock: number;
    lowStock: number; missingSeo: number; noBrand: number; duplicateSkus: number;
  }> => {
    await getAdminCaller(ctx, args.sessionToken);
    const products = await ctx.db.query('products').take(50000);
    const skuCount = new Map<string, number>();
    let active = 0, inactive = 0, activeNoImage = 0, activeNoDescription = 0;
    let activeZeroStock = 0, lowStock = 0, missingSeo = 0, noBrand = 0;
    for (const p of products) {
      if (p.sku) skuCount.set(p.sku, (skuCount.get(p.sku) ?? 0) + 1);
      if (!p.isActive) { inactive++; continue; }
      active++;
      if (!p.images || p.images.length === 0) activeNoImage++;
      if (!p.description || !p.description.trim()) activeNoDescription++;
      if (p.stock <= 0) activeZeroStock++;
      else if (p.stock <= 5) lowStock++;
      if (!p.seoTitle || !p.seoDescription) missingSeo++;
      const brand = p.brand ?? ((p.attributes ?? {}) as Record<string, unknown>).brand;
      if (!brand) noBrand++;
    }
    let duplicateSkus = 0;
    for (const c of skuCount.values()) if (c > 1) duplicateSkus++;
    return {
      total: products.length, active, inactive,
      activeNoImage, activeNoDescription, activeZeroStock,
      lowStock, missingSeo, noBrand, duplicateSkus,
    };
  },
});

export const getFeatured = query({
  args: {},
  handler: async (ctx) => {
    const inactiveCats = await ctx.db
      .query('categories')
      .withIndex('by_active', (q) => q.eq('isActive', false))
      .take(200);
    const inactiveCatIds = new Set(inactiveCats.map((c) => c._id));

    const isAvailable = (p: { isActive: boolean; stock: number; categoryId: (typeof inactiveCats)[number]['_id'] }) =>
      p.isActive && p.stock > 0 && !inactiveCatIds.has(p.categoryId);

    const featured = (await ctx.db
      .query('products')
      .withIndex('by_featured', (q) => q.eq('isFeatured', true))
      .take(12)).filter(isAvailable);

    if (featured.length >= 12) return featured.slice(0, 12);

    const need = 12 - featured.length;
    const recent = await ctx.db
      .query('products')
      .withIndex('by_active', (q) => q.eq('isActive', true))
      .order('desc')
      .take(need + 4);
    const seen = new Set(featured.map((p) => p._id));
    for (const p of recent) {
      if (featured.length >= 12) break;
      if (!seen.has(p._id) && isAvailable(p)) featured.push(p);
    }
    return featured.map(normalizeProductImages);
  },
});

export const getBestsellers = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 12;
    // Tally sold quantities from recent non-cancelled orders (bounded scan).
    const orders = await ctx.db.query('orders').order('desc').take(5000);
    const qty = new Map<string, number>();
    for (const o of orders) {
      if (o.status === 'cancelled') continue;
      for (const it of o.items) {
        const id = it.productId as unknown as string;
        qty.set(id, (qty.get(id) ?? 0) + (it.quantity ?? 0));
      }
    }
    if (qty.size === 0) return [];

    const inactiveCats = await ctx.db
      .query('categories')
      .withIndex('by_active', (q) => q.eq('isActive', false))
      .take(200);
    const inactiveCatIds = new Set(inactiveCats.map((c) => c._id));

    const sortedIds = [...qty.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id as Id<'products'>);

    const result: Doc<'products'>[] = [];
    for (const id of sortedIds) {
      const p = await ctx.db.get(id);
      if (p && p.isActive && p.stock > 0 && !inactiveCatIds.has(p.categoryId)) {
        result.push(p);
        if (result.length >= limit) break;
      }
    }
    return result.map(normalizeProductImages);
  },
});

export const getRetailDiscounted = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db
      .query('products')
      .withIndex('by_active', (q) => q.eq('isActive', true))
      .order('desc')
      .take(500);
    return products
      .filter((p) => p.stock > 0 && p.retailDiscount && p.retailDiscount > 0)
      .map(normalizeProductImages);
  },
});

export const getWholesaleDiscounted = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db
      .query('products')
      .withIndex('by_active', (q) => q.eq('isActive', true))
      .order('desc')
      .take(500);
    return products
      .filter((p) => p.stock > 0 && p.wholesaleDiscount && p.wholesaleDiscount > 0)
      .map(normalizeProductImages);
  },
});

export const create = mutation({
  args: {
    sessionToken: v.string(),
    name: v.string(), slug: v.string(), description: v.string(), price: v.optional(v.number()),
    costPrice: v.optional(v.number()),
    wholesalePrice: v.optional(v.number()), compareAtPrice: v.optional(v.number()),
    retailDiscount: v.optional(v.number()), wholesaleDiscount: v.optional(v.number()),
    categoryId: v.id('categories'),
    images: v.array(v.string()), brand: v.optional(v.string()),
    qtyStep: v.optional(v.number()),
    sku: v.optional(v.string()),
    oemNumbers: v.optional(v.array(v.object({
      manufacturer: v.string(),
      code: v.string(),
    }))),
    atgCode: v.optional(v.string()), variantGroup: v.optional(v.string()), stock: v.number(),
    isActive: v.boolean(), isFeatured: v.optional(v.boolean()),
    showInPromotions: v.optional(v.boolean()),
    attributes: v.optional(v.any()),
    seoTitle: v.optional(v.string()), seoDescription: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    const { sessionToken, ...data } = args;
    void sessionToken;
    const finalPrice = data.price ?? 0;
    data.price = finalPrice;
    const now = Date.now();
    if (data.sku) {
      data.sku = data.sku.trim();
      const existingBySku = await ctx.db.query('products').withIndex('by_sku', (q) => q.eq('sku', data.sku!)).unique();
      if (existingBySku) {
        throw new Error(`Արտիկուլ "${data.sku}" արդեն գոյություն ունի`);
      }
    }
    if (data.wholesalePrice === undefined) data.wholesalePrice = finalPrice;
    if (data.showInPromotions === undefined && data.compareAtPrice && data.compareAtPrice > data.price) {
      data.showInPromotions = true;
    }
    if (data.brand) {
      const attrs = (data.attributes ?? {}) as Record<string, unknown>;
      if (attrs.brand !== data.brand) {
        data.attributes = { ...attrs, brand: data.brand };
      }
    }
    // Sync brand from filterDef brand attribute (stored by filterId)
    if (!data.brand) {
      const attrs = (data.attributes ?? {}) as Record<string, unknown>;
      const brandDef = data.categoryId
        ? await ctx.db.query('filterDefinitions').withIndex('by_category', (q) => q.eq('categoryId', data.categoryId!)).filter((q) => q.eq(q.field('slug'), 'brand')).first()
        : undefined;
      if (brandDef) {
        const val = attrs[brandDef._id as string];
        const brandVal = Array.isArray(val) ? val[0] : (typeof val === 'string' ? val : undefined);
        if (brandVal) { data.brand = brandVal; (data.attributes as Record<string, unknown>).brand = brandVal; }
      }
    }
    // Auto-generate SKU if not provided
    if (!data.sku) {
      const cat = await ctx.db.get(data.categoryId);
      const prefix = cat ? cat.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() : 'PRD';
      let generatedSku = '';
      for (let i = 0; i < 10; i++) {
        const ts = now.toString(36).slice(-4).toUpperCase();
        const rnd = Math.random().toString(36).substring(2, 4).toUpperCase();
        const candidate = `${prefix}-${ts}${rnd}`;
        const exists = await ctx.db.query('products').withIndex('by_sku', (q) => q.eq('sku', candidate)).unique();
        if (!exists) {
          generatedSku = candidate;
          break;
        }
      }
      if (!generatedSku) throw new Error('Չհաջողվեց ստեղծել եզակի արտիկուլ');
      data.sku = generatedSku;
    }
    const createPayload: ProductInsert = {
      ...data,
      price: finalPrice,
      wholesalePrice: data.wholesalePrice ?? finalPrice,
      createdAt: now,
      updatedAt: now,
    };
    const newId = await ctx.db.insert('products', createPayload);
    await syncOemIndex(ctx, newId, data.oemNumbers);
    return newId;
  },
});

export const update = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id('products'), name: v.optional(v.string()), slug: v.optional(v.string()),
    description: v.optional(v.string()), price: v.optional(v.number()),
    costPrice: v.optional(v.number()),
    wholesalePrice: v.optional(v.number()), compareAtPrice: v.optional(v.number()),
    retailDiscount: v.optional(v.number()), wholesaleDiscount: v.optional(v.number()),
    categoryId: v.optional(v.id('categories')),
    images: v.optional(v.array(v.string())), brand: v.optional(v.string()),
    clearBrand: v.optional(v.boolean()),
    qtyStep: v.optional(v.number()),
    sku: v.optional(v.string()),
    oemNumbers: v.optional(v.array(v.object({
      manufacturer: v.string(),
      code: v.string(),
    }))),
    atgCode: v.optional(v.string()),
    variantGroup: v.optional(v.string()),
    stock: v.optional(v.number()), isActive: v.optional(v.boolean()),
    isFeatured: v.optional(v.boolean()),
    showInPromotions: v.optional(v.boolean()),
    attributes: v.optional(v.any()),
    seoTitle: v.optional(v.string()), seoDescription: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    const { id, sessionToken, stock, price, wholesalePrice, compareAtPrice, retailDiscount, wholesaleDiscount, showInPromotions, clearBrand, ...rest } = args;
    void sessionToken;
    if (clearBrand) { rest.brand = undefined; }
    const hasAttributesUpdate = args.attributes !== undefined;
    if (hasAttributesUpdate) {
      const rAttrs = (args.attributes ?? {}) as Record<string, unknown>;
      if (rest.brand && rAttrs.brand !== rest.brand) rAttrs.brand = rest.brand;
      if (!rest.brand && rAttrs.brand && typeof rAttrs.brand === 'string') rest.brand = rAttrs.brand as string;
      // Sync brand from filterDef brand attribute only if it has a value for this product's category
      const catId = args.categoryId ?? (await ctx.db.get(id))?.categoryId;
      const brandDef = catId
        ? await ctx.db.query('filterDefinitions').withIndex('by_category', (q) => q.eq('categoryId', catId)).filter((q) => q.eq(q.field('slug'), 'brand')).first()
        : undefined;
      if (brandDef) {
        const val = rAttrs[brandDef._id as string];
        const brandVal = Array.isArray(val) ? val[0] : (typeof val === 'string' ? val : undefined);
        if (brandVal) { rest.brand = brandVal; rAttrs.brand = brandVal; }
      }
      rest.attributes = Object.keys(rAttrs).length > 0 ? rAttrs : undefined;
    }
    const old = await ctx.db.get(id);
    if (rest.sku !== undefined) {
      const nextSku = rest.sku.trim();
      if (!nextSku) throw new Error('Արտիկուլը դատարկ չի կարող լինել');
      const existingBySku = await ctx.db.query('products').withIndex('by_sku', (q) => q.eq('sku', nextSku)).unique();
      if (existingBySku && existingBySku._id !== id) {
        throw new Error(`Արտիկուլ "${nextSku}" արդեն գոյություն ունի`);
      }
      rest.sku = nextSku;
    }
    if (clearBrand) { rest.brand = undefined; }
    if (stock !== undefined && old && old.stock <= 0 && stock > 0) {
      await ctx.scheduler.runAfter(0, internal.backInStock.notifySubscribers, { productId: id, productName: old.name });
    }
    if (price !== undefined && old && price < old.price) {
      await ctx.scheduler.runAfter(0, internal.priceAlerts.checkAndNotify, { productId: id, newPrice: price });
    }
    const patch: Record<string, unknown> = { ...rest };
    if (compareAtPrice !== undefined) {
      const effectivePrice = price ?? old?.price ?? 0;
      if (compareAtPrice > 0) {
        patch.compareAtPrice = compareAtPrice;
        if (showInPromotions === undefined) {
          patch.showInPromotions = compareAtPrice > effectivePrice;
        }
      } else {
        patch.compareAtPrice = undefined;
        if (showInPromotions === undefined) patch.showInPromotions = false;
      }
    }
    if (showInPromotions !== undefined) {
      patch.showInPromotions = showInPromotions;
    }
    if (stock !== undefined) patch.stock = stock;
    if (price !== undefined) patch.price = price;
    if (wholesalePrice !== undefined) patch.wholesalePrice = wholesalePrice;
    if (retailDiscount !== undefined) patch.retailDiscount = retailDiscount > 0 ? retailDiscount : undefined;
    if (wholesaleDiscount !== undefined) patch.wholesaleDiscount = wholesaleDiscount > 0 ? wholesaleDiscount : undefined;
    patch.updatedAt = Date.now();
    await ctx.db.patch(id, patch);

    // Delete from R2 any images that were removed during this edit.
    if (args.images !== undefined && old?.images?.length) {
      const next = new Set(args.images);
      const removedKeys = old.images
        .filter((url) => !next.has(url))
        .map(r2KeyFromUrl)
        .filter((k): k is string => !!k);
      if (removedKeys.length) {
        await ctx.scheduler.runAfter(0, internal.r2Actions.deleteObjects, { keys: removedKeys });
      }
    }

    // Keep the OEM search index in sync only when the field was provided.
    if (args.oemNumbers !== undefined) {
      await syncOemIndex(ctx, id, args.oemNumbers);
    }

    if (stock !== undefined && old && old.stock !== stock) {
      const caller = await getAdminCaller(ctx, args.sessionToken);
      await ctx.db.insert('stockMovements', {
        productId: id,
        type: 'manual',
        qty: stock - old.stock,
        stockBefore: old.stock,
        stockAfter: stock,
        adminName: caller?.name ?? caller?.email ?? undefined,
        createdAt: Date.now(),
      });
    }
  },
});

/**
 * Extract the R2 object key (e.g. "products/<uuid>") from a stored image URL so
 * it can be deleted. Returns null for anything that isn't an R2 object we own
 * (external hosts, unknown prefixes) so we never delete unintended objects.
 */
function r2KeyFromUrl(imageUrl: string): string | null {
  let s = (imageUrl ?? '').trim();
  if (!s) return null;

  // Proxied forms carry the key/url in a query param.
  const keyParam = s.match(/[?&]key=([^&]+)/);
  if (keyParam) {
    s = decodeURIComponent(keyParam[1]);
  } else {
    const urlParam = s.match(/[?&]url=([^&]+)/);
    if (urlParam) s = decodeURIComponent(urlParam[1]);
  }

  let key: string;
  try {
    const u = new URL(s);
    const host = u.hostname.toLowerCase();
    // Only touch objects on our R2 buckets — never external images.
    if (!host.endsWith('.r2.dev') && !host.endsWith('.r2.cloudflarestorage.com')) {
      return null;
    }
    key = decodeURIComponent(u.pathname).replace(/^\/+/, '');
  } catch {
    // Not an absolute URL — treat as a bare key (e.g. "products/<uuid>").
    key = s.replace(/^\/+/, '');
  }

  // Strip a leading bucket segment for path-style URLs.
  const bucket = process.env.R2_BUCKET_NAME;
  if (bucket && (key === bucket || key.startsWith(`${bucket}/`))) {
    key = key.slice(bucket.length).replace(/^\/+/, '');
  }

  // Restrict deletions to the prefixes this app manages.
  if (!key.startsWith('products/') && !key.startsWith('reviews/')) return null;
  return key;
}

export const remove = mutation({
  args: { sessionToken: v.string(), id: v.id('products') },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    const product = await ctx.db.get(args.id);
    if (product?.images?.length) {
      const keys = product.images.map(r2KeyFromUrl).filter((k): k is string => !!k);
      if (keys.length) await ctx.scheduler.runAfter(0, internal.r2Actions.deleteObjects, { keys });
    }
    await syncOemIndex(ctx, args.id, undefined); // remove OEM index rows
    await ctx.db.delete(args.id);
  },
});

/**
 * Apply one action to many products at once from the admin list.
 */
export const bulkAction = mutation({
  args: {
    sessionToken: v.string(),
    ids: v.array(v.id('products')),
    op: v.union(
      v.literal('activate'),
      v.literal('deactivate'),
      v.literal('delete'),
      v.literal('setDiscount'),
      v.literal('setCategory'),
    ),
    discount: v.optional(v.number()),
    categoryId: v.optional(v.id('categories')),
  },
  handler: async (ctx, args): Promise<{ affected: number }> => {
    await getAdminCaller(ctx, args.sessionToken);
    const now = Date.now();
    let affected = 0;
    for (const id of args.ids) {
      const p = await ctx.db.get(id);
      if (!p) continue;
      if (args.op === 'delete') {
        if (p.images?.length) {
          const keys = p.images.map(r2KeyFromUrl).filter((k): k is string => !!k);
          if (keys.length) await ctx.scheduler.runAfter(0, internal.r2Actions.deleteObjects, { keys });
        }
        await syncOemIndex(ctx, id, undefined);
        await ctx.db.delete(id);
      } else if (args.op === 'activate') {
        await ctx.db.patch(id, { isActive: true, updatedAt: now });
      } else if (args.op === 'deactivate') {
        await ctx.db.patch(id, { isActive: false, updatedAt: now });
      } else if (args.op === 'setDiscount') {
        const d = args.discount ?? 0;
        await ctx.db.patch(id, { retailDiscount: d > 0 ? d : undefined, updatedAt: now });
      } else if (args.op === 'setCategory' && args.categoryId) {
        await ctx.db.patch(id, { categoryId: args.categoryId, updatedAt: now });
      } else {
        continue;
      }
      affected++;
    }
    return { affected };
  },
});

export const bulkCreate = mutation({
  args: {
    sessionToken: v.string(),
    products: v.array(
      v.object({
        name: v.optional(v.string()),
        slug: v.optional(v.string()),
        description: v.optional(v.string()),
        price: v.optional(v.number()),
        costPrice: v.optional(v.number()),
        retailDiscount: v.optional(v.number()),
        wholesalePrice: v.optional(v.number()),
        compareAtPrice: v.optional(v.number()),
        category: v.optional(v.string()),
        categoryId: v.id('categories'),
        sku: v.optional(v.string()),
        atgCode: v.optional(v.string()),
        variantGroup: v.optional(v.string()),

        oemNumbers: v.optional(v.array(v.object({
          manufacturer: v.string(),
          code: v.string(),
        }))),
        stock: v.optional(v.number()),
        isActive: v.optional(v.boolean()),
        isFeatured: v.optional(v.boolean()),
        showInPromotions: v.optional(v.boolean()),
        seoTitle: v.optional(v.string()),
        seoDescription: v.optional(v.string()),
        images: v.optional(v.array(v.string())),
        attributes: v.optional(v.any()),
        vehicleCompat: v.optional(v.any()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    const now = Date.now();
    let created = 0;
    let updated = 0;

    const asciiFieldName = /^[\x20-\x7E]+$/;
    const filterIndexCache = new Map<string, {
      byId: Set<string>;
      bySlug: Map<string, string>;
      byName: Map<string, string>;
    }>();

    const getFilterIndexForCategory = async (categoryId: Id<'categories'>) => {
      const cached = filterIndexCache.get(categoryId);
      if (cached) return cached;

      const defs = await ctx.db
        .query('filterDefinitions')
        .withIndex('by_category', (q) => q.eq('categoryId', categoryId))
        .take(100);

      const index = {
        byId: new Set(defs.map((d) => d._id)),
        bySlug: new Map(defs.map((d) => [d.slug.toLowerCase().trim(), d._id])),
        byName: new Map(defs.map((d) => [d.name.toLowerCase().trim(), d._id])),
      };
      filterIndexCache.set(categoryId, index);
      return index;
    };

    const sanitizeAttributes = async (categoryId: Id<'categories'>, attributes: unknown): Promise<Record<string, unknown> | undefined> => {
      if (!attributes || typeof attributes !== 'object') return undefined;

      const index = await getFilterIndexForCategory(categoryId);
      const result: Record<string, unknown> = {};

      for (const [rawKey, value] of Object.entries(attributes as Record<string, unknown>)) {
        const key = rawKey.trim();
        if (!key) continue;

        let targetKey: string | undefined;

        if (index.byId.has(key)) {
          targetKey = key;
        } else {
          const norm = key.toLowerCase().trim();
          targetKey = index.bySlug.get(norm) ?? index.byName.get(norm);
          if (!targetKey && asciiFieldName.test(key)) {
            targetKey = key;
          }
        }

        if (!targetKey) continue;
        result[targetKey] = value;
      }

      return Object.keys(result).length > 0 ? result : undefined;
    };

    // Reject duplicate SKUs inside the same import file.
    const skuRows = new Map<string, number>();
    for (let i = 0; i < args.products.length; i++) {
      const sku = args.products[i].sku?.trim();
      if (!sku) continue;
      const firstRow = skuRows.get(sku);
      if (firstRow !== undefined) {
        throw new Error(`Արտիկուլ "${sku}" կրկնվում է ֆայլում (տողեր ${firstRow + 1} և ${i + 1})`);
      }
      skuRows.set(sku, i);
    }
    
    for (const p of args.products) {
      // Поиск существующего товара по sku или slug
      let existing = null;
      const nextSku = p.sku?.trim();
      
      if (nextSku) {
        existing = await ctx.db.query('products').withIndex('by_sku', (q) => q.eq('sku', nextSku)).unique();
      } else if (p.slug) {
        const slug = p.slug;
        existing = await ctx.db.query('products').withIndex('by_slug', (q) => q.eq('slug', slug)).unique();
      }
      
      if (existing) {
        if (nextSku) {
          const skuOwner = await ctx.db.query('products').withIndex('by_sku', (q) => q.eq('sku', nextSku)).unique();
          if (skuOwner && skuOwner._id !== existing._id) {
            throw new Error(`Արտիկուլ "${nextSku}" արդեն գոյություն ունի`);
          }
        }
        // Обновляем ТОЛЬКО переданные поля
        const updatePayload: Record<string, unknown> = { updatedAt: now };
        
        // Передаём только заполненные поля
        if (p.name !== undefined) updatePayload.name = p.name;
        if (p.slug !== undefined) updatePayload.slug = p.slug;
        if (p.description !== undefined) updatePayload.description = p.description;
        if (p.price !== undefined) updatePayload.price = p.price;
        if (p.costPrice !== undefined) updatePayload.costPrice = p.costPrice;
        if (p.retailDiscount !== undefined) updatePayload.retailDiscount = p.retailDiscount;
        if (p.wholesalePrice !== undefined) updatePayload.wholesalePrice = p.wholesalePrice;
        if (p.compareAtPrice !== undefined) updatePayload.compareAtPrice = p.compareAtPrice;
        if (p.categoryId !== undefined) updatePayload.categoryId = p.categoryId;
        if (nextSku !== undefined) updatePayload.sku = nextSku;
        if (p.atgCode !== undefined) updatePayload.atgCode = p.atgCode;
        if (p.oemNumbers !== undefined) updatePayload.oemNumbers = p.oemNumbers;
        if (p.stock !== undefined) updatePayload.stock = p.stock;
        if (p.isActive !== undefined) updatePayload.isActive = p.isActive;
        if (p.isFeatured !== undefined) updatePayload.isFeatured = p.isFeatured;
        if (p.showInPromotions !== undefined) updatePayload.showInPromotions = p.showInPromotions;
        if (p.seoTitle !== undefined) updatePayload.seoTitle = p.seoTitle;
        if (p.seoDescription !== undefined) updatePayload.seoDescription = p.seoDescription;
        if (p.images !== undefined) updatePayload.images = p.images;
        if (p.attributes !== undefined) {
          const safeAttrs = await sanitizeAttributes(p.categoryId, p.attributes);
          updatePayload.attributes = safeAttrs;
        }
        if (p.vehicleCompat !== undefined) updatePayload.vehicleCompat = p.vehicleCompat;
        
        await ctx.db.patch(existing._id, updatePayload);
        if (p.oemNumbers !== undefined) await syncOemIndex(ctx, existing._id, p.oemNumbers);
        updated++;
      } else {
        if (nextSku) {
          const existingBySku = await ctx.db.query('products').withIndex('by_sku', (q) => q.eq('sku', nextSku)).unique();
          if (existingBySku) {
            throw new Error(`Արտիկուլ "${nextSku}" արդեն գոյություն ունի`);
          }
        }
        // Создаём новый товар с дефолтами
        const createPayload: ProductInsert = {
          name: p.name || nextSku || 'Unnamed Product',
          slug: p.slug || (nextSku ? nextSku.toLowerCase().replace(/[^a-z0-9-]/g, '-') : `product-${Date.now()}`),
          description: p.description || '',
          price: p.price ?? 0,
          categoryId: p.categoryId,
          images: p.images ?? [],
          isActive: p.isActive ?? true,
          stock: p.stock ?? 0,
          createdAt: now,
          updatedAt: now,
        };
        
        // Опциональные поля
        if (p.costPrice !== undefined) createPayload.costPrice = p.costPrice;
        if (p.wholesalePrice !== undefined) createPayload.wholesalePrice = p.wholesalePrice;
        if (p.retailDiscount !== undefined) createPayload.retailDiscount = p.retailDiscount;
        if (p.compareAtPrice !== undefined) createPayload.compareAtPrice = p.compareAtPrice;
        if (nextSku !== undefined) createPayload.sku = nextSku;
        if (p.atgCode !== undefined) createPayload.atgCode = p.atgCode;
        if (p.oemNumbers !== undefined) createPayload.oemNumbers = p.oemNumbers;
        if (p.isFeatured !== undefined) createPayload.isFeatured = p.isFeatured;
        if (p.showInPromotions !== undefined) createPayload.showInPromotions = p.showInPromotions;
        if (p.seoTitle !== undefined) createPayload.seoTitle = p.seoTitle;
        if (p.seoDescription !== undefined) createPayload.seoDescription = p.seoDescription;
        if (p.attributes !== undefined) {
          const safeAttrs = await sanitizeAttributes(p.categoryId, p.attributes);
          if (safeAttrs) createPayload.attributes = safeAttrs;
        }
        
        const insertedId = await ctx.db.insert('products', createPayload);
        if (p.oemNumbers !== undefined) await syncOemIndex(ctx, insertedId, p.oemNumbers);
        created++;
      }
    }
    
    return `Ստեղծվել է ${created}, թարմացվել է ${updated} ապրանք`;
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('products').order('asc').take(50000);
  },
});

export const listCostMap = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query('products').order('asc').take(50000);
    return products.map((p) => ({ _id: p._id, costPrice: p.costPrice }));
  },
});

export const listNameMap = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query('products').order('asc').take(50000);
    return products.map((p) => ({ _id: p._id, name: p.name }));
  },
});

export const listStockSummary = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query('products').withIndex('by_active', (q) => q.eq('isActive', true)).take(50000);
    const low = products.filter((p) => p.stock > 0 && p.stock <= 5).map((p) => ({ _id: p._id, name: p.name, stock: p.stock }));
    const out = products.filter((p) => p.stock === 0).map((p) => ({ _id: p._id, name: p.name }));
    return { total: products.length, low, out };
  },
});

export const listAnalyticsMap = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query('products').order('asc').take(50000);
    return products.map((p) => ({
      _id: p._id,
      name: p.name,
      categoryId: p.categoryId,
      brand: p.brand ?? ((p.attributes as Record<string, unknown> | undefined)?.brand as string | undefined),
      costPrice: p.costPrice,
    }));
  },
});

export const migrateAttributeKeys = mutation({
  args: {
    productId: v.id('products'),
    newAttributes: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.productId, { attributes: args.newAttributes, updatedAt: Date.now() });
  },
});

export const listStockMovements = query({
  args: {
    sessionToken: v.string(),
    productId: v.optional(v.id('products')),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try { await getAdminCaller(ctx, args.sessionToken); } catch { return []; }
    const take = args.limit ?? 200;
    if (args.productId) {
      return await ctx.db
        .query('stockMovements')
        .withIndex('by_product', (q) => q.eq('productId', args.productId!))
        .order('desc')
        .take(take);
    }
    return await ctx.db.query('stockMovements').withIndex('by_created').order('desc').take(take);
  },
});

export const getVariantGroup = query({
  args: { variantGroup: v.string() },
  handler: async (ctx, args) => {
    if (!args.variantGroup) return [];
    const products = await ctx.db
      .query('products')
      .withIndex('by_variant_group', (q) => q.eq('variantGroup', args.variantGroup))
      .take(50);
    return products
      .filter((p) => p.isActive)
      .sort((a, b) => {
        const ao = a.variantOrder ?? Number.MAX_SAFE_INTEGER;
        const bo = b.variantOrder ?? Number.MAX_SAFE_INTEGER;
        if (ao !== bo) return ao - bo;
        return a.name.localeCompare(b.name);
      });
  },
});

export const reorderVariantGroup = mutation({
  args: {
    sessionToken: v.string(),
    variantGroup: v.string(),
    items: v.array(v.object({ id: v.id('products'), order: v.number() })),
  },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    if (!args.variantGroup || args.items.length === 0) return;

    const ids = new Set(args.items.map((i) => i.id));
    const products = await Promise.all(args.items.map((i) => ctx.db.get(i.id)));
    for (const p of products) {
      if (!p) throw new Error('Variant not found');
      if (p.variantGroup !== args.variantGroup) {
        throw new Error('All items must belong to the same variant group');
      }
    }

    const now = Date.now();
    await Promise.all(
      args.items.map((item) =>
        ctx.db.patch(item.id, {
          variantOrder: item.order,
          updatedAt: now,
        }),
      ),
    );

    // Keep non-mentioned items after mentioned ones preserving their current order.
    const rest = await ctx.db
      .query('products')
      .withIndex('by_variant_group', (q) => q.eq('variantGroup', args.variantGroup))
      .take(100);
    const trailing = rest
      .filter((p) => !ids.has(p._id))
      .sort((a, b) => (a.variantOrder ?? Number.MAX_SAFE_INTEGER) - (b.variantOrder ?? Number.MAX_SAFE_INTEGER));

    await Promise.all(
      trailing.map((p, idx) =>
        ctx.db.patch(p._id, {
          variantOrder: args.items.length + idx,
          updatedAt: now,
        }),
      ),
    );
  },
});

/**
 * Personalized recommendations derived from the shopper's recently-viewed
 * products: returns in-stock products from the same categories, excluding the
 * viewed ones. Falls back to featured/active products when no history.
 */
export const recommendedFromViewed = query({
  args: {
    viewedIds: v.optional(v.array(v.id('products'))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 8;
    const viewed = (args.viewedIds ?? []).slice(0, 12);
    const viewedSet = new Set(viewed.map(String));

    const cats = new Set<string>();
    for (const id of viewed) {
      const p = await ctx.db.get(id);
      if (p && p.isActive) cats.add(p.categoryId);
    }

    const pool: Doc<'products'>[] = [];
    if (cats.size > 0) {
      for (const catId of cats) {
        const inCat = await ctx.db
          .query('products')
          .withIndex('by_category', (q) => q.eq('categoryId', catId as Id<'categories'>))
          .take(24);
        pool.push(...inCat);
      }
    } else {
      const active = await ctx.db
        .query('products')
        .withIndex('by_active', (q) => q.eq('isActive', true))
        .take(40);
      pool.push(...active);
    }

    const seen = new Set<string>();
    const result: Doc<'products'>[] = [];
    for (const p of pool) {
      if (!p.isActive || p.stock <= 0) continue;
      if (viewedSet.has(p._id) || seen.has(p._id)) continue;
      seen.add(p._id);
      result.push(p);
      if (result.length >= limit) break;
    }
    return result.map((p) => normalizeProductImages(p));
  },
});
