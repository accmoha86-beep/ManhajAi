// =============================================================================
// Manhaj AI — Supabase Server Client (with cookies for SSR)
// =============================================================================

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Create a Supabase client for server-side usage (Server Components, Route Handlers, Server Actions).
 * Uses cookies for session management.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Can't set cookies in Server Components (read-only).
            // This is expected — the middleware handles cookie refresh.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // Same as above
          }
        },
      },
    }
  );
}

/**
 * Get the current authenticated user from the server context.
 * Returns null if not authenticated.
 */
export async function getServerUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user;
}

/**
 * Get the current user's profile from the users table.
 * Returns null if not authenticated or profile not found.
 */
export async function getServerUserProfile() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  return profile;
}

/**
 * Require authentication — redirect to login if not authenticated.
 * Use in Server Components and Server Actions.
 */
export async function requireAuth() {
  const user = await getServerUser();
  if (!user) {
    const { redirect } = await import('next/navigation');
    redirect('/login');
    throw new Error('Redirect'); // unreachable — satisfies TypeScript
  }
  return user;
}

/**
 * Require admin role — redirect to dashboard if not admin.
 */
export async function requireAdmin() {
  const user = await requireAuth();
  const supabase = await createServerSupabaseClient();

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    const { redirect } = await import('next/navigation');
    redirect('/dashboard');
  }

  return user;
}
