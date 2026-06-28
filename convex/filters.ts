import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { internal } from './_generated/api';
import { getAdminCaller } from './lib/auth';

function normalizeOptionValue(value: string): string {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function mapToCanonicalOption(value: unknown, options: string[]): unknown {
  if (!options.length) return value;
  const normalizedOptions = options.map((opt) => ({ raw: opt, norm: normalizeOptionValue(opt) }));

  const mapOne = (input: string): string => {
    const norm = normalizeOptionValue(input);
    if (!norm) return input;
    const exact = normalizedOptions.find((o) => o.norm === norm);
    if (exact) return exact.raw;
    const includes = normalizedOptions.find((o) => o.norm.includes(norm) || norm.includes(o.norm));
    return includes?.raw ?? input;
  };

  if (Array.isArray(value)) {
    const mapped = value
      .filter((v): v is string => typeof v === 'string')
      .map(mapOne);
    return Array.from(new Set(mapped));
  }

  if (typeof value === 'string') return mapOne(value);
  return value;
}

export const getByCategory = query({
  args: { categoryId: v.id('categories') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('filterDefinitions')
      .withIndex('by_category', (q) => q.eq('categoryId', args.categoryId))
      .take(50);
  },
});

export const create = mutation({
  args: {
    sessionToken: v.string(),
    categoryId: v.id('categories'),
    name: v.string(),
    slug: v.string(),
    type: v.union(v.literal('select'), v.literal('multiselect'), v.literal('range'), v.literal('boolean')),
    options: v.optional(v.array(v.string())),
    unit: v.optional(v.string()),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    const { sessionToken: _, ...data } = args;
    const id = await ctx.db.insert('filterDefinitions', data);
    // Auto-translate the filter name + option labels to RU/EN in the background.
    await ctx.scheduler.runAfter(0, internal.translate.translateFilter, { id });
    return id;
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), id: v.id('filterDefinitions') },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    await ctx.db.delete(args.id);
  },
});

export const update = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id('filterDefinitions'),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    type: v.optional(v.union(v.literal('select'), v.literal('multiselect'), v.literal('range'), v.literal('boolean'))),
    options: v.optional(v.array(v.string())),
    unit: v.optional(v.string()),
    order: v.optional(v.number()),
    categoryId: v.optional(v.id('categories')),
  },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    const { id, sessionToken: _, slug, ...patch } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error('Ֆիլտրը չի գտնվել');
    // IMPORTANT: slug cannot be changed after creation to avoid breaking filter system
    // Filters are identified by _id, not slug, so slug is now immutable
    if (slug !== undefined) {
      throw new Error('Ֆիլտրի slug-ը չի կարող փոխվել հետո: Օգտագործեք միայն name դաշտը');
    }

    // When filter options are updated (including renamed labels), remap product values
    // for this filter to canonical new options, for both _id and legacy slug keys.
    if (patch.options && patch.options.length > 0) {
      const products = await ctx.db
        .query('products')
        .withIndex('by_category', (q) => q.eq('categoryId', existing.categoryId))
        .collect();

      for (const product of products) {
        const attrs = (product.attributes ?? {}) as Record<string, unknown>;
        let changed = false;
        const nextAttrs: Record<string, unknown> = { ...attrs };

        const keysToRemap = [id as string, existing.slug];
        for (const key of keysToRemap) {
          if (!(key in nextAttrs)) continue;
          const currentVal = nextAttrs[key];
          const mappedVal = mapToCanonicalOption(currentVal, patch.options);
          if (JSON.stringify(mappedVal) !== JSON.stringify(currentVal)) {
            nextAttrs[key] = mappedVal;
            changed = true;
          }
        }

        if (changed) {
          await ctx.db.patch(product._id, { attributes: nextAttrs });
        }
      }
    }

    await ctx.db.patch(id, patch);
    // Re-translate after edits (name/options may have changed).
    await ctx.scheduler.runAfter(0, internal.translate.translateFilter, { id, force: true });
  },
});

export const migrateTesak = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    const cats = await ctx.db.query('categories').collect();
    let added = 0;
    for (const cat of cats) {
      const existing = (await ctx.db.query('filterDefinitions')
        .withIndex('by_category', (q) => q.eq('categoryId', cat._id))
        .take(50)).find((f) => f.slug === 'type');
      if (!existing) {
        await ctx.db.insert('filterDefinitions', {
          categoryId: cat._id, name: 'Տեսակ', slug: 'type',
          type: 'multiselect', options: [], order: 0,
        });
        added++;
      }
    }
    return added > 0 ? `${added} Կատեգորիաների համար ավելացվել է ֆիլտրը Տեսակ` : 'Բոլոր կատեգորիաների համար արդեն կա Տեսակ ֆիլտր';
  },
});

export const runMigrateFilterAttributeKeysToId = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
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

    return { updated, message: `Գծանցվել են ${updated} ապրանքներ՝ օգտագործելով ֆիլտրի _id փոխարեն slug-ի` };
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('filterDefinitions').order('asc').take(200);
  },
});

export const reorder = mutation({
  args: {
    sessionToken: v.string(),
    items: v.array(v.object({ id: v.id('filterDefinitions'), order: v.number() })),
  },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    for (const item of args.items) {
      await ctx.db.patch(item.id, { order: item.order });
    }
  },
});
