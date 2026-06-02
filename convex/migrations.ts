import { mutation } from './_generated/server';

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
