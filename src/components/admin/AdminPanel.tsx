// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useUIStore } from "@/store/ui-store";
import {
  BarChart3, Users, CreditCard, BookOpen, GraduationCap,
  Palette, TrendingUp, DollarSign, Eye,
  Shield, Plus, Edit, Trash2, Search, Loader2, Save,
  Settings, Package, Key, ToggleLeft, ToggleRight, X,
  CheckCircle, XCircle, RefreshCw, Bell, Tag, ChevronDown,
  Send, Filter, Calendar, Hash, Percent, AlertCircle,
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

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--theme-text-secondary)" }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="بحث بالاسم أو البريد..."
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
                  {["الاسم", "البريد الإلكتروني", "الصف", "الحالة", "تاريخ التسجيل", "إجراء"].map(h => (
                    <th key={h} className="text-right py-3 px-3 font-medium" style={{ color: "var(--theme-text-secondary)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--theme-surface-border)" }}>
                    <td className="py-3 px-3 font-medium" style={{ color: "var(--theme-text-primary)" }}>{(s.name as string) || (s.full_name as string) || "—"}</td>
                    <td className="py-3 px-3" dir="ltr" style={{ color: "var(--theme-text-secondary)" }}>{(s.email as string) || "—"}</td>
                    <td className="py-3 px-3" style={{ color: "var(--theme-text-secondary)" }}>{(s.grade as string) || (s.grade_name as string) || "—"}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${s.banned ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}>
                        {s.banned ? "محظور" : "نشط"}
                      </span>
                    </td>
                    <td className="py-3 px-3" style={{ color: "var(--theme-text-secondary)" }}>{formatDate(s.created_at as string)}</td>
                    <td className="py-3 px-3">
                      <button onClick={() => toggleBan(s.id as string, !!s.banned)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium ${s.banned ? "bg-green-100 text-green-600 hover:bg-green-200" : "bg-red-100 text-red-600 hover:bg-red-200"}`}>
                        {s.banned ? "إلغاء الحظر" : "حظر"}
                      </button>
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
              <td className="py-3 px-3 font-medium" style={{ color: "var(--theme-text-primary)" }}>{(s.student_name as string) || (s.user_name as string) || "—"}</td>
              <td className="py-3 px-3" style={{ color: "var(--theme-text-secondary)" }}>{(s.plan_name as string) || (s.plan as string) || "—"}</td>
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

/* ═══════════ TAB 5: Subjects ═══════════ */
function SubjectsTab() {
  const [subjects, setSubjects] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editItem, setEditItem] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState({ name: "", grade_id: "", description: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const r = await adminAPI("get_subjects"); setSubjects(Array.isArray(r) ? r : r.subjects || []); } catch (e: unknown) { setError(e instanceof Error ? e.message : "خطأ"); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm({ name: "", grade_id: "", description: "" }); setEditItem(null); setModal("create"); };
  const openEdit = (s: Record<string, unknown>) => {
    setForm({ name: (s.name as string) || "", grade_id: (s.grade_id as string) || "", description: (s.description as string) || "" });
    setEditItem(s); setModal("edit");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (modal === "create") await adminAPI("create_subject", form);
      else await adminAPI("update_subject", { subject_id: editItem?.id, ...form });
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

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold" style={{ color: "var(--theme-text-primary)" }}>المواد الدراسية ({subjects.length})</h3>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium" style={{ background: "var(--theme-cta-gradient)" }}>
          <Plus size={16} /> إضافة مادة
        </button>
      </div>

      {subjects.length === 0 ? <EmptyState message="لا توجد مواد" icon={<BookOpen size={40} />} /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "2px solid var(--theme-surface-border)" }}>
                {["المادة", "الصف", "الوصف", "منشور", "إجراءات"].map(h => (
                  <th key={h} className="text-right py-3 px-3 font-medium" style={{ color: "var(--theme-text-secondary)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subjects.map((s, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--theme-surface-border)" }}>
                  <td className="py-3 px-3 font-medium" style={{ color: "var(--theme-text-primary)" }}>{(s.name as string) || "—"}</td>
                  <td className="py-3 px-3" style={{ color: "var(--theme-text-secondary)" }}>{(s.grade_name as string) || (s.grade_id as string) || "—"}</td>
                  <td className="py-3 px-3" style={{ color: "var(--theme-text-secondary)" }}>{((s.description as string) || "—").slice(0, 50)}</td>
                  <td className="py-3 px-3"><ToggleSwitch checked={!!(s.published ?? s.is_published)} onChange={() => togglePublish(s.id as string, !!(s.published ?? s.is_published))} /></td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: "var(--theme-primary)" }}><Edit size={16} /></button>
                      <button onClick={() => handleDelete(s.id as string)} className="p-1.5 rounded-lg hover:opacity-70 text-red-500"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === "create" ? "إضافة مادة جديدة" : "تعديل المادة"} onSave={handleSave} saving={saving}>
        <InputField label="اسم المادة" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="مثال: الرياضيات" />
        <InputField label="معرّف الصف" value={form.grade_id} onChange={v => setForm({ ...form, grade_id: v })} placeholder="grade_id" />
        <InputField label="الوصف" value={form.description} onChange={v => setForm({ ...form, description: v })} placeholder="وصف المادة" />
      </Modal>
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

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const r = await adminAPI("get_themes"); setThemes(Array.isArray(r) ? r : r.themes || []); } catch (e: unknown) { setError(e instanceof Error ? e.message : "خطأ"); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const activate = async (id: string) => {
    try { await adminAPI("update_theme", { theme_id: id, active: true }); load(); } catch { load(); }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (themes.length === 0) return <EmptyState message="لا توجد ثيمات" icon={<Palette size={40} />} />;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {themes.map((t, i) => (
        <div key={i} className="rounded-2xl p-4 relative" style={{ background: "var(--theme-bg)", border: `2px solid ${t.active || t.is_active ? "var(--theme-primary)" : "var(--theme-surface-border)"}` }}>
          {(t.active || t.is_active) && (
            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-lg text-xs font-medium bg-green-100 text-green-600">نشط</span>
          )}
          <div className="flex items-center gap-3 mb-3">
            {t.preview_colors ? (
              <div className="flex gap-1">
                {(t.preview_colors as string[]).map((c: string, j: number) => <div key={j} className="w-6 h-6 rounded-full" style={{ background: c }} />)}
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl" style={{ background: (t.primary_color as string) || "var(--theme-primary)" }} />
            )}
          </div>
          <h4 className="font-bold mb-1" style={{ color: "var(--theme-text-primary)" }}>{(t.name_ar as string) || (t.name as string) || "—"}</h4>
          <p className="text-xs mb-3" style={{ color: "var(--theme-text-secondary)" }}>{(t.description as string) || ""}</p>
          {!(t.active || t.is_active) && (
            <button onClick={() => activate(t.id as string)} className="w-full py-2 rounded-xl text-white text-sm font-medium" style={{ background: "var(--theme-cta-gradient)" }}>
              تفعيل
            </button>
          )}
          {t.scheduled_at && (
            <p className="text-xs mt-2 flex items-center gap-1" style={{ color: "var(--theme-text-secondary)" }}>
              <Calendar size={12} /> مجدول: {formatDate(t.scheduled_at as string)}
            </p>
          )}
        </div>
      ))}
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
  const [form, setForm] = useState({ code: "", discount_type: "percentage", discount_value: "", max_uses: "", expires_at: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const r = await adminAPI("get_coupons"); setCoupons(Array.isArray(r) ? r : r.coupons || []); } catch (e: unknown) { setError(e instanceof Error ? e.message : "خطأ"); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm({ code: "", discount_type: "percentage", discount_value: "", max_uses: "", expires_at: "" }); setEditItem(null); setModal("create"); };
  const openEdit = (c: Record<string, unknown>) => {
    setForm({
      code: (c.code as string) || "", discount_type: (c.discount_type as string) || "percentage",
      discount_value: String(c.discount_value || c.discount || ""), max_uses: String(c.max_uses || ""),
      expires_at: (c.expires_at as string)?.slice(0, 10) || "",
    });
    setEditItem(c); setModal("edit");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const params = { ...form, discount_value: Number(form.discount_value), max_uses: form.max_uses ? Number(form.max_uses) : null };
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
                {["الكود", "النوع", "القيمة", "الاستخدامات", "ينتهي", "إجراءات"].map(h => (
                  <th key={h} className="text-right py-3 px-3 font-medium" style={{ color: "var(--theme-text-secondary)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coupons.map((c, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--theme-surface-border)" }}>
                  <td className="py-3 px-3 font-mono font-bold" style={{ color: "var(--theme-primary)" }}>{(c.code as string) || "—"}</td>
                  <td className="py-3 px-3" style={{ color: "var(--theme-text-secondary)" }}>{c.discount_type === "percentage" ? "نسبة %" : "مبلغ ثابت"}</td>
                  <td className="py-3 px-3 font-medium" style={{ color: "var(--theme-text-primary)" }}>
                    {c.discount_type === "percentage" ? `${c.discount_value || c.discount}%` : formatCurrency((c.discount_value as number) || (c.discount as number) || 0)}
                  </td>
                  <td className="py-3 px-3" style={{ color: "var(--theme-text-secondary)" }}>{(c.used_count as number) || 0} / {(c.max_uses as number) || "∞"}</td>
                  <td className="py-3 px-3" style={{ color: "var(--theme-text-secondary)" }}>{c.expires_at ? formatDate(c.expires_at as string) : "—"}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: "var(--theme-primary)" }}><Edit size={16} /></button>
                      <button onClick={() => handleDelete(c.id as string)} className="p-1.5 rounded-lg hover:opacity-70 text-red-500"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === "create" ? "إضافة كوبون جديد" : "تعديل الكوبون"} onSave={handleSave} saving={saving}>
        <InputField label="كود الكوبون" value={form.code} onChange={v => setForm({ ...form, code: v })} placeholder="SAVE20" dir="ltr" />
        <SelectField label="نوع الخصم" value={form.discount_type} onChange={v => setForm({ ...form, discount_type: v })} options={[{ value: "percentage", label: "نسبة مئوية %" }, { value: "fixed", label: "مبلغ ثابت" }]} />
        <InputField label="قيمة الخصم" value={form.discount_value} onChange={v => setForm({ ...form, discount_value: v })} type="number" placeholder="20" />
        <InputField label="أقصى عدد استخدامات" value={form.max_uses} onChange={v => setForm({ ...form, max_uses: v })} type="number" placeholder="اتركه فارغاً لغير محدود" />
        <InputField label="تاريخ الانتهاء" value={form.expires_at} onChange={v => setForm({ ...form, expires_at: v })} type="date" />
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

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (secrets.length === 0) return <EmptyState message="لا توجد مفاتيح" icon={<Key size={40} />} />;

  return (
    <div>
      <h3 className="font-bold mb-4" style={{ color: "var(--theme-text-primary)" }}>مفاتيح النظام</h3>
      <div className="space-y-3">
        {secrets.map((s, i) => {
          const key = (s.key as string) || (s.name as string) || "";
          const isEditing = editKey === key;
          return (
            <div key={i} className="rounded-xl p-4" style={{ background: "var(--theme-bg)", border: "1px solid var(--theme-surface-border)" }}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-sm font-medium" style={{ color: "var(--theme-text-primary)" }}>{key}</span>
                {isEditing ? (
                  <div className="flex gap-2">
                    <button onClick={() => handleSave(key)} disabled={saving} className="px-3 py-1 rounded-lg text-xs text-white font-medium" style={{ background: "var(--theme-cta-gradient)" }}>
                      {saving ? <Loader2 size={12} className="animate-spin" /> : "حفظ"}
                    </button>
                    <button onClick={() => setEditKey(null)} className="px-3 py-1 rounded-lg text-xs font-medium" style={{ color: "var(--theme-text-secondary)" }}>إلغاء</button>
                  </div>
                ) : (
                  <button onClick={() => { setEditKey(key); setEditValue((s.value as string) || ""); }} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: "var(--theme-primary)" }}>
                    <Edit size={14} />
                  </button>
                )}
              </div>
              {isEditing ? (
                <input value={editValue} onChange={e => setEditValue(e.target.value)} dir="ltr"
                  className="w-full px-3 py-2 rounded-lg outline-none text-sm font-mono mt-1" style={{ background: "var(--theme-surface-bg)", border: "1px solid var(--theme-surface-border)", color: "var(--theme-text-primary)" }} />
              ) : (
                <p className="text-xs font-mono" dir="ltr" style={{ color: "var(--theme-text-secondary)" }}>
                  {(s.value as string) ? "••••••••••••" : "(فارغ)"}
                </p>
              )}
              {s.description && <p className="text-xs mt-1" style={{ color: "var(--theme-text-secondary)" }}>{s.description as string}</p>}
            </div>
          );
        })}
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
          const val = (s.value as string) || "";
          const isEditing = editKey === key;
          const isBool = val === "true" || val === "false";
          return (
            <div key={i} className="rounded-xl p-4 flex items-center justify-between gap-4" style={{ background: "var(--theme-bg)", border: "1px solid var(--theme-surface-border)" }}>
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
                  <ToggleSwitch checked={val === "true"} onChange={async (v) => {
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
                    <span className="text-xs truncate max-w-[120px]" style={{ color: "var(--theme-text-secondary)" }}>{val || "(فارغ)"}</span>
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
