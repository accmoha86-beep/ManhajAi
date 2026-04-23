import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    // Use RPC function to bypass RLS
    const { data, error } = await sb.rpc('get_subscription_plans');
    if (error) throw error;

    return NextResponse.json({
      plans: data || [],
    });
  } catch (e) {
    console.error('[Plans API] Error:', e);
    return NextResponse.json({ plans: [] });
  }
}
