'use server';

import { cookies } from 'next/headers';

export async function setAuthCookie(sessionToken: string) {
  const cookieStore = await cookies();
  cookieStore.set('auth-token', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    // Match the Convex session lifetime (30d) so the cookie does not expire
    // before the server-side session does. Server validates the token anyway.
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('auth-token');
}

export async function getAuthCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('auth-token')?.value ?? null;
}
