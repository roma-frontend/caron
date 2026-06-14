import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { paginationOptsValidator } from 'convex/server';
import { getAdminCaller } from './lib/auth';
import { api } from './_generated/api';
import { normalizeImageUrls } from './lib/imageUrl';
import type { Doc, Id } from './_generated/dataModel';

type ProductInsert = Omit<Doc<'products'>, '_id' | '_creationTime'>;

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
    const hasFilters = !!(args.minPrice || args.maxPrice || args.inStockOnly || args.onSale || args.minRating || args.attributes);
    // When attribute filters are active we must over-fetch because filtering happens in-memory
    // after the DB query. Fetch up to 2000 so we don't miss products beyond position 200.
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
    if (args.onSale) filtered = filtered.filter((p) => p.compareAtPrice != null && p.compareAtPrice > p.price);
    if (args.minRating) filtered = filtered.filter((p) => (p.rating ?? 0) >= args.minRating!);
    if (args.brand) filtered = filtered.filter((p) => {
      const b = args.brand!.toLowerCase();
      if (p.brand?.toLowerCase() === b) return true;
      const attrBrand = ((p.attributes ?? {}) as Record<string, unknown>).brand;
      if (typeof attrBrand === 'string' && attrBrand.toLowerCase() === b) return true;
      return false;
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
          let attrMatch = Array.from(aliasKeys).some((k) => checkVal(pa[k]));

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
    const searchLower = args.oem.toLowerCase();
    const results = await ctx.db.query('products')
      .withIndex('by_active', (q) => q.eq('isActive', true))
      .take(300);
    const trimmed = searchLower.trim();
    const matches = results
      .filter((p) => p.oemNumbers?.some((o) => o.code.toLowerCase().includes(trimmed) || o.manufacturer.toLowerCase().includes(trimmed)))
      .slice(0, args.limit ?? 20);
    // Exclude inactive categories
    const inactiveCats = await ctx.db.query('categories').withIndex('by_active', (q) => q.eq('isActive', false)).take(200);
    if (inactiveCats.length > 0) {
      const ids = new Set(inactiveCats.map((c) => c._id));
      return matches.filter((p) => !ids.has(p.categoryId)).map(normalizeProductImages);
    }
    return matches.map(normalizeProductImages);
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
    name: v.string(), slug: v.string(), description: v.string(), price: v.number(),
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
    atgCode: v.optional(v.string()), stock: v.number(),
    isActive: v.boolean(), isFeatured: v.optional(v.boolean()),
    showInPromotions: v.optional(v.boolean()),
    attributes: v.optional(v.any()),
    seoTitle: v.optional(v.string()), seoDescription: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    const { sessionToken: _, ...data } = args;
    const now = Date.now();
    if (data.sku) {
      data.sku = data.sku.trim();
      const existingBySku = await ctx.db.query('products').withIndex('by_sku', (q) => q.eq('sku', data.sku!)).unique();
      if (existingBySku) {
        throw new Error(`Արտիկուլ "${data.sku}" արդեն գոյություն ունի`);
      }
    }
    if (data.wholesalePrice === undefined) data.wholesalePrice = data.price;
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
      const brandDef = await ctx.db.query('filterDefinitions').filter((q) => q.eq(q.field('slug'), 'brand')).first();
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
    return await ctx.db.insert('products', { ...data, createdAt: now, updatedAt: now });
  },
});

