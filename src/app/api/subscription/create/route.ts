// app/api/subscription/create/route.ts — Create a new subscription
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';
import { calculatePrice } from '@/domain/subscription';
import { createCheckoutSession } from '@/infrastructure/stripe/client';
import { createPayment } from '@/infrastructure/paymob/client';
import { getAuthUser } from '@/lib/auth';

const CreateSubscriptionSchema = z.object({
  planId: z.string().uuid('معرف الخطة غير صالح'),
  subjects: z.array(z.string().uuid()).min(1, 'يجب اختيار مادة واحدة على الأقل'),
  period: z.enum(['monthly', 'term', 'annual'], {
    errorMap: () => ({ message: 'فترة الاشتراك غير صالحة' }),
  }),
  paymentMethod: z.enum(['stripe', 'vodafone', 'fawry', 'instapay'], {
    errorMap: () => ({ message: 'طريقة الدفع غير صالحة' }),
  }),
  couponCode: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await getAuthUser(request);
    if (!authResult.ok) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }
    const user = authResult.data;

    const body = await request.json();

    // Validate input
    const parsed = CreateSubscriptionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'بيانات غير صالحة' },
        { status: 400 }
      );
    }

    const { planId, subjects, period, paymentMethod, couponCode } = parsed.data;

    const supabase = await createServerSupabaseClient();

    // Fetch subscription plans
    const { data: plans, error: plansError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('max_subjects', { ascending: true });

    if (plansError || !plans?.length) {
      return NextResponse.json(
        { error: 'لا توجد خطط اشتراك متاحة حاليًا' },
        { status: 404 }
      );
    }

    // Validate selected subjects exist
    const { data: validSubjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('id')
      .in('id', subjects);

    if (subjectsError || !validSubjects) {
      return NextResponse.json(
        { error: 'فشل في التحقق من المواد المختارة' },
        { status: 400 }
      );
    }

    if (validSubjects.length !== subjects.length) {
      return NextResponse.json(
        { error: 'بعض المواد المختارة غير موجودة' },
        { status: 400 }
      );
    }

    // Check coupon if provided
    let couponDiscount = 0;
    if (couponCode) {
      const { data: coupon } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (!coupon) {
        return NextResponse.json(
          { error: 'كود الخصم غير صالح أو منتهي الصلاحية' },
          { status: 400 }
        );
      }

      // Check usage limit
      if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
        return NextResponse.json(
          { error: 'كود الخصم تم استخدامه بالكامل' },
          { status: 400 }
        );
      }

      // Check expiry
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        return NextResponse.json(
          { error: 'كود الخصم منتهي الصلاحية' },
          { status: 400 }
        );
      }

      couponDiscount = coupon.discount_percent ?? 0;
    }

    // Calculate price
    const pricing = calculatePrice({
      subjects: subjects.length,
      plans,
      period,
      couponDiscount,
    });

    // Create pending subscription record
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: user.id,
        plan_id: planId,
        subjects: subjects,
        period,
        base_price: pricing.basePrice,
        discount: pricing.discount,
        final_price: pricing.finalPrice,
        discount_percent: pricing.discountPercent,
        coupon_code: couponCode?.toUpperCase() || null,
        payment_method: paymentMethod,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (subError || !subscription) {
      console.error('[Subscription] Create failed:', subError);
      return NextResponse.json(
        { error: 'فشل في إنشاء الاشتراك' },
        { status: 500 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
    const successUrl = `${appUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}&sub_id=${subscription.id}`;
    const cancelUrl = `${appUrl}/subscription/cancel?sub_id=${subscription.id}`;

    // Route to payment provider
    if (paymentMethod === 'stripe') {
      const sessionResult = await createCheckoutSession({
        userId: user.id,
        planId,
        subjects,
        period,
        amount: pricing.finalPrice,
        successUrl,
        cancelUrl,
      });

      if (!sessionResult.ok) {
        return NextResponse.json(
          { error: sessionResult.error },
          { status: 500 }
        );
      }

      // Update subscription with Stripe session ID
      await supabase
        .from('subscriptions')
        .update({ stripe_session_id: sessionResult.data.sessionId })
        .eq('id', subscription.id);

      return NextResponse.json({
        subscriptionId: subscription.id,
        paymentUrl: sessionResult.data.url,
        pricing,
      });
    }

    // Paymob payment methods (vodafone, fawry, instapay)
    const paymentResult = await createPayment({
      amount: Math.round(pricing.finalPrice * 100), // Convert to piasters
      userId: user.id,
      method: paymentMethod as 'vodafone' | 'fawry' | 'instapay',
      phone: user.phone,
    });

    if (!paymentResult.ok) {
      return NextResponse.json(
        { error: paymentResult.error },
        { status: 500 }
      );
    }

    // Update subscription with Paymob order ID
    await supabase
      .from('subscriptions')
      .update({ paymob_order_id: paymentResult.data.orderId })
      .eq('id', subscription.id);

    return NextResponse.json({
      subscriptionId: subscription.id,
      paymentUrl: paymentResult.data.paymentUrl,
      pricing,
    });
  } catch (error) {
    console.error('[Subscription] Unexpected error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى' },
      { status: 500 }
    );
  }
}
