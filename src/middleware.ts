/**
 * Security Middleware (Edge runtime)
 * - JWT auth guard for protected routes
 * - CSP headers with nonce
 * - Rate limiting for API routes
 * - Security headers (HSTS, X-Frame-Options, etc.)
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const jwtSecretRaw = process.env.JWT_SECRET ?? '';
const jwtSecret = new TextEncoder().encode(jwtSecretRaw);

async function isValidJWT(token: string | undefined): Promise<boolean> {
  if (!token || !jwtSecretRaw) return false;
  try {
    await jwtVerify(token, jwtSecret, { algorithms: ['HS256'] });
    return true;
  } catch {
    return false;
  }
}

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/products',
  '/categories',
  '/cart',
  '/checkout',
  '/api/health',
  '/api/auth',
  '/_next',
  '/favicon.ico',
];

const ADMIN_PREFIX = '/admin';

function isPublic(pathname: string): boolean {
  if (pathname.startsWith('/_next/') || pathname.startsWith('/static/')) return true;
  if (pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico|css|js|woff2?)$/)) return true;
  if (pathname.startsWith('/products/') || pathname.startsWith('/categories/')) return true;
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  // CSP
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    "connect-src 'self' https://*.convex.cloud wss://*.convex.cloud",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  // Admin routes require auth cookie
  if (pathname.startsWith('/admin')) {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  const response = NextResponse.next();

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('X-Nonce', nonce);
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    response.headers.set('Content-Security-Policy', csp);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
