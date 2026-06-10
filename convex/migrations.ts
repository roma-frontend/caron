import { mutation } from './_generated/server';

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
