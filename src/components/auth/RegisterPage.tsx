"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuthStore } from "@/store/auth-store";
import {
  UserPlus, Phone, Lock, Eye, EyeOff, User, MapPin,
  ChevronLeft, ChevronRight, Check, Loader2, CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { GOVERNORATES } from "@/lib/constants";

type ConfirmationResultType = { confirm: (code: string) => Promise<{ user: { getIdToken: () => Promise<string> } }> };

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

  // Step 2: OTP via Firebase
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [firebaseConfigured, setFirebaseConfigured] = useState(false);
  const [otpEnabledByAdmin, setOtpEnabledByAdmin] = useState(true);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResultType | null>(null);
  const [firebaseToken, setFirebaseToken] = useState<string | null>(null);
  const [otpTimer, setOtpTimer] = useState(120);
  const [canResend, setCanResend] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const recaptchaRef = useRef<HTMLDivElement>(null);

  // Step 3: Governorate
  const [governorate, setGovernorate] = useState("");

  // Step 4: Success
  const [successData, setSuccessData] = useState<{ name: string; referralCode: string } | null>(null);

  // Check Firebase config + admin OTP setting on mount
  useEffect(() => {
    const checkFirebase = async () => {
      try {
        const mod = await import("@/infrastructure/firebase/config");
        setFirebaseConfigured(mod.isFirebaseConfigured());
      } catch {
        setFirebaseConfigured(false);
      }
    };
    const checkOtpSetting = async () => {
      try {
        const res = await fetch("/api/public/settings");
        const data = await res.json();
        setOtpEnabledByAdmin(data.otp_enabled === true || data.otp_enabled === "true");
      } catch {
        setOtpEnabledByAdmin(true);
      }
    };
    checkFirebase();
    checkOtpSetting();
  }, []);

  const otpActive = otpEnabledByAdmin && firebaseConfigured;

  useEffect(() => {
    if (step !== 2 || !otpActive) return;
    if (otpTimer <= 0) {
      setCanResend(true);
      return;
    }
    const interval = setInterval(() => setOtpTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [step, otpTimer, otpActive]);

  const sendOtp = useCallback(async () => {
    if (!phone) return;
    setOtpSending(true);
    setError("");
    try {
      const { setupRecaptcha, sendFirebaseOTP } = await import("@/infrastructure/firebase/config");
      const recaptchaVerifier = await setupRecaptcha("recaptcha-container");
      if (!recaptchaVerifier) {
        throw new Error("Failed to setup reCAPTCHA");
      }
      const result = await sendFirebaseOTP(phone, recaptchaVerifier);
      setConfirmationResult(result as unknown as ConfirmationResultType);
      setOtpTimer(120);
      setCanResend(false);
    } catch (e) {
      console.error("[OTP] Send failed:", e);
      setError("فشل إرسال كود التحقق. تأكد من صحة رقم الهاتف");
    } finally {
      setOtpSending(false);
    }
  }, [phone]);

  useEffect(() => {
    if (step === 2 && otpActive && !confirmationResult) {
      sendOtp();
    }
    if (step === 2 && !otpActive) {
      const timer = setTimeout(() => setStep(3), 800);
      return () => clearTimeout(timer);
    }
  }, [step, otpActive, confirmationResult, sendOtp]);

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

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 3) {
      otpRefs.current[index + 1]?.focus();
    }
    if (value && index === 3 && newOtp.every((d) => d)) {
      verifyOtp(newOtp.join(""));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const verifyOtp = async (code: string) => {
    if (!confirmationResult) return;
    setLoading(true);
    setError("");
    try {
      const result = await confirmationResult.confirm(code);
      const idToken = await result.user.getIdToken();
      setFirebaseToken(idToken);
      setStep(3);
    } catch {
      setError("كود التحقق غير صحيح");
      setOtp(["", "", "", ""]);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
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
          firebase_token: firebaseToken || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "فشل التسجيل");
        setLoading(false);
        return;
      }

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

      setSuccessData({ name, referralCode: data.user?.referralCode || "" });
      setStep(4);
      setLoading(false);

      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 2000);
    } catch {
      setError("فشل الاتصال بالخادم");
      setLoading(false);
    }
  };

  const stepLabels = ["البيانات", "التحقق", "المحافظة", "تم!"];
  const stepIcons = ["📝", "📱", "📍", "✅"];

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6"
      style={{ background: "var(--theme-page-bg)" }}
    >
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: "var(--theme-primary)" }}
        />
        <div
          className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: "var(--theme-accent)" }}
        />
      </div>

      <div className="themed-card p-8 sm:p-10 w-full max-w-lg relative" style={{ zIndex: 1 }}>
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <Image
              src="/logo-horizontal.png"
              alt="منهج AI"
              width={180}
              height={50}
              className="h-12 w-auto"
              priority
            />
          </div>
          <h1 className="text-3xl font-extrabold mb-2" style={{ color: "var(--theme-text-primary)" }}>
            إنشاء حساب جديد
          </h1>
          <p className="text-base" style={{ color: "var(--theme-text-secondary)" }}>
            🚀 ابدأ رحلتك في التعلم الذكي
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8 px-2">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0 transition-all"
                  style={{
                    background: step >= s ? "var(--theme-cta-gradient)" : "var(--theme-surface-border)",
                    color: step >= s ? "#fff" : "var(--theme-text-muted)",
                    boxShadow: step >= s ? "var(--theme-btn-shadow)" : "none",
                    transform: step === s ? "scale(1.1)" : "scale(1)",
                  }}
                >
                  {step > s ? <Check size={18} /> : stepIcons[s - 1]}
                </div>
                <span
                  className="text-xs font-bold mt-1.5"
                  style={{ color: step >= s ? "var(--theme-primary)" : "var(--theme-text-muted)" }}
                >
                  {stepLabels[s - 1]}
                </span>
              </div>
              {s < 4 && (
                <div
                  className="flex-1 h-[3px] mx-2 rounded-full mt-[-16px]"
                  style={{
                    background: step > s ? "var(--theme-primary)" : "var(--theme-surface-border)",
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div
            className="mb-5 p-4 rounded-xl text-sm font-bold text-center"
            style={{
              background: "rgba(220,38,38,0.1)",
              color: "#DC2626",
              border: "1px solid rgba(220,38,38,0.3)",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* reCAPTCHA container */}
        <div id="recaptcha-container" ref={recaptchaRef} />

        {/* Step 1: Name + Phone + Password */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className="block text-base font-bold mb-2" style={{ color: "var(--theme-text-primary)" }}>
                👤 الاسم الكامل
              </label>
              <div className="relative">
                <User size={20} className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: "var(--theme-text-muted)" }} />
                <input
                  className="themed-input pr-12"
                  placeholder="اكتب اسمك الكامل"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ padding: "14px 48px 14px 16px", fontSize: "1.05rem" }}
                />
              </div>
            </div>
            <div>
              <label className="block text-base font-bold mb-2" style={{ color: "var(--theme-text-primary)" }}>
                📱 رقم الهاتف
              </label>
              <div className="relative">
                <Phone size={20} className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: "var(--theme-text-muted)" }} />
                <input
                  className="themed-input pr-12"
                  placeholder="01012345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  dir="ltr"
                  style={{ textAlign: "right", padding: "14px 48px 14px 16px", fontSize: "1.05rem" }}
                />
              </div>
            </div>
            <div>
              <label className="block text-base font-bold mb-2" style={{ color: "var(--theme-text-primary)" }}>
                🔒 كلمة المرور
              </label>
              <div className="relative">
                <Lock size={20} className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: "var(--theme-text-muted)" }} />
                <input
                  type={showPassword ? "text" : "password"}
                  className="themed-input pr-12 pl-12"
                  placeholder="6 أحرف على الأقل"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ padding: "14px 48px 14px 48px", fontSize: "1.05rem" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-4 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--theme-text-muted)", background: "none", border: "none", cursor: "pointer" }}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <button
              onClick={handleStep1}
              className="themed-btn-primary w-full flex items-center justify-center gap-3 text-lg font-bold"
              style={{ padding: "16px", borderRadius: "14px", fontSize: "1.15rem" }}
            >
              <span>التالي</span>
              <ChevronLeft size={20} />
            </button>
          </div>
        )}

        {/* Step 2: OTP via Firebase */}
        {step === 2 && (
          <div className="text-center space-y-6 py-4">
            {!otpActive ? (
              <>
                <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center" style={{ background: "var(--theme-hover-overlay)" }}>
                  <Loader2 size={36} className="animate-spin" style={{ color: "var(--theme-primary)" }} />
                </div>
                <p className="text-base font-bold" style={{ color: "var(--theme-text-secondary)" }}>
                  {!otpEnabledByAdmin ? "التحقق غير مفعّل حالياً ✅" : "جارٍ التحقق... تم التخطي مؤقتاً ✅"}
                </p>
              </>
            ) : (
              <>
                <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center" style={{ background: "var(--theme-hover-overlay)" }}>
                  <span className="text-4xl">📱</span>
                </div>
                <p className="text-base" style={{ color: "var(--theme-text-secondary)" }}>
                  تم إرسال كود التحقق إلى<br />
                  <strong dir="ltr" className="text-lg" style={{ color: "var(--theme-text-primary)" }}>{phone}</strong>
                </p>

                {/* 4-digit OTP inputs */}
                <div className="flex justify-center gap-4" dir="ltr">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="w-16 h-16 text-center text-3xl font-bold rounded-xl border-2 focus:outline-none transition-all"
                      style={{
                        borderColor: digit ? "var(--theme-primary)" : "var(--theme-surface-border)",
                        background: "var(--theme-surface-bg)",
                        color: "var(--theme-text-primary)",
                        boxShadow: digit ? "0 0 0 3px rgba(var(--theme-primary-rgb, 59,130,246), 0.1)" : "none",
                      }}
                    />
                  ))}
                </div>

                {/* Timer & Resend */}
                <div className="space-y-2">
                  {!canResend ? (
                    <p className="text-base font-bold" style={{ color: "var(--theme-text-muted)" }}>
                      ⏱️ إعادة الإرسال بعد {formatTime(otpTimer)}
                    </p>
                  ) : (
                    <button
                      onClick={() => { sendOtp(); }}
                      disabled={otpSending}
                      className="flex items-center gap-2 mx-auto text-base font-bold"
                      style={{ color: "var(--theme-primary)", background: "none", border: "none", cursor: "pointer" }}
                    >
                      <RefreshCw size={18} className={otpSending ? "animate-spin" : ""} />
                      إعادة إرسال الكود
                    </button>
                  )}
                </div>

                {loading && (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 size={20} className="animate-spin" style={{ color: "var(--theme-primary)" }} />
                    <span className="text-base" style={{ color: "var(--theme-text-secondary)" }}>جارٍ التحقق...</span>
                  </div>
                )}

                <button
                  onClick={() => setStep(1)}
                  className="themed-btn-outline py-3 px-8 text-base font-bold"
                  style={{ borderRadius: "12px" }}
                >
                  <ChevronRight size={18} className="inline ml-1" /> رجوع
                </button>
              </>
            )}
          </div>
        )}

        {/* Step 3: Governorate */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <label className="block text-base font-bold mb-3" style={{ color: "var(--theme-text-primary)" }}>
                📍 اختر محافظتك
              </label>
              <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto p-1 custom-scrollbar">
                {GOVERNORATES.map((g) => (
                  <button
                    key={g}
                    onClick={() => setGovernorate(g)}
                    className="p-3 rounded-xl text-sm font-bold transition-all border"
                    style={{
                      background: governorate === g ? "var(--theme-primary)" : "var(--theme-surface-bg)",
                      color: governorate === g ? "#fff" : "var(--theme-text-primary)",
                      borderColor: governorate === g ? "var(--theme-primary)" : "var(--theme-surface-border)",
                      transform: governorate === g ? "scale(1.05)" : "scale(1)",
                    }}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-base font-bold mb-2" style={{ color: "var(--theme-text-primary)" }}>
                🎓 الصف الدراسي
              </label>
              <div
                className="themed-card p-4 flex items-center gap-3"
                style={{ borderColor: "var(--theme-primary)", background: "var(--theme-hover-overlay)" }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base" style={{ background: "var(--theme-cta-gradient)", color: "#fff" }}>
                  <Check size={18} />
                </div>
                <span className="font-bold text-base" style={{ color: "var(--theme-text-primary)" }}>الصف الثالث الثانوي</span>
                <span
                  className="text-xs mr-auto px-3 py-1 rounded-full font-bold"
                  style={{ background: "var(--theme-hover-overlay)", color: "var(--theme-primary)" }}
                >
                  المتاح حالياً
                </span>
              </div>
            </div>

            <div
              className="p-4 rounded-xl text-base text-center font-bold"
              style={{ background: "rgba(59,130,246,0.08)", color: "var(--theme-primary)", border: "1px solid rgba(59,130,246,0.2)" }}
            >
              🎁 تجربة مجانية لمدة يومين — بدون أي رسوم!
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(otpActive ? 2 : 1)}
                className="themed-btn-outline flex-1 py-4 text-base font-bold"
                style={{ borderRadius: "14px" }}
              >
                <ChevronRight size={18} className="inline ml-1" /> رجوع
              </button>
              <button
                onClick={handleStep3Submit}
                disabled={loading}
                className="themed-btn-primary flex-1 py-4 flex items-center justify-center gap-2 text-lg font-bold"
                style={{ opacity: loading ? 0.7 : 1, borderRadius: "14px" }}
              >
                {loading ? (
                  <>
                    <Loader2 size={22} className="animate-spin" />
                    <span>جارٍ التسجيل...</span>
                  </>
                ) : (
                  <>
                    <span>ابدأ مجاناً</span>
                    <ChevronLeft size={18} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && successData && (
          <div className="text-center space-y-6 py-6">
            <div className="w-24 h-24 mx-auto rounded-full flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)" }}>
              <CheckCircle2 size={48} style={{ color: "#10B981" }} />
            </div>
            <h2 className="text-2xl font-extrabold" style={{ color: "var(--theme-text-primary)" }}>
              أهلاً بك {successData.name}! 🎉
            </h2>
            <p className="text-base" style={{ color: "var(--theme-text-secondary)" }}>
              تم إنشاء حسابك بنجاح!<br />جاري تحويلك للوحة التحكم...
            </p>
            <div className="flex items-center justify-center gap-2">
              <Loader2 size={20} className="animate-spin" style={{ color: "var(--theme-primary)" }} />
              <span className="text-base font-bold" style={{ color: "var(--theme-primary)" }}>جارٍ التحويل...</span>
            </div>
          </div>
        )}

        {/* Login link */}
        {step < 4 && (
          <div className="text-center mt-6">
            <span className="text-base" style={{ color: "var(--theme-text-secondary)" }}>{"عندك حساب بالفعل؟ "}</span>
            <Link href="/login" className="text-base font-bold" style={{ color: "var(--theme-primary)" }}>
              سجل دخول 🔑
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
