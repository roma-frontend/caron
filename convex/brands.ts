import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { requireCapability } from './lib/auth';
import { normalizeImageUrl } from './lib/imageUrl';

function normalizeBrandLogo<T extends { logoUrl?: string }>(brand: T): T {
  if (!brand.logoUrl) return brand;
  const normalized = normalizeImageUrl(brand.logoUrl);
  return normalized === brand.logoUrl ? brand : { ...brand, logoUrl: normalized ?? undefined };
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'brand'
  );
}

const byOrder = (a: { order: number; name: string }, b: { order: number; name: string }) =>
  a.order - b.order || a.name.localeCompare(b.name);

/** Public: active brands, ordered. Used by the home strip + /brands page. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const brands = await ctx.db
      .query('brands')
      .withIndex('by_active', (q) => q.eq('isActive', true))
      .take(500);
    return brands.map(normalizeBrandLogo).sort(byOrder);
  },
});

/** Admin: all brands (active + inactive), ordered. */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const brands = await ctx.db.query('brands').take(1000);
    return brands.map(normalizeBrandLogo).sort(byOrder);
  },
});

export const create = mutation({
  args: {
    sessionToken: v.string(),
    name: v.string(),
    logoUrl: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireCapability(ctx, args.sessionToken, 'brands');
    const name = args.name.trim();
    if (!name) throw new Error('Brand name is required');

    const all = await ctx.db.query('brands').take(1000);
    if (all.some((b) => b.name.toLowerCase() === name.toLowerCase())) {
      throw new Error('Brand already exists');
    }

    // Ensure a unique slug.
    let slug = slugify(name);
    const used = new Set(all.map((b) => b.slug));
    if (used.has(slug)) {
      let i = 2;
      while (used.has(`${slug}-${i}`)) i++;
      slug = `${slug}-${i}`;
    }

    const maxOrder = all.reduce((m, b) => Math.max(m, b.order ?? 0), -1);
    const now = Date.now();
    return await ctx.db.insert('brands', {
      name,
      slug,
      logoUrl: args.logoUrl,
      order: maxOrder + 1,
      isActive: args.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id('brands'),
    name: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireCapability(ctx, args.sessionToken, 'brands');
    const current = await ctx.db.get(args.id);
    if (!current) throw new Error('Brand not found');

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) {
      const name = args.name.trim();
      if (!name) throw new Error('Brand name is required');
      const all = await ctx.db.query('brands').take(1000);
      if (all.some((b) => b._id !== args.id && b.name.toLowerCase() === name.toLowerCase())) {
        throw new Error('Brand already exists');
      }
      patch.name = name;
    }
    if (args.logoUrl !== undefined) patch.logoUrl = args.logoUrl || undefined;
    if (args.isActive !== undefined) patch.isActive = args.isActive;
    await ctx.db.patch(args.id, patch);
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), id: v.id('brands') },
  handler: async (ctx, args) => {
    await requireCapability(ctx, args.sessionToken, 'brands');
    await ctx.db.delete(args.id);
  },
});

export const reorder = mutation({
  args: {
    sessionToken: v.string(),
    items: v.array(v.object({ id: v.id('brands'), order: v.number() })),
  },
  handler: async (ctx, args) => {
    await requireCapability(ctx, args.sessionToken, 'brands');
    const now = Date.now();
    for (const it of args.items) {
      await ctx.db.patch(it.id, { order: it.order, updatedAt: now });
    }
  },
});
