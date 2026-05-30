import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { getAdminCaller } from './lib/auth';

export const get = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query('settings').first();
    return settings ?? {
      storeName: 'AutoParts Armenia',
      phone: '+374 XX XXX XXX',
      email: 'info@autoparts.am',
      address: 'Երևան, Հայաստան',
      whatsapp: '',
      telegram: '',
      instagram: '',
      facebook: '',
      deliveryYerevan: 1000,
      deliveryRegions: 2000,
      freeShippingThreshold: 20000,
      announcementBar: 'Անվճար առաքում 20,000 ֏-ից ավելի պատվերների համար • Հեռ. +374 XX XXX XXX',
      workingHours: '10:00 - 19:00',
      telegramBotToken: '',
      telegramChatId: '',
      mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d48884.85!2d44.5!3d40.18!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x406aa2dab8fc8b5b%3A0x3d1479ae87da526a!2sYerevan!5e0!3m2!1sen!2sam!4v1',
      maintenanceMode: false,
      maintenanceMessage: '',
      accentColor: '',
      announcementEnabled: true,
      showCategories: true,
      showFeatured: true,
      showBrands: true,
      showFeatures: true,
      enableCarSelector: true,
      enableReviews: true,
    };
  },
});

export const getPublic = query({
  args: {},
  handler: async (ctx) => {
    const s = await ctx.db.query('settings').first();
    if (!s) return null;
    const { telegramBotToken, telegramChatId, ...pub } = s;
    return pub;
  },
});

export const save = mutation({
  args: {
    sessionToken: v.string(),
    storeName: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    whatsapp: v.optional(v.string()),
    telegram: v.optional(v.string()),
    instagram: v.optional(v.string()),
    facebook: v.optional(v.string()),
    deliveryYerevan: v.optional(v.number()),
    deliveryRegions: v.optional(v.number()),
    freeShippingThreshold: v.optional(v.number()),
    announcementBar: v.optional(v.string()),
    workingHours: v.optional(v.string()),
    telegramBotToken: v.optional(v.string()),
    telegramChatId: v.optional(v.string()),
    mapUrl: v.optional(v.string()),
    maintenanceMode: v.optional(v.boolean()),
    maintenanceMessage: v.optional(v.string()),
    accentColor: v.optional(v.string()),
    announcementEnabled: v.optional(v.boolean()),
    showCategories: v.optional(v.boolean()),
    showFeatured: v.optional(v.boolean()),
    showBrands: v.optional(v.boolean()),
    showFeatures: v.optional(v.boolean()),
    enableCarSelector: v.optional(v.boolean()),
    enableReviews: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await getAdminCaller(ctx, args.sessionToken);
    const { sessionToken, ...data } = args;
    const existing = await ctx.db.query('settings').first();
    if (existing) {
      await ctx.db.patch(existing._id, data);
    } else {
      await ctx.db.insert('settings', {
        storeName: args.storeName ?? 'AutoParts Armenia',
        phone: args.phone ?? '',
        email: args.email ?? '',
        address: args.address ?? '',
        whatsapp: args.whatsapp ?? '',
        telegram: args.telegram ?? '',
        instagram: args.instagram ?? '',
        facebook: args.facebook ?? '',
        deliveryYerevan: args.deliveryYerevan ?? 1000,
        deliveryRegions: args.deliveryRegions ?? 2000,
        freeShippingThreshold: args.freeShippingThreshold ?? 20000,
        announcementBar: args.announcementBar ?? '',
        workingHours: args.workingHours ?? '10:00 - 19:00',
        telegramBotToken: args.telegramBotToken ?? '',
        telegramChatId: args.telegramChatId ?? '',
        mapUrl: args.mapUrl ?? '',
      });
    }
  },
});
