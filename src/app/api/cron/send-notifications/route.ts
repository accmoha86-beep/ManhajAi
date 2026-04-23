import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';

// Cron endpoint: processes scheduled notifications that are due
// GET /api/cron/send-notifications
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('x-cron-secret');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    
    // Find scheduled notifications that are due
    const { data: dueNotifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', new Date().toISOString())
      .limit(50);

    if (error) {
      console.error('[Cron] Notification fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!dueNotifications || dueNotifications.length === 0) {
      return NextResponse.json({ success: true, processed: 0 });
    }

    let processed = 0;
    for (const notif of dueNotifications) {
      // Mark as sent
      await supabase
        .from('notifications')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', notif.id);
      processed++;
    }

    return NextResponse.json({
      success: true,
      processed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
