import { v } from 'convex/values';
import { mutation, query, action } from './_generated/server';
import { api } from './_generated/api';
import { ConvexError } from 'convex/values';
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
    throw new ConvexError({ code: 'TOO_MANY_ATTEMPTS' });
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
      throw new ConvexError({ code: 'INVALID_CREDENTIALS' });
    }
    const passMatch = await verifyPassword(args.password, user.passwordHash);
    if (!passMatch) {
      await recordLoginFailure(ctx, attemptKey);
      throw new ConvexError({ code: 'INVALID_CREDENTIALS' });
    }
    if (!user.isActive) throw new ConvexError({ code: 'USER_INACTIVE' });
    await clearLoginFailures(ctx, attemptKey);
    if (!user.passwordHash.startsWith(`${PASSWORD_HASH_PREFIX}$`)) {
      await ctx.db.patch(user._id, { passwordHash: await hashPassword(args.password) });
    }
    const sessionToken = await createSession(ctx, user._id, 30);
    return { userId: user._id, sessionToken, name: user.name, email: user.email, role: user.role, customerType: user.customerType, discountPercent: user.discountPercent, phone: user.phone, address: user.address };
  },
});

/** Public numeric Telegram bot id (the token prefix before ':'). Not secret —
 * it's embedded in the login widget — and needed by the custom Telegram button
 * to call Telegram.Login.auth(). Null when the bot token isn't configured. */
export const telegramBotId = query({
  args: {},
  handler: async () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return null;
    const id = token.split(':')[0];
    return /^\d+$/.test(id) ? id : null;
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
      return { id: user._id, name: user.name, email: user.email, role: user.role, customerType: user.customerType, discountPercent: user.discountPercent, phone: user.phone, address: user.address, telegramUsername: user.telegramUsername };
    }
    // Fallback: old sessionToken on user document
    const user = await ctx.db.query('users').withIndex('by_session_token', (q) => q.eq('sessionToken', args.sessionToken)).unique();
    if (!user || !user.isActive || !user.sessionExpiry || user.sessionExpiry < Date.now()) return null;
    return { id: user._id, name: user.name, email: user.email, role: user.role, customerType: user.customerType, discountPercent: user.discountPercent, phone: user.phone, address: user.address, telegramUsername: user.telegramUsername };
  },
});

export const logout = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db.query('sessions').withIndex('by_token', (q) => q.eq('token', args.sessionToken)).unique();
    if (session) await ctx.db.delete(session._id);
  },
});

/**
 * Change the current user's password.
 *
 * The DB password is what the generic email-login path verifies, so setting it
 * gives the admin a working credential even when the bootstrap login still uses
 * env vars (the env check just runs first). Verification of the current
 * password:
 *  - if a `passwordHash` already exists → it must match;
 *  - otherwise (e.g. an env-only admin that never set a DB password) → verify
 *    against the configured `ADMIN_PASSWORD` / `ADMIN_PASSWORD_HASH` so we never
 *    let an authenticated session set a password without proving the old one.
 */
export const changePassword = mutation({
  args: { sessionToken: v.string(), currentPassword: v.string(), newPassword: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db.query('sessions').withIndex('by_token', (q) => q.eq('token', args.sessionToken)).unique();
    if (!session || session.expiresAt < Date.now()) throw new Error('Սեսիան ավարտվել է');
    const user = await ctx.db.get(session.userId);
    if (!user || !user.isActive) throw new Error('Օգտագործողը չի գտնվել');

    if (args.newPassword.length < 8) throw new Error('Նոր գաղտնաբառը պետք է լինի առնվազն 8 նիշ');

    let currentOk = false;
    if (user.passwordHash) {
      currentOk = await verifyPassword(args.currentPassword, user.passwordHash);
    } else {
      // Env-bootstrap admin without a DB password yet.
      const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
      const adminPassword = process.env.ADMIN_PASSWORD;
      const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
      if (user.role === 'admin' && adminEmail && user.email.toLowerCase() === adminEmail) {
        currentOk = adminPasswordHash
          ? await verifyPassword(args.currentPassword, adminPasswordHash)
          : adminPassword
            ? await safeEqual(args.currentPassword, adminPassword)
            : false;
      }
    }
    if (!currentOk) throw new Error('Ընթացիկ գաղտնաբառը սխալ է');

    await ctx.db.patch(user._id, { passwordHash: await hashPassword(args.newPassword) });
    return { success: true };
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

/**
 * Public registration entry point with Cloudflare Turnstile bot protection.
 * Actions can perform network I/O (mutations cannot), so the captcha token is
 * verified here, then account creation is delegated to the `register` mutation.
 * Inert until TURNSTILE_SECRET_KEY is set in the Convex environment — until then
 * it behaves exactly like calling register directly.
 */
export const registerWithTurnstile = action({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    password: v.string(),
    referralCode: v.optional(v.string()),
    turnstileToken: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    userId: Id<'users'>;
    sessionToken: string;
    name: string;
    email: string;
    role: 'customer';
    customerType: 'retail';
    discountPercent: undefined;
    phone: string | undefined;
  }> => {
    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (secret) {
      const token = args.turnstileToken;
      if (!token) throw new Error('Captcha required');
      let ok = false;
      try {
        const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ secret, response: token }),
        });
        ok = res.ok && ((await res.json()) as { success?: boolean }).success === true;
      } catch {
        ok = false;
      }
      if (!ok) throw new Error('Captcha verification failed');
    }
    return await ctx.runMutation(api.auth.register, {
      name: args.name,
      email: args.email,
      phone: args.phone,
      password: args.password,
      referralCode: args.referralCode,
    });
  },
});

