import { mutation, internalMutation } from './_generated/server';

function toBaseSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function fallbackSlugFromId(id: string): string {
  return `category-${id.slice(-8)}`;
}

export const syncBrand = mutation({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query('products').collect();
    let updated = 0;
    for (const p of products) {
      const attrs = (p.attributes ?? {}) as Record<string, unknown>;
      // Sync product.brand -> attributes.brand
      if (p.brand && (!attrs.brand || attrs.brand !== p.brand)) {
        await ctx.db.patch(p._id, { attributes: { ...attrs, brand: p.brand } });
        updated++;
      }
      // Sync attributes.brand -> product.brand (if product.brand is missing)
      if (!p.brand && attrs.brand && typeof attrs.brand === 'string') {
        await ctx.db.patch(p._id, { brand: attrs.brand as string, attributes: { ...attrs, brand: attrs.brand } });
        updated++;
      }
    }
    return `Synced brand for ${updated} products`;
  },
});

export const mergeDuplicateCategories = mutation({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db.query('categories').collect();
    const activeCategories = categories.filter((c) => c.isActive);
    const products = await ctx.db.query('products').collect();

    const activeCountByCategory = new Map<string, number>();
    for (const product of products) {
      if (!product.isActive) continue;
      activeCountByCategory.set(product.categoryId, (activeCountByCategory.get(product.categoryId) ?? 0) + 1);
    }

    const byName = new Map<string, typeof activeCategories>();
    for (const category of activeCategories) {
      const key = category.name.trim().toLowerCase();
      const existing = byName.get(key) ?? [];
      existing.push(category);
      byName.set(key, existing);
    }

    let movedProducts = 0;
    let movedFilterDefinitions = 0;
    let deactivatedCategories = 0;

    for (const group of byName.values()) {
      if (group.length < 2) continue;

      const sorted = [...group].sort((a, b) => {
        const aCount = activeCountByCategory.get(a._id) ?? 0;
        const bCount = activeCountByCategory.get(b._id) ?? 0;
        if (aCount !== bCount) return bCount - aCount;

        const aSlugScore = a.slug === '-' ? 0 : 1;
        const bSlugScore = b.slug === '-' ? 0 : 1;
        if (aSlugScore !== bSlugScore) return bSlugScore - aSlugScore;

        return a.createdAt - b.createdAt;
      });

      const target = sorted[0];
      const sources = sorted.slice(1);

      for (const source of sources) {
        const sourceProducts = products.filter((p) => p.categoryId === source._id);
        for (const product of sourceProducts) {
          await ctx.db.patch(product._id, { categoryId: target._id, updatedAt: Date.now() });
          movedProducts++;
        }

        const definitions = await ctx.db
          .query('filterDefinitions')
          .withIndex('by_category', (q) => q.eq('categoryId', source._id))
          .collect();
        for (const definition of definitions) {
          await ctx.db.patch(definition._id, { categoryId: target._id });
          movedFilterDefinitions++;
        }

        const promotions = await ctx.db.query('promotions').collect();
        for (const promo of promotions) {
          if (!promo.categoryIds || promo.categoryIds.length === 0) continue;
          if (!promo.categoryIds.includes(source._id)) continue;

          const categoryIds = Array.from(new Set(promo.categoryIds.map((id) => (id === source._id ? target._id : id))));
          await ctx.db.patch(promo._id, { categoryIds });
        }

        await ctx.db.patch(source._id, {
          isActive: false,
          slug: `${source.slug}-merged-${Date.now()}`,
          name: `${source.name} (merged)`,
        });
        deactivatedCategories++;
      }
    }

    return {
      movedProducts,
      movedFilterDefinitions,
      deactivatedCategories,
    };
  },
});

