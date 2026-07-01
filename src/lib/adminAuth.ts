import { cookies } from 'next/headers';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';

// The `auth-token` cookie holds the Convex session token (see actions/auth.ts),
// so validate it against Convex — the real source of truth — not as a JWT.
export async function requireAdminAuth(): Promise<boolean> {
  const token = (await cookies()).get('auth-token')?.value;
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!token || !url) return false;
  try {
    const user = await new ConvexHttpClient(url).query(api.auth.me, { sessionToken: token });
    return user?.role === 'admin' || user?.role === 'manager' || user?.role === 'superadmin';
  } catch {
    return false;
  }
}
