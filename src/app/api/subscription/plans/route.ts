import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data, error } = await sb
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('max_subjects', { ascending: true });
    if (error) throw error;

    return NextResponse.json({
      plans: data || [],
    });
  } catch {
    return NextResponse.json({ plans: [] });
  }
}
