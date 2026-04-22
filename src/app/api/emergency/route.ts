// app/api/emergency/route.ts — Emergency review
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
    const { data, error } = await supabase.rpc('get_emergency_review', {
      p_user_id: authResult.data.id,
    });

    if (error) {
      console.error('[Emergency] GET error:', error);
      return NextResponse.json({ error: 'فشل في جلب بيانات المراجعة الطارئة' }, { status: 500 });
    }

    return NextResponse.json(data || {});
  } catch (error) {
    console.error('[Emergency] Unexpected error:', error);
    return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}
