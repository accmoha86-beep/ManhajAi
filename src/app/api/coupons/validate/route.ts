import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    if (!code) return NextResponse.json({ error: 'كود الخصم مطلوب' }, { status: 400 });

    const supabase = await createServerSupabaseClient();
    const { data: coupon } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (!coupon) {
      return NextResponse.json({ valid: false, error: 'كود الخصم غير صالح' });
    }

    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      return NextResponse.json({ valid: false, error: 'كود الخصم تم استخدامه بالكامل' });
    }

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, error: 'كود الخصم منتهي الصلاحية' });
    }

    return NextResponse.json({
      valid: true,
      discount_percent: coupon.discount_percent,
      description: coupon.description_ar || `خصم ${coupon.discount_percent}%`,
    });
  } catch {
    return NextResponse.json({ error: 'خطأ في التحقق' }, { status: 500 });
  }
}