/**
 * Verify the HMAC signature of a Telegram Login Widget payload.
 * secret_key = SHA256(bot_token); hash = HMAC_SHA256(data_check_string, secret_key).
 * data_check_string = the received fields (except `hash`) as `key=value`, sorted
 * alphabetically and joined by "\n". See https://core.telegram.org/widgets/login
 */
async function verifyTelegramHash(fields: Record<string, string>, hash: string, botToken: string): Promise<boolean> {
  const dataCheckString = Object.keys(fields)
    .filter((k) => fields[k] !== undefined && fields[k] !== '')
    .sort()
    .map((k) => `${k}=${fields[k]}`)
    .join('\n');
  const enc = new TextEncoder();
  const secretKey = await crypto.subtle.digest('SHA-256', enc.encode(botToken));
  const key = await crypto.subtle.importKey('raw', secretKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(dataCheckString));
  return safeEqual(bytesToHex(new Uint8Array(sig)), hash.toLowerCase());
}

const TELEGRAM_AUTH_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Sign in (or sign up) with the Telegram Login Widget. The widget hands the
 * client a signed payload; we re-verify the HMAC server-side with the bot token
 * (never trusting the client), reject stale authorizations, then find-or-create
 * a user keyed by Telegram id and issue a session — same shape as email login.
 */
export const loginWithTelegram = mutation({
  args: {
    id: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    username: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
    authDate: v.string(),
    hash: v.string(),
  },
  handler: async (ctx, args) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) throw new Error('Telegram մուտքը կարգավորված չէ');

    // Reconstruct exactly the fields Telegram signed (omit empty/optional ones).
    const fields: Record<string, string> = { id: args.id, auth_date: args.authDate };
    if (args.firstName) fields.first_name = args.firstName;
    if (args.lastName) fields.last_name = args.lastName;
    if (args.username) fields.username = args.username;
    if (args.photoUrl) fields.photo_url = args.photoUrl;

    if (!(await verifyTelegramHash(fields, args.hash, botToken))) {
      throw new Error('Telegram ստուգումը ձախողվեց');
    }

    // Replay protection: the signature is reusable, so freshness is enforced here.
    const authDateMs = Number(args.authDate) * 1000;
    if (!Number.isFinite(authDateMs) || Date.now() - authDateMs > TELEGRAM_AUTH_MAX_AGE_MS) {
      throw new Error('Telegram վավերացման ժամկետը լրացել է, փորձեք կրկին');
    }

    let user = await ctx.db.query('users').withIndex('by_telegram_id', (q) => q.eq('telegramId', args.id)).unique();
    if (!user) {
      const name = [args.firstName, args.lastName].filter(Boolean).join(' ').trim() || args.username || `Telegram ${args.id}`;
      const referralCode = await generateReferralCode(ctx);
      // Telegram doesn't provide an email; use a clearly-synthetic placeholder so
      // the schema invariant holds. The user can set a real email later.
      const placeholderEmail = `tg_${args.id}@telegram.local`;
      const newId = await ctx.db.insert('users', {
        name,
        email: placeholderEmail,
        telegramId: args.id,
        telegramUsername: args.username,
        role: 'customer',
        customerType: 'retail',
        isActive: true,
        referralCode,
        createdAt: Date.now(),
      });
      user = (await ctx.db.get(newId))!;
    } else if (args.username && user.telegramUsername !== args.username) {
      await ctx.db.patch(user._id, { telegramUsername: args.username });
    }
    if (!user.isActive) throw new Error('Օգտագործողը արգելափակված է');

    const sessionToken = await createSession(ctx, user._id, 30);
    return { userId: user._id, sessionToken, name: user.name, email: user.email, role: user.role, customerType: user.customerType, discountPercent: user.discountPercent, phone: user.phone, address: user.address, telegramUsername: user.telegramUsername };
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
