// app/api/webhook/paymob/route.ts — Paymob callback handler (RPC-based — no direct table access)
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyCallback } from '@/infrastructure/paymob/client';

export const runtime = 'nodejs';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * POST: Paymob server-to-server callback
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const hmac = request.nextUrl.searchParams.get('hmac') ?? '';

    // Verify HMAC signature
    if (!(await verifyCallback(hmac, body.obj))) {
      console.error('[PaymobWebhook] HMAC verification failed');
      return NextResponse.json({ error: 'Invalid HMAC' }, { status: 400 });
    }

    const transaction = body.obj;
    const success = transaction.success === true;
    const orderId = transaction.order?.id?.toString();
    const transactionId = String(transaction.id ?? '');

    if (!orderId) {
      console.error('[PaymobWebhook] Missing order ID');
      return NextResponse.json({ error: 'Missing order ID' }, { status: 400 });
    }

    const supabase = getSupabase();

    if (success) {
      // Activate subscription via RPC (SECURITY DEFINER — bypasses RLS)
      const { data, error } = await supabase.rpc('activate_subscription_by_paymob', {
        p_paymob_order_id: orderId,
        p_paymob_transaction_id: transactionId,
      });

      if (error) {
        console.error('[PaymobWebhook] Activate RPC error:', error);
      } else {
        console.log('[PaymobWebhook] ✅ Activated:', data);
      }
    } else {
      // Mark payment as failed via RPC
      const { error } = await supabase.rpc('mark_paymob_payment_failed', {
        p_paymob_order_id: orderId,
        p_paymob_transaction_id: transactionId,
      });

      if (error) {
        console.error('[PaymobWebhook] Mark failed RPC error:', error);
      }
      console.log(`[PaymobWebhook] ❌ Payment failed for order ${orderId}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[PaymobWebhook] Unexpected error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

/**
 * GET: Paymob redirect callback (user redirect after payment)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const success = searchParams.get('success') === 'true';
  const orderId = searchParams.get('order') ?? searchParams.get('merchant_order_id');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://manhaj-ai.com';

  if (success && orderId) {
    return NextResponse.redirect(`${appUrl}/subscription/success?order_id=${orderId}`);
  }

  return NextResponse.redirect(`${appUrl}/subscription/cancel?order_id=${orderId ?? ''}`);
}
