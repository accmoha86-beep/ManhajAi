// infrastructure/stripe/client.ts — Stripe payment client
import Stripe from 'stripe';
import type { Result } from '@/lib/result';
import { ok, err } from '@/lib/result';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
  typescript: true,
});

/**
 * Create a Stripe Checkout session for a subscription payment.
 */
export async function createCheckoutSession(params: {
  userId: string;
  planId: string;
  subjects: string[];
  period: string;
  amount: number;
  successUrl: string;
  cancelUrl: string;
}): Promise<Result<{ sessionId: string; url: string }>> {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'egp',
            product_data: {
              name: 'اشتراك منهج AI',
              description: `${params.subjects.length} مادة — ${getPeriodLabel(params.period)}`,
              metadata: {
                planId: params.planId,
                subjects: params.subjects.join(','),
                period: params.period,
              },
            },
            unit_amount: Math.round(params.amount * 100), // Stripe uses piasters
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: params.userId,
        planId: params.planId,
        subjects: params.subjects.join(','),
        period: params.period,
      },
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    });

    if (!session.url) {
      return err('فشل في إنشاء رابط الدفع');
    }

    return ok({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'خطأ غير معروف';
    return err(`فشل في إنشاء جلسة الدفع: ${message}`);
  }
}

/**
 * Create a Stripe Customer Portal session for managing subscriptions.
 */
export async function createPortalSession(
  customerId: string
): Promise<Result<{ url: string }>> {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    });

    return ok({ url: session.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'خطأ غير معروف';
    return err(`فشل في إنشاء بوابة الإدارة: ${message}`);
  }
}

/**
 * Cancel a Stripe subscription.
 */
export async function cancelSubscription(
  subscriptionId: string
): Promise<Result<void>> {
  try {
    await stripe.subscriptions.cancel(subscriptionId);
    return ok(undefined);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'خطأ غير معروف';
    return err(`فشل في إلغاء الاشتراك: ${message}`);
  }
}

/**
 * Construct a Stripe webhook event from the raw body and signature.
 */
export function constructWebhookEvent(
  body: string | Buffer,
  signature: string
): Result<Stripe.Event> {
  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    return ok(event);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'خطأ غير معروف';
    return err(`فشل في التحقق من webhook: ${message}`);
  }
}

function getPeriodLabel(period: string): string {
  switch (period) {
    case 'monthly':
      return 'شهري';
    case 'term':
      return 'ترم دراسي';
    case 'annual':
      return 'سنوي';
    default:
      return period;
  }
}
