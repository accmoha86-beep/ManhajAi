import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult.ok) {
      return NextResponse.json({ error: 'يرجى تسجيل الدخول أولاً' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc('create_trial_subscription', {
      p_user_id: authResult.data.id,
    });

    if (error) {
      console.error('[Trial] RPC error:', error);
      return NextResponse.json({ error: 'فشل في تفعيل التجربة المجانية' }, { status: 500 });
    }

    if (data?.error) {
      return NextResponse.json({ error: data.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: data.message,
      trial_ends_at: data.trial_ends_at,
      subscription_id: data.subscription_id,
    });
  } catch (error) {
    console.error('[Trial] Error:', error);
    return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}
