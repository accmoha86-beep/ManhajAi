import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc('get_public_settings');

    if (error) {
      console.error('[PublicSettings] RPC error:', error);
      return NextResponse.json({ otp_enabled: true, trial_days: 2 });
    }

    return NextResponse.json(data || { otp_enabled: true, trial_days: 2 });
  } catch (error) {
    console.error('[PublicSettings] Error:', error);
    return NextResponse.json({ otp_enabled: true, trial_days: 2 });
  }
}
