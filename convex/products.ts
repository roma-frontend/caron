import { v } from 'convex/values';
import { query, mutation, internalMutation, internalQuery } from './_generated/server';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { paginationOptsValidator } from 'convex/server';
import { getAdminCaller, requireCapability, logAudit } from './lib/auth';
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

// Shared "card" projection — ONLY the fields product cards render. Keeps
// `attributes` (carBrand badge + card chips) but drops the heavy unused fields:
// description ×3, seoTitle/seoDescription, oemNumbers, costPrice and all images
// past the first. Used by every card-listing query so list payloads stay small
// (the full doc is still used server-side for filtering/search before projecting).
export function toProductCard(p: Doc<'products'>) {
  return {
    _id: p._id,
    _creationTime: p._creationTime,
    slug: p.slug,
    name: p.name,
    nameRu: p.nameRu,
    nameEn: p.nameEn,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    wholesalePrice: p.wholesalePrice,
    retailDiscount: p.retailDiscount,
    wholesaleDiscount: p.wholesaleDiscount,
    categoryId: p.categoryId,
    images: (normalizeImageUrls(p.images?.slice(0, 1) ?? []) as string[]) ?? [],
    sku: p.sku,
    stock: p.stock,
    brand: p.brand,
    qtyStep: p.qtyStep,
    atgCode: p.atgCode,
    isActive: p.isActive,
    isFeatured: p.isFeatured,
    rating: p.rating,
    reviewCount: p.reviewCount,
    attributes: p.attributes,
  };
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

/**
 * Collect every attribute key under which a product's brand may be stored.
 * Brands can live as:
 *   - the top-level `brand` field,
 *   - `attributes.brand` (literal slug),
 *   - `attributes[<filterDefinitionId>]` where the definition's slug is 'brand'.
 * Bulk-imported products often only have the filter-definition-id form, so we
 * must look there too or they silently fail brand filtering.
 */
async function getBrandAttributeKeys(ctx: QueryCtx): Promise<Set<string>> {
  const keys = new Set<string>(['brand']);
  try {
    const brandDefs = await ctx.db
      .query('filterDefinitions')
      .filter((q) => q.eq(q.field('slug'), 'brand'))
      .take(500);
    for (const d of brandDefs) keys.add(d._id as string);
  } catch {
    /* ignore — fall back to literal 'brand' key */
  }
  return keys;
}

/** Does the product's brand (in any storage form) match the requested brand? */
function productMatchesBrand(
  product: { brand?: string; attributes?: unknown },
  brandKeys: Set<string>,
  targetLower: string,
): boolean {
  const matches = (val: unknown): boolean => {
    if (typeof val === 'string') return val.toLowerCase() === targetLower;
    if (Array.isArray(val)) return val.some((v) => typeof v === 'string' && v.toLowerCase() === targetLower);
    return false;
  };
  if (matches(product.brand)) return true;
  const attrs = (product.attributes ?? {}) as Record<string, unknown>;
  for (const key of brandKeys) {
    if (matches(attrs[key])) return true;
  }
  return false;
}

/** Collect all distinct brand strings from a product (any storage form). */
function collectProductBrands(product: { brand?: string; attributes?: unknown }, brandKeys: Set<string>, out: Set<string>): void {
  const add = (val: unknown) => {
    if (typeof val === 'string' && val.trim()) out.add(val.trim());
    else if (Array.isArray(val)) for (const v of val) if (typeof v === 'string' && v.trim()) out.add(v.trim());
  };
  if (product.brand && product.brand.trim()) { out.add(product.brand.trim()); return; }
  const attrs = (product.attributes ?? {}) as Record<string, unknown>;
  for (const key of brandKeys) add(attrs[key]);
}

/**
 * Recompute the denormalized catalogStats singleton from the active products.
 * Called from product write paths (and a daily cron) — never from the customer
 * read path. Scans active products once and upserts a single small document, so
 * hot public queries (getBrands, categories.listWithCounts) read O(1) instead of
 * scanning thousands of rows on every page load.
 */
async function recomputeCatalogStats(ctx: MutationCtx): Promise<void> {
  const brandKeys = await getBrandAttributeKeys(ctx);
  const products = await ctx.db
    .query('products')
    .withIndex('by_active', (q) => q.eq('isActive', true))
    .take(100000);

  const categoryCounts: Record<string, number> = {};
  const brands = new Set<string>();
  const brandCounts: Record<string, number> = {};
  for (const p of products) {
    const cat = p.categoryId as unknown as string;
    categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1;
    const productBrands = new Set<string>();
    collectProductBrands(p, brandKeys, productBrands);
    for (const b of productBrands) {
      brands.add(b);
      const key = b.toLowerCase();
      brandCounts[key] = (brandCounts[key] ?? 0) + 1;
    }
  }

  const data = {
    key: 'singleton',
    categoryCounts,
    brandCounts,
    brands: [...brands].sort(),
    updatedAt: Date.now(),
  };
  const existing = await ctx.db
    .query('catalogStats')
    .withIndex('by_key', (q) => q.eq('key', 'singleton'))
    .unique();
  if (existing) await ctx.db.patch(existing._id, data);
  else await ctx.db.insert('catalogStats', data);
}

/** Daily self-healing recompute (cron-invoked). Idempotent. */
export const recomputeCatalogStatsCron = internalMutation({
  args: {},
  handler: async (ctx) => {
    await recomputeCatalogStats(ctx);
  },
});

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
    if (args.brand) {
      const brandKeys = await getBrandAttributeKeys(ctx);
      const targetLower = args.brand.toLowerCase();
      filtered = filtered.filter((p) => productMatchesBrand(p, brandKeys, targetLower));
    }

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

    return { ...result, page: filtered.map(toProductCard) };
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

// Trimmed "card" projection for id-list lookups (e.g. recently-viewed):
// point-reads the given ids and returns ONLY fields product cards render — not
// descriptions/specs/attributes/oemNumbers/extra images. Replaces fetching the
// whole catalog client-side just to show a few cards.
export const listByIds = query({
  args: { ids: v.array(v.id('products')) },
  handler: async (ctx, args) => {
    const docs = await Promise.all(args.ids.slice(0, 50).map((id) => ctx.db.get(id)));
    return docs
      .filter((p): p is NonNullable<typeof p> => !!p && p.isActive)
      .map((p) => ({
        _id: p._id,
        slug: p.slug,
        name: p.name,
        nameRu: p.nameRu,
        nameEn: p.nameEn,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        wholesalePrice: p.wholesalePrice,
        retailDiscount: p.retailDiscount,
        wholesaleDiscount: p.wholesaleDiscount,
        images: (normalizeImageUrls(p.images?.slice(0, 1) ?? []) as string[]) ?? [],
        stock: p.stock,
        brand: p.brand,
        atgCode: p.atgCode,
        sku: p.sku,
        qtyStep: p.qtyStep,
        rating: p.rating,
        reviewCount: p.reviewCount,
        isActive: p.isActive,
      }));
  },
});

// Trimmed catalog listing for display shelves (home rails, etc.): same access
// pattern as `list` but returns ONLY the fields cards render (keeps attributes
// for the carBrand badge; drops description×3 / seo×2 / oemNumbers / costPrice /
// extra images). Cuts the bulk of per-doc bytes for high-count shelves. Use the
// full `list` where description/oem/all-images are needed (admin, filtering).
export const listCards = query({
  args: {
    categoryId: v.optional(v.id('categories')),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
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
    const inactiveCats = await ctx.db.query('categories').withIndex('by_active', (q) => q.eq('isActive', false)).take(200);
    if (inactiveCats.length > 0) {
      const ids = new Set(inactiveCats.map((c) => c._id));
      products = products.filter((p) => !ids.has(p.categoryId));
    }
    return products.map(toProductCard);
  },
});

export const getBrands = query({
  args: {},
  handler: async (ctx) => {
    // Fast path: read the denormalized singleton (O(1)), so this hot homepage
    // query doesn't scan the products table on every visit.
    const stats = await ctx.db
      .query('catalogStats')
      .withIndex('by_key', (q) => q.eq('key', 'singleton'))
      .unique();
    if (stats && Array.isArray(stats.brands)) return stats.brands as string[];

    // Fallback (stats not yet computed): live scan. A product write or the daily
    // cron will populate the singleton and switch to the fast path.
    const products = await ctx.db.query('products').withIndex('by_active', (q) => q.eq('isActive', true)).take(5000);
    const brandKeys = await getBrandAttributeKeys(ctx);
    const brands = new Set<string>();
    for (const p of products) collectProductBrands(p, brandKeys, brands);
    return [...brands].sort();
  },
});

/**
 * Per-brand active-product counts, keyed by lowercased brand name (matching the
 * brand-filter semantics). Reads the denormalized singleton (O(1)); falls back
 * to a live scan only before the first stats recompute.
 */
export const getBrandCounts = query({
  args: {},
  handler: async (ctx) => {
    const stats = await ctx.db
      .query('catalogStats')
      .withIndex('by_key', (q) => q.eq('key', 'singleton'))
      .unique();
    if (stats && stats.brandCounts) return stats.brandCounts as Record<string, number>;

    const brandKeys = await getBrandAttributeKeys(ctx);
    const products = await ctx.db.query('products').withIndex('by_active', (q) => q.eq('isActive', true)).take(5000);
    const counts: Record<string, number> = {};
    for (const p of products) {
      const pb = new Set<string>();
      collectProductBrands(p, brandKeys, pb);
      for (const b of pb) {
        const key = b.toLowerCase();
        counts[key] = (counts[key] ?? 0) + 1;
      }
    }
    return counts;
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
      // Use `.first()` instead of `.unique()`: the `by_slug` index is not a
      // unique constraint, so duplicate slugs in the data would make
      // `.unique()` throw a server error. Taking the first match keeps the
      // page resilient to accidental duplicates.
      product = await ctx.db.query('products').withIndex('by_slug', (q) => q.eq('slug', candidate)).first();
      if (product) break;
    }
    if (!product) {
      for (const candidate of candidates) {
        product = await ctx.db.query('products').withIndex('by_sku', (q) => q.eq('sku', candidate)).first();
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

/**
 * Admin-only: find products that share the same `slug`. Returns one group per
 * duplicated slug with the conflicting products (id, name, sku, isActive,
 * creation time). Useful to inspect data before cleaning it up. Read-only.
 */
export const findDuplicateSlugs = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    await requireCapability(ctx, args.sessionToken, 'products');
    const all = await ctx.db.query('products').take(100000);
    const bySlug = new Map<string, Doc<'products'>[]>();
    for (const p of all) {
      const key = p.slug ?? '';
      const list = bySlug.get(key) ?? [];
      list.push(p);
      bySlug.set(key, list);
    }
    const groups = [];
    for (const [slug, items] of bySlug) {
      if (items.length > 1) {
        groups.push({
          slug,
          count: items.length,
          products: items
            .sort((a, b) => a._creationTime - b._creationTime)
            .map((p) => ({
              id: p._id,
              name: p.name,
              sku: p.sku,
              isActive: p.isActive,
              creationTime: p._creationTime,
            })),
        });
      }
    }
    groups.sort((a, b) => b.count - a.count);
    return { totalDuplicateSlugs: groups.length, groups };
  },
});

/**
 * Admin-only: resolve duplicate slugs so every product becomes uniquely
 * reachable. The oldest product in each group keeps the original slug; the
 * rest get a unique suffix derived from their SKU (falling back to a numeric
 * suffix). No products are deleted, so nothing is lost. Idempotent: re-running
 * after a clean catalog reports 0 changes.
 */
export const dedupeSlugs = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    await requireCapability(ctx, args.sessionToken, 'products');
    const all = await ctx.db.query('products').take(100000);

    const bySlug = new Map<string, Doc<'products'>[]>();
    for (const p of all) {
      const key = p.slug ?? '';
      const list = bySlug.get(key) ?? [];
      list.push(p);
      bySlug.set(key, list);
    }
    // Track every slug currently in use so generated slugs stay unique.
    const used = new Set(all.map((p) => p.slug ?? ''));

    const changes: { id: Id<'products'>; from: string; to: string }[] = [];
    for (const [slug, items] of bySlug) {
      if (items.length <= 1) continue;
      // Keep the oldest product on the original slug; rename the others.
      const sorted = items.sort((a, b) => a._creationTime - b._creationTime);
      for (let i = 1; i < sorted.length; i++) {
        const p = sorted[i];
        const base = p.sku
          ? `${slug}-${normalizeSlugValue(p.sku)}`
          : slug;
        let candidate = base || `${slug}-${i}`;
        let n = 1;
        while (used.has(candidate)) {
          n++;
          candidate = `${base || slug}-${n}`;
        }
        used.add(candidate);
        await ctx.db.patch(p._id, { slug: candidate });
        changes.push({ id: p._id, from: slug, to: candidate });
      }
    }
    return {
      renamed: changes.length,
      changes,
      message:
        changes.length === 0
          ? 'Կրկնվող slug-եր չկան'
          : `${changes.length} ապրանքի slug-ը թարմացվեց`,
    };
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
    await requireCapability(ctx, args.sessionToken, 'products');
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

    // Keep images of trashed products alive so they survive the orphan-cleanup
    // cron and a restore brings the pictures back intact.
    const trashed = await ctx.db.query('deletedProducts').take(50000);
    for (const d of trashed) if (d.images) urls.push(...d.images);

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
    const brandKeys = await getBrandAttributeKeys(ctx);
    const skuCount = new Map<string, number>();
    let active = 0, inactive = 0, activeNoImage = 0, activeNoDescription = 0;
    let activeZeroStock = 0, lowStock = 0, missingSeo = 0, noBrand = 0;
    const hasBrand = (p: { brand?: string; attributes?: unknown }): boolean => {
      if (typeof p.brand === 'string' && p.brand.trim()) return true;
      const attrs = (p.attributes ?? {}) as Record<string, unknown>;
      for (const key of brandKeys) {
        const v = attrs[key];
        if (typeof v === 'string' && v.trim()) return true;
        if (Array.isArray(v) && v.some((x) => typeof x === 'string' && x.trim())) return true;
      }
      return false;
    };
    for (const p of products) {
      if (p.sku) skuCount.set(p.sku, (skuCount.get(p.sku) ?? 0) + 1);
      if (!p.isActive) { inactive++; continue; }
      active++;
      if (!p.images || p.images.length === 0) activeNoImage++;
      if (!p.description || !p.description.trim()) activeNoDescription++;
      if (p.stock <= 0) activeZeroStock++;
      else if (p.stock <= 5) lowStock++;
      if (!p.seoTitle || !p.seoDescription) missingSeo++;
      if (!hasBrand(p)) noBrand++;
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

    if (featured.length >= 12) return featured.slice(0, 12).map(toProductCard);

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
    return featured.map(toProductCard);
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
    return result.map(toProductCard);
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
      .map(toProductCard);
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
      .map(toProductCard);
  },
});

