"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import {
  UserPlus, Phone, Lock, Eye, EyeOff, User, MapPin,
  ChevronLeft, ChevronRight, Check, ShoppingCart,
} from "lucide-react";
import { GOVERNORATES } from "@/lib/constants";

const gradeOptions = [
  { value: "3sec", label: "الصف الثالث الثانوي" },
  { value: "2sec", label: "الصف الثاني الثانوي" },
  { value: "1sec", label: "الصف الأول الثانوي" },
];

const subjectsList = [
  { id: "math", name: "الرياضيات", icon: "📐", price: 99 },
  { id: "physics", name: "الفيزياء", icon: "⚛️", price: 99 },
  { id: "chemistry", name: "الكيمياء", icon: "🧪", price: 99 },
];

const paymentMethods = [
  { id: "paymob_vodafone", label: "فودافون كاش", icon: "📱" },
  { id: "paymob_fawry", label: "فوري", icon: "🏪" },
  { id: "paymob_instapay", label: "إنستا باي", icon: "💳" },
  { id: "stripe", label: "بطاقة ائتمان", icon: "💳" },
];

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Step 1
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Step 2
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [timer, setTimer] = useState(120);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Step 3
  const [governorate, setGovernorate] = useState("");
  const [gradeLevel, setGradeLevel] = useState("3sec");

  // Step 4
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("paymob_vodafone");

  // OTP Timer
  useEffect(() => {
    if (step !== 2 || timer <= 0) return;
    const interval = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [step, timer]);

  // OTP auto-advance
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value[0];
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 3) {
      otpRefs.current[index + 1]?.focus();
    }
    if (newOtp.every((d) => d !== "") && index === 3) {
      setTimeout(() => setStep(3), 500);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const discountPercent =
    selectedSubjects.length >= 3 ? 20 : selectedSubjects.length >= 2 ? 10 : 0;
  const basePrice = selectedSubjects.length * 99;
  const finalPrice = Math.round(basePrice * (1 - discountPercent / 100));

  const toggleSubject = (id: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleStep1 = () => {
    setError("");
    if (!name || name.length < 2) {
      setError("الاسم مطلوب (حرفين على الأقل)");
      return;
    }
    if (!/^01[0125]\d{8}$/.test(phone)) {
      setError("رقم الهاتف غير صحيح");
      return;
    }
    if (password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    setStep(2);
    setTimer(120);
  };

  const handleStep3 = () => {
    setError("");
    if (!governorate) {
      setError("يرجى اختيار المحافظة");
      return;
    }
    setStep(4);
  };

  const handleFinalSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: name,
          phone,
          password,
          governorate,
          grade_level: gradeLevel,
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
          id: data.data?.user?.id || "temp",
          fullName: name,
          phone,
          role: "student",
          trialEndsAt: null,
          referralCode: "",
          avatarUrl: null,
        },
        data.data?.token || "temp"
      );
      router.push("/dashboard");
    } catch {
      setError("فشل الاتصال بالخادم");
      setLoading(false);
    }
  };

  const stepTitles = ["البيانات الأساسية", "تأكيد الهاتف", "المحافظة والصف", "اختر المواد"];

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
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6"
      style={{ background: "var(--theme-page-bg)" }}>
      <div className="themed-card p-8 w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: "var(--theme-cta-gradient)" }}>
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
          <div className="mb-4 p-3 rounded-lg text-sm font-bold text-center"
            style={{ background: "rgba(220,38,38,0.1)", color: "#DC2626", border: "1px solid rgba(220,38,38,0.3)" }}>
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
                <User size={18} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--theme-text-muted)" }} />
                <input className="themed-input pr-10" placeholder="الاسم الكامل" value={name}
                  onChange={(e) => setName(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: "var(--theme-text-primary)" }}>
                📱 رقم الهاتف
              </label>
              <div className="relative">
                <Phone size={18} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--theme-text-muted)" }} />
                <input className="themed-input pr-10" placeholder="01xxxxxxxxx" value={phone}
                  onChange={(e) => setPhone(e.target.value)} dir="ltr" style={{ textAlign: "right" }} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: "var(--theme-text-primary)" }}>
                🔒 كلمة المرور
              </label>
              <div className="relative">
                <Lock size={18} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--theme-text-muted)" }} />
                <input type={showPassword ? "text" : "password"} className="themed-input pr-10 pl-10"
                  placeholder="6 أحرف على الأقل" value={password}
                  onChange={(e) => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--theme-text-muted)", background: "none", border: "none", cursor: "pointer" }}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button onClick={handleStep1} className="themed-btn-primary w-full flex items-center justify-center gap-2 py-3 text-lg">
              <span>التالي</span>
              <ChevronLeft size={20} />
            </button>
          </div>
        )}

        {/* Step 2: OTP */}
        {step === 2 && (
          <div className="text-center space-y-6">
            <p className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>
              أدخل الكود المرسل إلى <span className="font-bold" style={{ color: "var(--theme-primary)" }}>{phone}</span>
            </p>
            <div className="flex gap-3 justify-center" dir="ltr">
              {otp.map((digit, i) => (
                <input key={i} ref={(el) => { otpRefs.current[i] = el; }}
                  type="text" inputMode="numeric" maxLength={1}
                  className="otp-box" value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)} />
              ))}
            </div>
            <div className="text-sm" style={{ color: timer > 0 ? "var(--theme-primary)" : "var(--theme-text-muted)" }}>
              {timer > 0 ? (
                <span>⏱️ {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, "0")}</span>
              ) : (
                <button className="font-bold" style={{ color: "var(--theme-primary)", background: "none", border: "none", cursor: "pointer" }}
                  onClick={() => setTimer(120)}>
                  إعادة إرسال الكود
                </button>
              )}
            </div>
            <button onClick={() => setStep(1)} className="text-sm font-bold"
              style={{ color: "var(--theme-text-secondary)", background: "none", border: "none", cursor: "pointer" }}>
              <ChevronRight size={14} className="inline" /> تغيير رقم الهاتف
            </button>
          </div>
        )}

        {/* Step 3: Governorate + Grade */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: "var(--theme-text-primary)" }}>
                📍 المحافظة
              </label>
              <div className="relative">
                <MapPin size={18} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--theme-text-muted)" }} />
                <select className="themed-input pr-10" value={governorate}
                  onChange={(e) => setGovernorate(e.target.value)}>
                  <option value="">اختر المحافظة</option>
                  {GOVERNORATES.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: "var(--theme-text-primary)" }}>
                🎓 الصف الدراسي
              </label>
              <div className="grid grid-cols-1 gap-2">
                {gradeOptions.map((g) => (
                  <button key={g.value}
                    onClick={() => setGradeLevel(g.value)}
                    className="themed-card p-3 text-right cursor-pointer flex items-center gap-3"
                    style={{
                      borderColor: gradeLevel === g.value ? "var(--theme-primary)" : undefined,
                      background: gradeLevel === g.value ? "var(--theme-hover-overlay)" : undefined,
                    }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                      style={{
                        background: gradeLevel === g.value ? "var(--theme-cta-gradient)" : "var(--theme-surface-border)",
                        color: gradeLevel === g.value ? "#fff" : "var(--theme-text-muted)",
                      }}>
                      {gradeLevel === g.value ? <Check size={16} /> : "○"}
                    </div>
                    <span className="font-bold" style={{ color: "var(--theme-text-primary)" }}>{g.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="themed-btn-outline flex-1 py-3">
                <ChevronRight size={18} className="inline" /> رجوع
              </button>
              <button onClick={handleStep3} className="themed-btn-primary flex-1 py-3 flex items-center justify-center gap-2">
                <span>التالي</span> <ChevronLeft size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Subject Cart + Payment */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold mb-3" style={{ color: "var(--theme-text-primary)" }}>
                📚 اختر المواد
              </label>
              <div className="grid grid-cols-1 gap-2">
                {subjectsList.map((s) => {
                  const selected = selectedSubjects.includes(s.id);
                  return (
                    <button key={s.id} onClick={() => toggleSubject(s.id)}
                      className="themed-card p-4 cursor-pointer flex items-center gap-3"
                      style={{
                        borderColor: selected ? "var(--theme-primary)" : undefined,
                        background: selected ? "var(--theme-hover-overlay)" : undefined,
                      }}>
                      <span className="text-2xl">{s.icon}</span>
                      <span className="text-xl font-extrabold flex-1 text-right" style={{ color: "var(--theme-text-primary)" }}>
                        {s.name}
                      </span>
                      <span className="text-sm font-bold" style={{ color: "var(--theme-primary)" }}>
                        {s.price} ج.م/شهر
                      </span>
                      <div className="w-6 h-6 rounded-md flex items-center justify-center"
                        style={{
                          background: selected ? "var(--theme-cta-gradient)" : "var(--theme-surface-border)",
                          color: selected ? "#fff" : "transparent",
                        }}>
                        <Check size={14} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Auto discount */}
            {discountPercent > 0 && (
              <div className="p-3 rounded-lg text-sm font-bold text-center"
                style={{ background: "rgba(5,150,105,0.1)", color: "#059669", border: "1px solid rgba(5,150,105,0.3)" }}>
                🎉 خصم {discountPercent}% لاختيارك {selectedSubjects.length} مواد!
              </div>
            )}

            {/* Price summary */}
            {selectedSubjects.length > 0 && (
              <div className="themed-card p-4 space-y-2">
                <div className="flex justify-between text-sm" style={{ color: "var(--theme-text-secondary)" }}>
                  <span>السعر الأصلي</span>
                  <span>{basePrice} ج.م/شهر</span>
                </div>
                {discountPercent > 0 && (
                  <div className="flex justify-between text-sm font-bold" style={{ color: "#059669" }}>
                    <span>الخصم ({discountPercent}%)</span>
                    <span>-{basePrice - finalPrice} ج.م</span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between text-lg font-extrabold"
                  style={{ borderColor: "var(--theme-surface-border)", color: "var(--theme-text-primary)" }}>
                  <span>الإجمالي</span>
                  <span style={{ color: "var(--theme-primary)" }}>{finalPrice} ج.م/شهر</span>
                </div>
              </div>
            )}

            {/* Payment method */}
            <div>
              <label className="block text-sm font-bold mb-3" style={{ color: "var(--theme-text-primary)" }}>
                💳 طريقة الدفع
              </label>
              <div className="grid grid-cols-2 gap-2">
                {paymentMethods.map((pm) => (
                  <button key={pm.id} onClick={() => setPaymentMethod(pm.id)}
                    className="themed-card p-3 text-center cursor-pointer"
                    style={{
                      borderColor: paymentMethod === pm.id ? "var(--theme-primary)" : undefined,
                      background: paymentMethod === pm.id ? "var(--theme-hover-overlay)" : undefined,
                    }}>
                    <div className="text-xl mb-1">{pm.icon}</div>
                    <div className="text-xs font-bold" style={{ color: "var(--theme-text-primary)" }}>{pm.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(3)} className="themed-btn-outline flex-1 py-3">
                <ChevronRight size={18} className="inline" /> رجوع
              </button>
              <button onClick={handleFinalSubmit} disabled={loading}
                className="themed-btn-primary flex-1 py-3 flex items-center justify-center gap-2 text-lg"
                style={{ opacity: loading ? 0.7 : 1 }}>
                <ShoppingCart size={20} />
                <span>{loading ? "جارٍ التسجيل..." : "ابدأ التجربة المجانية"}</span>
              </button>
            </div>
          </div>
        )}

        {/* Login link */}
        <div className="text-center mt-6">
          <span className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>
            {"عندك حساب بالفعل؟ "}
          </span>
          <Link href="/login" className="text-sm font-bold" style={{ color: "var(--theme-primary)" }}>
            سجل دخول
          </Link>
        </div>
      </div>
    </div>
  );
}