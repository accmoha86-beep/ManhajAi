// infrastructure/whatsapp/client.ts — WhatsApp OTP client
import type { Result } from '@/lib/result';
import { ok, err } from '@/lib/result';

const WHATSAPP_API_URL = `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}`;

/**
 * Send an OTP code via WhatsApp Business API.
 */
export async function sendOTP(
  phone: string,
  code: string
): Promise<Result<void>> {
  try {
    // Format Egyptian phone to international: 01012345678 → 2001012345678
    const internationalPhone = phone.startsWith('0')
      ? `20${phone.substring(1)}`
      : phone;

    const response = await fetch(`${WHATSAPP_API_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: internationalPhone,
        type: 'template',
        template: {
          name: 'otp_verification',
          language: { code: 'ar' },
          components: [
            {
              type: 'body',
              parameters: [
                {
                  type: 'text',
                  text: code,
                },
              ],
            },
            {
              type: 'button',
              sub_type: 'url',
              index: 0,
              parameters: [
                {
                  type: 'text',
                  text: code,
                },
              ],
            },
          ],
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMsg =
        errorData?.error?.message ?? `HTTP ${response.status}`;
      console.error('[WhatsApp OTP] Send failed:', errorMsg);
      return err('فشل في إرسال رمز التحقق. يرجى المحاولة مرة أخرى');
    }

    return ok(undefined);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'خطأ غير معروف';
    console.error('[WhatsApp OTP] Error:', message);
    return err('فشل في إرسال رمز التحقق. يرجى المحاولة مرة أخرى');
  }
}

/**
 * Generate a 4-digit OTP code.
 */
export function generateOTP(): string {
  const otp = Math.floor(1000 + Math.random() * 9000);
  return otp.toString();
}

/**
 * Check whether an OTP has expired based on creation time and TTL.
 */
export function isOTPExpired(createdAt: Date, ttlMinutes: number): boolean {
  const now = new Date();
  const expiresAt = new Date(createdAt);
  expiresAt.setMinutes(expiresAt.getMinutes() + ttlMinutes);
  return now > expiresAt;
}
