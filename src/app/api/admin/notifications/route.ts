// app/api/admin/notifications/route.ts — Admin list notifications
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    if (authResult.data.role !== 'admin') {
      return NextResponse.json({ error: 'غير مصرح لك بهذا الإجراء' }, { status: 403 });
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc('admin_list_notifications');

    if (error) {
      console.error('[AdminNotifications] GET error:', error);
      return NextResponse.json({ error: 'فشل في جلب الإشعارات' }, { status: 500 });
    }

    return NextResponse.json({ notifications: data || [] });
  } catch (error) {
    console.error('[AdminNotifications] Unexpected error:', error);
    return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}