export const create = mutation({
  args: {
    sessionToken: v.string(),
    name: v.string(), slug: v.string(), description: v.string(), price: v.optional(v.number()),
    nameRu: v.optional(v.string()), nameEn: v.optional(v.string()),
    descriptionRu: v.optional(v.string()), descriptionEn: v.optional(v.string()),
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
    await requireCapability(ctx, args.sessionToken, 'products');
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
    await recomputeCatalogStats(ctx);
    // Auto-fill RU/EN translations in the background (no-op if already set or AI unconfigured).
    await ctx.scheduler.runAfter(0, internal.translate.translateProduct, { id: newId });
    return newId;
  },
});

export const update = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id('products'), name: v.optional(v.string()), slug: v.optional(v.string()),
    description: v.optional(v.string()), price: v.optional(v.number()),
    nameRu: v.optional(v.string()), nameEn: v.optional(v.string()),
    descriptionRu: v.optional(v.string()), descriptionEn: v.optional(v.string()),
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
    await requireCapability(ctx, args.sessionToken, 'products');
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

    // Refresh denormalized catalog stats only when something that affects them
    // changed (active flag, category, or brand). Pure stock/price/SEO edits —
    // the frequent inventory operations — are skipped so they stay cheap.
    const activeChanged = args.isActive !== undefined && !!old && args.isActive !== old.isActive;
    const categoryChanged = args.categoryId !== undefined && !!old && args.categoryId !== old.categoryId;
    const brandTouched = args.brand !== undefined || clearBrand === true || args.attributes !== undefined;
    if (activeChanged || categoryChanged || brandTouched) {
      await recomputeCatalogStats(ctx);
    }

    if (stock !== undefined && old && old.stock !== stock) {
      const caller = await requireCapability(ctx, args.sessionToken, 'products');
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

    // Fill missing RU/EN translations in the background when source text changed.
    if (args.name !== undefined || args.description !== undefined) {
      await ctx.scheduler.runAfter(0, internal.translate.translateProduct, { id });
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
    const caller = await requireCapability(ctx, args.sessionToken, 'products');
    await requireCapability(ctx, args.sessionToken, 'action.delete');
    const product = await ctx.db.get(args.id);
    if (!product) return;
    await archiveProduct(ctx, product, caller);
    await syncOemIndex(ctx, args.id, undefined); // remove OEM index rows
    await ctx.db.delete(args.id);
    await recomputeCatalogStats(ctx);
    await logAudit(ctx, caller, 'product.delete', `Moved product "${product.name}" to trash`,
      { targetType: 'product', targetId: args.id });
  },
});

