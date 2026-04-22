// app/api/webhook/paymob/route.ts — Paymob callback handler
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';
import { verifyCallback } from '@/infrastructure/paymob/client';

/**
 * POST: Paymob server-to-server callback
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const hmac = request.nextUrl.searchParams.get('hmac') ?? '';

    // Verify HMAC signature
    if (!verifyCallback(hmac, body.obj)) {
      console.error('[PaymobWebhook] HMAC verification failed');
      return NextResponse.json(
        { error: 'Invalid HMAC' },
        { status: 400 }
      );
    }

    const transaction = body.obj;
    const success = transaction.success === true;
    const orderId = transaction.order?.id?.toString();

    if (!orderId) {
      console.error('[PaymobWebhook] Missing order ID');
      return NextResponse.json(
        { error: 'Missing order ID' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    if (success) {
      await handlePaymentSuccess(supabase, orderId, transaction);
    } else {
      await handlePaymentFailure(supabase, orderId, transaction);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[PaymobWebhook] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

/**
 * GET: Paymob redirect callback (user redirect after payment)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const success = searchParams.get('success') === 'true';
  const orderId = searchParams.get('order') ?? searchParams.get('merchant_order_id');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  if (success && orderId) {
    return NextResponse.redirect(
      `${appUrl}/subscription/success?order_id=${orderId}`
    );
  }

  return NextResponse.redirect(
    `${appUrl}/subscription/cancel?order_id=${orderId ?? ''}`
  );
}

/**
 * Handle successful Paymob payment — activate subscription.
 */
async function handlePaymentSuccess(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  orderId: string,
  transaction: Record<string, unknown>
) {
  // Find subscription by Paymob order ID
  const { data: subscription, error: findError } = await supabase
    .from('subscriptions')
    .select('id, user_id, subjects, period')
    .eq('paymob_order_id', orderId)
    .eq('status', 'pending')
    .single();

  if (findError || !subscription) {
    console.error(
      `[PaymobWebhook] Subscription not found for order ${orderId}`
    );
    return;
  }

  // Calculate period end date
  const now = new Date();
  const periodEnd = new Date(now);
  switch (subscription.period) {
    case 'monthly':
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      break;
    case 'term':
      periodEnd.setMonth(periodEnd.getMonth() + 4);
      break;
    case 'annual':
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      break;
  }

  // Activate subscription
  const { error: updateError } = await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      paid_at: now.toISOString(),
      paymob_transaction_id: String(transaction.id ?? ''),
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      activated_at: now.toISOString(),
    })
    .eq('id', subscription.id);

  if (updateError) {
    console.error(
      '[PaymobWebhook] Activate subscription failed:',
      updateError
    );
    return;
  }

  // Grant subject access
  const subjects = subscription.subjects as string[];
  if (subjects?.length) {
    await supabase.from('user_subjects').upsert(
      subjects.map((subjectId) => ({
        user_id: subscription.user_id,
        subject_id: subjectId,
        granted_at: now.toISOString(),
      })),
      { onConflict: 'user_id,subject_id' }
    );
  }

  console.log(
    `[PaymobWebhook] Subscription activated for user ${subscription.user_id}`
  );
}

/**
 * Handle failed Paymob payment.
 */
async function handlePaymentFailure(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  orderId: string,
  transaction: Record<string, unknown>
) {
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'payment_failed',
      payment_failed_at: new Date().toISOString(),
      paymob_transaction_id: String(transaction.id ?? ''),
    })
    .eq('paymob_order_id', orderId)
    .eq('status', 'pending');

  if (error) {
    console.error('[PaymobWebhook] Mark payment failed error:', error);
  }

  console.log(
    `[PaymobWebhook] Payment failed for order ${orderId}`
  );
}
