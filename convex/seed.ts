import { mutation, mutation as seedMutation } from './_generated/server';

export const seed = seedMutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db.query('categories').take(1);
    if (existing.length > 0) return 'Already seeded';

    const now = Date.now();

    // Categories
    const catTires = await ctx.db.insert('categories', { name: 'Անիվներ', slug: 'tires', description: 'Անիվների կատեգորիա', order: 1, isActive: true, createdAt: now });
    const catOils = await ctx.db.insert('categories', { name: 'Նյութեր', slug: 'oils', description: 'Նյութերի կատեգորիա', order: 2, isActive: true, createdAt: now });
    const catFilters = await ctx.db.insert('categories', { name: 'Ֆիլտրեր', slug: 'filters', description: 'Ֆիլտրերի կատեգորիա', order: 3, isActive: true, createdAt: now });
    const catBrakes = await ctx.db.insert('categories', { name: 'Կոճղակ', slug: 'brakes', description: 'Կոճղակների կատեգորիա', order: 4, isActive: true, createdAt: now });
    const catLamps = await ctx.db.insert('categories', { name: 'Լամպեր', slug: 'lamps', description: 'Լամպերի կատեգորիա', order: 5, isActive: true, createdAt: now });
    const catBatteries = await ctx.db.insert('categories', { name: 'Բատարաններ', slug: 'batteries', description: 'Բատարանների կատեգորիա', order: 6, isActive: true, createdAt: now });

    // Products
    const products = [
      { name: 'Michelin Pilot Sport 5 225/45 R17', slug: 'michelin-pilot-sport-5-225-45-r17', description: 'Շարժիչների կատեգորիա', price: 85000, compareAtPrice: 95000, categoryId: catTires, sku: 'TIRE-001', stock: 24, isFeatured: true },
      { name: 'Continental PremiumContact 6 205/55 R16', slug: 'continental-premiumcontact-6', description: 'Նյութերի կատեգորիա', price: 72000, categoryId: catTires, sku: 'TIRE-002', stock: 18, isFeatured: true },
      { name: 'Bridgestone Turanza T005 195/65 R15', slug: 'bridgestone-turanza-t005', description: 'Անիվների կատեգորիա', price: 58000, categoryId: catTires, sku: 'TIRE-003', stock: 32, isFeatured: false },
      { name: 'Mobil 1 5W-30 4', slug: 'mobil-1-5w30-4l', description: 'Նյութերի կատեգորիա', price: 18500, compareAtPrice: 22000, categoryId: catOils, sku: 'OIL-001', stock: 50, isFeatured: true },
      { name: 'Castrol EDGE 5W-40 4', slug: 'castrol-edge-5w40-4l', description: 'Նյութերի կատեգորիա', price: 16000, categoryId: catOils, sku: 'OIL-002', stock: 45, isFeatured: false },
      { name: 'Shell Helix Ultra 0W-20 4', slug: 'shell-helix-ultra-0w20', description: 'Նյութերի կատեգորիա', price: 21000, categoryId: catOils, sku: 'OIL-003', stock: 28, isFeatured: true },
      { name: 'MANN-FILTER W 712/95', slug:'mann-filter-w712-95', description: 'Ֆիլտրերի կատեգորիա', price: 4500, categoryId: catFilters, sku: 'FLT-001', stock:10, isFeatured:false },
      { name: 'Bosch F 026 400 228', slug: 'bosch-air-filter-f026', description: 'Ֆիլտրերի կատեգորիա', price: 5200, categoryId: catFilters, sku: 'FLT-002', stock: 75, isFeatured: false },
      { name: 'Brembo P 85 075', slug: 'brembo-p85075-brake-pads', description: 'Կոճղակների կատեգորիա', price: 28000, compareAtPrice: 32000, categoryId: catBrakes, sku: 'BRK-001', stock: 20, isFeatured: true },
      { name: 'TRW GDB1550', slug: 'trw-gdb1550-brake-pads', description: 'Կոճղակների կատեգորիա', price: 19500, categoryId: catBrakes, sku: 'BRK-002', stock: 35, isFeatured: false },
      { name: 'Philips X-tremeVision H7 +150%', slug: 'philips-xtremevision-h7', description: 'Լամպերի կատեգորիա', price: 8500, compareAtPrice: 10000, categoryId: catLamps, sku: 'LMP-001', stock: 60, isFeatured: true },
      { name: 'Osram Night Breaker H4', slug: 'osram-night-breaker-h4', description: 'Լամպերի կատեգորիա', price: 7200, categoryId: catLamps, sku: 'LMP-002', stock: 48, isFeatured: false },
      { name: 'Varta Blue Dynamic D24 60Ah', slug: 'varta-blue-dynamic-d24', description: 'Բատարանների կատեգորիա', price:45000, compareAtPrice:52000, categoryId:catBatteries, sku:'BAT-001', stock:12, isFeatured:true },
      { name: 'Bosch S4 005 60Ah', slug: 'bosch-s4-005-60ah', description: 'Բատարանների կատեգորիա', price:42000, categoryId:catBatteries, sku:'BAT-002', stock:15, isFeatured:false },
    ];

    for (const p of products) {
      await ctx.db.insert('products', { ...p, images: [], isActive: true, createdAt: now, updatedAt: now });
    }

    return `Seeded: 6 categories, ${products.length} products`;
  },
});

export const setImages = seedMutation({
  args: {},
  handler: async (ctx) => {
    const imageMap: Record<string, string[]> = {
      tires: ['/products/tires.jpg'],
      oils: ['/products/oils.jpg', '/products/oils_2.jpg'],
      filters: ['/products/filters.jpg'],
      brakes: ['/products/brakes.jpg'],
      lamps: ['/products/lamps.jpg'],
      batteries: ['/products/batteries.jpg'],
    };
    const cats = await ctx.db.query('categories').collect();
    const slugById = new Map(cats.map((c) => [c._id, c.slug]));
    const products = await ctx.db.query('products').collect();
    let n = 0;
    for (const p of products) {
      const slug = slugById.get(p.categoryId);
      const imgs = slug ? imageMap[slug] : undefined;
      if (!imgs) continue;
      const sameAsOld = p.images?.length === 1 && p.images[0] === imgs[0];
      if (p.images && p.images.length > 1) continue;
      if (p.images?.length === 1 && !sameAsOld) continue;
      await ctx.db.patch(p._id, { images: imgs, updatedAt: Date.now() });
      n++;
    }
    return `Updated ${n} products`;
  },
});
