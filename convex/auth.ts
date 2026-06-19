import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import type { MutationCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';

const PASSWORD_HASH_PREFIX = 'pbkdf2-sha256';
const PASSWORD_HASH_ITERATIONS = 210_000;
const MAX_LOGIN_FAILURES = 5;
const LOGIN_LOCK_MS = 15 * 60 * 1000;

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  if (hex.length % 2 !== 0) throw new Error('Invalid hex value');
  const bytes = new Uint8Array(new ArrayBuffer(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function derivePbkdf2(password: string, saltHex: string, iterations: number): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: hexToBytes(saltHex), iterations },
    key,
    256,
  );
  return bytesToHex(new Uint8Array(bits));
}

async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const saltHex = bytesToHex(salt);
  const hashHex = await derivePbkdf2(password, saltHex, PASSWORD_HASH_ITERATIONS);
  return `${PASSWORD_HASH_PREFIX}$${PASSWORD_HASH_ITERATIONS}$${saltHex}$${hashHex}`;
}

async function hashLegacyPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(password));
  return bytesToHex(new Uint8Array(hash));
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (storedHash.startsWith(`${PASSWORD_HASH_PREFIX}$`)) {
    const [, iterationsRaw, saltHex, expectedHex] = storedHash.split('$');
    const iterations = Number(iterationsRaw);
    if (!iterations || !saltHex || !expectedHex) return false;
    const actualHex = await derivePbkdf2(password, saltHex, iterations);
    return safeEqual(actualHex, expectedHex);
  }

  return safeEqual(await hashLegacyPassword(password), storedHash);
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

async function createSession(ctx: MutationCtx, userId: Id<'users'>, days: number): Promise<string> {
  const token = crypto.randomUUID();
  await ctx.db.insert('sessions', { userId, token, expiresAt: Date.now() + days * 24 * 60 * 60 * 1000, createdAt: Date.now() });
  return token;
}

/** Generate a unique, human-friendly referral code. */
async function generateReferralCode(ctx: MutationCtx): Promise<string> {
  for (let i = 0; i < 6; i++) {
    const code = 'C' + Math.random().toString(36).slice(2, 8).toUpperCase();
    const existing = await ctx.db.query('users').withIndex('by_referral_code', (q) => q.eq('referralCode', code)).first();
    if (!existing) return code;
  }
  return 'C' + Date.now().toString(36).toUpperCase();
}

async function assertLoginAllowed(ctx: MutationCtx, key: string): Promise<void> {
  const attempt = await ctx.db.query('authAttempts').withIndex('by_key', (q) => q.eq('key', key)).unique();
  if (attempt?.lockedUntil && attempt.lockedUntil > Date.now()) {
    throw new Error('Չափազանց շատ փորձեր։ Փորձեք ավելի ուշ։');
  }
}

async function recordLoginFailure(ctx: MutationCtx, key: string): Promise<void> {
  const now = Date.now();
  const attempt = await ctx.db.query('authAttempts').withIndex('by_key', (q) => q.eq('key', key)).unique();
  const failures = (attempt?.lockedUntil && attempt.lockedUntil <= now ? 0 : attempt?.failures ?? 0) + 1;
  const patch = {
    failures,
    lockedUntil: failures >= MAX_LOGIN_FAILURES ? now + LOGIN_LOCK_MS : undefined,
    updatedAt: now,
  };
  if (attempt) await ctx.db.patch(attempt._id, patch);
  else await ctx.db.insert('authAttempts', { key, ...patch });
}

async function clearLoginFailures(ctx: MutationCtx, key: string): Promise<void> {
  const attempt = await ctx.db.query('authAttempts').withIndex('by_key', (q) => q.eq('key', key)).unique();
  if (attempt) await ctx.db.delete(attempt._id);
}