/**
 * Move a product into the `deletedProducts` archive (trash). Images are kept in
 * R2 (referenced via imageReferences) so a restore is lossless.
 */
async function archiveProduct(
  ctx: MutationCtx,
  product: Doc<'products'>,
  caller: { _id: Id<'users'>; name: string },
): Promise<void> {
  const { _id, _creationTime, ...rest } = product;
  void _id; void _creationTime;
  await ctx.db.insert('deletedProducts', {
    originalId: product._id,
    name: product.name,
    sku: product.sku,
    images: product.images,
    snapshot: JSON.stringify(rest),
    deletedBy: caller._id,
    deletedByName: caller.name,
    deletedAt: Date.now(),
  });
}

/** List trashed products (most-recently deleted first). Admin-only. */
export const listTrash = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    await requireCapability(ctx, args.sessionToken, 'trash');
    const rows = await ctx.db.query('deletedProducts').withIndex('by_deletedAt').order('desc').take(500);
    return rows.map((r) => ({
      _id: r._id,
      name: r.name,
      sku: r.sku,
      image: r.images?.[0] ?? null,
      deletedByName: r.deletedByName,
      deletedAt: r.deletedAt,
    }));
  },
});

/** Restore a trashed product back into the live catalog. Admin-only. */
export const restoreProduct = mutation({
  args: { sessionToken: v.string(), trashId: v.id('deletedProducts') },
  handler: async (ctx, args) => {
    const caller = await requireCapability(ctx, args.sessionToken, 'trash');
    const row = await ctx.db.get(args.trashId);
    if (!row) throw new Error('Not found');
    const data = JSON.parse(row.snapshot) as ProductInsert;
    const newId = await ctx.db.insert('products', data);
    await syncOemIndex(ctx, newId, data.oemNumbers);
    await ctx.db.delete(args.trashId);
    await recomputeCatalogStats(ctx);
    await logAudit(ctx, caller, 'product.restore', `Restored product "${row.name}" from trash`,
      { targetType: 'product', targetId: newId });
    return { productId: newId };
  },
});

