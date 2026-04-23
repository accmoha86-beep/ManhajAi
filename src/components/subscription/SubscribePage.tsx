"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/auth-store";
import {
  CreditCard, Check, Star, Loader2, Zap,
  Shield, Clock, Tag, X, CheckCircle2,
} from "lucide-react";

interface Plan {
  id: string;
  name_ar: string;
  max_subjects: number;
  price_monthly: number;
  price_term?: number;
  price_annual?: number;
  discount_percent: number;
  features_ar: string[];
  is_active: boolean;
  is_popular?: boolean;
}

interface AppliedCoupon {
  coupon_id: string;
  code: string;
  discount_percent: number;
  description: string;
}

const DEFAULT_PRICE = 89;

type Period = 'monthly' | 'term' | 'annual';

const periodLabels: Record<Period, string> = {
  monthly: 'شهري',
  term: 'ترم دراسي',
  annual: 'سنوي',
};

export default function SubscribePage() {
  const { user } = useAuthStore();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('monthly');
  const [processing, setProcessing] = useState(false);

  // Promo code state
  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/subscription/plans');
      const data = await res.json();
      if (data.plans && data.plans.length > 0) {
        setPlans(data.plans);
        // Select popular plan by default, or first
        const popular = data.plans.find((p: Plan) => p.is_popular);
        setSelectedPlan(popular?.id || data.plans[0]?.id || null);
      } else {
        setPlans([
          { id: 'default-1', name_ar: 'مادة واحدة', max_subjects: 1, price_monthly: DEFAULT_PRICE, discount_percent: 0, features_ar: ['شرح تفاعلي بالذكاء الاصطناعي', 'امتحانات ذكية', 'تقارير مفصلة'], is_active: true },
          { id: 'default-2', name_ar: '3 مواد', max_subjects: 3, price_monthly: 219, discount_percent: 18, features_ar: ['كل مميزات المادة الواحدة', 'خصم 18%', 'أولوية الدعم'], is_active: true, is_popular: true },
          { id: 'default-3', name_ar: 'كل المواد', max_subjects: 99, price_monthly: 349, discount_percent: 35, features_ar: ['وصول لجميع المواد', 'خصم 35%', 'دعم VIP'], is_active: true },
        ]);
        setSelectedPlan('default-2');
      }
    } catch {
      setPlans([
        { id: 'default-1', name_ar: 'مادة واحدة', max_subjects: 1, price_monthly: DEFAULT_PRICE, discount_percent: 0, features_ar: ['شرح تفاعلي'], is_active: true },
      ]);
      setSelectedPlan('default-1');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  const getPrice = (plan: Plan, period: Period): number => {
    switch (period) {
      case 'term': return plan.price_term || plan.price_monthly * 4;
      case 'annual': return plan.price_annual || plan.price_monthly * 10;
      default: return plan.price_monthly;
    }
  };

  const getDiscount = (plan: Plan, period: Period): number => {
    if (period === 'monthly') return 0;
    const monthlyTotal = plan.price_monthly * (period === 'term' ? 4 : 12);
    const actualPrice = getPrice(plan, period);
    if (actualPrice >= monthlyTotal) return 0;
    return Math.round(((monthlyTotal - actualPrice) / monthlyTotal) * 100);
  };

  const getFinalPrice = (plan: Plan, period: Period): number => {
    const basePrice = getPrice(plan, period);
    if (appliedCoupon) {
      const discounted = basePrice * (1 - appliedCoupon.discount_percent / 100);
      return Math.round(discounted);
    }
    return basePrice;
  };

  // Validate promo code
  const validatePromo = async () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) {
      setPromoError("اكتب كود الخصم");
      return;
    }
    setPromoLoading(true);
    setPromoError("");
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.valid) {
        setAppliedCoupon({
          coupon_id: data.coupon_id,
          code: data.code,
          discount_percent: data.discount_percent,
          description: data.description,
        });
        setPromoError("");
      } else {
        setPromoError(data.error || 'كود الخصم غير صالح');
        setAppliedCoupon(null);
      }
    } catch {
      setPromoError('فشل في التحقق من كود الخصم');
    } finally {
      setPromoLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setPromoCode("");
    setPromoError("");
  };

  const handleSubscribe = async () => {
    if (!selectedPlan || !user) {
      if (!user) window.location.href = '/login';
      return;
    }
    const plan = plans.find(p => p.id === selectedPlan);
    if (!plan) return;

    setProcessing(true);
    try {
      const res = await fetch('/api/subscription/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          planId: plan.id,
          period: selectedPeriod,
          paymentMethod: 'stripe',
          couponCode: appliedCoupon?.code || undefined,
          subjects: [],
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        alert(data.error);
      }
    } catch {
      alert('فشل في إنشاء جلسة الدفع — تأكد من تسجيل الدخول');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] font-cairo">
        <Loader2 className="animate-spin" size={40} style={{ color: 'var(--theme-primary)' }} />
      </div>
    );
  }

  const currentPlan = plans.find(p => p.id === selectedPlan);

  return (
    <div className="p-6 font-cairo max-w-5xl mx-auto" style={{ color: 'var(--theme-text-primary)' }}>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-4xl mb-3">🚀</div>
        <h1 className="text-3xl font-extrabold mb-2">اختر خطتك</h1>
        <p className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
          ابدأ رحلتك مع منهج AI — تعلم ذكي وتفاعلي
        </p>
      </div>

      {/* Free Trial CTA */}
      <div className="themed-card p-5 mb-8 text-center max-w-lg mx-auto" style={{ border: '2px solid var(--theme-primary)', background: 'var(--theme-surface-bg)' }}>
        <div className="text-3xl mb-2">🎁</div>
        <h3 className="text-lg font-extrabold mb-1" style={{ color: 'var(--theme-primary)' }}>
          جرّب مجانًا — بدون بطاقة دفع!
        </h3>
        <p className="text-sm mb-3" style={{ color: 'var(--theme-text-secondary)' }}>
          ابدأ بتجربة مجانية لمدة يومين وشوف المنصة بنفسك
        </p>
        <button
          onClick={async () => {
            if (!user) { window.location.href = '/register'; return; }
            setProcessing(true);
            try {
              const res = await fetch('/api/subscription/trial', { method: 'POST', credentials: 'include' });
              const data = await res.json();
              if (data.success) {
                alert(data.message);
                window.location.href = '/dashboard';
              } else {
                alert(data.error || 'فشل في تفعيل التجربة');
              }
            } catch { alert('فشل في الاتصال'); }
            setProcessing(false);
          }}
          disabled={processing}
          className="px-8 py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 mx-auto"
          style={{ background: 'var(--theme-cta-gradient)' }}
        >
          {processing ? <Loader2 className="animate-spin" size={18} /> : <><Zap size={18} /> ابدأ التجربة المجانية</>}
        </button>
      </div>

      {/* Period Selector */}
      <div className="flex justify-center gap-2 mb-8">
        {(['monthly', 'term', 'annual'] as Period[]).map(period => (
          <button
            key={period}
            onClick={() => setSelectedPeriod(period)}
            className="px-5 py-2 rounded-xl text-sm font-bold transition-all"
            style={{
              background: selectedPeriod === period ? 'var(--theme-cta-gradient)' : 'var(--theme-hover-overlay)',
              color: selectedPeriod === period ? '#fff' : 'var(--theme-text-secondary)',
              border: selectedPeriod === period ? 'none' : '1px solid var(--theme-surface-border)',
            }}
          >
            {periodLabels[period]}
            {period === 'annual' && <span className="mr-1">🔥</span>}
          </button>
        ))}
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {plans.map((plan) => {
          const isSelected = selectedPlan === plan.id;
          const price = getPrice(plan, selectedPeriod);
          const finalPrice = getFinalPrice(plan, selectedPeriod);
          const discount = getDiscount(plan, selectedPeriod);
          const isPopular = plan.is_popular;
          return (
            <button
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className="themed-card p-5 text-right cursor-pointer transition-all relative"
              style={{
                borderColor: isSelected ? 'var(--theme-primary)' : undefined,
                borderWidth: isSelected ? '2px' : undefined,
                boxShadow: isSelected ? '0 4px 20px rgba(99,102,241,0.2)' : undefined,
                transform: isSelected ? 'scale(1.02)' : undefined,
              }}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: 'var(--theme-cta-gradient)', color: '#fff' }}>
                  <Star size={10} className="inline ml-1" /> الأكثر شيوعاً
                </div>
              )}
              {discount > 0 && (
                <div className="absolute top-3 left-3 px-2 py-0.5 rounded-lg text-xs font-bold"
                  style={{ background: '#10B98115', color: '#10B981' }}>
                  وفر {discount}%
                </div>
              )}
              <div className="text-2xl mb-2">
                {plan.max_subjects >= 99 ? '👑' : plan.max_subjects >= 2 ? '⭐' : '📘'}
              </div>
              <h3 className="text-lg font-extrabold mb-1" style={{ color: 'var(--theme-text-primary)' }}>
                {plan.name_ar}
              </h3>
              <div className="text-xs mb-3" style={{ color: 'var(--theme-text-muted)' }}>
                {plan.max_subjects >= 99 ? 'جميع المواد' : `حتى ${plan.max_subjects} ${plan.max_subjects === 1 ? 'مادة' : 'مواد'}`}
              </div>
              <div className="mb-4">
                {appliedCoupon && (
                  <span className="text-lg line-through ml-2" style={{ color: 'var(--theme-text-muted)' }}>
                    {price}
                  </span>
                )}
                <span className="text-3xl font-extrabold" style={{ color: 'var(--theme-primary)' }}>
                  {finalPrice}
                </span>
                <span className="text-sm mr-1" style={{ color: 'var(--theme-text-muted)' }}>
                  ج.م / {periodLabels[selectedPeriod]}
                </span>
              </div>
              <div className="space-y-2">
                {(plan.features_ar || []).map((feature, fi) => (
                  <div key={fi} className="flex items-center gap-2 text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
                    <Check size={14} style={{ color: '#10B981' }} />
                    {feature}
                  </div>
                ))}
              </div>
              {isSelected && (
                <div className="mt-4 w-full py-2 rounded-xl text-sm font-bold text-center"
                  style={{ background: 'var(--theme-cta-gradient)', color: '#fff' }}>
                  ✓ مختارة
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Promo Code Section */}
      <div className="themed-card p-5 mb-6 max-w-md mx-auto">
        <div className="flex items-center gap-2 mb-3">
          <Tag size={18} style={{ color: 'var(--theme-primary)' }} />
          <h3 className="text-sm font-extrabold" style={{ color: 'var(--theme-text-primary)' }}>
            عندك كود خصم؟
          </h3>
        </div>

        {appliedCoupon ? (
          /* Applied coupon display */
          <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: '#10B98110', border: '1px solid #10B981' }}>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={20} style={{ color: '#10B981' }} />
              <div>
                <div className="text-sm font-bold" style={{ color: '#10B981' }}>
                  {appliedCoupon.code} — خصم {appliedCoupon.discount_percent}%
                </div>
                <div className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                  {appliedCoupon.description}
                </div>
              </div>
            </div>
            <button
              onClick={removeCoupon}
              className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
              title="إزالة الكود"
            >
              <X size={16} style={{ color: '#EF4444' }} />
            </button>
          </div>
        ) : (
          /* Promo code input */
          <div>
            <div className="flex gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoError(""); }}
                onKeyDown={(e) => e.key === 'Enter' && validatePromo()}
                placeholder="ادخل كود الخصم..."
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold"
                style={{
                  background: 'var(--theme-hover-overlay)',
                  border: promoError ? '1px solid #EF4444' : '1px solid var(--theme-surface-border)',
                  color: 'var(--theme-text-primary)',
                  letterSpacing: '2px',
                  textAlign: 'center',
                }}
                dir="ltr"
                maxLength={20}
              />
              <button
                onClick={validatePromo}
                disabled={promoLoading || !promoCode.trim()}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                style={{
                  background: 'var(--theme-cta-gradient)',
                  opacity: promoLoading || !promoCode.trim() ? 0.5 : 1,
                }}
              >
                {promoLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "تطبيق"
                )}
              </button>
            </div>
            {promoError && (
              <p className="text-xs mt-2 font-bold" style={{ color: '#EF4444' }}>
                ❌ {promoError}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Subscribe Button */}
      {currentPlan && (
        <div className="themed-card p-6 text-center max-w-md mx-auto">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield size={20} style={{ color: '#10B981' }} />
            <span className="text-sm font-bold" style={{ color: 'var(--theme-text-secondary)' }}>
              دفع آمن — ضمان استرداد 7 أيام
            </span>
          </div>
          <div className="text-xl font-extrabold mb-1" style={{ color: 'var(--theme-text-primary)' }}>
            {currentPlan.name_ar} — {getFinalPrice(currentPlan, selectedPeriod)} ج.م
            {appliedCoupon && (
              <span className="text-sm line-through mr-2" style={{ color: 'var(--theme-text-muted)' }}>
                {getPrice(currentPlan, selectedPeriod)} ج.م
              </span>
            )}
          </div>
          <div className="text-xs mb-4 flex items-center justify-center gap-1" style={{ color: 'var(--theme-text-muted)' }}>
            <Clock size={12} /> {periodLabels[selectedPeriod]}
            {appliedCoupon && (
              <span className="mr-2 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: '#10B98120', color: '#10B981' }}>
                🎫 {appliedCoupon.code}
              </span>
            )}
          </div>
          <button
            onClick={handleSubscribe}
            disabled={processing}
            className="themed-btn-primary w-full py-3 text-lg font-bold flex items-center justify-center gap-2"
          >
            {processing ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <CreditCard size={20} />
                اشترك الآن
                <Zap size={16} />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
