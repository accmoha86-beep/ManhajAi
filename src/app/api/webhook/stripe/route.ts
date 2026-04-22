// app/api/webhook/stripe/route.ts — Stripe webhook handler
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';
import { constructWebhookEvent } from '@/infrastructure/stripe/client';
import type Stripe from 'stripe';

// Disable body parsing — Stripe needs the raw body for signature verification
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    // Verify and construct event
    const eventResult = constructWebhookEvent(body, signature);
    if (!eventResult.ok) {
      console.error('[StripeWebhook] Verification failed:', eventResult.error);
      return NextResponse.json(
        { error: eventResult.error },
        { status: 400 }
      );
    }

    const event = eventResult.data;
    const supabase = await createServerSupabaseClient();

    switch (event.type) {
      case 'checkout.session.completed': {
        await handleCheckoutCompleted(supabase, event.data.object as Stripe.Checkout.Session);
        break;
      }

      case 'invoice.payment_failed': {
        await handlePaymentFailed(supabase, event.data.object as Stripe.Invoice);
        break;
      }

      case 'customer.subscription.deleted': {
        await handleSubscriptionDeleted(supabase, event.data.object as Stripe.Subscription);
        break;
      }

      default:
        console.log(`[StripeWebhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[StripeWebhook] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle successful checkout — activate the subscription.
 */
async function handleCheckoutCompleted(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  session: Stripe.Checkout.Session
) {
  const userId = session.metadata?.userId;
  const planId = session.metadata?.planId;
  const subjects = session.metadata?.subjects?.split(',') ?? [];
  const period = session.metadata?.period ?? 'monthly';

  if (!userId || !planId) {
    console.error('[StripeWebhook] Missing metadata in checkout session');
    return;
  }

  // Calculate period end date
  const now = new Date();
  const periodEnd = new Date(now);
  switch (period) {
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
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      paid_at: now.toISOString(),
      stripe_session_id: session.id,
      stripe_customer_id: session.customer as string,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      activated_at: now.toISOString(),
    })
    .eq('user_id', userId)
    .eq('stripe_session_id', session.id);

  if (error) {
    console.error('[StripeWebhook] Activate subscription failed:', error);
    return;
  }

  // Update user's subscription subjects
  await supabase.from('user_subjects').upsert(
    subjects.map((subjectId) => ({
      user_id: userId,
      subject_id: subjectId,
      granted_at: now.toISOString(),
    })),
    { onConflict: 'user_id,subject_id' }
  );

  console.log(
    `[StripeWebhook] Subscription activated for user ${userId}, ${subjects.length} subjects`
  );
}

/**
 * Handle failed payment — mark the subscription.
 */
async function handlePaymentFailed(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  invoice: Stripe.Invoice
) {
  const customerId = invoice.customer as string;

  if (!customerId) return;

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'payment_failed',
      payment_failed_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId)
    .eq('status', 'active');

  if (error) {
    console.error('[StripeWebhook] Mark payment failed error:', error);
  }

  console.log(
    `[StripeWebhook] Payment failed for customer ${customerId}`
  );
}

/**
 * Handle subscription deletion — cancel the subscription.
 */
async function handleSubscriptionDeleted(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string;

  if (!customerId) return;

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId)
    .in('status', ['active', 'payment_failed']);

  if (error) {
    console.error('[StripeWebhook] Cancel subscription error:', error);
  }

  console.log(
    `[StripeWebhook] Subscription cancelled for customer ${customerId}`
  );
}
