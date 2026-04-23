import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';

// This endpoint can be called by a cron job (Railway, external cron, or admin)
// GET /api/cron/check-subscriptions
export async function GET(request: NextRequest) {
  try {
    // Simple auth via secret header (optional — for external cron services)
    const authHeader = request.headers.get('x-cron-secret');
    const cronSecret = process.env.CRON_SECRET;
    
    // If CRON_SECRET is set, require it; otherwise allow open access
    if (cronSecret && authHeader !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    
    const { data, error } = await supabase.rpc('check_expired_subscriptions');

    if (error) {
      console.error('[Cron] Subscription check error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[Cron] Subscription check:', data);
    
    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error) {
    console.error('[Cron] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
