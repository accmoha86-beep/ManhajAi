import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    const userId = authResult.ok ? authResult.data.id : null;
    
    const { searchParams } = new URL(request.url);
    const governorate = searchParams.get('governorate');
    
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc('get_leaderboard', {
      p_user_id: userId,
      p_governorate: governorate,
      p_limit: 50
    });
    if (error) return NextResponse.json({ error: 'فشل في جلب المتصدرين' }, { status: 500 });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[Leaderboard] Error:', error);
    return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}