export const normalizeActiveCategorySlugs = mutation({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db.query('categories').collect();
    const usedSlugs = new Set(categories.map((c) => c.slug.toLowerCase()));
    let updated = 0;

    const active = categories.filter((c) => c.isActive);
    for (const category of active) {
      const current = category.slug.trim().toLowerCase();
      const invalid = current === '' || current === '-';
      if (!invalid) continue;

      usedSlugs.delete(current);

      const base = toBaseSlug(category.name) || fallbackSlugFromId(category._id);
      let next = base;
      let suffix = 2;
      while (usedSlugs.has(next.toLowerCase())) {
        next = `${base}-${suffix}`;
        suffix++;
      }

      await ctx.db.patch(category._id, { slug: next });
      usedSlugs.add(next.toLowerCase());
      updated++;
    }

    return { updated };
  },
});

export const convertOemNumbersFormat = mutation({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query('products').collect();
    let updated = 0;

    for (const product of products) {
      const oem = product.oemNumbers;
      if (!oem || oem.length === 0) continue;

      const isOldFormat = typeof oem[0] === 'string';
      if (!isOldFormat) continue;

      const newOemNumbers: Array<{ manufacturer: string; code: string }> = (oem as unknown as string[]).map((code) => ({
        manufacturer: 'Unknown',
        code: code,
      }));

      await ctx.db.patch(product._id, { oemNumbers: newOemNumbers });
      updated++;
    }

    return { updated };
  },
});

export const migrateFilterAttributeKeysToId = mutation({
  args: {},
  handler: async (ctx) => {
    // Build mapping of slug -> _id for all filterDefinitions
    const filterDefs = await ctx.db.query('filterDefinitions').collect();
    const slugToId = new Map<string, string>(filterDefs.map((f) => [f.slug, f._id]));

    const products = await ctx.db.query('products').collect();
    let updated = 0;

    for (const product of products) {
      const attrs = (product.attributes ?? {}) as Record<string, unknown>;
      const newAttrs: Record<string, unknown> = {};
      let changed = false;

      for (const [key, value] of Object.entries(attrs)) {
        const filterId = slugToId.get(key);
        if (filterId) {
          // This key is a slug, map it to the _id
          newAttrs[filterId] = value;
          changed = true;
        } else {
          // Not a slug (might be brand, etc.), keep as is
          newAttrs[key] = value;
        }
      }

      if (changed) {
        await ctx.db.patch(product._id, { attributes: newAttrs });
        updated++;
      }
    }

    return { updated, message: `Migrated ${updated} products to use filter _id instead of slug` };
  },
});

import { v } from 'convex/values';

export const normalizeBrand = mutation({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx) => {
    const allBrandDefs = await ctx.db.query('filterDefinitions').filter((q) => q.eq(q.field('slug'), 'brand')).collect();
    const brandDefByCategory = new Map(allBrandDefs.map((d) => [d.categoryId, d]));
    const products = await ctx.db.query('products').collect();
    let updated = 0;
    for (const p of products) {
      const attrs = (p.attributes ?? {}) as Record<string, unknown>;
      const rawBrand = (attrs.brand as string | undefined) ?? p.brand;
      if (!rawBrand) continue;
      const brandDef = brandDefByCategory.get(p.categoryId);
      const match = brandDef?.options?.find((o) => o.toLowerCase() === rawBrand.toLowerCase());
      const normalized = match ?? rawBrand;
      if (normalized !== rawBrand || p.brand !== normalized) {
        await ctx.db.patch(p._id, {
          brand: normalized,
          attributes: { ...attrs, brand: normalized },
        });
        updated++;
      }
    }
    return `Normalized brand for ${updated} products`;
  },
});

/**
 * Backfill brand for products that only have it stored under the brand
 * filter-definition's _id key in attributes (e.g. bulk-imported products),
 * mirroring it into the top-level `brand` field and `attributes.brand`.
 * Idempotent — safe to re-run.
 */
