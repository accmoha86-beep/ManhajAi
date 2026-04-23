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
      .eq('code', code.toUpperCase().trim())
      .eq('is_active', true)
      .single();

    if (!coupon) {
      return NextResponse.json({ valid: false, error: 'كود الخصم غير صالح أو غير نشط' });
    }

    // Check max uses
    if (coupon.max_uses && (coupon.used_count || 0) >= coupon.max_uses) {
      return NextResponse.json({ valid: false, error: 'كود الخصم تم استخدامه بالكامل' });
    }

    // Check validity period (DB column is valid_from / valid_until)
    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return NextResponse.json({ valid: false, error: 'كود الخصم لم يبدأ بعد' });
    }
    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return NextResponse.json({ valid: false, error: 'كود الخصم منتهي الصلاحية' });
    }

    return NextResponse.json({
      valid: true,
      coupon_id: coupon.id,
      code: coupon.code,
      discount_percent: coupon.discount_percent,
      description: coupon.description_ar || `خصم ${coupon.discount_percent}%`,
    });
  } catch {
    return NextResponse.json({ error: 'خطأ في التحقق من كود الخصم' }, { status: 500 });
  }
}
