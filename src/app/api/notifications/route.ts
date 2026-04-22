// app/api/notifications/route.ts — Student GET + Admin POST
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
    const { data, error } = await supabase.rpc('get_student_notifications', {
      p_user_id: authResult.data.id,
    });

    if (error) {
      console.error('[Notifications] GET error:', error);
      return NextResponse.json({ error: 'فشل في جلب الإشعارات' }, { status: 500 });
    }

    return NextResponse.json({ notifications: data || [] });
  } catch (error) {
    console.error('[Notifications] Unexpected error:', error);
    return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    if (authResult.data.role !== 'admin') {
      return NextResponse.json({ error: 'غير مصرح لك بهذا الإجراء' }, { status: 403 });
    }

    const body = await request.json();
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc('admin_create_notification', {
      p_title: body.title,
      p_body: body.body,
      p_type: body.type || 'announcement',
      p_audience: body.audience || 'all',
      p_audience_filter: body.audience_filter || null,
      p_channel: body.channel || 'site',
    });

    if (error) {
      console.error('[Notifications] POST error:', error);
      return NextResponse.json({ error: 'فشل في إنشاء الإشعار' }, { status: 500 });
    }

    return NextResponse.json({ success: true, notification: data });
  } catch (error) {
    console.error('[Notifications] Unexpected error:', error);
    return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}