/** Permanently delete a trashed product and purge its R2 images. Admin-only. */
export const permanentDeleteProduct = mutation({
  args: { sessionToken: v.string(), trashId: v.id('deletedProducts') },
  handler: async (ctx, args) => {
    const caller = await requireCapability(ctx, args.sessionToken, 'trash');
    const row = await ctx.db.get(args.trashId);
    if (!row) return;
    if (row.images?.length) {
      const keys = row.images.map(r2KeyFromUrl).filter((k): k is string => !!k);
      if (keys.length) await ctx.scheduler.runAfter(0, internal.r2Actions.deleteObjects, { keys });
    }
    await ctx.db.delete(args.trashId);
    await logAudit(ctx, caller, 'product.purge', `Permanently deleted "${row.name}"`,
      { targetType: 'product', targetId: row.originalId });
  },
});

/** Empty the whole trash (permanent). Admin-only. */
export const emptyTrash = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const caller = await requireCapability(ctx, args.sessionToken, 'trash');
    const rows = await ctx.db.query('deletedProducts').take(1000);
    for (const row of rows) {
      if (row.images?.length) {
        const keys = row.images.map(r2KeyFromUrl).filter((k): k is string => !!k);
        if (keys.length) await ctx.scheduler.runAfter(0, internal.r2Actions.deleteObjects, { keys });
      }
      await ctx.db.delete(row._id);
    }
    await logAudit(ctx, caller, 'product.emptyTrash', `Emptied trash (${rows.length} products)`);
    return { removed: rows.length };
  },
});

