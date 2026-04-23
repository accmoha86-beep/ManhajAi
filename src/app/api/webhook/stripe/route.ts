// app/api/webhook/stripe/route.ts — Stripe webhook handler (RPC-based)
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { constructWebhookEvent } from '@/infrastructure/stripe/client';
import type Stripe from 'stripe';

export const runtime = 'nodejs';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

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
    const supabase = getSupabase();

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const period = session.metadata?.period ?? 'monthly';
        
        const { data, error } = await supabase.rpc('activate_subscription_by_stripe_session', {
          p_stripe_session_id: session.id,
          p_stripe_customer_id: (session.customer as string) || '',
          p_period: period,
        });

        if (error) {
          console.error('[StripeWebhook] Activate RPC error:', error);
        } else {
          console.log('[StripeWebhook] ✅ Activated:', data);
        }
        break;
      }

      case 'invoice.payment_failed':
      case 'payment_intent.payment_failed': {
        const obj = event.data.object as { customer?: string };
        const customerId = obj.customer;
        if (customerId) {
          await supabase.rpc('mark_subscription_payment_failed', {
            p_stripe_customer_id: customerId,
          });
          console.log('[StripeWebhook] ⚠️ Payment failed for:', customerId);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        if (customerId) {
          await supabase.rpc('cancel_stripe_subscription', {
            p_stripe_customer_id: customerId,
          });
          console.log('[StripeWebhook] ❌ Subscription cancelled for:', customerId);
        }
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
