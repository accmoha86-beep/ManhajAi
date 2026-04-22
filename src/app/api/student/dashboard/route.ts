import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }
    const user = authResult.data;
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc('get_student_dashboard', { p_user_id: user.id });
    if (error) {
      console.error('[Dashboard] RPC error:', error);
      return NextResponse.json({ error: 'فشل في جلب البيانات' }, { status: 500 });
    }
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[Dashboard] Error:', error);
    return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}
