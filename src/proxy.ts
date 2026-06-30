import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { splitLocale, DEFAULT_LOCALE } from '@/lib/i18n/locale';

// Next.js 16: "Proxy" is the renamed Middleware convention.
//
// Responsibilities:
//  1. Admin soft-auth gate (real authz is server-side).
//  2. Storefront locale routing (Variant A): /ru, /en prefixes are rewritten to
//     the unprefixed route and the resolved locale is forwarded via the
//     `x-locale` header so server components emit the right language + hreflang.
//  3. Baseline security headers.

function withSecurity(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin routes: soft gate on auth token presence; never localized.
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return withSecurity(NextResponse.next());
  }

  // Skip locale handling for API, the Sentry tunnel, Next internals and any
  // path with a file extension (static assets).
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/monitoring') ||
    pathname.startsWith('/_next') ||
    /\.[^/]+$/.test(pathname)
  ) {
    return withSecurity(NextResponse.next());
  }

  // Storefront locale routing.
  const { locale, path } = splitLocale(pathname);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-locale', locale);
  // Forward the resolved (unprefixed) path so the root layout can emit
  // route-specific <head> hints (e.g. preload the hero poster only on home).
  requestHeaders.set('x-pathname', path);

  let response: NextResponse;
  if (locale !== DEFAULT_LOCALE) {
    // Internally serve the unprefixed route; the browser URL stays prefixed.
    const url = request.nextUrl.clone();
    url.pathname = path;
    response = NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  } else {
    response = NextResponse.next({ request: { headers: requestHeaders } });
  }
  // NB: we deliberately do NOT set a NEXT_LOCALE cookie here. The locale is
  // fully derived from the URL, nothing reads the cookie, and emitting
  // Set-Cookie on every response makes pages uncacheable by the CDN — which
  // would force a function invocation on every page view.
  return withSecurity(response);
}

export const config = {
  // Exclude API/media/monitoring and static assets so the Edge Middleware does
  // NOT run on image requests or API calls — every storefront image goes
  // through /api/r2-image now, and running middleware on each was a pure waste
  // of Edge invocations. Middleware only needs to run on real page navigations.
  matcher: ['/((?!api|monitoring|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
