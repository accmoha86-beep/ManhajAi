// app/api/subscription/create/route.ts — Create subscription + redirect to payment
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createCheckoutSession } from '@/infrastructure/stripe/client';
import { createPayment } from '@/infrastructure/paymob/client';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/infrastructure/supabase/service-role';

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
    const supabase = createServiceRoleClient();

    // Fetch subscription plan
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: 'الخطة غير موجودة أو غير متاحة' }, { status: 404 });
    }

    // If no specific subjects, get all published subjects
    let subjectIds = subjects;
    if (subjectIds.length === 0) {
      const { data: allSubjects } = await supabase
        .from('subjects')
        .select('id')
        .eq('is_published', true);
      subjectIds = (allSubjects || []).map(s => s.id);
    }

    // Limit subjects to plan's max
    if (plan.max_subjects && plan.max_subjects < 99) {
      subjectIds = subjectIds.slice(0, plan.max_subjects);
    }

    // Calculate price based on period
    let basePrice = plan.price_monthly || 89;
    let periodMultiplier = 1;
    switch (period) {
      case 'term': periodMultiplier = 4; break;
      case 'annual': periodMultiplier = 10; break; // 10 months price for 12 months
    }
    basePrice = basePrice * periodMultiplier;

    // Apply plan discount
    let discountPercent = plan.discount_percent || 0;

    // Check coupon if provided
    if (couponCode) {
      const { data: coupon } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (coupon) {
        // Check usage limit
        if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
          return NextResponse.json({ error: 'كود الخصم تم استخدامه بالكامل' }, { status: 400 });
        }
        // Check expiry — actual DB column is valid_until
        if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
          return NextResponse.json({ error: 'كود الخصم منتهي الصلاحية' }, { status: 400 });
        }
        // Add coupon discount (capped at 50% total)
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

    // Create pending subscription in DB
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: user.id,
        subject_ids: subjectIds,
        subjects: subjectIds, // jsonb copy
        status: 'pending',
        plan_type: period,
        price_egp: finalPrice,
        discount_percent: discountPercent,
        period,
        base_price: basePrice,
        discount: discountAmount,
        final_price: finalPrice,
        coupon_code: couponCode?.toUpperCase() || null,
        payment_method: paymentMethod,
        starts_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        auto_renew: false,
      })
      .select('id')
      .single();

    if (subError || !subscription) {
      console.error('[Subscription] Create failed:', subError);
      return NextResponse.json({ error: 'فشل في إنشاء الاشتراك' }, { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://manhaj-ai.com';
    const successUrl = `${appUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}&sub_id=${subscription.id}`;
    const cancelUrl = `${appUrl}/subscription/cancel?sub_id=${subscription.id}`;

    // Route to payment provider
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

      // Update subscription with Stripe session ID
      await supabase
        .from('subscriptions')
        .update({ stripe_session_id: sessionResult.data.sessionId })
        .eq('id', subscription.id);

      return NextResponse.json({
        success: true,
        subscriptionId: subscription.id,
        url: sessionResult.data.url,
        pricing: { basePrice, discount: discountAmount, finalPrice, discountPercent },
      });
    }

    // Paymob payment methods
    const paymentResult = await createPayment({
      amount: Math.round(finalPrice * 100),
      userId: user.id,
      method: paymentMethod as 'vodafone' | 'fawry' | 'instapay',
      phone: user.phone,
    });

    if (!paymentResult.ok) {
      return NextResponse.json({ error: paymentResult.error }, { status: 500 });
    }

    await supabase
      .from('subscriptions')
      .update({ paymob_order_id: paymentResult.data.orderId })
      .eq('id', subscription.id);

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      url: paymentResult.data.paymentUrl,
      pricing: { basePrice, discount: discountAmount, finalPrice, discountPercent },
    });
  } catch (error) {
    console.error('[Subscription] Error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'حدث خطأ غير متوقع', debug: msg }, { status: 500 });
  }
}
