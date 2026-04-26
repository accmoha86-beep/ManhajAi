// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useUIStore } from "@/store/ui-store";
import {
  BarChart3, Users, CreditCard, BookOpen, GraduationCap,
  Palette, TrendingUp, DollarSign, Eye,
  Shield, Plus, Edit, Trash2, Search, Loader2, Save, EyeOff,
  Settings, Package, Key, ToggleLeft, ToggleRight, X,
  CheckCircle, XCircle, RefreshCw, Bell, Tag, ChevronDown,
  Send, Filter, Calendar, Hash, Percent, AlertCircle,
  Upload, FileText,
} from "lucide-react";
import { useRouter } from "next/navigation";

/* ───────── Types ───────── */
interface StatCard { title: string; value: string | number; icon: React.ReactNode; color: string }
interface ModalProps { open: boolean; onClose: () => void; title: string; children: React.ReactNode; onSave?: () => void; saving?: boolean }

/* ───────── Admin API ───────── */
async function adminAPI(action: string, params: Record<string, unknown> = {}) {
  const res = await fetch("/api/admin/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ action, ...params }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "فشل في العملية");
  return data.data;
}

/* ───────── Shared UI ───────── */
function Modal({ open, onClose, title, children, onSave, saving }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl p-6 max-h-[85vh] overflow-y-auto" style={{ background: "var(--theme-surface-bg)", border: "1px solid var(--theme-surface-border)" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold" style={{ color: "var(--theme-text-primary)" }}>{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:opacity-70"><X size={20} style={{ color: "var(--theme-text-secondary)" }} /></button>
        </div>
        {children}
        {onSave && (
          <div className="flex gap-2 mt-4">
            <button onClick={onSave} disabled={saving} className="flex-1 py-2 px-4 rounded-xl text-white font-medium flex items-center justify-center gap-2" style={{ background: "var(--theme-cta-gradient)" }}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} حفظ
            </button>
            <button onClick={onClose} className="px-4 py-2 rounded-xl font-medium" style={{ background: "var(--theme-surface-border)", color: "var(--theme-text-secondary)" }}>إلغاء</button>
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingState() {
  return <div className="flex items-center justify-center py-20"><Loader2 size={32} className="animate-spin" style={{ color: "var(--theme-primary)" }} /></div>;
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <AlertCircle size={40} className="text-red-500" />
      <p className="text-red-500 font-medium">{message}</p>
      <button onClick={onRetry} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white" style={{ background: "var(--theme-cta-gradient)" }}>
        <RefreshCw size={16} /> إعادة المحاولة
      </button>
    </div>
  );
}

function EmptyState({ message, icon }: { message: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div style={{ color: "var(--theme-text-secondary)" }}>{icon}</div>
      <p className="font-medium" style={{ color: "var(--theme-text-secondary)" }}>{message}</p>
    </div>
  );
}

function InputField({ label, value, onChange, type = "text", placeholder = "", dir }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; dir?: string }) {
  return (
    <div className="mb-3">
      <label className="block text-sm font-medium mb-1" style={{ color: "var(--theme-text-secondary)" }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} dir={dir || "rtl"}
        className="w-full px-3 py-2 rounded-xl outline-none text-sm" style={{ background: "var(--theme-bg)", border: "1px solid var(--theme-surface-border)", color: "var(--theme-text-primary)" }} />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="mb-3">
      <label className="block text-sm font-medium mb-1" style={{ color: "var(--theme-text-secondary)" }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full px-3 py-2 rounded-xl outline-none text-sm" style={{ background: "var(--theme-bg)", border: "1px solid var(--theme-surface-border)", color: "var(--theme-text-primary)" }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className="flex items-center">
      {checked ? <ToggleRight size={28} style={{ color: "var(--theme-primary)" }} /> : <ToggleLeft size={28} style={{ color: "var(--theme-text-secondary)" }} />}
    </button>
  );
}

function formatDate(d: string) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" }); } catch { return d; }
}

function formatCurrency(v: number | string) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(n)) return "٠ ج.م";
  return `${n.toLocaleString("ar-EG")} ج.م`;
}

/* ───────── Tabs Config ───────── */
const TABS = [
  { id: "overview", label: "نظرة عامة", icon: <BarChart3 size={18} /> },
  { id: "students", label: "الطلاب", icon: <Users size={18} /> },
  { id: "subscriptions", label: "الاشتراكات", icon: <CreditCard size={18} /> },
  { id: "grades", label: "الصفوف", icon: <GraduationCap size={18} /> },
  { id: "subjects", label: "المواد", icon: <BookOpen size={18} /> },
  { id: "payments", label: "المدفوعات", icon: <DollarSign size={18} /> },
  { id: "themes", label: "الثيمات", icon: <Palette size={18} /> },
  { id: "coupons", label: "الكوبونات", icon: <Tag size={18} /> },
  { id: "notifications", label: "الإشعارات", icon: <Bell size={18} /> },
  { id: "payment_config", label: "💳 إعدادات الدفع", icon: <CreditCard size={18} /> },
  { id: "plans", label: "📦 الخطط", icon: <Package size={18} /> },
  { id: "secrets", label: "🔑 المفاتيح", icon: <Key size={18} /> },
  { id: "profitability", label: "💰 الأرباح", icon: <TrendingUp size={18} /> },
  { id: "analytics", label: "📈 التحليلات", icon: <BarChart3 size={18} /> },
  { id: "settings", label: "⚙️ الإعدادات", icon: <Settings size={18} /> },
];

