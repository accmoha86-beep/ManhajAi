"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import {
  User, Phone, Lock, Bell, Eye, EyeOff,
  Save, Shield, Trash2, LogOut,
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  const [name, setName] = useState(user?.fullName || "");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 font-cairo max-w-2xl mx-auto" style={{ color: "var(--theme-text-primary)" }}>
      <h1 className="text-2xl font-extrabold mb-6">⚙️ الإعدادات</h1>

      {!isAuthenticated ? (
        <div className="themed-card p-8 text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-xl font-bold mb-2" style={{ color: "var(--theme-text-primary)" }}>
            سجل دخولك أولاً
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--theme-text-secondary)" }}>
            يرجى تسجيل الدخول لعرض وتعديل الإعدادات
          </p>
          <button
            onClick={() => router.push("/login")}
            className="themed-btn-primary px-6 py-2"
          >
            تسجيل الدخول
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Profile */}
          <div className="themed-card p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: "var(--theme-text-primary)" }}>
              <User size={20} style={{ color: "var(--theme-primary)" }} />
              الملف الشخصي
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: "var(--theme-text-primary)" }}>
                  الاسم الكامل
                </label>
                <input className="themed-input" value={name}
                  onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: "var(--theme-text-primary)" }}>
                  رقم الهاتف
                </label>
                <input className="themed-input" value={user?.phone || ""} disabled
                  style={{ opacity: 0.6 }} />
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div className="themed-card p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: "var(--theme-text-primary)" }}>
              <Lock size={20} style={{ color: "var(--theme-primary)" }} />
              تغيير كلمة المرور
            </h2>
            <div className="space-y-4">
              <div className="relative">
                <input type={showOld ? "text" : "password"} className="themed-input pl-10"
                  placeholder="كلمة المرور الحالية" value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)} />
                <button type="button" onClick={() => setShowOld(!showOld)}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--theme-text-muted)", background: "none", border: "none", cursor: "pointer" }}>
                  {showOld ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="relative">
                <input type={showNew ? "text" : "password"} className="themed-input pl-10"
                  placeholder="كلمة المرور الجديدة" value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)} />
                <button type="button" onClick={() => setShowNew(!showNew)}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--theme-text-muted)", background: "none", border: "none", cursor: "pointer" }}>
                  {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="themed-card p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: "var(--theme-text-primary)" }}>
              <Bell size={20} style={{ color: "var(--theme-primary)" }} />
              الإشعارات
            </h2>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>
                تلقي إشعارات التذكير بالدراسة
              </span>
              <button onClick={() => setNotifications(!notifications)}
                className="w-12 h-6 rounded-full relative cursor-pointer transition-all"
                style={{
                  background: notifications ? "var(--theme-primary)" : "var(--theme-surface-border)",
                  border: "none",
                }}>
                <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all"
                  style={{ left: notifications ? "1.625rem" : "0.125rem" }} />
              </button>
            </div>
          </div>

          {/* Save */}
          <button onClick={handleSave}
            className="themed-btn-primary w-full py-3 flex items-center justify-center gap-2 text-lg">
            {saved ? (
              <><span>✅</span><span>تم الحفظ!</span></>
            ) : (
              <><Save size={20} /><span>حفظ التغييرات</span></>
            )}
          </button>

          {/* Danger Zone */}
          <div className="themed-card p-6" style={{ borderColor: "rgba(220,38,38,0.3)" }}>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: "#DC2626" }}>
              <Shield size={20} />
              منطقة الخطر
            </h2>
            <div className="flex gap-3">
              <button onClick={() => { logout(); router.push("/"); }}
                className="themed-btn-outline flex-1 py-2 flex items-center justify-center gap-2 text-sm"
                style={{ color: "#DC2626", borderColor: "rgba(220,38,38,0.3)" }}>
                <LogOut size={16} /> تسجيل الخروج
              </button>
              <button className="flex-1 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-bold cursor-pointer"
                style={{ background: "rgba(220,38,38,0.1)", color: "#DC2626", border: "1px solid rgba(220,38,38,0.3)" }}>
                <Trash2 size={16} /> حذف الحساب
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}