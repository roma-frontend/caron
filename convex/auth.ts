import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) throw new Error('Admin not configured');
    if (args.email.toLowerCase() !== adminEmail.toLowerCase() || args.password !== adminPassword) {
      throw new Error('Սխալ էլ. փոստ կամ գաղտնաբառ');
    }

    // Find or create admin user
    let user = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', adminEmail.toLowerCase()))
      .unique();

    if (!user) {
      const id = await ctx.db.insert('users', {
        name: 'Admin',
        email: adminEmail.toLowerCase(),
        role: 'admin',
        isActive: true,
        createdAt: Date.now(),
      });
      user = (await ctx.db.get(id))!;
    }

    const sessionToken = crypto.randomUUID();
    await ctx.db.patch(user._id, {
      sessionToken,
      sessionExpiry: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    return { userId: user._id, sessionToken, name: user.name, email: user.email, role: user.role };
  },
});

export const me = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const users = await ctx.db.query('users').take(100);
    const user = users.find((u) => u.sessionToken === args.sessionToken);
    if (!user || !user.sessionExpiry || user.sessionExpiry < Date.now()) return null;
    return { id: user._id, name: user.name, email: user.email, role: user.role };
  },
});

export const logout = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const users = await ctx.db.query('users').take(100);
    const user = users.find((u) => u.sessionToken === args.sessionToken);
    if (user) {
      await ctx.db.patch(user._id, { sessionToken: undefined, sessionExpiry: undefined });
    }
  },
});
