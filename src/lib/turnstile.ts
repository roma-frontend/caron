/**
 * Cloudflare Turnstile — server-side token verification.
 *
 * Inert until configured: when `TURNSTILE_SECRET_KEY` is not set, verification
 * is skipped (returns `true`) so forms keep working before the keys are added
 * in the Cloudflare dashboard. Mirrors the rate-limiter's "no-op unless
 * configured" pattern, making this a safe, gradual rollout.
 */
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstile(token: unknown, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // not configured — skip verification
  if (typeof token !== 'string' || token.length === 0) return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip && ip !== 'unknown') body.set('remoteip', ip);

    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) return false;

    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
