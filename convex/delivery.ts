import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { getAdminCaller } from './lib/auth';
import { computeDeliveryQuote, ruleNote, type RuleLike, type ZoneLike } from './lib/delivery';

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
    price: v.optional(v.number()),
    freeThreshold: v.optional(v.number()),
    etaText: v.optional(v.string()),
    keywords: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    const { sessionToken: _, id, ...rest } = args;
    if (id) {
      const patch: Record<string, unknown> = { name: rest.name, schedule: rest.schedule, group: rest.group };
      if (typeof rest.order === 'number') patch.order = rest.order;
      if (typeof rest.isActive === 'boolean') patch.isActive = rest.isActive;
      if (rest.price !== undefined) patch.price = rest.price;
      if (rest.freeThreshold !== undefined) patch.freeThreshold = rest.freeThreshold;
      if (rest.etaText !== undefined) patch.etaText = rest.etaText;
      if (rest.keywords !== undefined) patch.keywords = rest.keywords;
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
      price: rest.price,
      freeThreshold: rest.freeThreshold,
      etaText: rest.etaText,
      keywords: rest.keywords,
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

    // Russian/English address aliases to help auto-detect the zone from a typed
    // address. Admins can extend these per zone afterwards.
    const ALIASES: Record<string, string[]> = {
      'Արաբկիր': ['Арабкир', 'Arabkir'],
      'Կենտրոն': ['Кентрон', 'Центр', 'Kentron', 'Center'],
      'Էրեբունի': ['Эребуни', 'Erebuni'],
      'Մալաթիա-Սեբաստիա': ['Малатия', 'Себастия', 'Malatia', 'Sebastia'],
      'Շենգավիթ': ['Шенгавит', 'Shengavit'],
      'Նորք-Մարաշ': ['Норк', 'Мараш', 'Nork', 'Marash'],
      'Ավան-Առինջ': ['Аван', 'Аринж', 'Avan', 'Arinj'],
      'Քանաքեռ-Զեյթուն': ['Канакер', 'Зейтун', 'Kanaker', 'Zeytun'],
      'Աջափնյակ': ['Аджапняк', 'Ajapnyak'],
      'Դավթաշեն': ['Давташен', 'Davtashen'],
      'Նոր Նորք': ['Нор Норк', 'Nor Nork'],
      'Արագածոտնի մարզ': ['Арагацотн', 'Аштарак', 'Aragatsotn', 'Ashtarak'],
      'Շիրակի մարզ': ['Ширак', 'Гюмри', 'Shirak', 'Gyumri'],
      'Արմավիրի մարզ': ['Армавир', 'Armavir', 'Эчмиадзин', 'Vagharshapat'],
      'Արարատի մարզ': ['Арарат', 'Арташат', 'Ararat', 'Artashat'],
      'Կոտայքի մարզ': ['Котайк', 'Абовян', 'Раздан', 'Kotayk', 'Abovyan', 'Hrazdan'],
      'Լոռու մարզ': ['Лори', 'Ванадзор', 'Lori', 'Vanadzor'],
      'Գեղարքունիքի մարզ': ['Гегаркуник', 'Гавар', 'Севан', 'Gegharkunik', 'Sevan'],
      'Տավուշի մարզ': ['Тавуш', 'Иджеван', 'Tavush', 'Ijevan', 'Dilijan'],
      'Սյունիքի մարզ': ['Сюник', 'Капан', 'Горис', 'Syunik', 'Kapan', 'Goris'],
      'Վայոց Ձորի մարզ': ['Вайоц Дзор', 'Ехегнадзор', 'Vayots Dzor', 'Yeghegnadzor'],
    };

    for (const z of zones) {
      await ctx.db.insert('deliveryZones', {
        group: z.group,
        name: z.name,
        schedule: '',
        order: z.order,
        isActive: true,
        price: z.group === 'yerevan' ? 1000 : 2000,
        keywords: [z.name.replace(/ մարզ$/, ''), ...(ALIASES[z.name] ?? [])],
      });
    }
    return `seeded-${zones.length}`;
  },
});

// ─── Public quote (live checkout/calculator) ─────────────────────────────────

