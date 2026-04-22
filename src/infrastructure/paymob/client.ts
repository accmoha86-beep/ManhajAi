// infrastructure/paymob/client.ts — Paymob Accept API integration
import type { Result } from '@/lib/result';
import { ok, err } from '@/lib/result';
import crypto from 'crypto';

const PAYMOB_API_URL = 'https://accept.paymob.com/api';

const INTEGRATION_IDS: Record<string, string> = {
  vodafone: process.env.PAYMOB_VODAFONE_INTEGRATION_ID!,
  fawry: process.env.PAYMOB_FAWRY_INTEGRATION_ID!,
  instapay: process.env.PAYMOB_INSTAPAY_INTEGRATION_ID!,
};

/**
 * Authenticate with Paymob and get an auth token.
 */
async function authenticate(): Promise<Result<string>> {
  try {
    const response = await fetch(`${PAYMOB_API_URL}/auth/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: process.env.PAYMOB_API_KEY! }),
    });

    if (!response.ok) {
      return err('فشل في الاتصال ببوابة الدفع');
    }

    const data = await response.json();
    return ok(data.token as string);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'خطأ غير معروف';
    return err(`فشل في مصادقة بوابة الدفع: ${message}`);
  }
}

/**
 * Register an order with Paymob.
 */
async function createOrder(
  authToken: string,
  amountCents: number,
  merchantOrderId: string
): Promise<Result<number>> {
  try {
    const response = await fetch(`${PAYMOB_API_URL}/ecommerce/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        auth_token: authToken,
        delivery_needed: false,
        amount_cents: amountCents,
        currency: 'EGP',
        merchant_order_id: merchantOrderId,
        items: [],
      }),
    });

    if (!response.ok) {
      return err('فشل في إنشاء الطلب');
    }

    const data = await response.json();
    return ok(data.id as number);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'خطأ غير معروف';
    return err(`فشل في إنشاء الطلب: ${message}`);
  }
}

/**
 * Generate a payment key for the order.
 */
async function getPaymentKey(
  authToken: string,
  orderId: number,
  amountCents: number,
  integrationId: string,
  billingData: object
): Promise<Result<string>> {
  try {
    const response = await fetch(
      `${PAYMOB_API_URL}/acceptance/payment_keys`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          auth_token: authToken,
          amount_cents: amountCents,
          expiration: 3600,
          order_id: orderId,
          billing_data: billingData,
          currency: 'EGP',
          integration_id: parseInt(integrationId, 10),
        }),
      }
    );

    if (!response.ok) {
      return err('فشل في إنشاء مفتاح الدفع');
    }

    const data = await response.json();
    return ok(data.token as string);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'خطأ غير معروف';
    return err(`فشل في إنشاء مفتاح الدفع: ${message}`);
  }
}

/**
 * Create a payment via Paymob.
 * Amount should be in piasters (EGP * 100).
 */
export async function createPayment(params: {
  amount: number;
  userId: string;
  method: 'vodafone' | 'fawry' | 'instapay';
  phone?: string;
}): Promise<Result<{ paymentUrl: string; orderId: string }>> {
  const { amount, userId, method, phone } = params;

  const integrationId = INTEGRATION_IDS[method];
  if (!integrationId) {
    return err(`طريقة الدفع "${method}" غير مدعومة حاليًا`);
  }

  // Step 1: Authenticate
  const authResult = await authenticate();
  if (!authResult.ok) return authResult;
  const authToken = authResult.data;

  // Step 2: Create order
  const merchantOrderId = `MNH_${userId}_${Date.now()}`;
  const orderResult = await createOrder(authToken, amount, merchantOrderId);
  if (!orderResult.ok) return orderResult;
  const orderId = orderResult.data;

  // Step 3: Get payment key
  const billingData = {
    first_name: 'Student',
    last_name: 'User',
    email: 'student@manhaj.ai',
    phone_number: phone ?? '01000000000',
    apartment: 'NA',
    floor: 'NA',
    street: 'NA',
    building: 'NA',
    shipping_method: 'NA',
    postal_code: 'NA',
    city: 'Cairo',
    country: 'EG',
    state: 'Cairo',
  };

  const keyResult = await getPaymentKey(
    authToken,
    orderId,
    amount,
    integrationId,
    billingData
  );
  if (!keyResult.ok) return keyResult;
  const paymentKey = keyResult.data;

  // Step 4: Build payment URL based on method
  let paymentUrl: string;
  if (method === 'vodafone') {
    paymentUrl = `https://accept.paymob.com/api/acceptance/payments/pay`;
  } else if (method === 'fawry') {
    paymentUrl = `https://accept.paymob.com/api/acceptance/fawry_pay`;
  } else {
    paymentUrl = `https://accept.paymob.com/api/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=${paymentKey}`;
  }

  return ok({
    paymentUrl,
    orderId: orderId.toString(),
  });
}

/**
 * Verify a Paymob callback HMAC signature.
 */
export function verifyCallback(hmac: string, data: object): boolean {
  const hmacSecret = process.env.PAYMOB_HMAC_SECRET!;

  // Paymob requires concatenating specific fields in order
  const sortedData = data as Record<string, unknown>;
  const fields = [
    'amount_cents',
    'created_at',
    'currency',
    'error_occured',
    'has_parent_transaction',
    'id',
    'integration_id',
    'is_3d_secure',
    'is_auth',
    'is_capture',
    'is_refunded',
    'is_standalone_payment',
    'is_voided',
    'order',
    'owner',
    'pending',
    'source_data.pan',
    'source_data.sub_type',
    'source_data.type',
    'success',
  ];

  const concatenated = fields
    .map((field) => {
      const keys = field.split('.');
      let value: unknown = sortedData;
      for (const key of keys) {
        value = (value as Record<string, unknown>)?.[key];
      }
      return String(value ?? '');
    })
    .join('');

  const calculatedHmac = crypto
    .createHmac('sha512', hmacSecret)
    .update(concatenated)
    .digest('hex');

  return calculatedHmac === hmac;
}