/* ───────── Main Component ───────── */
export default function AdminPanel() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState("overview");
  const [tabsOpen, setTabsOpen] = useState(false);

  useEffect(() => {
    if (user && user.role !== "admin") router.push("/");
  }, [user, router]);

  return (
    <div className="min-h-screen pb-8" dir="rtl" style={{ fontFamily: "Cairo, sans-serif" }}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2" style={{ color: "var(--theme-text-primary)" }}>
          <Shield size={28} /> لوحة التحكم
        </h1>

        {/* Mobile tab selector */}
        <div className="md:hidden mb-4">
          <button onClick={() => setTabsOpen(!tabsOpen)} className="w-full flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: "var(--theme-surface-bg)", border: "1px solid var(--theme-surface-border)", color: "var(--theme-text-primary)" }}>
            <span className="flex items-center gap-2">{TABS.find(t => t.id === activeTab)?.icon} {TABS.find(t => t.id === activeTab)?.label}</span>
            <ChevronDown size={18} className={`transition-transform ${tabsOpen ? "rotate-180" : ""}`} />
          </button>
          {tabsOpen && (
            <div className="mt-1 rounded-xl overflow-hidden shadow-lg" style={{ background: "var(--theme-surface-bg)", border: "1px solid var(--theme-surface-border)" }}>
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => { setActiveTab(tab.id); setTabsOpen(false); }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors"
                  style={{ color: activeTab === tab.id ? "var(--theme-primary)" : "var(--theme-text-secondary)", background: activeTab === tab.id ? "var(--theme-primary-light, rgba(99,102,241,0.1))" : "transparent" }}>
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Desktop tabs */}
        <div className="hidden md:flex flex-wrap gap-2 mb-6">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={activeTab === tab.id ? { background: "var(--theme-cta-gradient)", color: "white" } : { background: "var(--theme-surface-bg)", color: "var(--theme-text-secondary)", border: "1px solid var(--theme-surface-border)" }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="rounded-2xl p-4 md:p-6" style={{ background: "var(--theme-surface-bg)", border: "1px solid var(--theme-surface-border)" }}>
          {activeTab === "overview" && <OverviewTab />}
          {activeTab === "students" && <StudentsTab />}
          {activeTab === "subscriptions" && <SubscriptionsTab />}
          {activeTab === "grades" && <GradesTab />}
          {activeTab === "subjects" && <SubjectsTab />}
          {activeTab === "payments" && <PaymentsTab />}
          {activeTab === "themes" && <ThemesTab />}
          {activeTab === "coupons" && <CouponsTab />}
          {activeTab === "notifications" && <NotificationsTab />}
          {activeTab === "payment_config" && <PaymentConfigTab />}
          {activeTab === "plans" && <PlansTab />}
          {activeTab === "secrets" && <SecretsTab />}
          {activeTab === "profitability" && <ProfitabilityTab />}
          {activeTab === "analytics" && <AnalyticsTab />}
          {activeTab === "settings" && <SettingsTab />}
        </div>
      </div>
    </div>
  );
}

/* ═══════════ TAB 1: Overview ═══════════ */
function OverviewTab() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setData(await adminAPI("overview")); } catch (e: unknown) { setError(e instanceof Error ? e.message : "خطأ"); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <EmptyState message="لا توجد بيانات" icon={<BarChart3 size={40} />} />;

  const stats: StatCard[] = [
    { title: "إجمالي الطلاب", value: (data.total_students as number) || 0, icon: <Users size={24} />, color: "#6366f1" },
    { title: "الاشتراكات النشطة", value: (data.active_subscriptions as number) || 0, icon: <CreditCard size={24} />, color: "#10b981" },
    { title: "إجمالي الإيرادات", value: formatCurrency((data.total_revenue as number) || 0), icon: <DollarSign size={24} />, color: "#f59e0b" },
    { title: "إجمالي المواد", value: (data.total_subjects as number) || 0, icon: <BookOpen size={24} />, color: "#8b5cf6" },
  ];

  const recentExams = (data.recent_exams as Array<Record<string, unknown>>) || [];

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s, i) => (
          <div key={i} className="rounded-2xl p-4" style={{ background: "var(--theme-bg)", border: "1px solid var(--theme-surface-border)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: "var(--theme-text-secondary)" }}>{s.title}</span>
              <div className="p-2 rounded-xl" style={{ background: s.color + "20", color: s.color }}>{s.icon}</div>
            </div>
            <p className="text-2xl font-bold" style={{ color: "var(--theme-text-primary)" }}>{s.value}</p>
          </div>
        ))}
      </div>
      <h3 className="text-lg font-bold mb-3" style={{ color: "var(--theme-text-primary)" }}>آخر الامتحانات</h3>
      {recentExams.length === 0 ? <EmptyState message="لا توجد امتحانات حديثة" icon={<Eye size={32} />} /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--theme-surface-border)" }}>
                <th className="text-right py-2 px-3 font-medium" style={{ color: "var(--theme-text-secondary)" }}>الطالب</th>
                <th className="text-right py-2 px-3 font-medium" style={{ color: "var(--theme-text-secondary)" }}>المادة</th>
                <th className="text-right py-2 px-3 font-medium" style={{ color: "var(--theme-text-secondary)" }}>النتيجة</th>
                <th className="text-right py-2 px-3 font-medium" style={{ color: "var(--theme-text-secondary)" }}>التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {recentExams.slice(0, 10).map((ex, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--theme-surface-border)" }}>
                  <td className="py-2 px-3" style={{ color: "var(--theme-text-primary)" }}>{(ex.student_name as string) || "—"}</td>
                  <td className="py-2 px-3" style={{ color: "var(--theme-text-primary)" }}>{(ex.subject_name as string) || "—"}</td>
                  <td className="py-2 px-3" style={{ color: "var(--theme-text-primary)" }}>{(ex.score as number) ?? "—"}%</td>
                  <td className="py-2 px-3" style={{ color: "var(--theme-text-secondary)" }}>{formatDate(ex.created_at as string)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ═══════════ TAB 2: Students ═══════════ */
function StudentsTab() {
  const [students, setStudents] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 20;

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await adminAPI("get_students", { search, page, per_page: perPage });
      setStudents(res.students || res || []);
      setTotal(res.total || 0);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "خطأ"); }
    setLoading(false);
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  const toggleBan = async (id: string, banned: boolean) => {
    try {
      await adminAPI(banned ? "unban_student" : "ban_student", { student_id: id });
      load();
    } catch { /* reload anyway */ load(); }
  };

  const deleteStudent = async (id: string, name: string) => {
    if (!confirm(`⚠️ هل أنت متأكد من حذف الطالب "${name}"؟\n\nسيتم حذف جميع بياناته (اشتراكات، امتحانات، شهادات، محادثات) نهائياً!`)) return;
    if (!confirm(`🔴 تأكيد نهائي: حذف "${name}" وكل بياناته؟ لا يمكن التراجع!`)) return;
    try {
      await adminAPI("delete_student", { student_id: id });
      alert(`✅ تم حذف "${name}" بنجاح`);
      load();
    } catch (e) {
      alert(`❌ خطأ في الحذف: ${e instanceof Error ? e.message : 'خطأ غير معروف'}`);
      load();
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--theme-text-secondary)" }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="بحث بالاسم أو الموبايل..."
            className="w-full pr-10 pl-4 py-2 rounded-xl outline-none text-sm" style={{ background: "var(--theme-bg)", border: "1px solid var(--theme-surface-border)", color: "var(--theme-text-primary)" }} />
        </div>
        <button onClick={load} className="px-4 py-2 rounded-xl flex items-center gap-2 text-sm" style={{ background: "var(--theme-bg)", border: "1px solid var(--theme-surface-border)", color: "var(--theme-text-secondary)" }}>
          <RefreshCw size={14} /> تحديث
        </button>
      </div>

      {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={load} /> : students.length === 0 ? <EmptyState message="لا يوجد طلاب" icon={<Users size={40} />} /> : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "2px solid var(--theme-surface-border)" }}>
                  {["الاسم", "رقم الموبايل", "الصف", "الحالة", "تاريخ التسجيل", "إجراء"].map(h => (
                    <th key={h} className="text-right py-3 px-3 font-medium" style={{ color: "var(--theme-text-secondary)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--theme-surface-border)" }}>
                    <td className="py-3 px-3 font-medium" style={{ color: "var(--theme-text-primary)" }}>{(s.name as string) || (s.full_name as string) || "—"}</td>
                    <td className="py-3 px-3" dir="ltr" style={{ color: "var(--theme-text-secondary)" }}>{(s.phone as string) || "—"}</td>
                    <td className="py-3 px-3" style={{ color: "var(--theme-text-secondary)" }}>{(s.grade as string) || (s.grade_name as string) || "—"}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${s.banned ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}>
                        {s.banned ? "محظور" : "نشط"}
                      </span>
                    </td>
                    <td className="py-3 px-3" style={{ color: "var(--theme-text-secondary)" }}>{formatDate(s.created_at as string)}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleBan(s.id as string, !!s.banned)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium ${s.banned ? "bg-green-100 text-green-600 hover:bg-green-200" : "bg-red-100 text-red-600 hover:bg-red-200"}`}>
                          {s.banned ? "إلغاء الحظر" : "حظر"}
                        </button>
                        <button onClick={() => deleteStudent(s.id as string, (s.full_name as string) || (s.name as string) || "طالب")}
                          className="px-3 py-1 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                          title="حذف الطالب نهائياً">
                          🗑️ حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {total > perPage && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded-lg text-sm disabled:opacity-40" style={{ background: "var(--theme-bg)", border: "1px solid var(--theme-surface-border)", color: "var(--theme-text-secondary)" }}>السابق</button>
              <span className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>صفحة {page} من {Math.ceil(total / perPage)}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / perPage)} className="px-3 py-1 rounded-lg text-sm disabled:opacity-40" style={{ background: "var(--theme-bg)", border: "1px solid var(--theme-surface-border)", color: "var(--theme-text-secondary)" }}>التالي</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ═══════════ TAB 3: Subscriptions ═══════════ */
function SubscriptionsTab() {
  const [subs, setSubs] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const r = await adminAPI("get_subscriptions"); setSubs(Array.isArray(r) ? r : r.subscriptions || []); } catch (e: unknown) { setError(e instanceof Error ? e.message : "خطأ"); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (subs.length === 0) return <EmptyState message="لا توجد اشتراكات" icon={<CreditCard size={40} />} />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "2px solid var(--theme-surface-border)" }}>
            {["الطالب", "الخطة", "الحالة", "بداية", "نهاية", "المبلغ"].map(h => (
              <th key={h} className="text-right py-3 px-3 font-medium" style={{ color: "var(--theme-text-secondary)" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {subs.map((s, i) => (
            <tr key={i} style={{ borderBottom: "1px solid var(--theme-surface-border)" }}>
              <td className="py-3 px-3 font-medium" style={{ color: "var(--theme-text-primary)" }}>{(s.full_name as string) || "—"}</td>
              <td className="py-3 px-3" style={{ color: "var(--theme-text-secondary)" }}>{(s.plan_type as string) === "monthly" ? "شهري" : (s.plan_type as string) === "term" ? "ترم" : (s.plan_type as string) === "annual" ? "سنوي" : (s.plan_type as string) === "trial" ? "تجريبي" : (s.plan_type as string) || "—"}</td>
              <td className="py-3 px-3">
                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${s.status === "active" ? "bg-green-100 text-green-600" : s.status === "cancelled" ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-600"}`}>
                  {s.status === "active" ? "نشط" : s.status === "cancelled" ? "ملغي" : s.status === "expired" ? "منتهي" : (s.status as string) || "—"}
                </span>
              </td>
              <td className="py-3 px-3" style={{ color: "var(--theme-text-secondary)" }}>{formatDate(s.start_date as string || s.created_at as string)}</td>
              <td className="py-3 px-3" style={{ color: "var(--theme-text-secondary)" }}>{formatDate(s.end_date as string || s.expires_at as string)}</td>
              <td className="py-3 px-3 font-medium" style={{ color: "var(--theme-text-primary)" }}>{formatCurrency((s.amount as number) || 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════ TAB 4: Grades ═══════════ */
function GradesTab() {
  const [grades, setGrades] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const r = await adminAPI("get_grades"); setGrades(Array.isArray(r) ? r : r.grades || []); } catch (e: unknown) { setError(e instanceof Error ? e.message : "خطأ"); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const togglePublish = async (id: string, published: boolean) => {
    try { await adminAPI("toggle_grade", { grade_id: id, published: !published }); load(); } catch { load(); }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (grades.length === 0) return <EmptyState message="لا توجد صفوف" icon={<GraduationCap size={40} />} />;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {grades.map((g, i) => (
        <div key={i} className="rounded-2xl p-4 flex items-center justify-between" style={{ background: "var(--theme-bg)", border: "1px solid var(--theme-surface-border)" }}>
          <div>
            <p className="font-bold" style={{ color: "var(--theme-text-primary)" }}>{(g.name as string) || (g.grade_name as string) || "—"}</p>
            <p className="text-xs mt-1" style={{ color: "var(--theme-text-secondary)" }}>{(g.subjects_count as number) || 0} مادة</p>
          </div>
          <ToggleSwitch checked={!!(g.published ?? g.is_published ?? true)} onChange={() => togglePublish(g.id as string, !!(g.published ?? g.is_published ?? true))} />
        </div>
      ))}
    </div>
  );
}

/* ═══════════ TAB 5: Subjects with Lessons & AI Content ═══════════ */
function SubjectsTab() {
  const [subjects, setSubjects] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editItem, setEditItem] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState({ name_ar: "", icon: "📘", color: "#3B82F6", grade_level: "3", is_published: true });
  const [saving, setSaving] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Record<string, unknown> | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const r = await adminAPI("get_subjects"); setSubjects(Array.isArray(r) ? r : r.subjects || []); } catch (e: unknown) { setError(e instanceof Error ? e.message : "خطأ"); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const subjectIcons = ["📘","📐","🧪","🌍","🔬","📖","🎨","💻","🧮","📊","🏛️","🌿","⚗️","🔭","📝","🎵","💪","🇬🇧","🇫🇷","🇩🇪"];
  const subjectColors = ["#3B82F6","#8B5CF6","#10B981","#F59E0B","#EF4444","#EC4899","#6366F1","#14B8A6","#F97316","#06B6D4"];

  const openCreate = () => { setForm({ name_ar: "", icon: "📘", color: "#3B82F6", grade_level: "3", is_published: true }); setEditItem(null); setModal("create"); };
  const openEdit = (s: Record<string, unknown>) => {
    setForm({
      name_ar: (s.name_ar as string) || (s.name as string) || "",
      icon: (s.icon as string) || "📘",
      color: (s.color as string) || "#3B82F6",
      grade_level: String((s.grade_level as number) || 3),
      is_published: !!(s.is_published ?? s.published ?? true),
    });
    setEditItem(s); setModal("edit");
  };

  const handleSave = async () => {
    if (!form.name_ar.trim()) { alert("اسم المادة مطلوب"); return; }
    setSaving(true);
    try {
      if (modal === "create") {
        await adminAPI("create_subject", {
          name_ar: form.name_ar.trim(),
          icon: form.icon,
          color: form.color,
          grade_level: Number(form.grade_level),
          is_published: form.is_published,
        });
      } else {
        await adminAPI("update_subject", {
          subject_id: editItem?.id,
          name_ar: form.name_ar.trim(),
          icon: form.icon,
          color: form.color,
          grade_level: Number(form.grade_level),
          is_published: form.is_published,
        });
      }
      setModal(null); load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "خطأ"); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه المادة؟")) return;
    try { await adminAPI("delete_subject", { subject_id: id }); load(); } catch { load(); }
  };

  const togglePublish = async (id: string, published: boolean) => {
    try { await adminAPI("toggle_subject", { subject_id: id, published: !published }); load(); } catch { load(); }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  // Show lessons for selected subject
  if (selectedSubject) {
    return <SubjectLessonsView subject={selectedSubject} onBack={() => setSelectedSubject(null)} />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold" style={{ color: "var(--theme-text-primary)" }}>المواد الدراسية ({subjects.length})</h3>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium" style={{ background: "var(--theme-cta-gradient)" }}>
          <Plus size={16} /> إضافة مادة
        </button>
      </div>

      {subjects.length === 0 ? <EmptyState message="لا توجد مواد" icon={<BookOpen size={40} />} /> : (
        <div className="grid gap-3">
          {subjects.map((s, i) => (
            <div key={i} className="p-4 rounded-xl flex items-center justify-between" style={{ background: "var(--theme-surface-bg)", border: "1px solid var(--theme-surface-border)" }}>
              <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => setSelectedSubject(s)}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white" style={{ background: "var(--theme-cta-gradient)" }}>
                  <BookOpen size={20} />
                </div>
                <div>
                  <p className="font-bold" style={{ color: "var(--theme-text-primary)" }}>{(s.name as string) || (s.name_ar as string) || "—"}</p>
                  <p className="text-xs" style={{ color: "var(--theme-text-secondary)" }}>
                    {(s.description as string) || (s.description_ar as string) || "بدون وصف"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ToggleSwitch checked={!!(s.published ?? s.is_published)} onChange={() => togglePublish(s.id as string, !!(s.published ?? s.is_published))} />
                <button onClick={() => setSelectedSubject(s)} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "var(--theme-primary-light, rgba(99,102,241,0.1))", color: "var(--theme-primary)" }}>
                  الدروس 📚
                </button>
                <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: "var(--theme-primary)" }}><Edit size={16} /></button>
                <button onClick={() => handleDelete(s.id as string)} className="p-1.5 rounded-lg hover:opacity-70 text-red-500"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === "create" ? "➕ إضافة مادة جديدة" : "✏️ تعديل المادة"} onSave={handleSave} saving={saving}>
        <InputField label="اسم المادة بالعربي *" value={form.name_ar} onChange={v => setForm({ ...form, name_ar: v })} placeholder="مثال: الرياضيات البحتة" />
        
        <div className="mb-3">
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--theme-text-secondary)" }}>أيقونة المادة</label>
          <div className="flex flex-wrap gap-2">
            {subjectIcons.map(ic => (
              <button key={ic} onClick={() => setForm({ ...form, icon: ic })}
                className="w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all"
                style={{ background: form.icon === ic ? "var(--theme-primary)" : "var(--theme-bg)", border: `2px solid ${form.icon === ic ? "var(--theme-primary)" : "var(--theme-surface-border)"}` }}>
                {ic}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--theme-text-secondary)" }}>لون المادة</label>
          <div className="flex flex-wrap gap-2">
            {subjectColors.map(cl => (
              <button key={cl} onClick={() => setForm({ ...form, color: cl })}
                className="w-8 h-8 rounded-full transition-all"
                style={{ background: cl, border: `3px solid ${form.color === cl ? "var(--theme-text-primary)" : "transparent"}`, transform: form.color === cl ? "scale(1.2)" : "scale(1)" }} />
            ))}
          </div>
        </div>

        <SelectField label="الصف الدراسي" value={form.grade_level} onChange={v => setForm({ ...form, grade_level: v })} 
          options={[{ value: "3", label: "الصف الثالث الثانوي" }, { value: "2", label: "الصف الثاني الثانوي" }, { value: "1", label: "الصف الأول الثانوي" }]} />

        <div className="flex items-center justify-between mb-3 p-3 rounded-xl" style={{ background: "var(--theme-bg)" }}>
          <span className="text-sm font-medium" style={{ color: "var(--theme-text-primary)" }}>نشر المادة فوراً؟</span>
          <ToggleSwitch checked={form.is_published} onChange={v => setForm({ ...form, is_published: v })} />
        </div>
      </Modal>
    </div>
  );
}

/* ═══════════ Subject Lessons View (with PDF Upload & AI Generation) ═══════════ */
function SubjectLessonsView({ subject, onBack }: { subject: Record<string, unknown>; onBack: () => void }) {
  const [lessons, setLessons] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addingLesson, setAddingLesson] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [genProgress, setGenProgress] = useState("");
  const [genResult, setGenResult] = useState<Record<string, unknown> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadLessonId, setUploadLessonId] = useState<string | null>(null);

  const subjectId = (subject.id as string) || "";
  const subjectName = (subject.name as string) || (subject.name_ar as string) || "المادة";

  const loadLessons = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r = await adminAPI("get_lessons", { subject_id: subjectId });
      const arr = r?.lessons || (Array.isArray(r) ? r : []);
      // Unwrap nested lessons
      const finalArr = Array.isArray(arr) ? arr : (arr?.lessons || []);
      setLessons(finalArr);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "خطأ"); }
    setLoading(false);
  }, [subjectId]);

  useEffect(() => { loadLessons(); }, [loadLessons]);

  const handleAddLesson = async () => {
    if (!newLessonTitle.trim()) return;
    setAddingLesson(true);
    try {
      await adminAPI("create_lesson", { subject_id: subjectId, title_ar: newLessonTitle.trim(), sort_order: lessons.length + 1 });
      setNewLessonTitle("");
      loadLessons();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "خطأ"); }
    setAddingLesson(false);
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm("حذف الدرس وكل محتواه (ملخصات + أسئلة)؟")) return;
    try { await adminAPI("delete_lesson", { lesson_id: lessonId }); loadLessons(); } catch { loadLessons(); }
  };

  const triggerUpload = (lessonId: string) => {
    setUploadLessonId(lessonId);
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !uploadLessonId) return;

    // Supported types
    const allowedTypes = [
      "application/pdf",
      "image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif", "image/bmp",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.ms-powerpoint",
      "text/plain", "text/csv", "text/markdown",
    ];
    const allowedExts = ['pdf','png','jpg','jpeg','webp','gif','bmp','docx','doc','xlsx','xls','csv','pptx','ppt','txt','md','rtf'];
    const maxSizeMB = 200;

    // Validate all files first
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const ext = f.name?.toLowerCase().split('.').pop() || '';
      if (!allowedTypes.includes(f.type) && !allowedExts.includes(ext)) {
        alert(`❌ الملف "${f.name}" — صيغة غير مدعومة.\nالصيغ المدعومة: PDF, Word, Excel, PowerPoint, صور, نص`);
        return;
      }
      if (f.size > maxSizeMB * 1024 * 1024) {
        alert(`❌ الملف "${f.name}" — حجمه (${(f.size / 1024 / 1024).toFixed(1)} MB) يتجاوز الحد (${maxSizeMB} MB)`);
        return;
      }
    }

    const totalFiles = files.length;
    setGeneratingId(uploadLessonId);
    setGenResult(null);
    let totalQuestionsAll = 0;
    let lastError: string | null = null;

    // Process files sequentially
    for (let fi = 0; fi < totalFiles; fi++) {
      const file = files[fi];
      const fileLabel = totalFiles > 1 ? `📁 ملف ${fi + 1}/${totalFiles}: ${file.name}` : '';
      const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);
      setGenProgress(`${fileLabel}\n📤 جاري رفع الملف (${fileSizeMB} MB)...`);

    try {
      const jobId = crypto.randomUUID();

      const formData = new FormData();
      formData.append("file", file);
      formData.append("lessonId", uploadLessonId);
      formData.append("subjectId", subjectId);
      formData.append("jobId", jobId); // Pre-generated UUID

      const token = document.cookie.split(";").find(c => c.trim().startsWith("auth-token="))?.split("=").slice(1).join("=");
      
      // Track if server responded
      let serverDone = false;
      let serverError: string | null = null;

      // 🔥 Start upload via XHR (for upload progress)
      const xhrPromise = new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/content/generate");
        if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.timeout = 600000; // 10 min timeout
        
        // Real upload progress
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            const loadedMB = (e.loaded / 1024 / 1024).toFixed(1);
            setGenProgress(`${fileLabel}\n📤 جاري رفع الملف... ${pct}% (${loadedMB} من ${fileSizeMB} MB)`);
          }
        };
        
        xhr.upload.onload = () => {
          setGenProgress(`${fileLabel}\n✅ تم الرفع — جاري المعالجة...`);
        };
        
        xhr.onload = () => {
          try {
            const parsed = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300 && parsed.success) {
              serverDone = true;
              resolve(parsed);
            } else {
              serverError = parsed.error || `خطأ ${xhr.status}`;
              reject(new Error(serverError!));
            }
          } catch {
            serverError = `خطأ من السيرفر (${xhr.status})`;
            reject(new Error(serverError));
          }
        };
        
        xhr.onerror = () => { console.warn("[Upload] XHR connection lost — polling continues"); resolve(null); };
        xhr.ontimeout = () => { console.warn("[Upload] XHR timeout — polling continues"); resolve(null); };
        xhr.send(formData);
      });

      // 🔄 Start polling 5 seconds after upload starts (job should exist by then)
      const pollDelay = 5000;
      await new Promise(r => setTimeout(r, pollDelay));

      // Poll while server is still processing
      let completed = false;
      let pollCount = 0;
      const maxPolls = 200; // 200 × 3s = 10 minutes

      while (!completed && !serverDone && pollCount < maxPolls) {
        await new Promise(r => setTimeout(r, 3000));
        pollCount++;

        try {
          const statusRes = await fetch(`/api/content/status?jobId=${jobId}`);
          if (!statusRes.ok) continue;
          const status = await statusRes.json();

          if (status.status === 'completed') {
            completed = true;
            setGenResult({
              summary: true,
              questions: { total: status.questionsCount || 0 },
              pages: status.totalPages,
              chunks: status.totalChunks,
            });
            setGenProgress("");
            loadLessons();
          } else if (status.status === 'failed') {
            throw new Error(status.error || 'فشل في المعالجة');
          } else if (status.progress > 0) {
            const pct = status.progress || 0;
            const msg = status.message || 'جاري المعالجة...';
            setGenProgress(`${fileLabel}\n${msg} — ${pct}%`);
          }
        } catch (pollErr: any) {
          if (pollErr.message?.includes('فشل')) throw pollErr;
        }
      }

      // Wait for server response if polling didn't catch completion
      if (!completed) {
        try {
          const data = await xhrPromise;
          if (data && data.success) {
            setGenResult({
              summary: data.summary,
              questions: data.questions,
            });
            setGenProgress("");
            loadLessons();
          } else if (!data) {
            // XHR was lost (proxy timeout) — check job one last time
            const finalCheck = await fetch(`/api/content/status?jobId=${jobId}`);
            if (finalCheck.ok) {
              const status = await finalCheck.json();
              if (status.status === 'completed') {
                setGenResult({ summary: true, questions: { total: status.questionsCount || 0 } });
                setGenProgress("");
                loadLessons();
              } else if (status.status === 'processing') {
                setGenProgress("⏳ جاري المعالجة في الخلفية... أعد تحميل الصفحة بعد دقيقة");
              } else {
                throw new Error(status.error || 'فشل في المعالجة');
              }
            }
          }
        } catch (xhrErr: any) {
          throw xhrErr;
        }
      }

    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : "خطأ غير متوقع";
      if (totalFiles === 1) {
        setGenProgress("");
        alert(lastError);
      }
    }

    // Track total questions across all files
    if (genResult) {
      totalQuestionsAll += ((genResult as Record<string, any>)?.questions?.total || 0);
    }

    } // end for loop (multi-file)

    // Final result for multi-file
    if (totalFiles > 1) {
      if (lastError && totalQuestionsAll === 0) {
        setGenProgress("");
        alert(`فشل في معالجة الملفات: ${lastError}`);
      } else {
        setGenResult({
          summary: true,
          questions: { total: totalQuestionsAll },
          multiFile: totalFiles,
        });
        setGenProgress("");
        loadLessons();
      }
    }

    setGeneratingId(null);
    e.target.value = "";
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="p-2 rounded-lg hover:opacity-70" style={{ color: "var(--theme-primary)" }}>
          <ChevronDown size={20} className="rotate-90" />
        </button>
        <div>
          <h3 className="font-bold text-lg" style={{ color: "var(--theme-text-primary)" }}>📚 دروس: {subjectName}</h3>
          <p className="text-xs" style={{ color: "var(--theme-text-secondary)" }}>{lessons.length} درس</p>
        </div>
      </div>

      {/* Add Lesson Form */}
      <div className="flex gap-2 mb-4">
        <input
          value={newLessonTitle}
          onChange={e => setNewLessonTitle(e.target.value)}
          placeholder="اسم الدرس الجديد..."
          className="flex-1 px-4 py-2.5 rounded-xl outline-none text-sm"
          style={{ background: "var(--theme-surface-bg)", border: "1px solid var(--theme-surface-border)", color: "var(--theme-text-primary)" }}
          onKeyDown={e => e.key === "Enter" && handleAddLesson()}
        />
        <button
          onClick={handleAddLesson}
          disabled={addingLesson || !newLessonTitle.trim()}
          className="px-4 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50"
          style={{ background: "var(--theme-cta-gradient)" }}
        >
          {addingLesson ? "..." : "➕ إضافة"}
        </button>
      </div>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.bmp,.tiff,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.md,.rtf" className="hidden" onChange={handleFileUpload} />

      {/* Generation Result Banner */}
      {genResult && (
        <div className="mb-4 p-4 rounded-xl bg-green-50 border border-green-200">
          <p className="font-bold text-green-700 mb-2">✅ تم توليد المحتوى بنجاح!</p>
          <div className="flex gap-4 text-sm text-green-600 flex-wrap">
            {(genResult.summary) && <span>📝 تم إنشاء الملخص</span>}
            <span>📋 {(genResult.questions as Record<string, unknown>)?.total || 0} سؤال</span>
            {(genResult.pages as number) > 0 && <span>📄 {genResult.pages as number} صفحة</span>}
            {(genResult.chunks as number) > 1 && <span>✂️ {genResult.chunks as number} جزء</span>}
            {(genResult.multiFile as number) > 1 && <span>📁 {genResult.multiFile as number} ملف</span>}
          </div>
          <button onClick={() => setGenResult(null)} className="mt-2 text-xs text-green-500 hover:underline">إغلاق ✕</button>
        </div>
      )}

      {/* Generation Progress — with real progress bar */}
      {/* Upload + Processing Progress */}
      {genProgress && (
        <div className="mb-4 p-4 rounded-xl bg-blue-50 border border-blue-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-blue-700 font-medium text-sm flex-1">{genProgress.replace(/— \d+%$/, '')}</p>
          </div>
          {genProgress.includes('%') && (() => {
            const pctMatch = genProgress.match(/(\d+)%/);
            const pct = pctMatch ? parseInt(pctMatch[1]) : 0;
            return (
              <div className="w-full bg-blue-200 rounded-full h-2.5 mt-1">
                <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
            );
          })()}
        </div>
      )}

      {/* Lessons List */}
      {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={loadLessons} /> : lessons.length === 0 ? (
        <EmptyState message="لا توجد دروس — أضف درس جديد وارفع ملف المنهج (PDF / Word / Excel / PowerPoint / صورة)" icon={<FileText size={40} />} />
      ) : (
        <div className="space-y-2">
          {lessons.map((l, i) => {
            const lessonId = l.id as string;
            const hasSummary = l.has_summary || l.has_summary_record;
            const hasQuestions = l.has_questions || ((l.questions_count as number) || 0) > 0;
            const questionsCount = (l.questions_count as number) || 0;
            const isGenerating = generatingId === lessonId;

            return (
              <div key={i} className="p-4 rounded-xl" style={{ background: "var(--theme-surface-bg)", border: "1px solid var(--theme-surface-border)" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: hasSummary && hasQuestions ? "#22c55e20" : "#f59e0b20", color: hasSummary && hasQuestions ? "#22c55e" : "#f59e0b" }}>
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm" style={{ color: "var(--theme-text-primary)" }}>{(l.title_ar as string) || "—"}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${hasSummary ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                          {hasSummary ? "✅ ملخص" : "❌ بدون ملخص"}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${hasQuestions ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                          {hasQuestions ? `✅ ${questionsCount} سؤال` : "❌ بدون أسئلة"}
                        </span>
                        {l.content_generated_at && (
                          <span className="text-xs" style={{ color: "var(--theme-text-secondary)" }}>
                            🕐 {new Date(l.content_generated_at as string).toLocaleDateString("ar-EG")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => triggerUpload(lessonId)}
                      disabled={isGenerating}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-50"
                      style={{ background: isGenerating ? "#9ca3af" : "var(--theme-cta-gradient)" }}
                    >
                      {isGenerating ? (
                        <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> جاري...</>
                      ) : (
                        <><Upload size={14} /> {hasSummary ? "إعادة توليد 🤖" : "رفع ملفات 📄📝📊"}</>
                      )}
                    </button>
                    <button onClick={() => handleDeleteLesson(lessonId)} className="p-1.5 rounded-lg hover:opacity-70 text-red-500"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════ TAB 6: Payments ═══════════ */
function PaymentsTab() {
  const [payments, setPayments] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const r = await adminAPI("get_payments"); setPayments(Array.isArray(r) ? r : r.payments || []); } catch (e: unknown) { setError(e instanceof Error ? e.message : "خطأ"); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (payments.length === 0) return <EmptyState message="لا توجد مدفوعات" icon={<DollarSign size={40} />} />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "2px solid var(--theme-surface-border)" }}>
            {["الطالب", "المبلغ", "الطريقة", "الحالة", "التاريخ"].map(h => (
              <th key={h} className="text-right py-3 px-3 font-medium" style={{ color: "var(--theme-text-secondary)" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {payments.map((p, i) => (
            <tr key={i} style={{ borderBottom: "1px solid var(--theme-surface-border)" }}>
              <td className="py-3 px-3 font-medium" style={{ color: "var(--theme-text-primary)" }}>{(p.student_name as string) || (p.user_name as string) || "—"}</td>
              <td className="py-3 px-3 font-medium" style={{ color: "var(--theme-text-primary)" }}>{formatCurrency((p.amount as number) || 0)}</td>
              <td className="py-3 px-3" style={{ color: "var(--theme-text-secondary)" }}>{(p.method as string) || (p.provider as string) || "—"}</td>
              <td className="py-3 px-3">
                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${p.status === "completed" || p.status === "paid" ? "bg-green-100 text-green-600" : p.status === "failed" ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-600"}`}>
                  {p.status === "completed" || p.status === "paid" ? "مكتمل" : p.status === "pending" ? "قيد الانتظار" : p.status === "failed" ? "فشل" : (p.status as string) || "—"}
                </span>
              </td>
              <td className="py-3 px-3" style={{ color: "var(--theme-text-secondary)" }}>{formatDate(p.created_at as string)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════ TAB 7: Themes ═══════════ */
function ThemesTab() {
  const [themes, setThemes] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activating, setActivating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const r = await adminAPI("get_themes"); setThemes(Array.isArray(r) ? r : r.themes || []); } catch (e: unknown) { setError(e instanceof Error ? e.message : "خطأ"); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const activate = async (id: string, slug: string) => {
    setActivating(id);
    try {
      await adminAPI("update_theme", { theme_id: id, is_active: true });
      // Apply theme locally on the site immediately
      const root = document.documentElement;
      if (slug === "default") {
        root.removeAttribute("data-theme");
      } else {
        root.setAttribute("data-theme", slug);
      }
      // Also update localStorage so it persists
      try {
        const stored = localStorage.getItem("manhaj-ui");
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.state = { ...parsed.state, theme: slug };
          localStorage.setItem("manhaj-ui", JSON.stringify(parsed));
        }
      } catch { /* ignore */ }
      load();
    } catch { load(); }
    setActivating(null);
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (themes.length === 0) return <EmptyState message="لا توجد ثيمات" icon={<Palette size={40} />} />;

  const themeEmojis: Record<string, string> = { default: "🔵", golden: "✨", exams: "🔴", graduation: "🎓", dark: "🌑" };

  return (
    <div>
      <h3 className="text-lg font-bold mb-4" style={{ color: "var(--theme-text-primary)" }}>🎨 إدارة الثيمات</h3>
      <p className="text-sm mb-4" style={{ color: "var(--theme-text-secondary)" }}>اختر الثيم النشط — التغيير يظهر فوراً على الموقع لكل الطلاب</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {themes.map((t, i) => {
          const cfg = t.config as Record<string, string> | null;
          const slug = (t.slug as string) || "default";
          const isActive = !!t.is_active;
          const isLoading = activating === (t.id as string);
          return (
            <div key={i} className="rounded-2xl p-4 relative overflow-hidden transition-all duration-300" style={{ 
              background: "var(--theme-surface-bg)", 
              border: `2px solid ${isActive ? "var(--theme-primary)" : "var(--theme-surface-border)"}`,
              opacity: isLoading ? 0.7 : 1
            }}>
              {isActive && (
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-lg text-xs font-bold bg-green-100 text-green-700 flex items-center gap-1">
                  <CheckCircle size={12} /> نشط
                </span>
              )}
              {/* Theme topbar gradient preview */}
              <div className="h-8 rounded-lg mb-3 -mx-1 -mt-1" style={{ background: cfg?.topbarGradient || "var(--theme-cta-gradient)" }} />
              
              {/* Color circles */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-full border-2 border-white shadow" style={{ background: cfg?.primary || "var(--theme-primary)" }} />
                <div className="w-7 h-7 rounded-full border-2 border-white shadow" style={{ background: cfg?.secondary || "var(--theme-secondary)" }} />
                <div className="w-5 h-5 rounded-full border border-white shadow" style={{ background: cfg?.pageBg || "#F9FAFB" }} />
              </div>

              <h4 className="font-bold text-base mb-1" style={{ color: "var(--theme-text-primary)" }}>
                {themeEmojis[slug] || "🎨"} {(t.name_ar as string) || "—"}
              </h4>
              <p className="text-xs mb-3" style={{ color: "var(--theme-text-muted)" }}>
                {slug === "default" ? "الثيم الأساسي — أزرق وبنفسجي" :
                 slug === "golden" ? "ثيم ذهبي فاخر — أخضر وذهبي" :
                 slug === "exams" ? "وضع الامتحانات — أحمر وبرتقالي" :
                 slug === "graduation" ? "ثيم التخرج — أخضر احتفالي" :
                 slug === "dark" ? "الوضع الداكن — نيلي أنيق" : ""}
              </p>
              
              {!isActive ? (
                <button 
                  onClick={() => activate(t.id as string, slug)} 
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02]" 
                  style={{ background: cfg?.topbarGradient || "var(--theme-cta-gradient)" }}>
                  {isLoading ? <><Loader2 size={16} className="animate-spin" /> جاري التفعيل...</> : <><Palette size={16} /> تفعيل هذا الثيم</>}
                </button>
              ) : (
                <div className="w-full py-2.5 rounded-xl text-sm font-bold text-center" style={{ background: "var(--theme-hover-overlay)", color: "var(--theme-primary)" }}>
                  ✅ الثيم الحالي
                </div>
              )}

              {(t.auto_activate_at || t.auto_deactivate_at) && (
                <p className="text-xs mt-2 flex items-center gap-1" style={{ color: "var(--theme-text-muted)" }}>
                  <Clock size={12} /> مجدول: {t.auto_activate_at ? formatDate(t.auto_activate_at as string) : ""} {t.auto_deactivate_at ? `→ ${formatDate(t.auto_deactivate_at as string)}` : ""}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════ TAB 8: Coupons ═══════════ */
function CouponsTab() {
  const [coupons, setCoupons] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editItem, setEditItem] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState({ code: "", discount_percent: "", max_uses: "", valid_until: "", description_ar: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const r = await adminAPI("get_coupons"); setCoupons(Array.isArray(r) ? r : r.coupons || []); } catch (e: unknown) { setError(e instanceof Error ? e.message : "خطأ"); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm({ code: "", discount_percent: "", max_uses: "", valid_until: "", description_ar: "" }); setEditItem(null); setModal("create"); };
  const openEdit = (c: Record<string, unknown>) => {
    setForm({
      code: (c.code as string) || "",
      discount_percent: String(c.discount_percent || ""),
      max_uses: String(c.max_uses || ""),
      valid_until: (c.valid_until as string)?.slice(0, 10) || "",
      description_ar: (c.description_ar as string) || "",
    });
    setEditItem(c); setModal("edit");
  };

  const handleSave = async () => {
    if (!form.code.trim()) { alert("كود الخصم مطلوب"); return; }
    if (!form.discount_percent || Number(form.discount_percent) <= 0) { alert("نسبة الخصم مطلوبة"); return; }
    setSaving(true);
    try {
      const params = {
        code: form.code.trim(),
        discount_percent: Number(form.discount_percent),
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        valid_until: form.valid_until || null,
        description_ar: form.description_ar.trim() || null,
      };
      if (modal === "create") await adminAPI("create_coupon", params);
      else await adminAPI("update_coupon", { coupon_id: editItem?.id, ...params });
      setModal(null); load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "خطأ"); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الكوبون؟")) return;
    try { await adminAPI("delete_coupon", { coupon_id: id }); load(); } catch { load(); }
  };

  const toggleActive = async (c: Record<string, unknown>) => {
    try {
      await adminAPI("update_coupon", { coupon_id: c.id, is_active: !(c.is_active as boolean) });
      load();
    } catch { load(); }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold" style={{ color: "var(--theme-text-primary)" }}>الكوبونات ({coupons.length})</h3>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium" style={{ background: "var(--theme-cta-gradient)" }}>
          <Plus size={16} /> إضافة كوبون
        </button>
      </div>

      {coupons.length === 0 ? <EmptyState message="لا توجد كوبونات" icon={<Tag size={40} />} /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "2px solid var(--theme-surface-border)" }}>
                {["الكود", "الخصم", "الوصف", "الاستخدامات", "الحالة", "ينتهي", "إجراءات"].map(h => (
                  <th key={h} className="text-right py-3 px-3 font-medium" style={{ color: "var(--theme-text-secondary)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coupons.map((c, i) => {
                const isActive = c.is_active !== false;
                const isExpired = c.valid_until && new Date(c.valid_until as string) < new Date();
                const usedUp = c.max_uses && (c.used_count as number || 0) >= (c.max_uses as number);
                return (
                  <tr key={i} style={{ borderBottom: "1px solid var(--theme-surface-border)", opacity: isActive && !isExpired && !usedUp ? 1 : 0.5 }}>
                    <td className="py-3 px-3 font-mono font-bold" style={{ color: "var(--theme-primary)", letterSpacing: "1px" }}>{(c.code as string) || "—"}</td>
                    <td className="py-3 px-3 font-bold" style={{ color: "#10B981" }}>{c.discount_percent as number}%</td>
                    <td className="py-3 px-3 text-xs" style={{ color: "var(--theme-text-secondary)" }}>{(c.description_ar as string) || "—"}</td>
                    <td className="py-3 px-3" style={{ color: "var(--theme-text-secondary)" }}>{(c.used_count as number) || 0} / {(c.max_uses as number) || "∞"}</td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => toggleActive(c)}
                        className="px-2 py-1 rounded-lg text-xs font-bold"
                        style={{
                          background: isActive ? "#10B98120" : "#EF444420",
                          color: isActive ? "#10B981" : "#EF4444",
                        }}
                      >
                        {isActive ? "نشط ✅" : "متوقف ❌"}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-xs" style={{ color: isExpired ? "#EF4444" : "var(--theme-text-secondary)" }}>
                      {c.valid_until ? (isExpired ? "منتهي ⏰" : formatDate(c.valid_until as string)) : "بدون حد"}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: "var(--theme-primary)" }}><Edit size={16} /></button>
                        <button onClick={() => handleDelete(c.id as string)} className="p-1.5 rounded-lg hover:opacity-70 text-red-500"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === "create" ? "إضافة كوبون جديد" : "تعديل الكوبون"} onSave={handleSave} saving={saving}>
        <InputField label="كود الكوبون" value={form.code} onChange={v => setForm({ ...form, code: v })} placeholder="SAVE20" dir="ltr" />
        <InputField label="نسبة الخصم %" value={form.discount_percent} onChange={v => setForm({ ...form, discount_percent: v })} type="number" placeholder="مثال: 20" />
        <InputField label="وصف الكوبون" value={form.description_ar} onChange={v => setForm({ ...form, description_ar: v })} placeholder="خصم بداية العام الدراسي" />
        <InputField label="أقصى عدد استخدامات" value={form.max_uses} onChange={v => setForm({ ...form, max_uses: v })} type="number" placeholder="اتركه فارغاً لغير محدود" />
        <InputField label="تاريخ الانتهاء" value={form.valid_until} onChange={v => setForm({ ...form, valid_until: v })} type="date" />
      </Modal>
    </div>
  );
}

/* ═══════════ TAB 9: Notifications ═══════════ */
function NotificationsTab() {
  const [notifications, setNotifications] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", target: "all" });
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/admin/notifications", { credentials: "include" });
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : data.data || data.notifications || []);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "خطأ"); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSend = async () => {
    if (!form.title || !form.body) return;
    setSending(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "فشل في الإرسال");
      setShowCreate(false); setForm({ title: "", body: "", target: "all" }); load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "خطأ"); }
    setSending(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold" style={{ color: "var(--theme-text-primary)" }}>الإشعارات</h3>
        <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium" style={{ background: "var(--theme-cta-gradient)" }}>
          <Plus size={16} /> إرسال إشعار
        </button>
      </div>

      {showCreate && (
        <div className="rounded-2xl p-4 mb-4" style={{ background: "var(--theme-bg)", border: "1px solid var(--theme-surface-border)" }}>
          <InputField label="عنوان الإشعار" value={form.title} onChange={v => setForm({ ...form, title: v })} placeholder="عنوان الإشعار" />
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--theme-text-secondary)" }}>محتوى الإشعار</label>
            <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} rows={3} placeholder="اكتب محتوى الإشعار..."
              className="w-full px-3 py-2 rounded-xl outline-none text-sm resize-none" style={{ background: "var(--theme-surface-bg)", border: "1px solid var(--theme-surface-border)", color: "var(--theme-text-primary)" }} />
          </div>
          <SelectField label="الهدف" value={form.target} onChange={v => setForm({ ...form, target: v })} options={[{ value: "all", label: "جميع الطلاب" }, { value: "subscribed", label: "المشتركون فقط" }]} />
          <button onClick={handleSend} disabled={sending} className="w-full py-2 rounded-xl text-white font-medium flex items-center justify-center gap-2" style={{ background: "var(--theme-cta-gradient)" }}>
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} إرسال
          </button>
        </div>
      )}

      {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={load} /> : notifications.length === 0 ? <EmptyState message="لا توجد إشعارات" icon={<Bell size={40} />} /> : (
        <div className="space-y-3">
          {notifications.map((n, i) => (
            <div key={i} className="rounded-xl p-4" style={{ background: "var(--theme-bg)", border: "1px solid var(--theme-surface-border)" }}>
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-sm" style={{ color: "var(--theme-text-primary)" }}>{(n.title as string) || "—"}</h4>
                  <p className="text-xs mt-1" style={{ color: "var(--theme-text-secondary)" }}>{(n.body as string) || (n.message as string) || ""}</p>
                </div>
                <span className="text-xs whitespace-nowrap" style={{ color: "var(--theme-text-secondary)" }}>{formatDate(n.created_at as string)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════ TAB 10: Payment Config ═══════════ */
function PaymentConfigTab() {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const r = await adminAPI("get_payment_config"); setConfig(r || {}); } catch (e: unknown) { setError(e instanceof Error ? e.message : "خطأ"); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try { await adminAPI("update_payment_config", { config }); alert("تم حفظ الإعدادات"); } catch (e: unknown) { alert(e instanceof Error ? e.message : "خطأ"); }
    setSaving(false);
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const fields = [
    { key: "stripe_publishable_key", label: "Stripe Publishable Key" },
    { key: "stripe_secret_key", label: "Stripe Secret Key" },
    { key: "stripe_webhook_secret", label: "Stripe Webhook Secret" },
    { key: "paymob_api_key", label: "Paymob API Key" },
    { key: "paymob_integration_id", label: "Paymob Integration ID" },
    { key: "paymob_iframe_id", label: "Paymob iFrame ID" },
    { key: "paymob_hmac_secret", label: "Paymob HMAC Secret" },
  ];

  return (
    <div>
      <h3 className="font-bold mb-4" style={{ color: "var(--theme-text-primary)" }}>إعدادات بوابات الدفع</h3>
      <div className="space-y-1">
        {fields.map(f => (
          <InputField key={f.key} label={f.label} value={config[f.key] || ""} onChange={v => setConfig({ ...config, [f.key]: v })} placeholder={f.label} dir="ltr" />
        ))}
      </div>
      <button onClick={handleSave} disabled={saving} className="mt-4 w-full py-2.5 rounded-xl text-white font-medium flex items-center justify-center gap-2" style={{ background: "var(--theme-cta-gradient)" }}>
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} حفظ الإعدادات
      </button>
    </div>
  );
}

/* ═══════════ TAB 11: Plans ═══════════ */
function PlansTab() {
  const [plans, setPlans] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editItem, setEditItem] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState({ name: "", price: "", duration_days: "", description: "", features: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const r = await adminAPI("get_plans"); setPlans(Array.isArray(r) ? r : r.plans || []); } catch (e: unknown) { setError(e instanceof Error ? e.message : "خطأ"); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm({ name: "", price: "", duration_days: "", description: "", features: "" }); setEditItem(null); setModal("create"); };
  const openEdit = (p: Record<string, unknown>) => {
    setForm({
      name: (p.name_ar as string) || (p.name as string) || "", price: String(p.price_monthly || p.price || ""), duration_days: String(p.duration_days || p.duration || ""),
      description: (p.description as string) || "",
      features: Array.isArray(p.features) ? (p.features as string[]).join("\n") : (p.features as string) || "",
    });
    setEditItem(p); setModal("edit");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const params = { name_ar: form.name, price_monthly: Number(form.price), duration_days: Number(form.duration_days), features: form.features.split("\n").filter(Boolean) };
      if (modal === "create") await adminAPI("create_plan", params);
      else await adminAPI("update_plan", { plan_id: editItem?.id, ...params });
      setModal(null); load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "خطأ"); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الخطة؟")) return;
    try { await adminAPI("delete_plan", { plan_id: id }); load(); } catch { load(); }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold" style={{ color: "var(--theme-text-primary)" }}>خطط الاشتراك ({plans.length})</h3>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium" style={{ background: "var(--theme-cta-gradient)" }}>
          <Plus size={16} /> إضافة خطة
        </button>
      </div>

      {plans.length === 0 ? <EmptyState message="لا توجد خطط" icon={<Package size={40} />} /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((p, i) => (
            <div key={i} className="rounded-2xl p-4" style={{ background: "var(--theme-bg)", border: "1px solid var(--theme-surface-border)" }}>
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold" style={{ color: "var(--theme-text-primary)" }}>{(p.name_ar as string) || (p.name as string) || "—"}</h4>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: "var(--theme-primary)" }}><Edit size={14} /></button>
                  <button onClick={() => handleDelete(p.id as string)} className="p-1.5 rounded-lg hover:opacity-70 text-red-500"><Trash2 size={14} /></button>
                </div>
              </div>
              <p className="text-2xl font-bold mb-1" style={{ color: "var(--theme-primary)" }}>{formatCurrency((p.price_monthly as number) || (p.price as number) || 0)}</p>
              <p className="text-xs mb-2" style={{ color: "var(--theme-text-secondary)" }}>{(p.duration_days as number) || (p.duration as number) || 30} يوم</p>
              {p.description && <p className="text-xs mb-2" style={{ color: "var(--theme-text-secondary)" }}>{p.description as string}</p>}
              {Array.isArray(p.features) && (p.features as string[]).length > 0 && (
                <ul className="space-y-1">
                  {(p.features as string[]).map((f: string, j: number) => (
                    <li key={j} className="flex items-center gap-1 text-xs" style={{ color: "var(--theme-text-secondary)" }}>
                      <CheckCircle size={12} className="text-green-500 flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === "create" ? "إضافة خطة جديدة" : "تعديل الخطة"} onSave={handleSave} saving={saving}>
        <InputField label="اسم الخطة" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="مثال: الخطة الشهرية" />
        <InputField label="السعر (ج.م)" value={form.price} onChange={v => setForm({ ...form, price: v })} type="number" placeholder="99" />
        <InputField label="المدة (بالأيام)" value={form.duration_days} onChange={v => setForm({ ...form, duration_days: v })} type="number" placeholder="30" />
        <InputField label="الوصف" value={form.description} onChange={v => setForm({ ...form, description: v })} placeholder="وصف الخطة" />
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--theme-text-secondary)" }}>المميزات (سطر لكل ميزة)</label>
          <textarea value={form.features} onChange={e => setForm({ ...form, features: e.target.value })} rows={4} placeholder="وصول لجميع المواد&#10;امتحانات غير محدودة&#10;دعم فني"
            className="w-full px-3 py-2 rounded-xl outline-none text-sm resize-none" style={{ background: "var(--theme-bg)", border: "1px solid var(--theme-surface-border)", color: "var(--theme-text-primary)" }} />
        </div>
      </Modal>
    </div>
  );
}

/* ═══════════ TAB: Profitability 💰 ═══════════ */
function ProfitabilityTab() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setData(await adminAPI("profitability")); } catch (e: unknown) { setError(e instanceof Error ? e.message : "خطأ"); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <EmptyState message="لا توجد بيانات مالية بعد" icon={<TrendingUp size={40} />} />;

  const summary = (data.summary || {}) as Record<string, number>;
  const topProfit = (data.top_profitable || []) as Record<string, unknown>[];
  const topCost = (data.top_costly || []) as Record<string, unknown>[];
  const monthly = (data.monthly_breakdown || []) as Record<string, unknown>[];

  const profitMargin = summary.total_revenue > 0 ? ((summary.net_profit / summary.total_revenue) * 100).toFixed(1) : "0";
  const maxMonthly = Math.max(...monthly.map(m => (m.revenue as number) || 0), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg" style={{ color: "var(--theme-text-primary)" }}>💰 تحليل الأرباح والتكاليف</h3>
        <button onClick={load} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm" style={{ background: "var(--theme-bg)", border: "1px solid var(--theme-surface-border)", color: "var(--theme-text-secondary)" }}>
          <RefreshCw size={14} /> تحديث
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "إجمالي الإيرادات", value: formatCurrency(summary.total_revenue || 0), icon: "💵", color: "#10B981", bg: "#10B98115" },
          { label: "إجمالي التكاليف", value: formatCurrency(summary.total_costs || 0), icon: "💸", color: "#EF4444", bg: "#EF444415" },
          { label: "صافي الربح", value: formatCurrency(summary.net_profit || 0), icon: "📈", color: (summary.net_profit || 0) >= 0 ? "#10B981" : "#EF4444", bg: (summary.net_profit || 0) >= 0 ? "#10B98115" : "#EF444415" },
          { label: "هامش الربح", value: `${profitMargin}%`, icon: "🎯", color: "#6366F1", bg: "#6366F115" },
        ].map((card, i) => (
          <div key={i} className="rounded-2xl p-4" style={{ background: card.bg, border: `1px solid ${card.color}30` }}>
            <div className="text-2xl mb-2">{card.icon}</div>
            <p className="text-2xl font-bold" style={{ color: card.color }}>{card.value}</p>
            <p className="text-xs mt-1 font-medium" style={{ color: "var(--theme-text-secondary)" }}>{card.label}</p>
          </div>
        ))}
      </div>

      {/* Cost Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "تكلفة AI (شات)", value: formatCurrency(summary.ai_cost || 0), icon: "🤖", desc: `${summary.total_messages || 0} رسالة` },
          { label: "تكلفة SMS", value: formatCurrency(summary.sms_cost || 0), icon: "📱", desc: `${summary.total_sms || 0} رسالة` },
          { label: "تكلفة البنية", value: formatCurrency(summary.infra_cost || 0), icon: "🏗️", desc: "Railway + Supabase" },
        ].map((item, i) => (
          <div key={i} className="rounded-xl p-4" style={{ background: "var(--theme-surface-bg)", border: "1px solid var(--theme-surface-border)" }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{item.icon}</span>
              <span className="font-bold text-sm" style={{ color: "var(--theme-text-primary)" }}>{item.label}</span>
            </div>
            <p className="text-xl font-bold" style={{ color: "#EF4444" }}>{item.value}</p>
            <p className="text-xs mt-1" style={{ color: "var(--theme-text-secondary)" }}>{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Monthly Revenue vs Cost Chart */}
      {monthly.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: "var(--theme-surface-bg)", border: "1px solid var(--theme-surface-border)" }}>
          <h4 className="font-bold mb-4" style={{ color: "var(--theme-text-primary)" }}>📊 الإيرادات مقابل التكاليف (شهرياً)</h4>
          <div className="flex items-end gap-3 h-40">
            {monthly.map((m, i) => {
              const rev = (m.revenue as number) || 0;
              const cost = (m.cost as number) || 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="flex items-end gap-0.5 w-full justify-center" style={{ height: "120px" }}>
                    <div className="w-[45%] rounded-t-md" style={{ height: `${Math.max((rev / maxMonthly) * 100, 4)}%`, background: "#10B981" }} title={`إيرادات: ${rev} ج.م`} />
                    <div className="w-[45%] rounded-t-md" style={{ height: `${Math.max((cost / maxMonthly) * 100, 4)}%`, background: "#EF4444" }} title={`تكاليف: ${cost} ج.م`} />
                  </div>
                  <span className="text-[10px] font-medium" style={{ color: "var(--theme-text-secondary)" }}>{(m.month as string)?.slice(5) || ""}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 justify-center">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{ background: "#10B981" }} /><span className="text-xs" style={{ color: "var(--theme-text-secondary)" }}>إيرادات</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{ background: "#EF4444" }} /><span className="text-xs" style={{ color: "var(--theme-text-secondary)" }}>تكاليف</span></div>
          </div>
        </div>
      )}

      {/* Top Profitable Students */}
      {topProfit.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: "var(--theme-surface-bg)", border: "1px solid var(--theme-surface-border)" }}>
          <h4 className="font-bold mb-3" style={{ color: "var(--theme-text-primary)" }}>🏆 أكثر 10 طلاب ربحية</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "2px solid var(--theme-surface-border)" }}>
                  {["#", "الطالب", "الإيرادات", "التكلفة", "صافي الربح"].map(h => (
                    <th key={h} className="text-right py-2 px-3 font-medium text-xs" style={{ color: "var(--theme-text-secondary)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topProfit.map((s, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--theme-surface-border)" }}>
                    <td className="py-2 px-3">
                      <span className="text-sm">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}</span>
                    </td>
                    <td className="py-2 px-3 font-medium" style={{ color: "var(--theme-text-primary)" }}>{(s.full_name as string) || "—"}</td>
                    <td className="py-2 px-3 font-medium" style={{ color: "#10B981" }}>{formatCurrency((s.revenue as number) || 0)}</td>
                    <td className="py-2 px-3" style={{ color: "#EF4444" }}>{formatCurrency((s.cost as number) || 0)}</td>
                    <td className="py-2 px-3 font-bold" style={{ color: ((s.profit as number) || 0) >= 0 ? "#10B981" : "#EF4444" }}>
                      {formatCurrency((s.profit as number) || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Costly Students */}
      {topCost.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: "var(--theme-surface-bg)", border: "1px solid var(--theme-surface-border)" }}>
          <h4 className="font-bold mb-3" style={{ color: "var(--theme-text-primary)" }}>💣 أكثر 10 طلاب تكلفة (AI)</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "2px solid var(--theme-surface-border)" }}>
                  {["#", "الطالب", "الرسائل", "التوكنز", "التكلفة"].map(h => (
                    <th key={h} className="text-right py-2 px-3 font-medium text-xs" style={{ color: "var(--theme-text-secondary)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topCost.map((s, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--theme-surface-border)" }}>
                    <td className="py-2 px-3 text-sm">{i + 1}</td>
                    <td className="py-2 px-3 font-medium" style={{ color: "var(--theme-text-primary)" }}>{(s.full_name as string) || "—"}</td>
                    <td className="py-2 px-3" style={{ color: "var(--theme-text-secondary)" }}>{(s.messages as number) || 0}</td>
                    <td className="py-2 px-3" dir="ltr" style={{ color: "var(--theme-text-secondary)" }}>{((s.tokens as number) || 0).toLocaleString()}</td>
                    <td className="py-2 px-3 font-bold" style={{ color: "#EF4444" }}>{formatCurrency((s.cost as number) || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="rounded-xl p-4" style={{ background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.2)" }}>
        <h4 className="font-bold text-sm mb-2" style={{ color: "var(--theme-primary)" }}>💡 نصائح لزيادة الأرباح</h4>
        <ul className="space-y-1.5 text-xs" style={{ color: "var(--theme-text-secondary)" }}>
          <li>• أسعار AI قابلة للتعديل من تاب 🔑 المفاتيح: (<code dir="ltr">AI_INPUT_COST_PER_1M</code> / <code dir="ltr">AI_OUTPUT_COST_PER_1M</code>)</li>
          <li>• استخدام <strong>claude-sonnet</strong> بدل <strong>claude-opus</strong> في الشات يقلل التكلفة ~80%</li>
          <li>• تقليل <code dir="ltr">AI_DAILY_LIMIT</code> يحد استهلاك الطلاب للشات</li>
          <li>• سعر صرف الدولار يتحدّث من: <code dir="ltr">USD_TO_EGP_RATE</code></li>
        </ul>
      </div>
    </div>
  );
}

/* ═══════════ TAB 12: Secrets ═══════════ */
/* ═══════════ TAB: Analytics ═══════════ */
function AnalyticsTab() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/admin/analytics", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setData(json.data);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "خطأ"); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const exportCSV = async () => {
    try {
      const res = await fetch("/api/admin/export", { credentials: "include" });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `manhaj-report-${new Date().toISOString().slice(0,10)}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <EmptyState message="لا توجد بيانات" icon={<BarChart3 size={40} />} />;

  const ov = (data.overview || {}) as Record<string, number>;
  const govData = (data.governorate_distribution || []) as { name: string; count: number }[];
  const monthlyRegs = (data.monthly_registrations || []) as { month: string; count: number }[];
  const subjectPop = (data.subject_popularity || []) as { name: string; exams: number }[];
  const maxReg = Math.max(...monthlyRegs.map(m => m.count), 1);
  const maxExam = Math.max(...subjectPop.map(s => s.exams), 1);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-lg" style={{ color: "var(--theme-text-primary)" }}>📈 التحليلات والإحصائيات</h3>
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium" style={{ background: "var(--theme-cta-gradient)" }}>
          📥 تصدير Excel
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {[
          { label: "إجمالي الطلاب", value: ov.total_students || 0, icon: "👥" },
          { label: "اشتراكات نشطة", value: ov.active_subscriptions || 0, icon: "✅" },
          { label: "تجريبية", value: ov.trial_subscriptions || 0, icon: "🔄" },
          { label: "منتهية", value: ov.expired_subscriptions || 0, icon: "⏰" },
          { label: "الإيرادات الشهرية", value: `${ov.monthly_revenue || 0} ج.م`, icon: "💰" },
          { label: "إجمالي الإيرادات", value: `${ov.total_revenue || 0} ج.م`, icon: "💎" },
          { label: "الامتحانات", value: ov.total_exams || 0, icon: "📝" },
          { label: "متوسط الدرجات", value: `${ov.avg_score || 0}%`, icon: "🎯" },
          { label: "رسائل AI", value: ov.total_messages || 0, icon: "🤖" },
          { label: "جدد هذا الأسبوع", value: ov.new_this_week || 0, icon: "🆕" },
          { label: "معرضين للخسارة", value: ov.at_risk || 0, icon: "⚠️" },
        ].map((card, i) => (
          <div key={i} className="rounded-xl p-3 text-center" style={{ background: "var(--theme-surface-bg)", border: "1px solid var(--theme-surface-border)" }}>
            <div className="text-2xl mb-1">{card.icon}</div>
            <p className="text-lg font-bold" style={{ color: "var(--theme-primary)" }}>{card.value}</p>
            <p className="text-xs" style={{ color: "var(--theme-text-secondary)" }}>{card.label}</p>
          </div>
        ))}
      </div>

      {/* Monthly Registrations Chart */}
      <div className="rounded-xl p-4" style={{ background: "var(--theme-surface-bg)", border: "1px solid var(--theme-surface-border)" }}>
        <h4 className="font-bold mb-3" style={{ color: "var(--theme-text-primary)" }}>📊 التسجيلات الشهرية</h4>
        <div className="flex items-end gap-2 h-32">
          {monthlyRegs.map((m, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs font-bold" style={{ color: "var(--theme-primary)" }}>{m.count}</span>
              <div className="w-full rounded-t-lg" style={{ height: `${Math.max((m.count / maxReg) * 100, 4)}%`, background: "var(--theme-cta-gradient)" }} />
              <span className="text-[10px]" style={{ color: "var(--theme-text-secondary)" }}>{m.month.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Subject Popularity */}
      <div className="rounded-xl p-4" style={{ background: "var(--theme-surface-bg)", border: "1px solid var(--theme-surface-border)" }}>
        <h4 className="font-bold mb-3" style={{ color: "var(--theme-text-primary)" }}>📚 المواد الأكثر شعبية (حسب الامتحانات)</h4>
        <div className="space-y-2">
          {subjectPop.slice(0, 8).map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-sm w-24 truncate" style={{ color: "var(--theme-text-primary)" }}>{s.name}</span>
              <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ background: "var(--theme-bg)" }}>
                <div className="h-full rounded-full" style={{ width: `${Math.max((s.exams / maxExam) * 100, 2)}%`, background: "var(--theme-cta-gradient)" }} />
              </div>
              <span className="text-xs font-bold w-8" style={{ color: "var(--theme-primary)" }}>{s.exams}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Governorate Map */}
      <div className="rounded-xl p-4" style={{ background: "var(--theme-surface-bg)", border: "1px solid var(--theme-surface-border)" }}>
        <h4 className="font-bold mb-3" style={{ color: "var(--theme-text-primary)" }}>🗺️ توزيع الطلاب حسب المحافظات</h4>
        {govData.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: "var(--theme-text-secondary)" }}>لا توجد بيانات</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {govData.map((g, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: "var(--theme-bg)" }}>
                <span className="text-sm" style={{ color: "var(--theme-text-primary)" }}>{g.name}</span>
                <span className="text-sm font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--theme-primary)", color: "white" }}>{g.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SecretsTab() {
  const [secrets, setSecrets] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [addMode, setAddMode] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const categories: Record<string, { label: string; icon: string; keys: string[] }> = {
    ai: { label: "🤖 الذكاء الاصطناعي", icon: "🤖", keys: ["anthropic_api_key", "AI_MODEL", "AI_CONTENT_MODEL", "AI_DAILY_LIMIT", "AI_MONTHLY_LIMIT"] },
    payments: { label: "💳 المدفوعات", icon: "💳", keys: ["STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY", "STRIPE_WEBHOOK_SECRET", "PAYMOB_API_KEY", "PAYMOB_HMAC_SECRET", "PAYMOB_IFRAME_ID", "PAYMOB_VODAFONE_INTEGRATION_ID", "PAYMOB_INSTAPAY_INTEGRATION_ID", "PAYMOB_FAWRY_INTEGRATION_ID"] },
    auth: { label: "🔐 الأمان والمصادقة", icon: "🔐", keys: ["jwt_secret", "FIREBASE_API_KEY", "FIREBASE_PROJECT_ID", "SMS_PROVIDER"] },
    site: { label: "🌐 إعدادات الموقع", icon: "🌐", keys: ["APP_URL", "SUPABASE_URL", "SUPABASE_ANON_KEY", "TRIAL_DAYS", "MAX_FILE_SIZE_MB", "WATERMARK_FONT_SIZE"] },
    messaging: { label: "📧 التواصل والإشعارات", icon: "📧", keys: ["RESEND_API_KEY", "whatsapp_access_token", "whatsapp_phone_number_id"] },
  };

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const r = await adminAPI("get_secrets"); setSecrets(Array.isArray(r) ? r : r.secrets || []); } catch (e: unknown) { setError(e instanceof Error ? e.message : "خطأ"); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (key: string) => {
    setSaving(true);
    try { await adminAPI("update_secret", { key, value: editValue }); setEditKey(null); load(); } catch (e: unknown) { alert(e instanceof Error ? e.message : "خطأ"); }
    setSaving(false);
  };

  const handleAdd = async () => {
    if (!newKey.trim()) return;
    setSaving(true);
    try { await adminAPI("update_secret", { key: newKey.trim(), value: newValue, description: newDesc }); setAddMode(false); setNewKey(""); setNewValue(""); setNewDesc(""); load(); } catch (e: unknown) { alert(e instanceof Error ? e.message : "خطأ"); }
    setSaving(false);
  };

  const getSecretByKey = (k: string) => secrets.find(s => (s.key as string) === k);
  const categorizedKeys = new Set(Object.values(categories).flatMap(c => c.keys));
  const uncategorized = secrets.filter(s => !categorizedKeys.has(s.key as string));

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const totalKeys = secrets.length;
  const filledKeys = secrets.filter(s => !!(s.value as string)).length;
  const emptyKeys = totalKeys - filledKeys;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg" style={{ color: "var(--theme-text-primary)" }}>🔑 مفاتيح النظام</h3>
        <button onClick={() => setAddMode(!addMode)} className="px-3 py-1.5 rounded-lg text-xs text-white font-medium" style={{ background: "var(--theme-cta-gradient)" }}>
          {addMode ? "إلغاء" : "+ إضافة مفتاح"}
        </button>
      </div>

      {/* Stats bar */}
      <div className="flex gap-3 mb-4">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "var(--theme-surface-bg)", color: "var(--theme-text-primary)" }}>
          📊 الإجمالي: {totalKeys}
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>
          ✅ نشط: {filledKeys}
        </div>
        {emptyKeys > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
            ⚠️ فارغ: {emptyKeys}
          </div>
        )}
      </div>

      {/* Add new key form */}
      {addMode && (
        <div className="rounded-xl p-4 mb-4" style={{ background: "var(--theme-surface-bg)", border: "2px dashed var(--theme-primary)" }}>
          <p className="text-sm font-medium mb-3" style={{ color: "var(--theme-text-primary)" }}>إضافة مفتاح جديد</p>
          <div className="grid grid-cols-1 gap-2 mb-3">
            <input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="اسم المفتاح (مثل: NEW_API_KEY)" dir="ltr"
              className="w-full px-3 py-2 rounded-lg outline-none text-sm font-mono" style={{ background: "var(--theme-page-bg)", border: "1px solid var(--theme-surface-border)", color: "var(--theme-text-primary)" }} />
            <input value={newValue} onChange={e => setNewValue(e.target.value)} placeholder="القيمة" dir="ltr"
              className="w-full px-3 py-2 rounded-lg outline-none text-sm font-mono" style={{ background: "var(--theme-page-bg)", border: "1px solid var(--theme-surface-border)", color: "var(--theme-text-primary)" }} />
            <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="وصف المفتاح (اختياري)"
              className="w-full px-3 py-2 rounded-lg outline-none text-sm" style={{ background: "var(--theme-page-bg)", border: "1px solid var(--theme-surface-border)", color: "var(--theme-text-primary)" }} />
          </div>
          <button onClick={handleAdd} disabled={saving || !newKey.trim()} className="px-4 py-2 rounded-lg text-sm text-white font-medium disabled:opacity-50" style={{ background: "var(--theme-cta-gradient)" }}>
            {saving ? "جاري الحفظ..." : "حفظ المفتاح"}
          </button>
        </div>
      )}

      {/* Grouped secrets */}
      <div className="space-y-5">
        {Object.entries(categories).map(([catId, cat]) => {
          const catSecrets = cat.keys.map(k => getSecretByKey(k)).filter(Boolean) as Record<string, unknown>[];
          if (catSecrets.length === 0) return null;
          const catFilled = catSecrets.filter(s => !!(s.value as string)).length;
          return (
            <div key={catId}>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-bold text-sm" style={{ color: "var(--theme-text-primary)" }}>{cat.label}</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: catFilled === catSecrets.length ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", color: catFilled === catSecrets.length ? "#22c55e" : "#ef4444" }}>
                  {catFilled}/{catSecrets.length}
                </span>
              </div>
              <div className="space-y-2">
                {catSecrets.map((s, i) => {
                  const key = s.key as string;
                  const val = s.value as string;
                  const desc = s.description as string;
                  const isEditing = editKey === key;
                  const isVisible = showValues[key];
                  const isEmpty = !val;
                  const isRef = desc?.includes("مرجع فقط");
                  return (
                    <div key={i} className="rounded-xl p-3" style={{ background: "var(--theme-page-bg)", border: `1px solid ${isEmpty ? "rgba(239,68,68,0.3)" : "var(--theme-surface-border)"}` }}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isEmpty ? "bg-red-400" : "bg-green-400"}`}></span>
                          <span className="font-mono text-xs font-medium" dir="ltr" style={{ color: "var(--theme-text-primary)" }}>{key}</span>
                          {isRef && <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-600">مرجع</span>}
                        </div>
                        <div className="flex gap-1">
                          {!isEditing && val && (
                            <button onClick={() => setShowValues(p => ({ ...p, [key]: !p[key] }))} className="p-1 rounded hover:opacity-70" style={{ color: "var(--theme-text-secondary)" }}>
                              {isVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                          )}
                          {isEditing ? (
                            <div className="flex gap-1">
                              <button onClick={() => handleSave(key)} disabled={saving} className="px-2.5 py-1 rounded-lg text-xs text-white font-medium" style={{ background: "var(--theme-cta-gradient)" }}>
                                {saving ? <Loader2 size={11} className="animate-spin" /> : "حفظ"}
                              </button>
                              <button onClick={() => setEditKey(null)} className="px-2 py-1 rounded-lg text-xs" style={{ color: "var(--theme-text-secondary)" }}>✕</button>
                            </div>
                          ) : (
                            <button onClick={() => { setEditKey(key); setEditValue(val || ""); }} className="p-1 rounded hover:opacity-70" style={{ color: "var(--theme-primary)" }}>
                              <Edit size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                      {isEditing ? (
                        <input value={editValue} onChange={e => setEditValue(e.target.value)} dir="ltr" autoFocus
                          className="w-full px-3 py-2 rounded-lg outline-none text-xs font-mono mt-1" style={{ background: "var(--theme-surface-bg)", border: "1px solid var(--theme-surface-border)", color: "var(--theme-text-primary)" }} />
                      ) : (
                        <p className="text-[11px] font-mono mr-4" dir="ltr" style={{ color: "var(--theme-text-secondary)" }}>
                          {isEmpty ? <span className="text-red-400">(فارغ — يحتاج تعيين)</span> : isVisible ? val : "•".repeat(Math.min(val.length, 30))}
                        </p>
                      )}
                      {desc && <p className="text-[11px] mt-1" style={{ color: "var(--theme-text-secondary)", opacity: 0.7 }}>{desc}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Uncategorized */}
        {uncategorized.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-bold text-sm" style={{ color: "var(--theme-text-primary)" }}>📦 أخرى</span>
            </div>
            <div className="space-y-2">
              {uncategorized.map((s, i) => {
                const key = s.key as string;
                const val = s.value as string;
                const desc = s.description as string;
                const isEditing = editKey === key;
                const isEmpty = !val;
                return (
                  <div key={i} className="rounded-xl p-3" style={{ background: "var(--theme-page-bg)", border: `1px solid ${isEmpty ? "rgba(239,68,68,0.3)" : "var(--theme-surface-border)"}` }}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isEmpty ? "bg-red-400" : "bg-green-400"}`}></span>
                        <span className="font-mono text-xs font-medium" dir="ltr" style={{ color: "var(--theme-text-primary)" }}>{key}</span>
                      </div>
                      {isEditing ? (
                        <div className="flex gap-1">
                          <button onClick={() => handleSave(key)} disabled={saving} className="px-2.5 py-1 rounded-lg text-xs text-white font-medium" style={{ background: "var(--theme-cta-gradient)" }}>
                            {saving ? <Loader2 size={11} className="animate-spin" /> : "حفظ"}
                          </button>
                          <button onClick={() => setEditKey(null)} className="px-2 py-1 rounded-lg text-xs" style={{ color: "var(--theme-text-secondary)" }}>✕</button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditKey(key); setEditValue(val || ""); }} className="p-1 rounded hover:opacity-70" style={{ color: "var(--theme-primary)" }}>
                          <Edit size={13} />
                        </button>
                      )}
                    </div>
                    {isEditing ? (
                      <input value={editValue} onChange={e => setEditValue(e.target.value)} dir="ltr" autoFocus
                        className="w-full px-3 py-2 rounded-lg outline-none text-xs font-mono mt-1" style={{ background: "var(--theme-surface-bg)", border: "1px solid var(--theme-surface-border)", color: "var(--theme-text-primary)" }} />
                    ) : (
                      <p className="text-[11px] font-mono mr-4" dir="ltr" style={{ color: "var(--theme-text-secondary)" }}>{isEmpty ? <span className="text-red-400">(فارغ)</span> : "•".repeat(Math.min((val || "").length, 30))}</p>
                    )}
                    {desc && <p className="text-[11px] mt-1" style={{ color: "var(--theme-text-secondary)", opacity: 0.7 }}>{desc}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════ TAB 13: Settings ═══════════ */
function SettingsTab() {
  const [settings, setSettings] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const r = await adminAPI("get_settings"); setSettings(Array.isArray(r) ? r : r.settings || []); } catch (e: unknown) { setError(e instanceof Error ? e.message : "خطأ"); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (key: string) => {
    setSaving(true);
    try { await adminAPI("update_setting", { key, value: editValue }); setEditKey(null); load(); } catch (e: unknown) { alert(e instanceof Error ? e.message : "خطأ"); }
    setSaving(false);
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (settings.length === 0) return <EmptyState message="لا توجد إعدادات" icon={<Settings size={40} />} />;

  return (
    <div>
      <h3 className="font-bold mb-4" style={{ color: "var(--theme-text-primary)" }}>إعدادات الموقع</h3>
      <div className="space-y-3">
        {settings.map((s, i) => {
          const key = (s.key as string) || (s.name as string) || "";
          const rawValue = s.value;
          const val = typeof rawValue === 'object' && rawValue !== null 
            ? JSON.stringify(rawValue, null, 2) 
            : String(rawValue ?? '');
          const isEditing = editKey === key;
          const isBool = rawValue === true || rawValue === false || val === "true" || val === "false";
          const boolChecked = rawValue === true || val === "true";
          return (
            <div key={i} className="rounded-xl p-4 flex items-center justify-between gap-4" style={{ background: "var(--theme-page-bg)", border: "1px solid var(--theme-surface-border)" }}>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm" style={{ color: "var(--theme-text-primary)" }}>{(s.label as string) || key}</p>
                {s.description && <p className="text-xs mt-0.5" style={{ color: "var(--theme-text-secondary)" }}>{s.description as string}</p>}
                {isEditing && !isBool && (
                  <input value={editValue} onChange={e => setEditValue(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg outline-none text-sm mt-2" style={{ background: "var(--theme-surface-bg)", border: "1px solid var(--theme-surface-border)", color: "var(--theme-text-primary)" }} />
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isBool ? (
                  <ToggleSwitch checked={boolChecked} onChange={async (v) => {
                    try { await adminAPI("update_setting", { key, value: String(v) }); load(); } catch { load(); }
                  }} />
                ) : isEditing ? (
                  <>
                    <button onClick={() => handleSave(key)} disabled={saving} className="px-3 py-1 rounded-lg text-xs text-white font-medium" style={{ background: "var(--theme-cta-gradient)" }}>
                      {saving ? <Loader2 size={12} className="animate-spin" /> : "حفظ"}
                    </button>
                    <button onClick={() => setEditKey(null)} className="px-3 py-1 rounded-lg text-xs" style={{ color: "var(--theme-text-secondary)" }}>إلغاء</button>
                  </>
                ) : (
                  <>
                    <span className="text-xs truncate max-w-[200px]" title={val} style={{ color: "var(--theme-text-secondary)" }}>{val.length > 50 ? val.substring(0, 50) + '...' : val || "(فارغ)"}</span>
                    <button onClick={() => { setEditKey(key); setEditValue(val); }} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: "var(--theme-primary)" }}><Edit size={14} /></button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
