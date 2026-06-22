import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { getAdminCaller } from './lib/auth';

/** Public: active delivery zones (both groups), ordered. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const zones = await ctx.db.query('deliveryZones').collect();
    return zones
      .filter((z) => z.isActive)
      .sort((a, b) => a.order - b.order);
  },
});

/** Admin: all delivery zones, ordered. */
export const listAdmin = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    const zones = await ctx.db.query('deliveryZones').collect();
    return zones.sort((a, b) => a.order - b.order);
  },
});

/** Admin: create or update a delivery zone. */
export const upsert = mutation({
  args: {
    sessionToken: v.string(),
    id: v.optional(v.id('deliveryZones')),
    group: v.union(v.literal('yerevan'), v.literal('region')),
    name: v.string(),
    schedule: v.string(),
    order: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    const { sessionToken: _, id, ...rest } = args;
    if (id) {
      const patch: Record<string, unknown> = { name: rest.name, schedule: rest.schedule, group: rest.group };
      if (typeof rest.order === 'number') patch.order = rest.order;
      if (typeof rest.isActive === 'boolean') patch.isActive = rest.isActive;
      await ctx.db.patch(id, patch);
      return id;
    }
    // New zone: append to end of its group.
    const existing = await ctx.db.query('deliveryZones').collect();
    const maxOrder = existing.reduce((m, z) => Math.max(m, z.order), -1);
    return await ctx.db.insert('deliveryZones', {
      group: rest.group,
      name: rest.name,
      schedule: rest.schedule,
      order: typeof rest.order === 'number' ? rest.order : maxOrder + 1,
      isActive: rest.isActive ?? true,
    });
  },
});

/** Admin: delete a delivery zone. */
export const remove = mutation({
  args: { sessionToken: v.string(), id: v.id('deliveryZones') },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    await ctx.db.delete(args.id);
  },
});

/** Admin: seed the standard Armenian locations (only if table is empty). */
export const seed = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    const existing = await ctx.db.query('deliveryZones').first();
    if (existing) return 'already-seeded';

    const zones: { group: 'yerevan' | 'region'; name: string; order: number }[] = [
      { group: 'yerevan', name: 'Արաբկիր', order: 0 },
      { group: 'yerevan', name: 'Կենտրոն', order: 1 },
      { group: 'yerevan', name: 'Էրեբունի', order: 2 },
      { group: 'yerevan', name: 'Մալաթիա-Սեբաստիա', order: 3 },
      { group: 'yerevan', name: 'Շենգավիթ', order: 4 },
      { group: 'yerevan', name: 'Նորք-Մարաշ', order: 5 },
      { group: 'yerevan', name: 'Ավան-Առինջ', order: 6 },
      { group: 'yerevan', name: 'Քանաքեռ-Զեյթուն', order: 7 },
      { group: 'yerevan', name: 'Աջափնյակ', order: 8 },
      { group: 'yerevan', name: 'Դավթաշեն', order: 9 },
      { group: 'yerevan', name: 'Նոր Նորք', order: 10 },
      { group: 'region', name: 'Արագածոտնի մարզ', order: 0 },
      { group: 'region', name: 'Շիրակի մարզ', order: 1 },
      { group: 'region', name: 'Արմավիրի մարզ', order: 2 },
      { group: 'region', name: 'Արարատի մարզ', order: 3 },
      { group: 'region', name: 'Կոտայքի մարզ', order: 4 },
      { group: 'region', name: 'Լոռու մարզ', order: 5 },
      { group: 'region', name: 'Գեղարքունիքի մարզ', order: 6 },
      { group: 'region', name: 'Տավուշի մարզ', order: 7 },
      { group: 'region', name: 'Սյունիքի մարզ', order: 8 },
      { group: 'region', name: 'Վայոց Ձորի մարզ', order: 9 },
    ];

    for (const z of zones) {
      await ctx.db.insert('deliveryZones', {
        group: z.group,
        name: z.name,
        schedule: '',
        order: z.order,
        isActive: true,
      });
    }
    return `seeded-${zones.length}`;
  },
});