/** Auto-purge products that have been in the trash longer than 30 days. */
export const purgeOldTrash = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 30 * 86400000;
    const old = await ctx.db.query('deletedProducts').withIndex('by_deletedAt', (q) => q.lt('deletedAt', cutoff)).take(500);
    for (const row of old) {
      if (row.images?.length) {
        const keys = row.images.map(r2KeyFromUrl).filter((k): k is string => !!k);
        if (keys.length) await ctx.scheduler.runAfter(0, internal.r2Actions.deleteObjects, { keys });
      }
      await ctx.db.delete(row._id);
    }
    return { purged: old.length };
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
    const caller = await requireCapability(ctx, args.sessionToken, 'products');
    await requireCapability(ctx, args.sessionToken, 'action.bulk');
    if (args.op === 'delete') await requireCapability(ctx, args.sessionToken, 'action.delete');
    const now = Date.now();
    let affected = 0;
    for (const id of args.ids) {
      const p = await ctx.db.get(id);
      if (!p) continue;
      if (args.op === 'delete') {
        await archiveProduct(ctx, p, caller);
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
    // setDiscount doesn't change the active set / category / brand, so it
    // doesn't affect catalogStats. All other ops do.
    if (affected > 0 && args.op !== 'setDiscount') {
      await recomputeCatalogStats(ctx);
    }
    return { affected };
  },
});