export const update = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id('products'), name: v.optional(v.string()), slug: v.optional(v.string()),
    description: v.optional(v.string()), price: v.optional(v.number()),
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
    stock: v.optional(v.number()), isActive: v.optional(v.boolean()),
    isFeatured: v.optional(v.boolean()),
    showInPromotions: v.optional(v.boolean()),
    attributes: v.optional(v.any()),
    seoTitle: v.optional(v.string()), seoDescription: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    const { id, sessionToken: _, stock, price, wholesalePrice, compareAtPrice, retailDiscount, wholesaleDiscount, showInPromotions, clearBrand, ...rest } = args;
    if (clearBrand) { rest.brand = undefined; }
    const rAttrs = (rest.attributes ?? {}) as Record<string, unknown>;
      if (rest.brand && rAttrs.brand !== rest.brand) rAttrs.brand = rest.brand;
      if (!rest.brand && rAttrs.brand && typeof rAttrs.brand === 'string') rest.brand = rAttrs.brand as string;
      // Sync from filterDef brand (stored by filterId)
      if (!rest.brand) {
        const brandDef = await ctx.db.query('filterDefinitions').filter((q) => q.eq(q.field('slug'), 'brand')).first();
        if (brandDef) {
          const val = rAttrs[brandDef._id as string];
          const brandVal = Array.isArray(val) ? val[0] : (typeof val === 'string' ? val : undefined);
          if (brandVal) { rest.brand = brandVal; rAttrs.brand = brandVal; }
        }
      }
      rest.attributes = Object.keys(rAttrs).length > 0 ? rAttrs : undefined;
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
      await ctx.scheduler.runAfter(0, api.backInStock.notifySubscribers, { productId: id, productName: old.name });
    }
    if (price !== undefined && old && price < old.price) {
      await ctx.scheduler.runAfter(0, api.priceAlerts.checkAndNotify, { productId: id, newPrice: price });
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
  },
});

async function deleteR2Image(imageUrl: string): Promise<void> {
  try {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKey = process.env.R2_ACCESS_KEY_ID;
    const secretKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucket = process.env.R2_BUCKET_NAME;
    if (!accountId || !accessKey || !secretKey || !bucket) return;

    const key = imageUrl.split('/').pop();
    if (!key) return;

    const host = `${accountId}.r2.cloudflarestorage.com`;
    const endpoint = `https://${host}/${bucket}/${encodeURIComponent(key)}`;
    const date = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
    const dateShort = date.slice(0, 8);
    const service = 's3';
    const region = 'auto';

    // AWS V4 signing helpers using Web Crypto API
    const hmac = async (keyBytes: ArrayBuffer, data: string): Promise<ArrayBuffer> => {
      const algo = { name: 'HMAC', hash: 'SHA-256' };
      const k = await crypto.subtle.importKey('raw', keyBytes, algo, false, ['sign']);
      return crypto.subtle.sign(algo, k, new TextEncoder().encode(data));
    };
    const sha256 = async (data: string): Promise<string> => {
      const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
      return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
    };

    const credentialScope = `${dateShort}/${region}/${service}/aws4_request`;
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
    const payloadHash = await sha256('');

    const canonicalRequest = [
      'DELETE',
      `/${bucket}/${encodeURIComponent(key)}`,
      '',
      `host:${host}`,
      `x-amz-content-sha256:${payloadHash}`,
      `x-amz-date:${date}`,
      '',
      signedHeaders,
      payloadHash,
    ].join('\n');

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      date,
      credentialScope,
      await sha256(canonicalRequest),
    ].join('\n');

    const dateKey = await hmac(new TextEncoder().encode(`AWS4${secretKey}`).buffer, dateShort);
    const regionKey = await hmac(dateKey, region);
    const serviceKey = await hmac(regionKey, service);
    const signingKey = await hmac(serviceKey, 'aws4_request');
    const sigBytes = await hmac(signingKey, stringToSign);
    const signature = Array.from(new Uint8Array(sigBytes)).map((b) => b.toString(16).padStart(2, '0')).join('');

    const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope},SignedHeaders=${signedHeaders},Signature=${signature}`;

    await fetch(endpoint, {
      method: 'DELETE',
      headers: {
        Host: host,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': date,
        Authorization: authHeader,
      },
    });
  } catch {}
}

export const remove = mutation({
  args: { sessionToken: v.string(), id: v.id('products') },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    const product = await ctx.db.get(args.id);
    if (product?.images?.length) {
      await Promise.all(product.images.map(deleteR2Image));
    }
    await ctx.db.delete(args.id);
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
        wholesalePrice: v.optional(v.number()),
        compareAtPrice: v.optional(v.number()),
        category: v.optional(v.string()),
        categoryId: v.id('categories'),
        sku: v.optional(v.string()),
        atgCode: v.optional(v.string()),
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
        if (p.wholesalePrice !== undefined) createPayload.wholesalePrice = p.wholesalePrice;
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
        
        await ctx.db.insert('products', createPayload);
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

export const migrateAttributeKeys = mutation({
  args: {
    productId: v.id('products'),
    newAttributes: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.productId, { attributes: args.newAttributes, updatedAt: Date.now() });
  },
});