/**
 * Compute the delivery price for a zone (or group), order subtotal and time.
 * Pure logic lives in lib/delivery so the checkout preview and the server-side
 * recompute on order creation always agree.
 */
export const quoteDelivery = query({
  args: {
    zoneId: v.optional(v.id('deliveryZones')),
    group: v.optional(v.union(v.literal('yerevan'), v.literal('region'))),
    subtotal: v.number(),
    at: v.optional(v.number()),
    lang: v.optional(v.union(v.literal('hy'), v.literal('ru'), v.literal('en'))),
  },
  handler: async (ctx, args) => {
    const zone = args.zoneId ? await ctx.db.get(args.zoneId) : null;
    const settings = await ctx.db.query('settings').first();
    const rules = (await ctx.db.query('deliveryRules').collect()).filter((r) => r.isActive);
    const q = computeDeliveryQuote({
      zone: zone as ZoneLike | null,
      group: args.group,
      subtotal: args.subtotal,
      at: args.at ?? Date.now(),
      settings: settings ?? undefined,
      rules: rules as unknown as RuleLike[],
    });
    return {
      base: q.base,
      price: q.price,
      free: q.free,
      appliedRuleName: q.appliedRule?.name ?? null,
      appliedRuleNote: ruleNote(q.appliedRule as RuleLike | null, args.lang ?? 'hy'),
    };
  },
});

// ─── Delivery Rules / Exceptions ─────────────────────────────────────────────

/** Public: active rules (for the delivery page notes). */
export const rulesList = query({
  args: {},
  handler: async (ctx) => {
    const rules = await ctx.db.query('deliveryRules').collect();
    return rules.filter((r) => r.isActive).sort((a, b) => a.priority - b.priority);
  },
});

/** Admin: all rules. */
export const rulesListAdmin = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    return (await ctx.db.query('deliveryRules').collect()).sort((a, b) => a.priority - b.priority);
  },
});

/** Admin: create or update a rule. */
export const ruleUpsert = mutation({
  args: {
    sessionToken: v.string(),
    id: v.optional(v.id('deliveryRules')),
    name: v.string(),
    isActive: v.optional(v.boolean()),
    priority: v.optional(v.number()),
    group: v.optional(v.union(v.literal('yerevan'), v.literal('region'))),
    zoneIds: v.optional(v.array(v.id('deliveryZones'))),
    weekdays: v.optional(v.array(v.number())),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
    minOrderTotal: v.optional(v.number()),
    effectType: v.union(v.literal('free'), v.literal('fixed'), v.literal('percent')),
    effectValue: v.optional(v.number()),
    note: v.optional(v.string()),
    noteRu: v.optional(v.string()),
    noteEn: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    const { sessionToken: _, id, ...rest } = args;
    if (id) {
      await ctx.db.patch(id, {
        name: rest.name,
        isActive: rest.isActive ?? true,
        priority: rest.priority ?? 0,
        group: rest.group,
        zoneIds: rest.zoneIds,
        weekdays: rest.weekdays,
        dateFrom: rest.dateFrom,
        dateTo: rest.dateTo,
        minOrderTotal: rest.minOrderTotal,
        effectType: rest.effectType,
        effectValue: rest.effectValue,
        note: rest.note,
        noteRu: rest.noteRu,
        noteEn: rest.noteEn,
      });
      return id;
    }
    return await ctx.db.insert('deliveryRules', {
      name: rest.name,
      isActive: rest.isActive ?? true,
      priority: rest.priority ?? 0,
      group: rest.group,
      zoneIds: rest.zoneIds,
      weekdays: rest.weekdays,
      dateFrom: rest.dateFrom,
      dateTo: rest.dateTo,
      minOrderTotal: rest.minOrderTotal,
      effectType: rest.effectType,
      effectValue: rest.effectValue,
      note: rest.note,
      noteRu: rest.noteRu,
      noteEn: rest.noteEn,
      createdAt: Date.now(),
    });
  },
});

/** Admin: delete a rule. */
export const ruleRemove = mutation({
  args: { sessionToken: v.string(), id: v.id('deliveryRules') },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    await ctx.db.delete(args.id);
  },
});