export const login = mutation({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const attemptKey = `login:${email}`;
    await assertLoginAllowed(ctx, attemptKey);

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    // Try admin login first
    if (adminEmail && (adminPassword || adminPasswordHash)) {
      const emailMatch = await safeEqual(email, adminEmail.toLowerCase());
      const passMatch = adminPasswordHash
        ? await verifyPassword(args.password, adminPasswordHash)
        : await safeEqual(args.password, adminPassword!);
      if (emailMatch && passMatch) {
        let user = await ctx.db.query('users').withIndex('by_email', (q) => q.eq('email', adminEmail.toLowerCase())).unique();
        if (!user) {
          const id = await ctx.db.insert('users', { name: 'Admin', email: adminEmail.toLowerCase(), role: 'admin', isActive: true, createdAt: Date.now() });
          user = (await ctx.db.get(id))!;
        }
        await clearLoginFailures(ctx, attemptKey);
        const sessionToken = await createSession(ctx, user._id, 7);
        return { userId: user._id, sessionToken, name: user.name, email: user.email, role: user.role, customerType: user.customerType, discountPercent: user.discountPercent, phone: user.phone, address: user.address };
      }
    }

    // Try customer login
    const user = await ctx.db.query('users').withIndex('by_email', (q) => q.eq('email', email)).unique();
    if (!user || !user.passwordHash) {
      await recordLoginFailure(ctx, attemptKey);
      throw new Error('Սխալ էլ․ հասցե կամ գաղտնաբառ');
    }
    const passMatch = await verifyPassword(args.password, user.passwordHash);
    if (!passMatch) {
      await recordLoginFailure(ctx, attemptKey);
      throw new Error('Սխալ էլ․ հասցե կամ գաղտնաբառ');
    }
    if (!user.isActive) throw new Error('Օգտագործողը չի գտնվել');
    await clearLoginFailures(ctx, attemptKey);
    if (!user.passwordHash.startsWith(`${PASSWORD_HASH_PREFIX}$`)) {
      await ctx.db.patch(user._id, { passwordHash: await hashPassword(args.password) });
    }
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
  args: { name: v.string(), email: v.string(), phone: v.optional(v.string()), password: v.string(), referralCode: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Սխալ էլ․ հասցե');
    if (!args.name.trim() || args.name.length > 100) throw new Error('Սխալ անուն');
    if (args.password.length < 8) throw new Error('Գաղտնաբառը պետք է լինի առնվազն 8 նիշ');
    const existing = await ctx.db.query('users').withIndex('by_email', (q) => q.eq('email', email)).unique();
    if (existing) throw new Error('Այս էլ․ հասցեն արդեն գրանցված է');

    // Resolve referrer from a referral code (if provided and valid).
    let referredBy: Id<'users'> | undefined;
    if (args.referralCode?.trim()) {
      const code = args.referralCode.trim().toUpperCase();
      const refUser = await ctx.db.query('users').withIndex('by_referral_code', (q) => q.eq('referralCode', code)).first();
      if (refUser) referredBy = refUser._id;
    }
    const referralCode = await generateReferralCode(ctx);

    const passwordHash = await hashPassword(args.password);
    const id = await ctx.db.insert('users', {
      name: args.name,
      email: email,
      phone: args.phone,
      role: 'customer',
      customerType: 'retail',
      passwordHash,
      isActive: true,
      referralCode,
      referredBy,
      createdAt: Date.now(),
    });
    const sessionToken = await createSession(ctx, id, 30);
    return { userId: id, sessionToken, name: args.name, email: email, role: 'customer' as const, customerType: 'retail' as const, discountPercent: undefined, phone: args.phone };
  },
});

/** Ensure the current user has a referral code; returns code + referral count. */
export const ensureReferralCode = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db.query('sessions').withIndex('by_token', (q) => q.eq('token', args.sessionToken)).unique();
    const userId = session?.userId;
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    let code = user.referralCode;
    if (!code) {
      code = await generateReferralCode(ctx);
      await ctx.db.patch(userId, { referralCode: code });
    }
    const allUsers = await ctx.db.query('users').withIndex('by_role', (q) => q.eq('role', 'customer')).take(5000);
    const referredCount = allUsers.filter((u) => u.referredBy === userId).length;
    return { code, referredCount };
  },
});
