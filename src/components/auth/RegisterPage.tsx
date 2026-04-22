"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import {
  UserPlus, Phone, Lock, Eye, EyeOff, User, MapPin,
  ChevronLeft, ChevronRight, Check, Loader2, CheckCircle2,
} from "lucide-react";
import { GOVERNORATES } from "@/lib/constants";

export default function RegisterPage() {
  const { login } = useAuthStore();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Step 1: Credentials
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Step 2: OTP (skipped for now)
  const [otpSkipMessage, setOtpSkipMessage] = useState("");

  // Step 3: Governorate
  const [governorate, setGovernorate] = useState("");

  // Step 4: Success
  const [successData, setSuccessData] = useState<{
    name: string;
    referralCode: string;
  } | null>(null);

  // Auto-advance OTP step
  useEffect(() => {
    if (step === 2) {
      setOtpSkipMessage("جارٍ التحقق...");
      const timer = setTimeout(() => {
        setOtpSkipMessage("تم التخطي مؤقتاً ✅");
        const advanceTimer = setTimeout(() => setStep(3), 500);
        return () => clearTimeout(advanceTimer);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleStep1 = () => {
    setError("");
    if (!name || name.length < 2) {
      setError("الاسم مطلوب (حرفين على الأقل)");
      return;
    }
    if (!/^01[0125]\d{8}$/.test(phone)) {
      setError("رقم الهاتف غير صحيح (مثال: 01012345678)");
      return;
    }
    if (password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    setStep(2);
  };

  const handleStep3Submit = async () => {
    setError("");
    if (!governorate) {
      setError("يرجى اختيار المحافظة");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          full_name: name,
          phone,
          password,
          governorate,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "فشل التسجيل");
        setLoading(false);
        return;
      }

      // Store auth
      login(
        {
          id: data.user?.id || data.user_id || "",
          fullName: name,
          phone,
          role: "student",
          trialEndsAt: data.user?.trialEndsAt || null,
          referralCode: data.user?.referralCode || "",
          avatarUrl: null,
        },
        data.token || ""
      );

      setSuccessData({
        name,
        referralCode: data.user?.referralCode || "",
      });
      setStep(4);
      setLoading(false);

      // Redirect after showing success
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 2000);
    } catch {
      setError("فشل الاتصال بالخادم");
      setLoading(false);
    }
  };

  const stepTitles = ["البيانات الأساسية", "تأكيد الهاتف", "المحافظة", "تم بنجاح!"];

  const renderProgressBar = () => (
    <div className="flex items-center justify-between mb-8">
      {[1, 2, 3, 4].map((s) => (
        <div key={s} className="flex items-center flex-1">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{
              background: step >= s ? "var(--theme-cta-gradient)" : "var(--theme-surface-border)",
              color: step >= s ? "#fff" : "var(--theme-text-muted)",
              boxShadow: step >= s ? "var(--theme-btn-shadow)" : "none",
            }}
          >
            {step > s ? <Check size={18} /> : s}
          </div>
          {s < 4 && (
            <div
              className="flex-1 h-[3px] mx-2 rounded-full"
              style={{
                background: step > s ? "var(--theme-primary)" : "var(--theme-surface-border)",
              }}
            />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div
      className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6"
      style={{ background: "var(--theme-page-bg)" }}
    >
      <div className="themed-card p-8 w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: "var(--theme-cta-gradient)" }}
          >
            <UserPlus size={28} color="#fff" />
          </div>
          <h1 className="text-2xl font-extrabold mb-1" style={{ color: "var(--theme-text-primary)" }}>
            إنشاء حساب جديد
          </h1>
          <p className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>
            {stepTitles[step - 1]}
          </p>
        </div>

        {renderProgressBar()}

        {error && (
          <div
            className="mb-4 p-3 rounded-lg text-sm font-bold text-center"
            style={{
              background: "rgba(220,38,38,0.1)",
              color: "#DC2626",
              border: "1px solid rgba(220,38,38,0.3)",
            }}
          >
            {error}
          </div>
        )}

        {/* Step 1: Name + Phone + Password */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: "var(--theme-text-primary)" }}>
                👤 الاسم الكامل
              </label>
              <div className="relative">
                <User
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--theme-text-muted)" }}
                />
                <input
                  className="themed-input pr-10"
                  placeholder="الاسم الكامل"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: "var(--theme-text-primary)" }}>
                📱 رقم الهاتف
              </label>
              <div className="relative">
                <Phone
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--theme-text-muted)" }}
                />
                <input
                  className="themed-input pr-10"
                  placeholder="01xxxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  dir="ltr"
                  style={{ textAlign: "right" }}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: "var(--theme-text-primary)" }}>
                🔒 كلمة المرور
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--theme-text-muted)" }}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  className="themed-input pr-10 pl-10"
                  placeholder="6 أحرف على الأقل"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--theme-text-muted)", background: "none", border: "none", cursor: "pointer" }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button
              onClick={handleStep1}
              className="themed-btn-primary w-full flex items-center justify-center gap-2 py-3 text-lg"
            >
              <span>التالي</span>
              <ChevronLeft size={20} />
            </button>
          </div>
        )}

        {/* Step 2: OTP — Auto-skip */}
        {step === 2 && (
          <div className="text-center space-y-6 py-8">
            <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center"
              style={{ background: "var(--theme-hover-overlay)" }}>
              <Loader2 size={32} className="animate-spin" style={{ color: "var(--theme-primary)" }} />
            </div>
            <p className="text-sm font-bold" style={{ color: "var(--theme-text-secondary)" }}>
              {otpSkipMessage || "جارٍ التحقق من الهاتف..."}
            </p>
            <p className="text-xs" style={{ color: "var(--theme-text-muted)" }}>
              📱 {phone}
            </p>
          </div>
        )}

        {/* Step 3: Governorate */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: "var(--theme-text-primary)" }}>
                📍 المحافظة
              </label>
              <div className="relative">
                <MapPin
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--theme-text-muted)" }}
                />
                <select
                  className="themed-input pr-10"
                  value={governorate}
                  onChange={(e) => setGovernorate(e.target.value)}
                >
                  <option value="">اختر المحافظة</option>
                  {GOVERNORATES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: "var(--theme-text-primary)" }}>
                🎓 الصف الدراسي
              </label>
              <div
                className="themed-card p-3 flex items-center gap-3"
                style={{
                  borderColor: "var(--theme-primary)",
                  background: "var(--theme-hover-overlay)",
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                  style={{ background: "var(--theme-cta-gradient)", color: "#fff" }}
                >
                  <Check size={16} />
                </div>
                <span className="font-bold" style={{ color: "var(--theme-text-primary)" }}>
                  الصف الثالث الثانوي
                </span>
                <span
                  className="text-xs mr-auto px-2 py-0.5 rounded-full"
                  style={{ background: "var(--theme-hover-overlay)", color: "var(--theme-primary)" }}
                >
                  المتاح حالياً
                </span>
              </div>
            </div>

            <div
              className="p-3 rounded-lg text-sm text-center"
              style={{
                background: "rgba(59,130,246,0.08)",
                color: "var(--theme-primary)",
                border: "1px solid rgba(59,130,246,0.2)",
              }}
            >
              🎁 تجربة مجانية لمدة يومين — بدون أي رسوم!
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="themed-btn-outline flex-1 py-3">
                <ChevronRight size={18} className="inline" /> رجوع
              </button>
              <button
                onClick={handleStep3Submit}
                disabled={loading}
                className="themed-btn-primary flex-1 py-3 flex items-center justify-center gap-2 text-lg"
                style={{ opacity: loading ? 0.7 : 1 }}
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>جارٍ التسجيل...</span>
                  </>
                ) : (
                  <>
                    <span>ابدأ التجربة المجانية</span>
                    <ChevronLeft size={18} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && successData && (
          <div className="text-center space-y-6 py-4">
            <div
              className="w-20 h-20 mx-auto rounded-full flex items-center justify-center"
              style={{ background: "rgba(16,185,129,0.15)" }}
            >
              <CheckCircle2 size={40} style={{ color: "#10B981" }} />
            </div>
            <h2 className="text-xl font-extrabold" style={{ color: "var(--theme-text-primary)" }}>
              أهلاً بك {successData.name}! 🎉
            </h2>
            <p className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>
              تم إنشاء حسابك بنجاح. جاري تحويلك للوحة التحكم...
            </p>
            <div className="flex items-center justify-center gap-2">
              <Loader2 size={18} className="animate-spin" style={{ color: "var(--theme-primary)" }} />
              <span className="text-sm font-bold" style={{ color: "var(--theme-primary)" }}>
                جارٍ التحويل...
              </span>
            </div>
          </div>
        )}

        {/* Login link */}
        {step < 4 && (
          <div className="text-center mt-6">
            <span className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>
              {"عندك حساب بالفعل؟ "}
            </span>
            <Link href="/login" className="text-sm font-bold" style={{ color: "var(--theme-primary)" }}>
              سجل دخول
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
