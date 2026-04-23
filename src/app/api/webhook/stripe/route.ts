// app/api/webhook/stripe/route.ts — Stripe webhook handler
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createServiceRoleClient } from '@/infrastructure/supabase/service-role';
import { constructWebhookEvent } from '@/infrastructure/stripe/client';
import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    const eventResult = await constructWebhookEvent(body, signature);
    if (!eventResult.ok) {
      console.error('[StripeWebhook] Verification failed:', eventResult.error);
      return NextResponse.json({ error: eventResult.error }, { status: 400 });
    }

    const event = eventResult.data;
    const supabase = createServiceRoleClient();

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
        console.log(`[StripeWebhook] Unhandled: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[StripeWebhook] Error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

async function handleCheckoutCompleted(supabase: SupabaseClient, session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const period = session.metadata?.period ?? 'monthly';

  if (!userId) {
    console.error('[StripeWebhook] Missing userId in metadata');
    return;
  }

  const now = new Date();
  const expiresAt = new Date(now);
  switch (period) {
    case 'monthly': expiresAt.setMonth(expiresAt.getMonth() + 1); break;
    case 'term': expiresAt.setMonth(expiresAt.getMonth() + 4); break;
    case 'annual': expiresAt.setFullYear(expiresAt.getFullYear() + 1); break;
  }

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      paid_at: now.toISOString(),
      stripe_customer_id: session.customer as string,
      starts_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      current_period_start: now.toISOString(),
      current_period_end: expiresAt.toISOString(),
      activated_at: now.toISOString(),
    })
    .eq('stripe_session_id', session.id);

  if (error) {
    console.error('[StripeWebhook] Activate failed:', error);
    return;
  }

  // Increment coupon usage
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('coupon_code')
    .eq('stripe_session_id', session.id)
    .single();

  if (sub?.coupon_code) {
    await supabase
      .from('coupons')
      .update({ used_count: supabase.rpc ? undefined : 0 })
      .eq('code', sub.coupon_code);
    // Direct increment
    await supabase.rpc('increment_coupon_usage', { p_code: sub.coupon_code });
  }

  console.log(`[StripeWebhook] ✅ Activated for user ${userId}`);
}

async function handlePaymentFailed(supabase: SupabaseClient, invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  if (!customerId) return;

  await supabase
    .from('subscriptions')
    .update({ status: 'expired', payment_failed_at: new Date().toISOString() })
    .eq('stripe_customer_id', customerId)
    .eq('status', 'active');
}

async function handleSubscriptionDeleted(supabase: SupabaseClient, subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  if (!customerId) return;

  await supabase
    .from('subscriptions')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('stripe_customer_id', customerId)
    .in('status', ['active', 'pending']);
}
