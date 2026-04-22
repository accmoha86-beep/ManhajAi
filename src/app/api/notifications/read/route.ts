// app/api/notifications/read/route.ts — Mark notification as read
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';
import { getAuthUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const body = await request.json();
    const { notification_id } = body;

    if (!notification_id) {
      return NextResponse.json({ error: 'معرف الإشعار مطلوب' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.rpc('mark_notification_read', {
      p_user_id: authResult.data.id,
      p_notification_id: notification_id,
    });

    if (error) {
      console.error('[Notifications] Mark read error:', error);
      return NextResponse.json({ error: 'فشل في تحديث الإشعار' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Notifications] Unexpected error:', error);
    return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}