export const backfillBrandFromFilterDef = mutation({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx) => {
    const brandDefs = await ctx.db
      .query('filterDefinitions')
      .filter((q) => q.eq(q.field('slug'), 'brand'))
      .collect();
    const brandDefByCategory = new Map(brandDefs.map((d) => [d.categoryId, d._id as string]));

    const pickString = (val: unknown): string | undefined => {
      if (typeof val === 'string' && val.trim()) return val.trim();
      if (Array.isArray(val)) { const f = val.find((v) => typeof v === 'string' && v.trim()); return f as string | undefined; }
      return undefined;
    };

    const products = await ctx.db.query('products').collect();
    let updated = 0;
    for (const p of products) {
      const attrs = (p.attributes ?? {}) as Record<string, unknown>;
      // Already consistent — skip.
      if (p.brand && attrs.brand === p.brand) continue;

      const defId = brandDefByCategory.get(p.categoryId);
      const brand =
        pickString(attrs.brand) ??
        (p.brand && p.brand.trim() ? p.brand.trim() : undefined) ??
        (defId ? pickString(attrs[defId]) : undefined);
      if (!brand) continue;

      if (p.brand === brand && attrs.brand === brand) continue;
      await ctx.db.patch(p._id, {
        brand,
        attributes: { ...attrs, brand },
      });
      updated++;
    }
    return `Backfilled brand for ${updated} products`;
  },
});


/**
 * Remove the duplicate brand attribute that bulk-imported products carry under
 * the brand *filter-definition id* (attributes["<defId>"]), keeping the
 * canonical brand in `product.brand` + `attributes.brand`. This caused the
 * comparison table to show two "Brand" rows.
 *
 * Safe for filtering: the catalog brand facet uses `def.slug === 'brand'` for
 * its options and sets the special `brand` query param, which matches
 * `product.brand` / `attributes.brand` (both preserved) — never the removed key.
 *
 * Run with: npx convex run migrations:removeDuplicateBrandAttribute
 */
export const removeDuplicateBrandAttribute = internalMutation({
  args: {},
  handler: async (ctx) => {
    const BRAND_LABELS = new Set(['brand', 'бренд', 'բրենդ']);
    const defs = await ctx.db.query('filterDefinitions').collect();
    const brandDefIds = new Set(
      defs
        .filter(
          (d) =>
            (d.slug ?? '').toLowerCase() === 'brand' ||
            BRAND_LABELS.has((d.name ?? '').trim().toLowerCase()) ||
            BRAND_LABELS.has(((d as { nameRu?: string }).nameRu ?? '').trim().toLowerCase()) ||
            BRAND_LABELS.has(((d as { nameEn?: string }).nameEn ?? '').trim().toLowerCase()),
        )
        .map((d) => d._id as string),
    );

    const products = await ctx.db.query('products').collect();
    let cleaned = 0;
    let brandFilled = 0;
    for (const p of products) {
      const attrs = { ...((p.attributes ?? {}) as Record<string, unknown>) };
      let removedValue: string | undefined;
      let changed = false;

      for (const id of brandDefIds) {
        if (id in attrs) {
          const v = attrs[id];
          if (!removedValue && typeof v === 'string' && v.trim()) removedValue = v.trim();
          delete attrs[id];
          changed = true;
        }
      }
      if (!changed) continue;

      const canonical =
        (typeof attrs.brand === 'string' && attrs.brand.trim() ? (attrs.brand as string).trim() : undefined) ??
        (p.brand && p.brand.trim() ? p.brand.trim() : undefined) ??
        removedValue;

      const patch: { attributes: Record<string, unknown>; brand?: string } = { attributes: attrs };
      if (canonical) {
        attrs.brand = canonical;
        if (p.brand !== canonical) {
          patch.brand = canonical;
          brandFilled++;
        }
      }
      await ctx.db.patch(p._id, patch);
      cleaned++;
    }

    return `Removed duplicate brand attribute from ${cleaned} product(s); brand field set on ${brandFilled}. brandDefIds=[${[...brandDefIds].join(', ')}]`;
  },
});
