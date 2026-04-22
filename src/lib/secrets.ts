import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Cache secrets in memory for 5 minutes to reduce DB calls
const secretsCache: Map<string, { value: string; expiry: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getSecret(key: string): Promise<string | null> {
  // Check cache first
  const cached = secretsCache.get(key);
  if (cached && Date.now() < cached.expiry) {
    return cached.value;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase.rpc('get_system_secret', { p_key: key });
    
    if (error) {
      console.error(`Error fetching secret ${key}:`, error.message);
      // Fallback to env var
      return process.env[key.toUpperCase()] || null;
    }

    const value = data as string;
    if (value) {
      secretsCache.set(key, { value, expiry: Date.now() + CACHE_TTL });
    }
    return value || null;
  } catch (err) {
    console.error(`Failed to fetch secret ${key}:`, err);
    // Fallback to env var
    return process.env[key.toUpperCase()] || null;
  }
}

// Clear cache (useful when admin updates a key)
export function clearSecretsCache() {
  secretsCache.clear();
}
