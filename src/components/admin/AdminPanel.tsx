"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useUIStore } from "@/store/ui-store";
import {
  BarChart3, Users, CreditCard, BookOpen, GraduationCap,
  Palette, TrendingUp, DollarSign, Eye, Check,
  Shield, Plus, Edit, Trash2, Search,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { ThemeSlug as Theme } from "@/store/ui-store";

const tabs = [
  { key: "overview", label: "نظرة عامة", icon: BarChart3 },
  { key: "subscriptions", label: "الاشتراكات", icon: CreditCard },
  { key: "grades", label: "الصفوف", icon: GraduationCap },
  { key: "subjects", label: "المواد", icon: BookOpen },
  { key: "payments", label: "المدفوعات", icon: DollarSign },
  { key: "themes", label: "الثيمات", icon: Palette },
];

const overviewStats = [
  { label: "إجمالي الطلاب", value: "1,247", change: "+12%", icon: Users, color: "#6366F1" },
  { label: "اشتراكات نشطة", value: "856", change: "+8%", icon: CreditCard, color: "#10B981" },
  { label: "الإيرادات الشهرية", value: "85,200 ج.م", change: "+15%", icon: DollarSign, color: "#F59E0B" },
  { label: "نسبة التحويل", value: "68%", change: "+3%", icon: TrendingUp, color: "#8B5CF6" },
];

const subscriptionsList = [
  { id: 1, student: "أحمد محمد", phone: "01012345678", plan: "كل المواد", status: "نشط", amount: "249 ج.م", date: "2025-03-01" },
  { id: 2, student: "فاطمة علي", phone: "01098765432", plan: "مادة واحدة", status: "نشط", amount: "99 ج.م", date: "2025-03-05" },
  { id: 3, student: "محمد حسن", phone: "01234567890", plan: "الترم كامل", status: "نشط", amount: "1,299 ج.م", date: "2025-02-15" },
  { id: 4, student: "مريم أحمد", phone: "01112223344", plan: "كل المواد", status: "تجربة", amount: "0 ج.م", date: "2025-03-10" },
  { id: 5, student: "عمر خالد", phone: "01556677889", plan: "مادة واحدة", status: "منتهي", amount: "99 ج.م", date: "2025-01-20" },
];

const gradesList = [
  { id: "3sec", name: "الصف الثالث الثانوي", students: 520, subjects: 3 },
  { id: "2sec", name: "الصف الثاني الثانوي", students: 380, subjects: 3 },
  { id: "1sec", name: "الصف الأول الثانوي", students: 347, subjects: 3 },
];

const subjectsList = [
  { id: "math", name: "الرياضيات", icon: "📐", grades: ["3sec", "2sec", "1sec"], lessons: 24, students: 890 },
  { id: "physics", name: "الفيزياء", icon: "⚛️", grades: ["3sec", "2sec"], lessons: 20, students: 650 },
  { id: "chemistry", name: "الكيمياء", icon: "🧪", grades: ["3sec", "2sec", "1sec"], lessons: 18, students: 720 },
];

const paymentsList = [
  { id: 1, student: "أحمد محمد", method: "فودافون كاش", amount: "249 ج.م", status: "مكتمل", date: "2025-03-01" },
  { id: 2, student: "فاطمة علي", method: "فوري", amount: "99 ج.م", status: "مكتمل", date: "2025-03-05" },
  { id: 3, student: "محمد حسن", method: "بطاقة ائتمان", amount: "1,299 ج.م", status: "مكتمل", date: "2025-02-15" },
  { id: 4, student: "نور الدين", method: "إنستا باي", amount: "99 ج.م", status: "معلق", date: "2025-03-12" },
  { id: 5, student: "سارة محمود", method: "فودافون كاش", amount: "249 ج.م", status: "فاشل", date: "2025-03-11" },
];

const themeOptions: { key: Theme; name: string; desc: string; emoji: string; colors: string[] }[] = [
  { key: "default", name: "الافتراضي", desc: "أزرق كلاسيكي", emoji: "💎", colors: ["#6366F1", "#8B5CF6"] },
  { key: "golden", name: "الذهبي", desc: "ذهبي إسلامي", emoji: "☪️", colors: ["#D4A017", "#1B5E20"] },
  { key: "exams", name: "الامتحانات", desc: "أحمر تحفيزي", emoji: "📝", colors: ["#DC2626", "#B91C1C"] },
  { key: "graduation", name: "التخرج", desc: "أخضر نجاح", emoji: "🎓", colors: ["#059669", "#047857"] },
  { key: "dark", name: "الليلي", desc: "وضع ليلي", emoji: "🌙", colors: ["#6366F1", "#4F46E5"] },
];

const statusColors: Record<string, string> = {
  "نشط": "#10B981",
  "تجربة": "#F59E0B",
  "منتهي": "#EF4444",
  "مكتمل": "#10B981",
  "معلق": "#F59E0B",
  "فاشل": "#EF4444",
};

export default function AdminPanel() {
  const { user, isAuthenticated } = useAuthStore();
  const { theme, setTheme } = useUIStore();
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="p-6 font-cairo text-center" style={{ color: "var(--theme-text-primary)" }}>
        <div className="themed-card p-8 max-w-md mx-auto">
          <div className="text-5xl mb-4">🛡️</div>
          <h2 className="text-2xl font-extrabold mb-2">صفحة الإدارة</h2>
          <p className="text-sm mb-6" style={{ color: "var(--theme-text-secondary)" }}>
            هذه الصفحة متاحة للمسؤولين فقط
          </p>
          <button onClick={() => router.push("/login")} className="themed-btn-primary px-6 py-2">
            تسجيل الدخول كمسؤول
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 font-cairo" style={{ color: "var(--theme-text-primary)" }}>
      <h1 className="text-2xl font-extrabold mb-6">🛡️ لوحة الإدارة</h1>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 overflow-x-auto" style={{ borderBottom: "1px solid var(--theme-surface-border)", paddingBottom: "0.75rem" }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold cursor-pointer transition-all whitespace-nowrap"
              style={{
                background: activeTab === tab.key ? "var(--theme-cta-gradient)" : "transparent",
                color: activeTab === tab.key ? "#fff" : "var(--theme-text-secondary)",
                border: activeTab === tab.key ? "none" : "1px solid var(--theme-surface-border)",
              }}>
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ═══ OVERVIEW TAB ═══ */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {overviewStats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="themed-card p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ background: `${stat.color}15` }}>
                      <Icon size={22} style={{ color: stat.color }} />
                    </div>
                    <div>
                      <div className="text-xs" style={{ color: "var(--theme-text-secondary)" }}>{stat.label}</div>
                      <div className="text-xl font-extrabold" style={{ color: "var(--theme-text-primary)" }}>{stat.value}</div>
                      <div className="text-xs font-bold" style={{ color: "#10B981" }}>{stat.change}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Charts placeholders */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="themed-card p-6">
              <h3 className="text-lg font-bold mb-4" style={{ color: "var(--theme-text-primary)" }}>📊 الاشتراكات الجديدة</h3>
              <div className="flex items-end gap-2 h-40">
                {[35, 55, 45, 70, 60, 85, 75].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-t-md" style={{ height: `${h}%`, background: "var(--theme-cta-gradient)" }} />
                    <span className="text-[0.55rem]" style={{ color: "var(--theme-text-muted)" }}>
                      {["سبت", "أحد", "اثن", "ثلا", "أربع", "خمي", "جمع"][i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="themed-card p-6">
              <h3 className="text-lg font-bold mb-4" style={{ color: "var(--theme-text-primary)" }}>💰 الإيرادات اليومية</h3>
              <div className="flex items-end gap-2 h-40">
                {[40, 65, 50, 80, 55, 90, 70].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-t-md" style={{ height: `${h}%`, background: "linear-gradient(to top, #F59E0B, #FBBF24)" }} />
                    <span className="text-[0.55rem]" style={{ color: "var(--theme-text-muted)" }}>
                      {["سبت", "أحد", "اثن", "ثلا", "أربع", "خمي", "جمع"][i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ SUBSCRIPTIONS TAB ═══ */}
      {activeTab === "subscriptions" && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--theme-text-muted)" }} />
              <input className="themed-input pr-10" placeholder="بحث بالاسم أو الهاتف..."
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </div>
          <div className="themed-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--theme-hover-overlay)" }}>
                  <th className="p-3 text-right font-bold" style={{ color: "var(--theme-text-secondary)" }}>الطالب</th>
                  <th className="p-3 text-right font-bold" style={{ color: "var(--theme-text-secondary)" }}>الهاتف</th>
                  <th className="p-3 text-right font-bold" style={{ color: "var(--theme-text-secondary)" }}>الخطة</th>
                  <th className="p-3 text-right font-bold" style={{ color: "var(--theme-text-secondary)" }}>الحالة</th>
                  <th className="p-3 text-right font-bold" style={{ color: "var(--theme-text-secondary)" }}>المبلغ</th>
                  <th className="p-3 text-right font-bold" style={{ color: "var(--theme-text-secondary)" }}>التاريخ</th>
                  <th className="p-3 text-right font-bold" style={{ color: "var(--theme-text-secondary)" }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {subscriptionsList.filter((s) =>
                  !searchQuery || s.student.includes(searchQuery) || s.phone.includes(searchQuery)
                ).map((sub) => (
                  <tr key={sub.id} style={{ borderBottom: "1px solid var(--theme-surface-border)" }}>
                    <td className="p-3 font-bold" style={{ color: "var(--theme-text-primary)" }}>{sub.student}</td>
                    <td className="p-3" dir="ltr" style={{ color: "var(--theme-text-secondary)" }}>{sub.phone}</td>
                    <td className="p-3" style={{ color: "var(--theme-text-secondary)" }}>{sub.plan}</td>
                    <td className="p-3">
                      <span className="px-2 py-1 rounded-lg text-xs font-bold"
                        style={{ background: `${statusColors[sub.status]}15`, color: statusColors[sub.status] }}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="p-3 font-bold" style={{ color: "var(--theme-primary)" }}>{sub.amount}</td>
                    <td className="p-3 text-xs" style={{ color: "var(--theme-text-muted)" }}>{sub.date}</td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <button className="p-1.5 rounded-lg" style={{ background: "var(--theme-hover-overlay)", border: "none", cursor: "pointer" }}>
                          <Eye size={14} style={{ color: "var(--theme-primary)" }} />
                        </button>
                        <button className="p-1.5 rounded-lg" style={{ background: "var(--theme-hover-overlay)", border: "none", cursor: "pointer" }}>
                          <Edit size={14} style={{ color: "var(--theme-primary)" }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ GRADES TAB ═══ */}
      {activeTab === "grades" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {gradesList.map((grade) => (
            <div key={grade.id} className="themed-card p-5">
              <div className="text-3xl mb-3">🎓</div>
              <h3 className="text-lg font-bold mb-3" style={{ color: "var(--theme-text-primary)" }}>{grade.name}</h3>
              <div className="space-y-2 text-sm" style={{ color: "var(--theme-text-secondary)" }}>
                <div className="flex justify-between">
                  <span>عدد الطلاب</span>
                  <span className="font-bold" style={{ color: "var(--theme-primary)" }}>{grade.students}</span>
                </div>
                <div className="flex justify-between">
                  <span>عدد المواد</span>
                  <span className="font-bold" style={{ color: "var(--theme-primary)" }}>{grade.subjects}</span>
                </div>
              </div>
              <button className="themed-btn-outline w-full mt-4 py-2 flex items-center justify-center gap-2 text-sm">
                <Edit size={14} /> تعديل
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ═══ SUBJECTS TAB ═══ */}
      {activeTab === "subjects" && (
        <div>
          <button className="themed-btn-primary mb-4 px-4 py-2 flex items-center gap-2 text-sm">
            <Plus size={16} /> إضافة مادة
          </button>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {subjectsList.map((sub) => (
              <div key={sub.id} className="themed-card p-5">
                <div className="text-3xl mb-3">{sub.icon}</div>
                <h3 className="text-xl font-extrabold mb-3" style={{ color: "var(--theme-text-primary)" }}>{sub.name}</h3>
                <div className="space-y-2 text-sm" style={{ color: "var(--theme-text-secondary)" }}>
                  <div className="flex justify-between">
                    <span>عدد الدروس</span>
                    <span className="font-bold" style={{ color: "var(--theme-primary)" }}>{sub.lessons}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>عدد الطلاب</span>
                    <span className="font-bold" style={{ color: "var(--theme-primary)" }}>{sub.students}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>الصفوف</span>
                    <span className="font-bold text-xs" style={{ color: "var(--theme-primary)" }}>
                      {sub.grades.length} صفوف
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button className="themed-btn-outline flex-1 py-2 flex items-center justify-center gap-1 text-xs">
                    <Edit size={14} /> تعديل
                  </button>
                  <button className="flex-1 py-2 rounded-lg flex items-center justify-center gap-1 text-xs font-bold cursor-pointer"
                    style={{ background: "rgba(220,38,38,0.1)", color: "#DC2626", border: "1px solid rgba(220,38,38,0.3)" }}>
                    <Trash2 size={14} /> حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ PAYMENTS TAB ═══ */}
      {activeTab === "payments" && (
        <div className="themed-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--theme-hover-overlay)" }}>
                <th className="p-3 text-right font-bold" style={{ color: "var(--theme-text-secondary)" }}>الطالب</th>
                <th className="p-3 text-right font-bold" style={{ color: "var(--theme-text-secondary)" }}>الطريقة</th>
                <th className="p-3 text-right font-bold" style={{ color: "var(--theme-text-secondary)" }}>المبلغ</th>
                <th className="p-3 text-right font-bold" style={{ color: "var(--theme-text-secondary)" }}>الحالة</th>
                <th className="p-3 text-right font-bold" style={{ color: "var(--theme-text-secondary)" }}>التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {paymentsList.map((pay) => (
                <tr key={pay.id} style={{ borderBottom: "1px solid var(--theme-surface-border)" }}>
                  <td className="p-3 font-bold" style={{ color: "var(--theme-text-primary)" }}>{pay.student}</td>
                  <td className="p-3" style={{ color: "var(--theme-text-secondary)" }}>{pay.method}</td>
                  <td className="p-3 font-bold" style={{ color: "var(--theme-primary)" }}>{pay.amount}</td>
                  <td className="p-3">
                    <span className="px-2 py-1 rounded-lg text-xs font-bold"
                      style={{ background: `${statusColors[pay.status]}15`, color: statusColors[pay.status] }}>
                      {pay.status}
                    </span>
                  </td>
                  <td className="p-3 text-xs" style={{ color: "var(--theme-text-muted)" }}>{pay.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══ THEMES TAB ═══ */}
      {activeTab === "themes" && (
        <div>
          <p className="text-sm mb-6" style={{ color: "var(--theme-text-secondary)" }}>
            اختر ثيم المنصة. التغيير يطبق فوراً على جميع الصفحات.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {themeOptions.map((t) => {
              const isActive = theme === t.key;
              return (
                <button key={t.key}
                  onClick={() => setTheme(t.key)}
                  className="themed-card p-5 text-right cursor-pointer transition-all"
                  style={{
                    borderColor: isActive ? t.colors[0] : undefined,
                    borderWidth: isActive ? "2px" : undefined,
                    boxShadow: isActive ? `0 4px 20px ${t.colors[0]}30` : undefined,
                  }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-3xl">{t.emoji}</div>
                    <div>
                      <div className="font-bold" style={{ color: "var(--theme-text-primary)" }}>{t.name}</div>
                      <div className="text-xs" style={{ color: "var(--theme-text-secondary)" }}>{t.desc}</div>
                    </div>
                    {isActive && (
                      <div className="mr-auto w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ background: t.colors[0] }}>
                        <Check size={14} color="#fff" />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {t.colors.map((c, i) => (
                      <div key={i} className="flex-1 h-3 rounded-full" style={{ background: c }} />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}