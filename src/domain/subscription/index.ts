// domain/subscription/index.ts — Pure business logic for subscriptions
import type { Result } from '@/lib/result';
import { ok, err } from '@/lib/result';
import type { Subscription, SubscriptionPlan } from '@/types';

/**
 * Calculate the price for a subscription based on selected subjects, plan, period, and optional coupon.
 */
export function calculatePrice(params: {
  subjects: number;
  plans: SubscriptionPlan[];
  period: 'monthly' | 'term' | 'annual';
  couponDiscount?: number;
}): {
  basePrice: number;
  discount: number;
  finalPrice: number;
  discountPercent: number;
} {
  const { subjects, plans, period, couponDiscount } = params;

  // Find the plan that matches the subject count, or use the first plan as fallback
  const plan = plans.find((p) => (p.max_subjects ?? 0) >= subjects) ?? plans[plans.length - 1];

  if (!plan) {
    return { basePrice: 0, discount: 0, finalPrice: 0, discountPercent: 0 };
  }

  // Base price per subject from plan
  const pricePerSubject = plan.price_monthly ?? 0;
  let basePrice = pricePerSubject * subjects;

  // Apply period multiplier
  let periodMultiplier = 1;
  switch (period) {
    case 'monthly':
      periodMultiplier = 1;
      break;
    case 'term':
      periodMultiplier = 4;
      break;
    case 'annual':
      periodMultiplier = 12;
      break;
  }

  basePrice = basePrice * periodMultiplier;

  // Calculate auto discount based on subject count
  const totalSubjects = Math.max(
    ...plans.map((p) => p.max_subjects ?? 0),
    subjects
  );
  const autoDiscountPercent = getAutoDiscount(subjects, totalSubjects);

  // Combine auto-discount and coupon discount (additive, capped at 50%)
  const totalDiscountPercent = Math.min(
    autoDiscountPercent + (couponDiscount ?? 0),
    50
  );

  const discount = Math.round(basePrice * (totalDiscountPercent / 100));
  const finalPrice = basePrice - discount;

  return {
    basePrice,
    discount,
    finalPrice: Math.max(finalPrice, 0),
    discountPercent: totalDiscountPercent,
  };
}

/**
 * Calculate auto-discount based on subject count.
 * 3+ subjects: 18% off
 * All subjects: 35% off
 */
export function getAutoDiscount(
  subjectCount: number,
  totalSubjects: number
): number {
  if (totalSubjects > 0 && subjectCount >= totalSubjects) {
    return 35;
  }
  if (subjectCount >= 3) {
    return 18;
  }
  return 0;
}

/**
 * Check if a subscription is currently active (not expired and not cancelled).
 */
export function isSubscriptionActive(sub: Subscription): boolean {
  const status = getSubscriptionStatus(sub);
  return status === 'active' || status === 'trial';
}

/**
 * Check if a subscription grants access to a specific subject.
 */
export function canAccessSubject(
  sub: Subscription,
  subjectId: string,
  subjectIds: string[]
): boolean {
  if (!isSubscriptionActive(sub)) {
    return false;
  }

  // If the subscription covers all subjects
  if ((sub as any).all_subjects) {
    return true;
  }

  // Check if the subject is in the subscription's subjects list
  return subjectIds.includes(subjectId);
}

/**
 * Determine the current status of a subscription.
 */
export function getSubscriptionStatus(
  sub: Subscription
): 'trial' | 'active' | 'expired' | 'cancelled' {
  // Explicit cancellation
  if ((sub as any).cancelled_at || sub.status === 'cancelled') {
    return 'cancelled';
  }

  const now = new Date();

  // Trial period check
  if (sub.trial_ends_at && !(sub as any).paid_at) {
    const trialEnd = new Date(sub.trial_ends_at);
    if (now <= trialEnd) {
      return 'trial';
    }
    return 'expired';
  }

  // Active paid subscription check
  if (sub.current_period_end) {
    const periodEnd = new Date(sub.current_period_end);
    if (now <= periodEnd) {
      return 'active';
    }
    return 'expired';
  }

  // If status is explicitly set
  if (sub.status === 'active') {
    return 'active';
  }

  return 'expired';
}
