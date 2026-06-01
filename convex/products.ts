import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { paginationOptsValidator } from 'convex/server';
import { getAdminCaller } from './lib/auth';
import { api } from './_generated/api';

export const listPaginated = query({
  args: {
    categoryId: v.optional(v.id('categories')),
    search: v.optional(v.string()),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    inStockOnly: v.optional(v.boolean()),
    onSale: v.optional(v.boolean()),
    minRating: v.optional(v.number()),
    sort: v.optional(v.union(v.literal('newest'), v.literal('priceAsc'), v.literal('priceDesc'), v.literal('popular'))),
    attributes: v.optional(v.any()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const hasFilters = !!(args.minPrice || args.maxPrice || args.inStockOnly || args.onSale || args.minRating || args.attributes);
    const paginationOpts = hasFilters
      ? { ...args.paginationOpts, numItems: Math.max(args.paginationOpts.numItems ?? 20, 200) }
      : args.paginationOpts;

    const byPrice = args.sort === 'priceAsc' || args.sort === 'priceDesc';
    const priceDir = args.sort === 'priceAsc' ? 'asc' : 'desc';
    let result;

    if (args.search) {
      result = await ctx.db
        .query('products')
        .withSearchIndex('search_products', (q) => {
          let s = q.search('name', args.search!);
          if (args.categoryId) s = s.eq('categoryId', args.categoryId);
          return s.eq('isActive', true);
        })
        .paginate(paginationOpts);
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
    if (args.minPrice) filtered = filtered.filter((p) => p.price >= args.minPrice!);
    if (args.maxPrice) filtered = filtered.filter((p) => p.price <= args.maxPrice!);
    if (args.inStockOnly) filtered = filtered.filter((p) => p.stock > 0);
    if (args.onSale) filtered = filtered.filter((p) => p.compareAtPrice != null && p.compareAtPrice > p.price);
    if (args.minRating) filtered = filtered.filter((p) => (p.rating ?? 0) >= args.minRating!);

    // Attribute filtering (arbitrary keys can't be indexed)
    if (args.attributes && typeof args.attributes === 'object') {
      const attrs = args.attributes as Record<string, unknown>;
      filtered = filtered.filter((p) => {
        if (!p.attributes) return false;
        const pa = p.attributes as Record<string, unknown>;
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
          if (Array.isArray(val)) {
            if (val.length === 0) continue;
            const pVal = pa[key];
            if (Array.isArray(pVal)) {
              if (!val.some((v) => pVal.includes(v))) return false;
            } else {
              if (!val.includes(pVal as string)) return false;
            }
          } else if (typeof val === 'boolean') {
            if (pa[key] !== val) return false;
          } else {
            if (pa[key] !== val) return false;
          }
        }
        return true;
      });
    }

    // Search is relevance-ordered: honor price sort within page. Popular: featured first.
    if (args.search && byPrice) filtered = [...filtered].sort((a, b) => (priceDir === 'asc' ? a.price - b.price : b.price - a.price));
    else if (args.sort === 'popular') filtered = [...filtered].sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));

    return { ...result, page: filtered };
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
      if (args.minPrice) results = results.filter((p) => p.price >= args.minPrice!);
      if (args.maxPrice) results = results.filter((p) => p.price <= args.maxPrice!);
      return results;
    }
    let products;
    if (args.categoryId) {
      products = await ctx.db.query('products').withIndex('by_category', (q) => q.eq('categoryId', args.categoryId!)).take(Math.min(args.limit ?? 20, 500));
      products = products.filter((p) => p.isActive);
    } else {
      products = await ctx.db.query('products').withIndex('by_active', (q) => q.eq('isActive', true)).take(Math.min(args.limit ?? 20, 500));
    }
    if (args.minPrice) products = products.filter((p) => p.price >= args.minPrice!);
    if (args.maxPrice) products = products.filter((p) => p.price <= args.maxPrice!);
    return products;
  },
});

export const getById = query({
  args: { id: v.id('products') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query('products').withIndex('by_slug', (q) => q.eq('slug', args.slug)).unique();
  },
});

export const getFeatured = query({
  args: {},
  handler: async (ctx) => {
    const featured = (await ctx.db
      .query('products')
      .withIndex('by_featured', (q) => q.eq('isFeatured', true))
      .take(12)).filter((p) => p.isActive);
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
      if (!seen.has(p._id)) featured.push(p);
    }
    return featured;
  },
});

export const create = mutation({
  args: {
    sessionToken: v.string(),
    name: v.string(), slug: v.string(), description: v.string(), price: v.number(),
    compareAtPrice: v.optional(v.number()), categoryId: v.id('categories'),
    images: v.array(v.string()), sku: v.optional(v.string()), stock: v.number(),
    isActive: v.boolean(), isFeatured: v.optional(v.boolean()),
    showInPromotions: v.optional(v.boolean()),
    attributes: v.optional(v.any()),
    seoTitle: v.optional(v.string()), seoDescription: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    const { sessionToken: _, ...data } = args;
    const now = Date.now();
    if (data.showInPromotions === undefined && data.compareAtPrice && data.compareAtPrice > data.price) {
      data.showInPromotions = true;
    }
    return await ctx.db.insert('products', { ...data, createdAt: now, updatedAt: now });
  },
});

export const update = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id('products'), name: v.optional(v.string()), slug: v.optional(v.string()),
    description: v.optional(v.string()), price: v.optional(v.number()),
    compareAtPrice: v.optional(v.number()), categoryId: v.optional(v.id('categories')),
    images: v.optional(v.array(v.string())), sku: v.optional(v.string()),
    stock: v.optional(v.number()), isActive: v.optional(v.boolean()),
    isFeatured: v.optional(v.boolean()),
    showInPromotions: v.optional(v.boolean()),
    attributes: v.optional(v.any()),
    seoTitle: v.optional(v.string()), seoDescription: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    const { id, sessionToken: _, stock, price, compareAtPrice, showInPromotions, ...rest } = args;
    const old = await ctx.db.get(id);
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
        name: v.string(),
        slug: v.string(),
        description: v.string(),
        price: v.number(),
        compareAtPrice: v.optional(v.number()),
        categoryId: v.id('categories'),
        sku: v.optional(v.string()),
        stock: v.number(),
        isActive: v.boolean(),
        isFeatured: v.optional(v.boolean()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    const now = Date.now();
    let count = 0;
    for (const p of args.products) {
      await ctx.db.insert('products', { ...p, images: [], createdAt: now, updatedAt: now });
      count++;
    }
    return `Imported ${count} products`;
  },
});
