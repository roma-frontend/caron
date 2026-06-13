import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import type { Id } from './_generated/dataModel';

async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(password));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

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

async function createSession(ctx: any, userId: Id<'users'>, days: number): Promise<string> {
  const token = crypto.randomUUID();
  await ctx.db.insert('sessions', { userId, token, expiresAt: Date.now() + days * 24 * 60 * 60 * 1000, createdAt: Date.now() });
  return token;
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
        const sessionToken = await createSession(ctx, user._id, 7);
        return { userId: user._id, sessionToken, name: user.name, email: user.email, role: user.role, customerType: user.customerType, discountPercent: user.discountPercent, phone: user.phone, address: user.address };
      }
    }

    // Try customer login
    const user = await ctx.db.query('users').withIndex('by_email', (q) => q.eq('email', args.email.toLowerCase())).unique();
    if (!user || !user.passwordHash) throw new Error('Սխալ էլ․ հասցե կամ գաղտնաբառ');
    const inputHash = await hashPassword(args.password);
    const passMatch = await safeEqual(inputHash, user.passwordHash);
    if (!passMatch) throw new Error('Սխալ էլ․ հասցե կամ գաղտնաբառ');
    if (!user.isActive) throw new Error('Օգտագործողը չի գտնվել');
    const sessionToken = await createSession(ctx, user._id, 30);
    return { userId: user._id, sessionToken, name: user.name, email: user.email, role: user.role, customerType: user.customerType, discountPercent: user.discountPercent, phone: user.phone, address: user.address };
  },
});

export const me = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    // Try sessions table first
    const session = await ctx.db.query('sessions').withIndex('by_token', (q) => q.eq('token', args.sessionToken)).unique();
    if (session) {
      if (session.expiresAt < Date.now()) return null;
      const user = await ctx.db.get(session.userId);
      if (!user || !user.isActive) return null;
      return { id: user._id, name: user.name, email: user.email, role: user.role, customerType: user.customerType, discountPercent: user.discountPercent, phone: user.phone, address: user.address };
    }
    // Fallback: old sessionToken on user document
    const user = await ctx.db.query('users').withIndex('by_session_token', (q) => q.eq('sessionToken', args.sessionToken)).unique();
    if (!user || !user.isActive || !user.sessionExpiry || user.sessionExpiry < Date.now()) return null;
    return { id: user._id, name: user.name, email: user.email, role: user.role, customerType: user.customerType, discountPercent: user.discountPercent, phone: user.phone, address: user.address };
  },
});

export const logout = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db.query('sessions').withIndex('by_token', (q) => q.eq('token', args.sessionToken)).unique();
    if (session) await ctx.db.delete(session._id);
  },
});

export const register = mutation({
  args: { name: v.string(), email: v.string(), phone: v.optional(v.string()), password: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Սխալ էլ․ հասցե');
    if (!args.name.trim() || args.name.length > 100) throw new Error('Սխալ անուն');
    if (args.password.length < 8) throw new Error('Գաղտնաբառը պետք է լինի առնվազն 8 նիշ');
    const existing = await ctx.db.query('users').withIndex('by_email', (q) => q.eq('email', email)).unique();
    if (existing) throw new Error('Այս էլ․ հասցեն արդեն գրանցված է');
    const passwordHash = await hashPassword(args.password);
    const id = await ctx.db.insert('users', {
      name: args.name,
      email: email,
      phone: args.phone,
      role: 'customer',
      customerType: 'retail',
      passwordHash,
      isActive: true,
      createdAt: Date.now(),
    });
    const sessionToken = await createSession(ctx, id, 30);
    return { userId: id, sessionToken, name: args.name, email: email, role: 'customer' as const, customerType: 'retail' as const, discountPercent: undefined, phone: args.phone };
  },
});
