import { createClient } from '@supabase/supabase-js';

const secretsCache: Record<string, { value: string; expires: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function getSecret(key: string): Promise<string | null> {
  // Check cache first
  const cached = secretsCache[key];
  if (cached && Date.now() < cached.expires) {
    return cached.value;
  }

  try {
    const supabase = getSupabase();
    if (!supabase) return null;
    
    const { data, error } = await supabase.rpc('get_system_secret', { p_key: key });
    if (error || !data) return null;
    
    // Cache the value
    secretsCache[key] = { value: data, expires: Date.now() + CACHE_TTL };
    return data;
  } catch {
    return null;
  }
}

export function clearSecretsCache() {
  Object.keys(secretsCache).forEach(key => delete secretsCache[key]);
}
