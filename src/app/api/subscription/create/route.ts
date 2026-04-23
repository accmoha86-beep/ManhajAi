// app/api/subscription/create/route.ts — Create subscription + redirect to payment
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createCheckoutSession } from '@/infrastructure/stripe/client';
import { getAuthUser } from '@/lib/auth';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';

const CreateSubscriptionSchema = z.object({
  planId: z.string().uuid('معرف الخطة غير صالح'),
  subjects: z.array(z.string().uuid()).optional().default([]),
  period: z.enum(['monthly', 'term', 'annual'], {
    errorMap: () => ({ message: 'فترة الاشتراك غير صالحة' }),
  }),
  paymentMethod: z.enum(['stripe', 'vodafone', 'fawry', 'instapay']).default('stripe'),
  couponCode: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }
    const user = authResult.data;

    const body = await request.json();
    const parsed = CreateSubscriptionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'بيانات غير صالحة' },
        { status: 400 }
      );
    }

    const { planId, subjects, period, paymentMethod, couponCode } = parsed.data;
    const supabase = await createServerSupabaseClient();

    // Fetch subscription plan via RPC (bypasses RLS)
    const { data: plansData } = await supabase.rpc('get_subscription_plans');
    const plans = Array.isArray(plansData) ? plansData : (plansData?.plans || []);
    const plan = plans.find((p: Record<string, unknown>) => p.id === planId && p.is_active);

    if (!plan) {
      return NextResponse.json({ error: 'الخطة غير موجودة أو غير متاحة' }, { status: 404 });
    }

    // Get subjects — if none selected, get all published
    let subjectIds = subjects;
    if (subjectIds.length === 0) {
      const { data: pubSubjects } = await supabase.rpc('get_published_subjects');
      const subList = Array.isArray(pubSubjects) ? pubSubjects : (pubSubjects?.subjects || []);
      subjectIds = subList.map((s: Record<string, unknown>) => s.id as string);
    }

    if (subjectIds.length === 0) {
      return NextResponse.json({ error: 'يجب اختيار مادة واحدة على الأقل' }, { status: 400 });
    }

    // Limit subjects to plan's max
    if (plan.max_subjects && plan.max_subjects < 99) {
      subjectIds = subjectIds.slice(0, plan.max_subjects);
    }

    // Calculate price based on period
    let basePrice = plan.price_monthly || 89;
    switch (period) {
      case 'term': basePrice *= 4; break;
      case 'annual': basePrice *= 10; break;
    }

    // Apply plan discount
    let discountPercent = plan.discount_percent || 0;

    // Check coupon if provided
    if (couponCode) {
      const { data: coupons } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase())
        .eq('is_active', true);

      const coupon = coupons && coupons.length > 0 ? coupons[0] : null;

      if (coupon) {
        if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
          return NextResponse.json({ error: 'كود الخصم تم استخدامه بالكامل' }, { status: 400 });
        }
        if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
          return NextResponse.json({ error: 'كود الخصم منتهي الصلاحية' }, { status: 400 });
        }
        discountPercent = Math.min(discountPercent + (coupon.discount_percent || 0), 50);
      } else {
        return NextResponse.json({ error: 'كود الخصم غير صالح' }, { status: 400 });
      }
    }

    const discountAmount = Math.round(basePrice * (discountPercent / 100));
    const finalPrice = Math.max(basePrice - discountAmount, 0);

    // Calculate period dates
    const now = new Date();
    const expiresAt = new Date(now);
    switch (period) {
      case 'monthly': expiresAt.setMonth(expiresAt.getMonth() + 1); break;
      case 'term': expiresAt.setMonth(expiresAt.getMonth() + 4); break;
      case 'annual': expiresAt.setFullYear(expiresAt.getFullYear() + 1); break;
    }

    // Create pending subscription via RPC (SECURITY DEFINER — bypasses RLS)
    const { data: subId, error: subError } = await supabase.rpc('create_pending_subscription', {
      p_user_id: user.id,
      p_subject_ids: subjectIds,
      p_plan_type: period,
      p_price_egp: finalPrice,
      p_discount_percent: discountPercent,
      p_period: period,
      p_base_price: basePrice,
      p_discount: discountAmount,
      p_final_price: finalPrice,
      p_coupon_code: couponCode?.toUpperCase() || null,
      p_payment_method: paymentMethod,
      p_starts_at: now.toISOString(),
      p_expires_at: expiresAt.toISOString(),
    });

    if (subError || !subId) {
      console.error('[Subscription] Create RPC failed:', subError);
      return NextResponse.json({ error: 'فشل في إنشاء الاشتراك' }, { status: 500 });
    }

    // Use request origin to ensure redirect works (handles both custom domain and Railway domain)
    const origin = request.headers.get('origin') || request.headers.get('referer')?.replace(/\/$/, '') || process.env.NEXT_PUBLIC_APP_URL || 'https://manhaj-ai-web-production.up.railway.app';
    const appUrl = origin.replace(/\/$/, '');
    const successUrl = `${appUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}&sub_id=${subId}`;
    const cancelUrl = `${appUrl}/subscription/cancel?sub_id=${subId}`;

    // Route to Stripe
    if (paymentMethod === 'stripe') {
      const sessionResult = await createCheckoutSession({
        userId: user.id,
        planId,
        subjects: subjectIds,
        period,
        amount: finalPrice,
        successUrl,
        cancelUrl,
      });

      if (!sessionResult.ok) {
        return NextResponse.json({ error: sessionResult.error }, { status: 500 });
      }

      // Update subscription with Stripe session ID via RPC
      await supabase.rpc('update_subscription_stripe', {
        p_sub_id: subId,
        p_stripe_session_id: sessionResult.data.sessionId,
      });

      return NextResponse.json({
        success: true,
        subscriptionId: subId,
        url: sessionResult.data.url,
        pricing: { basePrice, discount: discountAmount, finalPrice, discountPercent },
      });
    }

    // TODO: Paymob integration (when keys are configured)
    return NextResponse.json({ error: 'طريقة الدفع غير متاحة حالياً' }, { status: 400 });
  } catch (error) {
    console.error('[Subscription] Error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'حدث خطأ غير متوقع', debug: msg }, { status: 500 });
  }
}
