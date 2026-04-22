// app/api/notifications/unread/route.ts — Unread notifications count
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc('get_unread_notifications_count', {
      p_user_id: authResult.data.id,
    });

    if (error) {
      console.error('[Notifications] Unread count error:', error);
      return NextResponse.json({ error: 'فشل في جلب عدد الإشعارات' }, { status: 500 });
    }

    return NextResponse.json({ count: data || 0 });
  } catch (error) {
    console.error('[Notifications] Unexpected error:', error);
    return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}
