"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import {
  User, Lock, Eye, EyeOff, Copy, Share2, Gift,
  CheckCircle2, Loader2, Shield, Phone, MapPin,
  LogOut, AlertCircle,
} from "lucide-react";

export default function SettingsPage() {
  const { user, logout } = useAuthStore();

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState({ text: "", type: "" });

  // Referral
  const [copyMsg, setCopyMsg] = useState("");

  const handlePasswordChange = async () => {
    setPwMsg({ text: "", type: "" });

    if (!currentPassword) {
      setPwMsg({ text: "كلمة المرور الحالية مطلوبة", type: "error" });
      return;
    }
    if (newPassword.length < 6) {
      setPwMsg({ text: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل", type: "error" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMsg({ text: "كلمة المرور الجديدة غير متطابقة", type: "error" });
      return;
    }

    setPwLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwMsg({ text: "تم تغيير كلمة المرور بنجاح ✅", type: "success" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPwMsg({ text: data.error || "فشل تغيير كلمة المرور", type: "error" });
      }
    } catch {
      setPwMsg({ text: "فشل الاتصال بالخادم", type: "error" });
    } finally {
      setPwLoading(false);
    }
  };

  const referralCode = user?.referralCode || "—";

  const copyReferral = () => {
    navigator.clipboard.writeText(referralCode).then(() => {
      setCopyMsg("تم نسخ الكود ✅");
      setTimeout(() => setCopyMsg(""), 2000);
    });
  };

  const shareReferral = () => {
    const text = `سجل في منصة منهج AI واستخدم كود الإحالة الخاص بي: ${referralCode}\n\nمنصة ذكية لطلاب الثانوية العامة 🎓`;
    if (navigator.share) {
      navigator.share({ title: "كود الإحالة — منهج AI", text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => {
        setCopyMsg("تم نسخ رابط المشاركة ✅");
        setTimeout(() => setCopyMsg(""), 2000);
      });
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <div className="p-6 font-cairo max-w-2xl mx-auto space-y-6" style={{ color: "var(--theme-text-primary)" }}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold" style={{ color: "var(--theme-text-primary)" }}>
          ⚙️ الإعدادات
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--theme-text-secondary)" }}>
          إدارة حسابك والإعدادات الشخصية
        </p>
      </div>

      {/* Profile Info */}
      <div className="themed-card p-6">
        <h2 className="text-lg font-extrabold mb-4 flex items-center gap-2" style={{ color: "var(--theme-text-primary)" }}>
          <User size={20} />
          معلومات الحساب
        </h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-extrabold"
              style={{ background: "var(--theme-cta-gradient)", color: "#fff" }}
            >
              {user?.fullName?.[0] || "؟"}
            </div>
            <div>
              <div className="text-lg font-extrabold" style={{ color: "var(--theme-text-primary)" }}>
                {user?.fullName || "طالب"}
              </div>
              <div
                className="text-xs px-2 py-0.5 rounded-full inline-block mt-1"
                style={{ background: "var(--theme-hover-overlay)", color: "var(--theme-primary)" }}
              >
                🎓 طالب — الصف الثالث الثانوي
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--theme-hover-overlay)" }}>
              <Phone size={16} style={{ color: "var(--theme-primary)" }} />
              <div>
                <div className="text-xs" style={{ color: "var(--theme-text-muted)" }}>
                  رقم الهاتف
                </div>
                <div className="text-sm font-bold" style={{ color: "var(--theme-text-primary)" }} dir="ltr">
                  {user?.phone || "—"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--theme-hover-overlay)" }}>
              <MapPin size={16} style={{ color: "var(--theme-primary)" }} />
              <div>
                <div className="text-xs" style={{ color: "var(--theme-text-muted)" }}>
                  الحالة
                </div>
                <div className="text-sm font-bold" style={{ color: "#10B981" }}>
                  ✅ نشط
                </div>
              </div>
            </div>
          </div>

          {user?.trialEndsAt && (
            <div
              className="p-3 rounded-lg text-sm flex items-center gap-2"
              style={{
                background: "rgba(59,130,246,0.08)",
                color: "var(--theme-primary)",
                border: "1px solid rgba(59,130,246,0.2)",
              }}
            >
              <Shield size={16} />
              تجربة مجانية حتى:{" "}
              {new Date(user.trialEndsAt).toLocaleDateString("ar-EG", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          )}
        </div>
      </div>

      {/* Referral Code */}
      <div className="themed-card p-6">
        <h2 className="text-lg font-extrabold mb-4 flex items-center gap-2" style={{ color: "var(--theme-text-primary)" }}>
          <Gift size={20} style={{ color: "#F59E0B" }} />
          كود الإحالة
        </h2>
        <p className="text-sm mb-4" style={{ color: "var(--theme-text-secondary)" }}>
          شارك الكود مع أصحابك واحصل على مكافآت عند تسجيلهم!
        </p>

        <div
          className="flex items-center gap-3 p-4 rounded-xl"
          style={{ background: "var(--theme-hover-overlay)", border: "2px dashed var(--theme-surface-border)" }}
        >
          <div
            className="text-xl font-extrabold tracking-wider flex-1 text-center"
            style={{ color: "var(--theme-primary)", fontFamily: "monospace" }}
            dir="ltr"
          >
            {referralCode}
          </div>
          <button
            onClick={copyReferral}
            className="themed-btn-outline p-2"
            title="نسخ الكود"
          >
            <Copy size={16} />
          </button>
          <button
            onClick={shareReferral}
            className="themed-btn-primary p-2"
            title="مشاركة"
          >
            <Share2 size={16} />
          </button>
        </div>

        {copyMsg && (
          <div
            className="mt-3 p-2 rounded-lg text-sm font-bold text-center"
            style={{ background: "rgba(16,185,129,0.1)", color: "#10B981" }}
          >
            {copyMsg}
          </div>
        )}
      </div>

      {/* Change Password */}
      <div className="themed-card p-6">
        <h2 className="text-lg font-extrabold mb-4 flex items-center gap-2" style={{ color: "var(--theme-text-primary)" }}>
          <Lock size={20} />
          تغيير كلمة المرور
        </h2>

        {pwMsg.text && (
          <div
            className="mb-4 p-3 rounded-lg text-sm font-bold flex items-center gap-2"
            style={{
              background: pwMsg.type === "success" ? "rgba(16,185,129,0.1)" : "rgba(220,38,38,0.1)",
              color: pwMsg.type === "success" ? "#10B981" : "#DC2626",
              border: `1px solid ${pwMsg.type === "success" ? "rgba(16,185,129,0.3)" : "rgba(220,38,38,0.3)"}`,
            }}
          >
            {pwMsg.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {pwMsg.text}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2" style={{ color: "var(--theme-text-primary)" }}>
              كلمة المرور الحالية
            </label>
            <div className="relative">
              <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--theme-text-muted)" }} />
              <input
                type={showCurrentPw ? "text" : "password"}
                className="themed-input pr-10 pl-10"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الحالية"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPw(!showCurrentPw)}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--theme-text-muted)", background: "none", border: "none", cursor: "pointer" }}
              >
                {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2" style={{ color: "var(--theme-text-primary)" }}>
              كلمة المرور الجديدة
            </label>
            <div className="relative">
              <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--theme-text-muted)" }} />
              <input
                type={showNewPw ? "text" : "password"}
                className="themed-input pr-10 pl-10"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="6 أحرف على الأقل"
              />
              <button
                type="button"
                onClick={() => setShowNewPw(!showNewPw)}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--theme-text-muted)", background: "none", border: "none", cursor: "pointer" }}
              >
                {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2" style={{ color: "var(--theme-text-primary)" }}>
              تأكيد كلمة المرور الجديدة
            </label>
            <div className="relative">
              <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--theme-text-muted)" }} />
              <input
                type="password"
                className="themed-input pr-10"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="أعد إدخال كلمة المرور الجديدة"
              />
            </div>
          </div>

          <button
            onClick={handlePasswordChange}
            disabled={pwLoading}
            className="themed-btn-primary flex items-center justify-center gap-2 w-full py-3"
            style={{ opacity: pwLoading ? 0.7 : 1 }}
          >
            {pwLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                جارٍ التغيير...
              </>
            ) : (
              <>
                <Shield size={18} />
                تغيير كلمة المرور
              </>
            )}
          </button>
        </div>
      </div>

      {/* Logout */}
      <div className="themed-card p-6">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-extrabold transition-all"
          style={{
            background: "rgba(220,38,38,0.08)",
            color: "#DC2626",
            border: "1px solid rgba(220,38,38,0.2)",
            cursor: "pointer",
          }}
        >
          <LogOut size={18} />
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
}
