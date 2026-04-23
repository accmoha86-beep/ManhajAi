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
    const userId = authResult.data.id;

    // Check if user already has an active subscription or trial
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('id, status')
      .eq('user_id', userId)
      .in('status', ['active', 'trial'])
      .limit(1)
      .single();

    if (existingSub) {
      return NextResponse.json({ error: 'لديك اشتراك نشط بالفعل' }, { status: 400 });
    }

    // Get trial days from settings
    const { data: settings } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'trial_days')
      .single();
    
    const trialDays = settings?.value?.value || 2;
    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + trialDays);

    // Create trial subscription
    const { data: sub, error: subError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        status: 'trial',
        plan_type: 'trial',
        subject_ids: '{}',
        price_egp: 0,
        auto_renew: false,
        starts_at: new Date().toISOString(),
        expires_at: trialEnds.toISOString(),
      })
      .select('id')
      .single();

    if (subError) {
      console.error('[Trial] Create error:', subError);
      return NextResponse.json({ error: 'فشل في تفعيل التجربة المجانية' }, { status: 500 });
    }

    // Update user trial_ends_at
    await supabase
      .from('users')
      .update({ trial_ends_at: trialEnds.toISOString() })
      .eq('id', userId);

    return NextResponse.json({
      success: true,
      message: `تم تفعيل التجربة المجانية لمدة ${trialDays} أيام 🎉`,
      trial_ends_at: trialEnds.toISOString(),
      subscription_id: sub.id,
    });
  } catch (error) {
    console.error('[Trial] Error:', error);
    return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}
