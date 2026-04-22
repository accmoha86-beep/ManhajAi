import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult.ok) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    const userId = authResult.data.id;

    // Get or create referral code
    const { data: user } = await supabase
      .from('users')
      .select('referral_code')
      .eq('id', userId)
      .single();

    let referralCode = user?.referral_code;

    if (!referralCode) {
      // Generate a unique referral code
      referralCode = 'MNH' + userId.slice(0, 6).toUpperCase();
      await supabase
        .from('users')
        .update({ referral_code: referralCode })
        .eq('id', userId);
    }

    // Count referrals
    const { data: referrals, count } = await supabase
      .from('users')
      .select('id', { count: 'exact' })
      .eq('referred_by', userId);

    const referredCount = count || 0;
    const monthsEarned = referredCount; // 1 free month per referral

    return NextResponse.json({
      success: true,
      data: {
        referral_code: referralCode,
        referred_count: referredCount,
        months_earned: monthsEarned,
        referral_link: `${process.env.NEXT_PUBLIC_APP_URL || 'https://manhaj.ai'}/register?ref=${referralCode}`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult.ok) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { referral_code } = await request.json();
    if (!referral_code) {
      return NextResponse.json({ error: 'كود الإحالة مطلوب' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const userId = authResult.data.id;

    // Find the referrer
    const { data: referrer } = await supabase
      .from('users')
      .select('id, referral_code')
      .eq('referral_code', referral_code.toUpperCase())
      .single();

    if (!referrer) {
      return NextResponse.json({ error: 'كود الإحالة غير صالح' }, { status: 400 });
    }

    if (referrer.id === userId) {
      return NextResponse.json({ error: 'لا يمكنك استخدام كود الإحالة الخاص بك' }, { status: 400 });
    }

    // Check if already referred
    const { data: currentUser } = await supabase
      .from('users')
      .select('referred_by')
      .eq('id', userId)
      .single();

    if (currentUser?.referred_by) {
      return NextResponse.json({ error: 'تم تطبيق كود إحالة مسبقاً' }, { status: 400 });
    }

    // Apply referral
    await supabase
      .from('users')
      .update({ referred_by: referrer.id })
      .eq('id', userId);

    return NextResponse.json({
      success: true,
      message: 'تم تطبيق كود الإحالة بنجاح! سيحصل صاحب الكود على شهر مجاني 🎁',
    });
  } catch {
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
