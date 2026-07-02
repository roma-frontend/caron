import { v, ConvexError } from 'convex/values';
import { action, mutation, internalMutation, internalQuery } from './_generated/server';
import { internal } from './_generated/api';
import { hashPassword } from './auth';

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** SHA-256 hex of the raw token — only the hash is ever persisted. */
async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(input));
  return bytesToHex(new Uint8Array(digest));
}

/** Internal: resolve an active user by email (used by the reset action). */
export const _findUserByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db.query('users').withIndex('by_email', (q) => q.eq('email', args.email)).unique();
    if (!user || !user.isActive) return null;
    return { id: user._id, name: user.name };
  },
});

/** Internal: persist a reset token, invalidating any previous ones for the user. */
export const _storeToken = internalMutation({
  args: { userId: v.id('users'), tokenHash: v.string(), expiresAt: v.number() },
  handler: async (ctx, args) => {
    const old = await ctx.db.query('passwordResets').withIndex('by_user', (q) => q.eq('userId', args.userId)).collect();
    for (const r of old) await ctx.db.delete(r._id);
    await ctx.db.insert('passwordResets', { userId: args.userId, tokenHash: args.tokenHash, expiresAt: args.expiresAt, createdAt: Date.now() });
  },
});

/**
 * Request a password-reset email. Always resolves successfully to avoid account
 * enumeration. A link is emailed only for an active account with a real
 * (non-Telegram) address when RESEND_API_KEY is configured.
 */
export const requestPasswordReset = action({
  args: { email: v.string() },
  handler: async (ctx, args): Promise<{ ok: true }> => {
    const email = args.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.endsWith('@telegram.local')) return { ok: true };

    const user = await ctx.runQuery(internal.passwordReset._findUserByEmail, { email });
    if (!user) return { ok: true };

    const rawToken = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, '');
    const tokenHash = await sha256Hex(rawToken);
    await ctx.runMutation(internal.passwordReset._storeToken, { userId: user.id, tokenHash, expiresAt: Date.now() + RESET_TTL_MS });

    const apiKey = process.env.RESEND_API_KEY;
    if (process.env.NOTIFICATIONS_DISABLED === '1') return { ok: true }; // silenced (dev/E2E) — token stored, no delivery
    if (!apiKey) return { ok: true }; // email not configured — token stored, no delivery

    const siteUrl = (process.env.SITE_URL || 'https://www.caron.group').replace(/\/$/, '');
    const link = `${siteUrl}/reset-password?token=${rawToken}`;
    const html = `<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b">
      <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e4e4e7">
        <h1 style="font-size:20px;margin:0 0 8px">Caron</h1>
        <p style="font-size:15px;line-height:1.5">Հարգելի ${user.name}, դուք հայցել եք գաղտնաբառի վերականգնում։</p>
        <p style="font-size:15px;line-height:1.5">Сброс пароля / Reset your password:</p>
        <p style="margin:24px 0"><a href="${link}" style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:bold;display:inline-block">Վերականգնել · Сбросить · Reset</a></p>
        <p style="font-size:13px;color:#71717a;line-height:1.5">Հղումը գործում է 1 ժամ։ Եթե դուք չեք հայցել՝ անտեսեք այս նամակը.<br/>The link expires in 1 hour. If you didn't request this, ignore this email.</p>
        <p style="font-size:12px;color:#a1a1aa;word-break:break-all">${link}</p>
      </div></body></html>`;
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: (process.env.EMAIL_FROM || 'Caron <noreply@caron.group>').trim(),
          to: email,
          subject: 'Վերականգնել գաղտնաբառը · Caron',
          html,
        }),
      });
    } catch {
      /* best-effort: never surface delivery failures to the requester */
    }
    return { ok: true };
  },
});

/** Complete a password reset with the emailed single-use token. */
export const resetPassword = mutation({
  args: { token: v.string(), newPassword: v.string() },
  handler: async (ctx, args): Promise<{ ok: true }> => {
    if (args.newPassword.length < 8) throw new ConvexError({ code: 'WEAK_PASSWORD' });
    const tokenHash = await sha256Hex(args.token);
    const rec = await ctx.db.query('passwordResets').withIndex('by_tokenHash', (q) => q.eq('tokenHash', tokenHash)).unique();
    if (!rec || rec.usedAt || rec.expiresAt < Date.now()) throw new ConvexError({ code: 'INVALID_TOKEN' });
    const user = await ctx.db.get(rec.userId);
    if (!user || !user.isActive) throw new ConvexError({ code: 'INVALID_TOKEN' });

    await ctx.db.patch(user._id, { passwordHash: await hashPassword(args.newPassword) });
    await ctx.db.patch(rec._id, { usedAt: Date.now() });
    // Revoke every existing session — a reset should log out other devices.
    const sessions = await ctx.db.query('sessions').withIndex('by_user', (q) => q.eq('userId', user._id)).collect();
    for (const s of sessions) await ctx.db.delete(s._id);
    return { ok: true };
  },
});
