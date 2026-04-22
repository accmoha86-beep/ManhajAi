'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useRouter } from 'next/navigation';
import {
  CreditCard, Check, Loader2, Tag, ShoppingCart,
  ChevronLeft, Percent, AlertCircle,
} from 'lucide-react';

interface Subject {
  id: string;
  name_ar: string;
  icon: string;
  color: string;
  is_published: boolean;
}

const PERIODS = [
  { key: 'monthly', label: 'شهري', multiplier: 1, suffix: '/شهر' },
  { key: 'term', label: 'ترم (4 أشهر)', multiplier: 4, suffix: '/ترم', discount: 10 },
  { key: 'annual', label: 'سنوي', multiplier: 12, suffix: '/سنة', discount: 20 },
];

const PAYMENT_METHODS = [
  { key: 'stripe', label: 'بطاقة بنكية', icon: '💳' },
  { key: 'vodafone_cash', label: 'فودافون كاش', icon: '📱' },
  { key: 'fawry', label: 'فوري', icon: '🏪' },
  { key: 'instapay', label: 'إنستاباي', icon: '🏦' },
];

export default function SubscribePage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [period, setPeriod] = useState('monthly');
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState('');
  const [couponValid, setCouponValid] = useState(false);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const PRICE_PER_SUBJECT = 89;

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await fetch('/api/student/subjects', { credentials: 'include' });
        if (res.ok) {
          const json = await res.json();
          const list = (json.data?.subjects || json.subjects || []).filter((s: any) => s.is_published);
          setSubjects(list);
        }
      } catch {
        // fallback
      } finally {
        setLoading(false);
      }
    };
    fetchSubjects();
  }, []);

  const toggleSubject = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === subjects.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(subjects.map((s) => s.id));
    }
  };

  // Pricing calculations
  const totalSubjects = subjects.length;
  const selectedCount = selectedIds.length;
  const isAllSelected = selectedCount === totalSubjects && totalSubjects > 0;

  let autoDiscount = 0;
  if (isAllSelected) {
    autoDiscount = 35;
  } else if (selectedCount >= 3) {
    autoDiscount = 18;
  }

  const periodConfig = PERIODS.find((p) => p.key === period) || PERIODS[0];
  const basePrice = selectedCount * PRICE_PER_SUBJECT * periodConfig.multiplier;
  const periodDiscount = periodConfig.discount || 0;
  const totalDiscountPercent = Math.min(autoDiscount + periodDiscount + couponDiscount, 80);
  const discountAmount = Math.round(basePrice * (totalDiscountPercent / 100));
  const finalPrice = basePrice - discountAmount;

  const validateCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    setCouponError('');
    setCouponValid(false);
    setCouponDiscount(0);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim() }),
      });
      const data = await res.json();
      if (data.valid) {
        setCouponDiscount(data.discount_percent || 0);
        setCouponValid(true);
      } else {
        setCouponError(data.error || 'كود غير صالح');
      }
    } catch {
      setCouponError('خطأ في التحقق');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (selectedCount === 0) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/subscription/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          subject_ids: selectedIds,
          period: period,
          payment_method: paymentMethod,
          coupon_code: couponValid ? couponCode.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else if (data.success) {
        router.push('/subscription/success');
      } else {
        setError(data.error || 'حدث خطأ أثناء إنشاء الاشتراك');
      }
    } catch {
      setError('فشل الاتصال بالخادم');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center font-cairo">
        <Loader2 size={40} className="animate-spin" style={{ color: 'var(--theme-primary)' }} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 font-cairo max-w-5xl mx-auto space-y-6" dir="rtl" style={{ color: 'var(--theme-text-primary)' }}>
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl md:text-3xl font-extrabold mb-2" style={{ color: 'var(--theme-text-primary)' }}>
          اشترك في منهج AI 🚀
        </h1>
        <p className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
          اختر المواد التي تريد دراستها وابدأ رحلة التفوق
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Subject Selection + Options */}
        <div className="lg:col-span-2 space-y-6">
          {/* Subject Cards */}
          <div className="themed-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold flex items-center gap-2" style={{ color: 'var(--theme-text-primary)' }}>
                📚 اختر المواد
              </h2>
              <button
                onClick={selectAll}
                className="themed-btn-outline text-xs px-3 py-1.5 rounded-lg font-cairo"
              >
                {isAllSelected ? 'إلغاء الكل' : 'اختيار الكل'}
              </button>
            </div>

            {subjects.length === 0 ? (
              <p className="text-center py-8 text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
                لا توجد مواد متاحة حالياً
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {subjects.map((sub) => {
                  const selected = selectedIds.includes(sub.id);
                  return (
                    <button
                      key={sub.id}
                      onClick={() => toggleSubject(sub.id)}
                      className="themed-card p-4 flex items-center gap-3 text-right transition-all"
                      style={{
                        border: selected ? `2px solid ${sub.color || 'var(--theme-primary)'}` : '2px solid transparent',
                        background: selected ? `${sub.color || 'var(--theme-primary)'}10` : undefined,
                      }}
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                        style={{ background: `${sub.color || '#6366F1'}18` }}
                      >
                        {sub.icon || '📘'}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-sm" style={{ color: 'var(--theme-text-primary)' }}>
                          {sub.name_ar}
                        </h3>
                        <p className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
                          {PRICE_PER_SUBJECT} ج.م / شهر
                        </p>
                      </div>
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{
                          background: selected ? (sub.color || 'var(--theme-primary)') : 'var(--theme-surface-border)',
                        }}
                      >
                        {selected && <Check size={14} className="text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {autoDiscount > 0 && (
              <div
                className="flex items-center gap-2 p-3 rounded-xl text-sm font-bold"
                style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }}
              >
                <Percent size={16} />
                {isAllSelected
                  ? 'خصم 35% — اخترت كل المواد! 🎉'
                  : 'خصم 18% — اخترت 3 مواد أو أكثر! 🎁'}
              </div>
            )}
          </div>

          {/* Period Selector */}
          <div className="themed-card p-5 space-y-3">
            <h2 className="text-base font-extrabold flex items-center gap-2" style={{ color: 'var(--theme-text-primary)' }}>
              📅 مدة الاشتراك
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className="p-3 rounded-xl text-center transition-all"
                  style={{
                    background: period === p.key ? 'var(--theme-cta-gradient)' : 'var(--theme-hover-overlay)',
                    color: period === p.key ? '#fff' : 'var(--theme-text-primary)',
                    border: period === p.key ? 'none' : '1px solid var(--theme-surface-border)',
                  }}
                >
                  <div className="font-bold text-sm">{p.label}</div>
                  {p.discount && (
                    <div className="text-xs mt-1" style={{ opacity: 0.8 }}>
                      خصم {p.discount}%
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Method */}
          <div className="themed-card p-5 space-y-3">
            <h2 className="text-base font-extrabold flex items-center gap-2" style={{ color: 'var(--theme-text-primary)' }}>
              💳 طريقة الدفع
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {PAYMENT_METHODS.map((pm) => (
                <button
                  key={pm.key}
                  onClick={() => setPaymentMethod(pm.key)}
                  className="p-3 rounded-xl flex items-center gap-3 transition-all"
                  style={{
                    background: paymentMethod === pm.key ? 'var(--theme-cta-gradient)' : 'var(--theme-hover-overlay)',
                    color: paymentMethod === pm.key ? '#fff' : 'var(--theme-text-primary)',
                    border: paymentMethod === pm.key ? 'none' : '1px solid var(--theme-surface-border)',
                  }}
                >
                  <span className="text-2xl">{pm.icon}</span>
                  <span className="font-bold text-sm">{pm.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Coupon */}
          <div className="themed-card p-5 space-y-3">
            <h2 className="text-base font-extrabold flex items-center gap-2" style={{ color: 'var(--theme-text-primary)' }}>
              <Tag size={18} />
              كود خصم
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                className="themed-input flex-1 font-cairo text-sm"
                placeholder="أدخل كود الخصم..."
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value);
                  setCouponValid(false);
                  setCouponDiscount(0);
                  setCouponError('');
                }}
                dir="ltr"
              />
              <button
                onClick={validateCoupon}
                disabled={validatingCoupon || !couponCode.trim()}
                className="themed-btn-primary px-4 py-2 rounded-xl font-cairo text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {validatingCoupon ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                تحقق
              </button>
            </div>
            {couponValid && (
              <p className="text-sm font-bold" style={{ color: '#10B981' }}>
                ✅ تم تطبيق خصم {couponDiscount}%
              </p>
            )}
            {couponError && (
              <p className="text-sm font-bold" style={{ color: '#EF4444' }}>
                ❌ {couponError}
              </p>
            )}
          </div>
        </div>

        {/* Right: Summary */}
        <div>
          <div className="themed-card p-5 space-y-4 sticky top-20">
            <h2 className="text-lg font-extrabold flex items-center gap-2" style={{ color: 'var(--theme-text-primary)' }}>
              <ShoppingCart size={20} />
              ملخص الطلب
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--theme-text-secondary)' }}>المواد المختارة</span>
                <span className="font-bold" style={{ color: 'var(--theme-text-primary)' }}>{selectedCount} مادة</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--theme-text-secondary)' }}>الفترة</span>
                <span className="font-bold" style={{ color: 'var(--theme-text-primary)' }}>{periodConfig.label}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--theme-text-secondary)' }}>السعر الأساسي</span>
                <span className="font-bold" style={{ color: 'var(--theme-text-primary)' }}>{basePrice} ج.م</span>
              </div>

              {totalDiscountPercent > 0 && (
                <div className="flex justify-between text-sm" style={{ color: '#10B981' }}>
                  <span>الخصم ({totalDiscountPercent}%)</span>
                  <span className="font-bold">-{discountAmount} ج.م</span>
                </div>
              )}

              <div
                className="pt-3 flex justify-between items-center"
                style={{ borderTop: '2px solid var(--theme-surface-border)' }}
              >
                <span className="font-extrabold text-lg" style={{ color: 'var(--theme-text-primary)' }}>الإجمالي</span>
                <span className="font-extrabold text-2xl" style={{ color: 'var(--theme-primary)' }}>
                  {selectedCount > 0 ? `${finalPrice} ج.م` : '0 ج.م'}
                </span>
              </div>
            </div>

            {error && (
              <div
                className="p-3 rounded-lg text-sm font-bold flex items-center gap-2"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }}
              >
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <button
              onClick={handleSubscribe}
              disabled={selectedCount === 0 || submitting}
              className="w-full themed-btn-primary py-3 rounded-xl font-cairo text-base font-extrabold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <CreditCard size={20} />
              )}
              {submitting ? 'جارٍ المعالجة...' : 'اشترك الآن'}
            </button>

            {selectedCount === 0 && (
              <p className="text-xs text-center" style={{ color: 'var(--theme-text-muted)' }}>
                اختر مادة واحدة على الأقل للمتابعة
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