export const bulkCreate = mutation({
  args: {
    sessionToken: v.string(),
    products: v.array(
      v.object({
        id: v.optional(v.id('products')),
        name: v.optional(v.string()),
        nameRu: v.optional(v.string()),
        nameEn: v.optional(v.string()),
        slug: v.optional(v.string()),
        description: v.optional(v.string()),
        descriptionRu: v.optional(v.string()),
        descriptionEn: v.optional(v.string()),
        price: v.optional(v.number()),
        costPrice: v.optional(v.number()),
        retailDiscount: v.optional(v.number()),
        wholesalePrice: v.optional(v.number()),
        wholesaleDiscount: v.optional(v.number()),
        compareAtPrice: v.optional(v.number()),
        category: v.optional(v.string()),
        categoryId: v.id('categories'),
        sku: v.optional(v.string()),
        atgCode: v.optional(v.string()),
        brand: v.optional(v.string()),
        qtyStep: v.optional(v.number()),
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
    await requireCapability(ctx, args.sessionToken, 'products');
    const now = Date.now();
    let created = 0;
    let updated = 0;

    const asciiFieldName = /^[\x20-\x7E]+$/;
    const filterIndexCache = new Map<string, {
      byId: Set<string>;
      bySlug: Map<string, string>;
      byName: Map<string, string>;
      brandId: string | undefined;
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
        brandId: defs.find((d) => d.slug.toLowerCase().trim() === 'brand')?._id as string | undefined,
      };
      filterIndexCache.set(categoryId, index);
      return index;
    };

    /**
     * Mirror the brand into the canonical `brand` top-level field and the
     * `attributes.brand` literal key, so brand-based queries (filter, brand
     * list, analytics, "no brand" health) stay consistent regardless of which
     * attribute key the import used. Mutates `attrs` in place and returns the
     * resolved brand string (if any).
     */
    const syncBrand = (categoryId: Id<'categories'>, attrs: Record<string, unknown> | undefined): string | undefined => {
      if (!attrs) return undefined;
      const index = filterIndexCache.get(categoryId);
      const pickString = (val: unknown): string | undefined => {
        if (typeof val === 'string' && val.trim()) return val.trim();
        if (Array.isArray(val)) { const first = val.find((v) => typeof v === 'string' && v.trim()); return first as string | undefined; }
        return undefined;
      };
      const brand = pickString(attrs.brand)
        ?? (index?.brandId ? pickString(attrs[index.brandId]) : undefined);
      if (brand) attrs.brand = brand;
      return brand;
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
      // Поиск существующего товара: по id (точное совпадение для round-trip
      // экспорт→правка→импорт), затем по sku, затем по slug.
      let existing = null;
      const nextSku = p.sku?.trim();

      if (p.id) {
        existing = await ctx.db.get(p.id);
        if (!existing) {
          throw new Error(`Ապրանք id "${p.id}" չի գտնվել`);
        }
      } else if (nextSku) {
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
        if (p.nameRu !== undefined) updatePayload.nameRu = p.nameRu;
        if (p.nameEn !== undefined) updatePayload.nameEn = p.nameEn;
        if (p.slug !== undefined) updatePayload.slug = p.slug;
        if (p.description !== undefined) updatePayload.description = p.description;
        if (p.descriptionRu !== undefined) updatePayload.descriptionRu = p.descriptionRu;
        if (p.descriptionEn !== undefined) updatePayload.descriptionEn = p.descriptionEn;
        if (p.price !== undefined) updatePayload.price = p.price;
        if (p.costPrice !== undefined) updatePayload.costPrice = p.costPrice;
        if (p.retailDiscount !== undefined) updatePayload.retailDiscount = p.retailDiscount > 0 ? p.retailDiscount : undefined;
        if (p.wholesalePrice !== undefined) updatePayload.wholesalePrice = p.wholesalePrice;
        if (p.wholesaleDiscount !== undefined) updatePayload.wholesaleDiscount = p.wholesaleDiscount > 0 ? p.wholesaleDiscount : undefined;
        if (p.compareAtPrice !== undefined) updatePayload.compareAtPrice = p.compareAtPrice;
        if (p.categoryId !== undefined) updatePayload.categoryId = p.categoryId;
        if (nextSku !== undefined) updatePayload.sku = nextSku;
        if (p.atgCode !== undefined) updatePayload.atgCode = p.atgCode;
        if (p.variantGroup !== undefined) updatePayload.variantGroup = p.variantGroup || undefined;
        if (p.qtyStep !== undefined) updatePayload.qtyStep = p.qtyStep > 0 ? p.qtyStep : undefined;
        if (p.brand !== undefined) updatePayload.brand = p.brand || undefined;
        if (p.oemNumbers !== undefined) updatePayload.oemNumbers = p.oemNumbers;
        if (p.stock !== undefined) updatePayload.stock = p.stock;
        if (p.isActive !== undefined) updatePayload.isActive = p.isActive;
        if (p.isFeatured !== undefined) updatePayload.isFeatured = p.isFeatured;
        if (p.showInPromotions !== undefined) updatePayload.showInPromotions = p.showInPromotions;
        if (p.seoTitle !== undefined) updatePayload.seoTitle = p.seoTitle;
        if (p.seoDescription !== undefined) updatePayload.seoDescription = p.seoDescription;
        if (p.images !== undefined) updatePayload.images = p.images;
        // Attributes + vehicle compatibility. The edit form stores compat inside
        // `attributes.vehicleCompat`, so merge it there (not as a top-level field).
        if (p.attributes !== undefined || p.vehicleCompat !== undefined) {
          const safeAttrs = (await sanitizeAttributes(p.categoryId, p.attributes)) ?? {};
          if (Array.isArray(p.vehicleCompat) && p.vehicleCompat.length > 0) {
            safeAttrs.vehicleCompat = p.vehicleCompat;
          }
          const brand = syncBrand(p.categoryId, safeAttrs);
          updatePayload.attributes = Object.keys(safeAttrs).length > 0 ? safeAttrs : undefined;
          if (brand) updatePayload.brand = brand;
        }

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
        if (p.nameRu !== undefined) createPayload.nameRu = p.nameRu;
        if (p.nameEn !== undefined) createPayload.nameEn = p.nameEn;
        if (p.descriptionRu !== undefined) createPayload.descriptionRu = p.descriptionRu;
        if (p.descriptionEn !== undefined) createPayload.descriptionEn = p.descriptionEn;
        if (p.costPrice !== undefined) createPayload.costPrice = p.costPrice;
        if (p.wholesalePrice !== undefined) createPayload.wholesalePrice = p.wholesalePrice;
        if (p.retailDiscount !== undefined && p.retailDiscount > 0) createPayload.retailDiscount = p.retailDiscount;
        if (p.wholesaleDiscount !== undefined && p.wholesaleDiscount > 0) createPayload.wholesaleDiscount = p.wholesaleDiscount;
        if (p.compareAtPrice !== undefined) createPayload.compareAtPrice = p.compareAtPrice;
        if (nextSku !== undefined) createPayload.sku = nextSku;
        if (p.atgCode !== undefined) createPayload.atgCode = p.atgCode;
        if (p.variantGroup) createPayload.variantGroup = p.variantGroup;
        if (p.qtyStep !== undefined && p.qtyStep > 0) createPayload.qtyStep = p.qtyStep;
        if (p.brand) createPayload.brand = p.brand;
        if (p.oemNumbers !== undefined) createPayload.oemNumbers = p.oemNumbers;
        if (p.isFeatured !== undefined) createPayload.isFeatured = p.isFeatured;
        if (p.showInPromotions !== undefined) createPayload.showInPromotions = p.showInPromotions;
        if (p.seoTitle !== undefined) createPayload.seoTitle = p.seoTitle;
        if (p.seoDescription !== undefined) createPayload.seoDescription = p.seoDescription;
        if (p.attributes !== undefined || p.vehicleCompat !== undefined) {
          const safeAttrs = (await sanitizeAttributes(p.categoryId, p.attributes)) ?? {};
          if (Array.isArray(p.vehicleCompat) && p.vehicleCompat.length > 0) {
            safeAttrs.vehicleCompat = p.vehicleCompat;
          }
          if (Object.keys(safeAttrs).length > 0) {
            const brand = syncBrand(p.categoryId, safeAttrs);
            createPayload.attributes = safeAttrs;
            if (brand) createPayload.brand = brand;
          }
        }
        
        const insertedId = await ctx.db.insert('products', createPayload);
        if (p.oemNumbers !== undefined) await syncOemIndex(ctx, insertedId, p.oemNumbers);
        created++;
      }
    }
    
    if (created > 0 || updated > 0) {
      await recomputeCatalogStats(ctx);
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

/**
 * Admin product list: ALL products (active + inactive, all categories),
 * newest first, with normalized image URLs. Unlike the public `list` (capped
 * at 500 active products), this returns the full catalog for management.
 */
export const listAdmin = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query('products')
      .order('desc')
      .take(Math.min(args.limit ?? 50000, 50000));
    return products.map(normalizeProductImages);
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
    try { await requireCapability(ctx, args.sessionToken, 'products'); } catch { return []; }
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

/**
 * Stock analytics for the superadmin: sales velocity (units sold / day over the
 * last 30 days), estimated days of cover, reorder suggestions for fast-moving
 * low-stock items, and a dead-stock report (in stock but no sales in 60 days).
 */
export const stockInsights = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    try { await requireCapability(ctx, args.sessionToken, 'products'); } catch { return null; }
    const now = Date.now();
    const D30 = 30 * 24 * 60 * 60 * 1000;
    const D60 = 60 * 24 * 60 * 60 * 1000;

    // Sale movements in the last 60 days (qty is negative for sales).
    const sales = await ctx.db
      .query('stockMovements')
      .withIndex('by_created', (q) => q.gte('createdAt', now - D60))
      .filter((q) => q.eq(q.field('type'), 'sale'))
      .take(20000);

    const sold30 = new Map<string, number>();
    const sold60 = new Map<string, number>();
    for (const m of sales) {
      const units = Math.abs(m.qty);
      const key = m.productId as string;
      sold60.set(key, (sold60.get(key) ?? 0) + units);
      if (m.createdAt >= now - D30) sold30.set(key, (sold30.get(key) ?? 0) + units);
    }

    const products = await ctx.db.query('products').withIndex('by_active', (q) => q.eq('isActive', true)).take(10000);

    const reorder: Array<{ _id: string; name: string; sku?: string; stock: number; perDay: number; daysLeft: number; suggested: number }> = [];
    const deadStock: Array<{ _id: string; name: string; sku?: string; stock: number; lastSale60: 0 }> = [];

    for (const p of products) {
      const key = p._id as string;
      const units30 = sold30.get(key) ?? 0;
      const units60 = sold60.get(key) ?? 0;
      const perDay = units30 / 30;

      // Reorder: selling and less than 14 days of cover left. Suggest topping up
      // to ~30 days of demand.
      if (perDay > 0) {
        const daysLeft = perDay > 0 ? p.stock / perDay : Infinity;
        if (daysLeft < 14) {
          reorder.push({
            _id: key, name: p.name, sku: p.sku, stock: p.stock,
            perDay: Math.round(perDay * 100) / 100,
            daysLeft: Math.round(daysLeft),
            suggested: Math.max(0, Math.ceil(perDay * 30 - p.stock)),
          });
        }
      }
      // Dead stock: has inventory but zero sales in 60 days.
      if (p.stock > 0 && units60 === 0) {
        deadStock.push({ _id: key, name: p.name, sku: p.sku, stock: p.stock, lastSale60: 0 });
      }
    }

    reorder.sort((a, b) => a.daysLeft - b.daysLeft);
    deadStock.sort((a, b) => b.stock - a.stock);

    const totalUnits30 = [...sold30.values()].reduce((s, n) => s + n, 0);
    return {
      generatedAt: now,
      totalUnits30,
      reorder: reorder.slice(0, 100),
      deadStock: deadStock.slice(0, 100),
    };
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
      })
      .map(normalizeProductImages);
  },
});

export const reorderVariantGroup = mutation({
  args: {
    sessionToken: v.string(),
    variantGroup: v.string(),
    items: v.array(v.object({ id: v.id('products'), order: v.number() })),
  },
  handler: async (ctx, args) => {
    await requireCapability(ctx, args.sessionToken, 'products');
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
    // Accept raw strings (not v.id) so stale/foreign IDs from localStorage —
    // e.g. IDs saved before a data migration that now belong to another table —
    // don't reject the whole query at the argument validator. We normalize and
    // drop anything that isn't a valid product ID below.
    viewedIds: v.optional(v.array(v.string())),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 8;
    const viewed = (args.viewedIds ?? [])
      .slice(0, 12)
      .map((id) => ctx.db.normalizeId('products', id))
      .filter((id): id is Id<'products'> => id !== null);
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
