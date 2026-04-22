// middleware.ts — Root Next.js middleware
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

// Routes that require authentication
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
];

// Routes that require admin role
const ADMIN_ROUTES = ['/admin'];

// Routes that should redirect authenticated users (login/register pages)
const AUTH_ROUTES = ['/login', '/register', '/verify'];

// Public routes that never need auth
const PUBLIC_ROUTES = ['/', '/about', '/pricing', '/api/health', '/api/webhook'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // files with extensions (images, fonts, etc.)
  ) {
    return addDefaultHeaders(NextResponse.next());
  }

  // Skip public API routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route) && route !== '/')) {
    return addDefaultHeaders(NextResponse.next());
  }

  // Allow exact match on root
  if (pathname === '/') {
    return addDefaultHeaders(NextResponse.next());
  }

  // Get auth token from cookie or Authorization header
  const token =
    request.cookies.get('auth-token')?.value ??
    request.headers.get('Authorization')?.replace('Bearer ', '');

  let user: { sub: string; phone: string; role: string } | null = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      user = payload as unknown as { sub: string; phone: string; role: string };
    } catch {
      // Token invalid or expired — treat as unauthenticated
      user = null;
    }
  }

  // Redirect authenticated users away from auth pages
  if (user && AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Check protected routes
  const isProtected = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );
  const isAdmin = ADMIN_ROUTES.some((route) => pathname.startsWith(route));

  if (isProtected || isAdmin) {
    if (!user) {
      // Redirect to login with return URL
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Check admin access
    if (isAdmin && user.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return addDefaultHeaders(NextResponse.next());
}

/**
 * Add RTL and Arabic-related headers to all responses.
 */
function addDefaultHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Language', 'ar');
  response.headers.set('X-Text-Direction', 'rtl');
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (browser icon)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
