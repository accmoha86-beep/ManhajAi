// =============================================================================
// Manhaj AI — Supabase Service Role Client (bypasses RLS)
// Use ONLY in server-side API routes for admin operations like subscription management.
// =============================================================================

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let serviceClient: SupabaseClient | null = null;

/**
 * Creates a Supabase client with the Service Role key.
 * This client bypasses Row Level Security — use with caution.
 * Only for server-side operations that need to insert/update protected tables.
 */
export function createServiceRoleClient(): SupabaseClient {
  if (serviceClient) return serviceClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
  }

  serviceClient = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return serviceClient;
}
