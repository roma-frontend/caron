import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

async function safeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ]);
  const x = new Uint8Array(ha);
  const y = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

export const login = mutation({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    // Try admin login first
    if (adminEmail && adminPassword) {
      const emailMatch = await safeEqual(args.email.toLowerCase(), adminEmail.toLowerCase());
      const passMatch = await safeEqual(args.password, adminPassword);
      if (emailMatch && passMatch) {
        let user = await ctx.db.query('users').withIndex('by_email', (q) => q.eq('email', adminEmail.toLowerCase())).unique();
        if (!user) {
          const id = await ctx.db.insert('users', { name: 'Admin', email: adminEmail.toLowerCase(), role: 'admin', isActive: true, createdAt: Date.now() });
          user = (await ctx.db.get(id))!;
        }
        const sessionToken = crypto.randomUUID();
        await ctx.db.patch(user._id, { sessionToken, sessionExpiry: Date.now() + 7 * 24 * 60 * 60 * 1000 });
        return { userId: user._id, sessionToken, name: user.name, email: user.email, role: user.role, customerType: user.customerType, discountPercent: user.discountPercent, phone: user.phone };
      }
    }

    // Try customer login
    const user = await ctx.db.query('users').withIndex('by_email', (q) => q.eq('email', args.email.toLowerCase())).unique();
    if (!user || !user.passwordHash) throw new Error('Схала эл. пошт или пахтанабар');
    const passMatch = await safeEqual(args.password, user.passwordHash);
    if (!passMatch) throw new Error('Схала эл. пошт или пахтанабар');
    if (!user.isActive) throw new Error('Огтахасирэл э');
    const sessionToken = crypto.randomUUID();
    await ctx.db.patch(user._id, { sessionToken, sessionExpiry: Date.now() + 30 * 24 * 60 * 60 * 1000 });
    return { userId: user._id, sessionToken, name: user.name, email: user.email, role: user.role, customerType: user.customerType, discountPercent: user.discountPercent, phone: user.phone };
  },
});

export const me = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db.query('users').withIndex('by_session_token', (q) => q.eq('sessionToken', args.sessionToken)).unique();
    if (!user || !user.sessionExpiry || user.sessionExpiry < Date.now()) return null;
    return { id: user._id, name: user.name, email: user.email, role: user.role, customerType: user.customerType, discountPercent: user.discountPercent, phone: user.phone };
  },
});

export const logout = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db.query('users').withIndex('by_session_token', (q) => q.eq('sessionToken', args.sessionToken)).unique();
    if (user) await ctx.db.patch(user._id, { sessionToken: undefined, sessionExpiry: undefined });
  },
});

export const register = mutation({
  args: { name: v.string(), email: v.string(), phone: v.optional(v.string()), password: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query('users').withIndex('by_email', (q) => q.eq('email', args.email.toLowerCase())).unique();
    if (existing) throw new Error('Эл. пошт артен грануцвел э');
    const enc = new TextEncoder();
    const hash = await crypto.subtle.digest('SHA-256', enc.encode(args.password));
    const passwordHash = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
    const id = await ctx.db.insert('users', {
      name: args.name,
      email: args.email.toLowerCase(),
      phone: args.phone,
      role: 'customer',
      customerType: 'retail',
      passwordHash,
      isActive: true,
      createdAt: Date.now(),
    });
    const sessionToken = crypto.randomUUID();
    await ctx.db.patch(id, { sessionToken, sessionExpiry: Date.now() + 30 * 24 * 60 * 60 * 1000 });
    return { userId: id, sessionToken, name: args.name, email: args.email.toLowerCase(), role: 'customer' as const, customerType: 'retail' as const, discountPercent: undefined, phone: args.phone };
  },
});
