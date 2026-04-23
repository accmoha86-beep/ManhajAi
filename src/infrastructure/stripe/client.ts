// infrastructure/stripe/client.ts — Stripe payment client (DB secrets)
import Stripe from 'stripe';
import type { Result } from '@/lib/result';
import { ok, err } from '@/lib/result';
import { getSecret } from '@/lib/secrets';

let stripeInstance: Stripe | null = null;

async function getStripe(): Promise<Stripe | null> {
  if (stripeInstance) return stripeInstance;
  const key = await getSecret('STRIPE_SECRET_KEY');
  if (!key) return null;
  stripeInstance = new Stripe(key, { apiVersion: '2024-06-20', typescript: true });
  return stripeInstance;
}

const NOT_CONFIGURED_MSG = 'مفتاح Stripe غير مهيأ — أضف المفتاح من لوحة التحكم';

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
    const stripe = await getStripe();
    if (!stripe) return err(NOT_CONFIGURED_MSG);

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
            unit_amount: Math.round(params.amount * 100),
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

    return ok({ sessionId: session.id, url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'خطأ غير معروف';
    return err(`فشل في إنشاء جلسة الدفع: ${message}`);
  }
}

export async function createPortalSession(
  customerId: string
): Promise<Result<{ url: string }>> {
  try {
    const stripe = await getStripe();
    if (!stripe) return err(NOT_CONFIGURED_MSG);

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    });

    return ok({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'خطأ غير معروف';
    return err(`فشل في إنشاء بوابة الإدارة: ${message}`);
  }
}

export async function cancelSubscription(
  subscriptionId: string
): Promise<Result<void>> {
  try {
    const stripe = await getStripe();
    if (!stripe) return err(NOT_CONFIGURED_MSG);

    await stripe.subscriptions.cancel(subscriptionId);
    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'خطأ غير معروف';
    return err(`فشل في إلغاء الاشتراك: ${message}`);
  }
}

export async function constructWebhookEvent(
  body: string | Buffer,
  signature: string
): Promise<Result<Stripe.Event>> {
  try {
    const stripe = await getStripe();
    if (!stripe) return err(NOT_CONFIGURED_MSG);

    const webhookSecret = await getSecret('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) return err('مفتاح Webhook غير مهيأ — أضف المفتاح من لوحة التحكم');

    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    return ok(event);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'خطأ غير معروف';
    return err(`فشل في التحقق من webhook: ${message}`);
  }
}

function getPeriodLabel(period: string): string {
  switch (period) {
    case 'monthly': return 'شهري';
    case 'term': return 'ترم دراسي';
    case 'annual': return 'سنوي';
    default: return period;
  }
}
