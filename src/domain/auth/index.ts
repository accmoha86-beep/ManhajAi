// domain/auth/index.ts — Pure business logic for authentication
import type { Result } from '@/lib/result';
import { ok, err } from '@/lib/result';

/**
 * Validate an Egyptian phone number.
 * Must start with "01" and be exactly 11 digits.
 */
export function validatePhone(phone: string): Result<string> {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');

  if (!/^\d+$/.test(cleaned)) {
    return err('رقم الهاتف يجب أن يحتوي على أرقام فقط');
  }

  if (cleaned.length !== 11) {
    return err('رقم الهاتف يجب أن يكون 11 رقم');
  }

  if (!cleaned.startsWith('01')) {
    return err('رقم الهاتف يجب أن يبدأ بـ 01');
  }

  const validPrefixes = ['010', '011', '012', '015'];
  const prefix = cleaned.substring(0, 3);

  if (!validPrefixes.includes(prefix)) {
    return err('بادئة رقم الهاتف غير صالحة. يجب أن تكون 010 أو 011 أو 012 أو 015');
  }

  return ok(cleaned);
}

/**
 * Validate password strength.
 * Minimum 8 characters, must contain at least one number.
 */
export function validatePassword(password: string): Result<string> {
  if (!password || password.length < 8) {
    return err('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
  }

  if (!/\d/.test(password)) {
    return err('كلمة المرور يجب أن تحتوي على رقم واحد على الأقل');
  }

  return ok(password);
}

/**
 * Generate a unique referral code from the user's name.
 * Takes the first 3 letters of the name + 5 random alphanumeric characters.
 */
export function generateReferralCode(name: string): string {
  const sanitized = name.replace(/[^a-zA-Z\u0600-\u06FF]/g, '');
  const prefix = sanitized.substring(0, 3).toUpperCase() || 'MNH';

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let suffix = '';
  for (let i = 0; i < 5; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `${prefix}${suffix}`;
}

/**
 * Calculate the trial period end date from today.
 */
export function calculateTrialEnd(trialDays: number): Date {
  const end = new Date();
  end.setDate(end.getDate() + trialDays);
  return end;
}

/**
 * Check whether a trial has expired.
 */
export function isTrialExpired(trialEndsAt: Date): boolean {
  return new Date() > new Date(trialEndsAt);
}
