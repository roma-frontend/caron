import { v, ConvexError } from 'convex/values';
import { query, mutation } from './_generated/server';
import { getAdminCaller, logAudit } from './lib/auth';
import { generateBase32Secret, verifyTotp, otpauthUri, sha256Hex, generateRecoveryCodes } from './lib/totp';

/** Current staff user's 2FA status (enabled + whether a setup is pending). */
export const status = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const caller = await getAdminCaller(ctx, args.sessionToken);
    const user = await ctx.db.get(caller._id);
    return {
      enabled: !!user?.twoFactorEnabled,
      pending: !!user?.twoFactorSecret && !user?.twoFactorEnabled,
      recoveryRemaining: user?.twoFactorRecoveryCodes?.length ?? 0,
    };
  },
});

/** Begin 2FA setup: generate a fresh secret (not yet active) + otpauth URI. */
export const startSetup = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const caller = await getAdminCaller(ctx, args.sessionToken);
    const user = (await ctx.db.get(caller._id))!;
    if (user.twoFactorEnabled) throw new ConvexError({ code: 'ALREADY_ENABLED' });
    const secret = generateBase32Secret();
    await ctx.db.patch(caller._id, { twoFactorSecret: secret, twoFactorEnabled: false });
    return { secret, uri: otpauthUri(secret, user.email || user.name) };
  },
});

/** Confirm setup with a valid code → enable 2FA and return one-time recovery codes. */
export const enable = mutation({
  args: { sessionToken: v.string(), code: v.string() },
  handler: async (ctx, args) => {
    const caller = await getAdminCaller(ctx, args.sessionToken);
    const user = (await ctx.db.get(caller._id))!;
    if (user.twoFactorEnabled) throw new ConvexError({ code: 'ALREADY_ENABLED' });
    if (!user.twoFactorSecret) throw new ConvexError({ code: 'NO_PENDING_SETUP' });
    const ok = await verifyTotp(user.twoFactorSecret, args.code);
    if (!ok) throw new ConvexError({ code: 'INVALID_CODE' });

    const recoveryCodes = generateRecoveryCodes();
    const hashed = await Promise.all(recoveryCodes.map((c) => sha256Hex(c)));
    await ctx.db.patch(caller._id, { twoFactorEnabled: true, twoFactorRecoveryCodes: hashed });
    await logAudit(ctx, caller, 'user.2faEnable', `Enabled 2FA for "${user.name}"`,
      { targetType: 'user', targetId: caller._id });
    return { recoveryCodes };
  },
});

/** Disable 2FA (requires a valid current code or recovery code). */
export const disable = mutation({
  args: { sessionToken: v.string(), code: v.string() },
  handler: async (ctx, args) => {
    const caller = await getAdminCaller(ctx, args.sessionToken);
    const user = (await ctx.db.get(caller._id))!;
    if (!user.twoFactorEnabled || !user.twoFactorSecret) return { ok: true };
    let ok = await verifyTotp(user.twoFactorSecret, args.code);
    if (!ok) {
      const hash = await sha256Hex(args.code.trim().toLowerCase());
      ok = (user.twoFactorRecoveryCodes ?? []).includes(hash);
    }
    if (!ok) throw new ConvexError({ code: 'INVALID_CODE' });
    await ctx.db.patch(caller._id, { twoFactorEnabled: false, twoFactorSecret: undefined, twoFactorRecoveryCodes: undefined });
    await logAudit(ctx, caller, 'user.2faDisable', `Disabled 2FA for "${user.name}"`,
      { targetType: 'user', targetId: caller._id });
    return { ok: true };
  },
});
