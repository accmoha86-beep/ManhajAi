// =============================================================================
// Manhaj AI — Validated Environment Variables
// =============================================================================

import { z } from 'zod';

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // AI
  ANTHROPIC_API_KEY: z.string().min(1),

  // Stripe
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1),

  // Paymob
  PAYMOB_API_KEY: z.string().min(1),
  PAYMOB_IFRAME_ID: z.string().min(1),
  PAYMOB_INTEGRATION_ID_CARD: z.string().min(1),
  PAYMOB_INTEGRATION_ID_VODAFONE: z.string().min(1),
  PAYMOB_INTEGRATION_ID_FAWRY: z.string().min(1),
  PAYMOB_HMAC_SECRET: z.string().min(1),

  // WhatsApp OTP
  WHATSAPP_API_URL: z.string().url(),
  WHATSAPP_API_TOKEN: z.string().min(1),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url().default('https://manhaj-ai.com'),
  NEXT_PUBLIC_APP_NAME: z.string().default('Manhaj AI'),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ متغيرات البيئة غير صالحة:');
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error('متغيرات البيئة غير صالحة - تحقق من ملف .env');
  }

  return parsed.data;
}

export const env = validateEnv();
