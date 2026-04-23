// middleware.ts — Root Next.js middleware
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET env var is not set!');
    return null;
  }
  return new TextEncoder().encode(secret);
}

const PROTECTED_ROUTES = [
  '/dashboard',
  '/subjects',
  '/chat',
  '/exams',
  '/profile',
  '/subscription',
  '/leaderboard',
  '/certificates',
  '/settings',
  '/emergency',
  '/notifications',
];

const ADMIN_ROUTES = ['/admin'];
const AUTH_ROUTES = ['/login', '/register', '/verify'];
const PUBLIC_ROUTES = ['/', '/about', '/pricing', '/api/health', '/api/webhook'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return addDefaultHeaders(NextResponse.next());
  }

  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route) && route !== '/')) {
    return addDefaultHeaders(NextResponse.next());
  }

  if (pathname === '/') {
    return addDefaultHeaders(NextResponse.next());
  }

  const token =
    request.cookies.get('auth-token')?.value ??
    request.headers.get('Authorization')?.replace('Bearer ', '');

  let user: { userId?: string; sub?: string; phone: string; role: string } | null = null;

  if (token) {
    const jwtSecret = getJwtSecret();
    if (jwtSecret) {
      try {
        const { payload } = await jwtVerify(token, jwtSecret);
        user = payload as unknown as { userId?: string; sub?: string; phone: string; role: string };
      } catch (err) {
        console.error('JWT verification failed:', err instanceof Error ? err.message : 'unknown');
        user = null;
      }
    }
  }

  // Redirect authenticated users away from auth pages
  if (user && AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    response.headers.set('Vary', 'Cookie');
    return addDefaultHeaders(response);
  }

  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
  const isAdmin = ADMIN_ROUTES.some((route) => pathname.startsWith(route));

  if (isProtected || isAdmin) {
    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      const response = NextResponse.redirect(loginUrl);
      response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      response.headers.set('Vary', 'Cookie');
      return addDefaultHeaders(response);
    }

    if (isAdmin && user.role !== 'admin') {
      const response = NextResponse.redirect(new URL('/dashboard', request.url));
      response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      response.headers.set('Vary', 'Cookie');
      return addDefaultHeaders(response);
    }
  }

  // For auth-dependent pages, prevent CDN caching
  const isAuthDependent =
    AUTH_ROUTES.some(r => pathname.startsWith(r)) ||
    PROTECTED_ROUTES.some(r => pathname.startsWith(r)) ||
    ADMIN_ROUTES.some(r => pathname.startsWith(r));

  const response = NextResponse.next();
  if (isAuthDependent) {
    response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    response.headers.set('Vary', 'Cookie');
  }
  return addDefaultHeaders(response);
}

function addDefaultHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Language', 'ar');
  response.headers.set('X-Text-Direction', 'rtl');
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
