// app/api/certificates/route.ts — Student certificates
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
    const { data, error } = await supabase.rpc('get_student_certificates', {
      p_user_id: authResult.data.id,
    });

    if (error) {
      console.error('[Certificates] GET error:', error);
      return NextResponse.json({ error: 'فشل في جلب الشهادات' }, { status: 500 });
    }

    return NextResponse.json({ certificates: data || [] });
  } catch (error) {
    console.error('[Certificates] Unexpected error:', error);
    return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}
