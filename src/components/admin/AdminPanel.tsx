"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import {
  Users,
  CreditCard,
  DollarSign,
  Clock,
  BookOpen,
  CheckSquare,
  Search,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Shield,
  ShieldOff,
  Eye,
  EyeOff,
  BarChart3,
  MessageSquare,
  Palette,
  Key,
  Settings,
  Loader2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

// ─── API Helper ───────────────────────────────────────────────────────────────
async function adminAPI(action: string, params?: Record<string, any>) {
  const res = await fetch("/api/admin/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...params }),
  });
  return res.json();
}

// ─── Toast Component ──────────────────────────────────────────────────────────
function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-xl shadow-lg text-white font-cairo text-sm flex items-center gap-2 animate-fade-in"
      style={{
        background: type === "success" ? "#10B981" : "#EF4444",
      }}
    >
      {type === "success" ? (
        <CheckCircle className="w-4 h-4" />
      ) : (
        <AlertCircle className="w-4 h-4" />
      )}
      {message}
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2
        className="w-8 h-8 animate-spin"
        style={{ color: "var(--theme-primary)" }}
      />
      <span
        className="mr-3 font-cairo text-sm"
        style={{ color: "var(--theme-text-secondary)" }}
      >
        جاري التحميل...
      </span>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <BarChart3
        className="w-12 h-12 mb-3"
        style={{ color: "var(--theme-text-secondary)", opacity: 0.4 }}
      />
      <p
        className="font-cairo text-sm"
        style={{ color: "var(--theme-text-secondary)" }}
      >
        {message}
      </p>
    </div>
  );
}

// ─── Tab Definitions ──────────────────────────────────────────────────────────
const TABS = [
  { key: "overview", label: "📊 نظرة عامة" },
  { key: "students", label: "👥 الطلاب" },
  { key: "subscriptions", label: "💳 الاشتراكات" },
  { key: "subjects", label: "📚 المواد" },
  { key: "payments", label: "💰 المدفوعات" },
  { key: "settings", label: "⚙️ الإعدادات" },
  { key: "secrets", label: "🔑 مفاتيح API" },
  { key: "themes", label: "🎨 الثيمات" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({
  label,
  color,
}: {
  label: string;
  color: string;
}) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-cairo font-medium"
      style={{
        background: color + "22",
        color: color,
        border: `1px solid ${color}44`,
      }}
    >
      {label}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════════════════════════════════════════════════
function OverviewTab() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    adminAPI("get_stats")
      .then((res) => {
        if (res.success) setStats(res.data);
        else setError(res.error || "فشل تحميل الإحصائيات");
      })
      .catch(() => setError("خطأ في الاتصال"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error)
    return (
      <p className="text-red-500 font-cairo text-center py-8">{error}</p>
    );
  if (!stats) return null;

  const cards = [
    {
      title: "إجمالي الطلاب",
      value: stats.total_students ?? 0,
      icon: Users,
      color: "#6366F1",
    },
    {
      title: "اشتراكات نشطة",
      value: stats.active_subscriptions ?? 0,
      icon: CreditCard,
      color: "#10B981",
    },
    {
      title: "الإيرادات",
      value: `${stats.total_revenue ?? 0} ج.م`,
      icon: DollarSign,
      color: "#F59E0B",
    },
    {
      title: "اشتراكات تجريبية",
      value: stats.trial_subscriptions ?? 0,
      icon: Clock,
      color: "#8B5CF6",
    },
    {
      title: "المواد المنشورة",
      value: `${stats.published_subjects ?? 0} / ${stats.total_subjects ?? 0}`,
      icon: BookOpen,
      color: "#3B82F6",
    },
    {
      title: "الأسئلة",
      value: stats.total_questions ?? 0,
      icon: CheckSquare,
      color: "#EC4899",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="themed-card p-5 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <span
                  className="font-cairo text-xs"
                  style={{ color: "var(--theme-text-secondary)" }}
                >
                  {card.title}
                </span>
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: card.color + "18" }}
                >
                  <Icon className="w-4 h-4" style={{ color: card.color }} />
                </div>
              </div>
              <span
                className="font-cairo text-2xl font-bold"
                style={{ color: "var(--theme-text-primary)" }}
              >
                {card.value}
              </span>
            </div>
          );
        })}
      </div>

      {/* Extra info cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="themed-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare
              className="w-4 h-4"
              style={{ color: "var(--theme-primary)" }}
            />
            <span
              className="font-cairo text-sm font-semibold"
              style={{ color: "var(--theme-text-primary)" }}
            >
              رسائل الدردشة
            </span>
          </div>
          <p
            className="font-cairo text-3xl font-bold"
            style={{ color: "var(--theme-text-primary)" }}
          >
            {stats.total_chat_messages ?? 0}
          </p>
          <p
            className="font-cairo text-xs mt-1"
            style={{ color: "var(--theme-text-secondary)" }}
          >
            إجمالي رسائل المحادثة مع الذكاء الاصطناعي
          </p>
        </div>
        <div className="themed-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen
              className="w-4 h-4"
              style={{ color: "var(--theme-primary)" }}
            />
            <span
              className="font-cairo text-sm font-semibold"
              style={{ color: "var(--theme-text-primary)" }}
            >
              الدروس
            </span>
          </div>
          <p
            className="font-cairo text-3xl font-bold"
            style={{ color: "var(--theme-text-primary)" }}
          >
            {stats.total_lessons ?? 0}
          </p>
          <p
            className="font-cairo text-xs mt-1"
            style={{ color: "var(--theme-text-secondary)" }}
          >
            إجمالي الدروس المتوفرة
          </p>
        </div>
      </div>

      {/* Placeholder Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="themed-card p-6 flex flex-col items-center justify-center min-h-[200px]">
          <BarChart3
            className="w-10 h-10 mb-3"
            style={{ color: "var(--theme-text-secondary)", opacity: 0.3 }}
          />
          <p
            className="font-cairo text-sm"
            style={{ color: "var(--theme-text-secondary)" }}
          >
            📈 رسم بياني للاشتراكات - قريبًا
          </p>
        </div>
        <div className="themed-card p-6 flex flex-col items-center justify-center min-h-[200px]">
          <BarChart3
            className="w-10 h-10 mb-3"
            style={{ color: "var(--theme-text-secondary)", opacity: 0.3 }}
          />
          <p
            className="font-cairo text-sm"
            style={{ color: "var(--theme-text-secondary)" }}
          >
            📊 رسم بياني للإيرادات - قريبًا
          </p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STUDENTS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function StudentsTab() {
  const [students, setStudents] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const limit = 15;

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI("get_students", { search, page, limit });
      if (res.success) {
        setStudents(res.data?.students ?? []);
        setTotal(res.data?.total ?? 0);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const toggleBan = async (student: any) => {
    setActionLoading(student.id);
    try {
      const res = await adminAPI("update_student", {
        id: student.id,
        updates: { is_banned: !student.is_banned },
      });
      if (res.success) {
        setToast({ message: "✅ تم التحديث", type: "success" });
        fetchStudents();
      } else {
        setToast({ message: res.error || "فشل التحديث", type: "error" });
      }
    } catch {
      setToast({ message: "خطأ في الاتصال", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {/* Search */}
      <div className="relative">
        <Search
          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: "var(--theme-text-secondary)" }}
        />
        <input
          type="text"
          className="themed-input w-full pr-10 font-cairo text-sm"
          placeholder="بحث بالاسم أو الهاتف..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {loading ? (
        <Spinner />
      ) : students.length === 0 ? (
        <EmptyState message="لا يوجد طلاب بعد" />
      ) : (
        <>
          {/* Table */}
          <div className="themed-card overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--theme-surface-border)",
                  }}
                >
                  {["الاسم", "الهاتف", "المحافظة", "الحالة", "تاريخ التسجيل", "إجراءات"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 font-cairo text-xs font-semibold"
                        style={{ color: "var(--theme-text-secondary)" }}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {students.map((s: any) => (
                  <tr
                    key={s.id}
                    style={{
                      borderBottom: "1px solid var(--theme-surface-border)",
                    }}
                    className="hover:opacity-80 transition-opacity"
                  >
                    <td
                      className="px-4 py-3 font-cairo text-sm"
                      style={{ color: "var(--theme-text-primary)" }}
                    >
                      {s.full_name || s.name || "-"}
                    </td>
                    <td
                      className="px-4 py-3 font-cairo text-sm"
                      style={{ color: "var(--theme-text-secondary)" }}
                      dir="ltr"
                    >
                      {s.phone || "-"}
                    </td>
                    <td
                      className="px-4 py-3 font-cairo text-sm"
                      style={{ color: "var(--theme-text-secondary)" }}
                    >
                      {s.governorate || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {s.is_verified && (
                          <StatusBadge label="مُفعّل" color="#10B981" />
                        )}
                        {s.is_banned && (
                          <StatusBadge label="محظور" color="#EF4444" />
                        )}
                        {!s.is_verified && !s.is_banned && (
                          <StatusBadge label="غير مُفعّل" color="#6B7280" />
                        )}
                      </div>
                    </td>
                    <td
                      className="px-4 py-3 font-cairo text-xs"
                      style={{ color: "var(--theme-text-secondary)" }}
                      dir="ltr"
                    >
                      {s.created_at
                        ? new Date(s.created_at).toLocaleDateString("ar-EG")
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleBan(s)}
                        disabled={actionLoading === s.id}
                        className="themed-btn-outline text-xs font-cairo px-3 py-1.5 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
                        style={{
                          color: s.is_banned ? "#10B981" : "#EF4444",
                          borderColor: s.is_banned ? "#10B98144" : "#EF444444",
                        }}
                      >
                        {actionLoading === s.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : s.is_banned ? (
                          <ShieldOff className="w-3 h-3" />
                        ) : (
                          <Shield className="w-3 h-3" />
                        )}
                        {s.is_banned ? "إلغاء الحظر" : "حظر"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 py-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="themed-btn-outline p-2 rounded-lg disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <span
                className="font-cairo text-sm"
                style={{ color: "var(--theme-text-secondary)" }}
              >
                صفحة {page} من {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="themed-btn-outline p-2 rounded-lg disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUBSCRIPTIONS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function SubscriptionsTab() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const limit = 15;

  const fetchSubs = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (statusFilter) params.status = statusFilter;
      const res = await adminAPI("get_subscriptions", params);
      if (res.success) {
        setSubscriptions(res.data?.subscriptions ?? []);
        setTotal(res.data?.total ?? 0);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    fetchSubs();
  }, [fetchSubs]);

  const statusColors: Record<string, string> = {
    trial: "#F59E0B",
    active: "#10B981",
    expired: "#EF4444",
    cancelled: "#6B7280",
  };

  const statusLabels: Record<string, string> = {
    trial: "تجريبي",
    active: "نشط",
    expired: "منتهي",
    cancelled: "ملغي",
  };

  const filters = [
    { key: "", label: "الكل" },
    { key: "active", label: "نشط" },
    { key: "trial", label: "تجريبي" },
    { key: "expired", label: "منتهي" },
    { key: "cancelled", label: "ملغي" },
  ];

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => {
              setStatusFilter(f.key);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-xl font-cairo text-xs font-medium transition-all ${
              statusFilter === f.key
                ? "themed-btn-primary"
                : "themed-btn-outline"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : subscriptions.length === 0 ? (
        <EmptyState message="لا توجد اشتراكات" />
      ) : (
        <>
          <div className="themed-card overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--theme-surface-border)",
                  }}
                >
                  {["الطالب", "الخطة", "المبلغ", "الحالة", "تاريخ البدء", "تاريخ الانتهاء"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 font-cairo text-xs font-semibold"
                        style={{ color: "var(--theme-text-secondary)" }}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub: any, idx: number) => (
                  <tr
                    key={sub.id || idx}
                    style={{
                      borderBottom: "1px solid var(--theme-surface-border)",
                    }}
                    className="hover:opacity-80 transition-opacity"
                  >
                    <td
                      className="px-4 py-3 font-cairo text-sm"
                      style={{ color: "var(--theme-text-primary)" }}
                    >
                      {sub.student_name || sub.profiles?.full_name || "-"}
                    </td>
                    <td
                      className="px-4 py-3 font-cairo text-sm"
                      style={{ color: "var(--theme-text-secondary)" }}
                    >
                      {sub.plan_id || sub.plan || "-"}
                    </td>
                    <td
                      className="px-4 py-3 font-cairo text-sm"
                      style={{ color: "var(--theme-text-secondary)" }}
                    >
                      {sub.amount != null ? `${sub.amount} ج.م` : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={statusLabels[sub.status] || sub.status || "-"}
                        color={statusColors[sub.status] || "#6B7280"}
                      />
                    </td>
                    <td
                      className="px-4 py-3 font-cairo text-xs"
                      style={{ color: "var(--theme-text-secondary)" }}
                      dir="ltr"
                    >
                      {sub.starts_at || sub.created_at
                        ? new Date(
                            sub.starts_at || sub.created_at
                          ).toLocaleDateString("ar-EG")
                        : "-"}
                    </td>
                    <td
                      className="px-4 py-3 font-cairo text-xs"
                      style={{ color: "var(--theme-text-secondary)" }}
                      dir="ltr"
                    >
                      {sub.expires_at
                        ? new Date(sub.expires_at).toLocaleDateString("ar-EG")
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 py-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="themed-btn-outline p-2 rounded-lg disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <span
                className="font-cairo text-sm"
                style={{ color: "var(--theme-text-secondary)" }}
              >
                صفحة {page} من {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="themed-btn-outline p-2 rounded-lg disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUBJECTS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function SubjectsTab() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const emptyForm = {
    name_ar: "",
    name_en: "",
    icon: "📘",
    color: "#6366F1",
    grade_level: 1,
    is_published: false,
    sort_order: 0,
  };
  const [form, setForm] = useState(emptyForm);

  const fetchSubjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI("get_subjects");
      if (res.success) setSubjects(res.data?.subjects ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (sub: any) => {
    setEditingId(sub.id);
    setForm({
      name_ar: sub.name_ar || "",
      name_en: sub.name_en || "",
      icon: sub.icon || "📘",
      color: sub.color || "#6366F1",
      grade_level: sub.grade_level || 1,
      is_published: sub.is_published ?? false,
      sort_order: sub.sort_order ?? 0,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let res;
      if (editingId) {
        res = await adminAPI("update_subject", {
          id: editingId,
          updates: form,
        });
      } else {
        res = await adminAPI("create_subject", form);
      }
      if (res.success) {
        setToast({ message: "✅ تم الحفظ", type: "success" });
        setShowForm(false);
        setEditingId(null);
        fetchSubjects();
      } else {
        setToast({ message: res.error || "فشل الحفظ", type: "error" });
      }
    } catch {
      setToast({ message: "خطأ في الاتصال", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه المادة؟")) return;
    try {
      const res = await adminAPI("delete_subject", { id });
      if (res.success) {
        setToast({ message: "✅ تم الحذف", type: "success" });
        fetchSubjects();
      } else {
        setToast({ message: res.error || "فشل الحذف", type: "error" });
      }
    } catch {
      setToast({ message: "خطأ في الاتصال", type: "error" });
    }
  };

  const togglePublish = async (sub: any) => {
    try {
      const res = await adminAPI("update_subject", {
        id: sub.id,
        updates: { is_published: !sub.is_published },
      });
      if (res.success) {
        setToast({ message: "✅ تم التحديث", type: "success" });
        fetchSubjects();
      } else {
        setToast({ message: res.error || "فشل التحديث", type: "error" });
      }
    } catch {
      setToast({ message: "خطأ في الاتصال", type: "error" });
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <h3
          className="font-cairo text-lg font-bold"
          style={{ color: "var(--theme-text-primary)" }}
        >
          المواد الدراسية ({subjects.length})
        </h3>
        <button
          onClick={openCreate}
          className="themed-btn-primary px-4 py-2 rounded-xl font-cairo text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          إضافة مادة
        </button>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div
          className="themed-card p-5 space-y-4"
          style={{
            border: "2px solid var(--theme-primary)",
          }}
        >
          <div className="flex items-center justify-between">
            <h4
              className="font-cairo text-sm font-bold"
              style={{ color: "var(--theme-text-primary)" }}
            >
              {editingId ? "تعديل المادة" : "إضافة مادة جديدة"}
            </h4>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="p-1 rounded-lg hover:opacity-70"
            >
              <X
                className="w-4 h-4"
                style={{ color: "var(--theme-text-secondary)" }}
              />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label
                className="block font-cairo text-xs mb-1"
                style={{ color: "var(--theme-text-secondary)" }}
              >
                الاسم بالعربية
              </label>
              <input
                type="text"
                className="themed-input w-full font-cairo text-sm"
                value={form.name_ar}
                onChange={(e) =>
                  setForm({ ...form, name_ar: e.target.value })
                }
                placeholder="مثال: الرياضيات"
              />
            </div>
            <div>
              <label
                className="block font-cairo text-xs mb-1"
                style={{ color: "var(--theme-text-secondary)" }}
              >
                الاسم بالإنجليزية
              </label>
              <input
                type="text"
                className="themed-input w-full font-cairo text-sm"
                value={form.name_en}
                onChange={(e) =>
                  setForm({ ...form, name_en: e.target.value })
                }
                placeholder="e.g. Mathematics"
              />
            </div>
            <div>
              <label
                className="block font-cairo text-xs mb-1"
                style={{ color: "var(--theme-text-secondary)" }}
              >
                الأيقونة (إيموجي)
              </label>
              <input
                type="text"
                className="themed-input w-full font-cairo text-sm"
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                placeholder="📘"
              />
            </div>
            <div>
              <label
                className="block font-cairo text-xs mb-1"
                style={{ color: "var(--theme-text-secondary)" }}
              >
                اللون
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="w-10 h-10 rounded-lg border-0 cursor-pointer"
                  value={form.color}
                  onChange={(e) =>
                    setForm({ ...form, color: e.target.value })
                  }
                />
                <input
                  type="text"
                  className="themed-input flex-1 font-cairo text-sm"
                  value={form.color}
                  onChange={(e) =>
                    setForm({ ...form, color: e.target.value })
                  }
                  dir="ltr"
                />
              </div>
            </div>
            <div>
              <label
                className="block font-cairo text-xs mb-1"
                style={{ color: "var(--theme-text-secondary)" }}
              >
                الصف الدراسي
              </label>
              <select
                className="themed-input w-full font-cairo text-sm"
                value={form.grade_level}
                onChange={(e) =>
                  setForm({ ...form, grade_level: Number(e.target.value) })
                }
              >
                <option value={1}>الصف الأول الثانوي</option>
                <option value={2}>الصف الثاني الثانوي</option>
                <option value={3}>الصف الثالث الثانوي</option>
              </select>
            </div>
            <div>
              <label
                className="block font-cairo text-xs mb-1"
                style={{ color: "var(--theme-text-secondary)" }}
              >
                ترتيب العرض
              </label>
              <input
                type="number"
                className="themed-input w-full font-cairo text-sm"
                value={form.sort_order}
                onChange={(e) =>
                  setForm({ ...form, sort_order: Number(e.target.value) })
                }
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) =>
                  setForm({ ...form, is_published: e.target.checked })
                }
                className="w-4 h-4 rounded"
              />
              <span
                className="font-cairo text-sm"
                style={{ color: "var(--theme-text-primary)" }}
              >
                نشر المادة
              </span>
            </label>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="themed-btn-outline px-4 py-2 rounded-xl font-cairo text-sm"
            >
              إلغاء
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.name_ar}
              className="themed-btn-primary px-4 py-2 rounded-xl font-cairo text-sm flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {editingId ? "حفظ التعديلات" : "إضافة"}
            </button>
          </div>
        </div>
      )}

      {/* Subject Cards Grid */}
      {subjects.length === 0 ? (
        <EmptyState message="لا توجد مواد بعد" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((sub: any) => (
            <div key={sub.id} className="themed-card p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                    style={{ background: (sub.color || "#6366F1") + "18" }}
                  >
                    {sub.icon || "📘"}
                  </div>
                  <div>
                    <h4
                      className="font-cairo text-sm font-bold"
                      style={{ color: "var(--theme-text-primary)" }}
                    >
                      {sub.name_ar}
                    </h4>
                    <p
                      className="font-cairo text-xs"
                      style={{ color: "var(--theme-text-secondary)" }}
                    >
                      {sub.name_en || ""} · الصف {sub.grade_level}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => togglePublish(sub)}
                  title={sub.is_published ? "إلغاء النشر" : "نشر"}
                >
                  {sub.is_published ? (
                    <StatusBadge label="منشور" color="#10B981" />
                  ) : (
                    <StatusBadge label="مسودة" color="#6B7280" />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-4">
                <span
                  className="font-cairo text-xs"
                  style={{ color: "var(--theme-text-secondary)" }}
                >
                  📖 {sub.lesson_count ?? 0} درس
                </span>
                <span
                  className="font-cairo text-xs"
                  style={{ color: "var(--theme-text-secondary)" }}
                >
                  ❓ {sub.question_count ?? 0} سؤال
                </span>
              </div>

              <div
                className="flex items-center gap-2 pt-2"
                style={{
                  borderTop: "1px solid var(--theme-surface-border)",
                }}
              >
                <button
                  onClick={() => openEdit(sub)}
                  className="themed-btn-outline flex-1 py-1.5 rounded-lg font-cairo text-xs flex items-center justify-center gap-1.5"
                >
                  <Edit3 className="w-3 h-3" />
                  تعديل
                </button>
                <button
                  onClick={() => handleDelete(sub.id)}
                  className="themed-btn-outline flex-1 py-1.5 rounded-lg font-cairo text-xs flex items-center justify-center gap-1.5"
                  style={{ color: "#EF4444", borderColor: "#EF444444" }}
                >
                  <Trash2 className="w-3 h-3" />
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAYMENTS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function PaymentsTab() {
  const [payments, setPayments] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 15;

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI("get_payments", { page, limit });
      if (res.success) {
        setPayments(res.data?.payments ?? []);
        setTotal(res.data?.total ?? 0);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const statusColors: Record<string, string> = {
    completed: "#10B981",
    pending: "#F59E0B",
    failed: "#EF4444",
    refunded: "#6B7280",
  };

  const statusLabels: Record<string, string> = {
    completed: "مكتمل",
    pending: "قيد الانتظار",
    failed: "فشل",
    refunded: "مسترد",
  };

  const totalPages = Math.ceil(total / limit);

  if (loading) return <Spinner />;
  if (payments.length === 0)
    return <EmptyState message="لا توجد مدفوعات بعد" />;

  return (
    <div className="space-y-4">
      <div className="themed-card overflow-x-auto">
        <table className="w-full text-right">
          <thead>
            <tr
              style={{
                borderBottom: "1px solid var(--theme-surface-border)",
              }}
            >
              {["الطالب", "الطريقة", "المبلغ", "الحالة", "التاريخ"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-3 font-cairo text-xs font-semibold"
                    style={{ color: "var(--theme-text-secondary)" }}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {payments.map((p: any, idx: number) => (
              <tr
                key={p.id || idx}
                style={{
                  borderBottom: "1px solid var(--theme-surface-border)",
                }}
                className="hover:opacity-80 transition-opacity"
              >
                <td
                  className="px-4 py-3 font-cairo text-sm"
                  style={{ color: "var(--theme-text-primary)" }}
                >
                  {p.student_name || p.profiles?.full_name || "-"}
                </td>
                <td
                  className="px-4 py-3 font-cairo text-sm"
                  style={{ color: "var(--theme-text-secondary)" }}
                >
                  {p.provider || p.payment_method || "-"}
                </td>
                <td
                  className="px-4 py-3 font-cairo text-sm font-semibold"
                  style={{ color: "var(--theme-text-primary)" }}
                >
                  {p.amount != null ? `${p.amount} ج.م` : "-"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge
                    label={statusLabels[p.status] || p.status || "-"}
                    color={statusColors[p.status] || "#6B7280"}
                  />
                </td>
                <td
                  className="px-4 py-3 font-cairo text-xs"
                  style={{ color: "var(--theme-text-secondary)" }}
                  dir="ltr"
                >
                  {p.created_at
                    ? new Date(p.created_at).toLocaleDateString("ar-EG")
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 py-2">
          <button
            onClick={() => setPage((pp) => Math.max(1, pp - 1))}
            disabled={page <= 1}
            className="themed-btn-outline p-2 rounded-lg disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span
            className="font-cairo text-sm"
            style={{ color: "var(--theme-text-secondary)" }}
          >
            صفحة {page} من {totalPages}
          </span>
          <button
            onClick={() => setPage((pp) => Math.min(totalPages, pp + 1))}
            disabled={page >= totalPages}
            className="themed-btn-outline p-2 rounded-lg disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SETTINGS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function SettingsTab() {
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Local editable state per key
  const [editValues, setEditValues] = useState<Record<string, any>>({});

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI("get_settings");
      if (res.success) {
        const s = res.data?.settings ?? [];
        setSettings(s);
        const vals: Record<string, any> = {};
        s.forEach((item: any) => {
          try {
            vals[item.key] = typeof item.value === "string" ? JSON.parse(item.value) : item.value;
          } catch {
            vals[item.key] = item.value;
          }
        });
        setEditValues(vals);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveSetting = async (key: string) => {
    setSaving(key);
    try {
      const value = editValues[key];
      const res = await adminAPI("update_setting", {
        key,
        value: typeof value === "object" ? JSON.stringify(value) : String(value),
      });
      if (res.success) {
        setToast({ message: "✅ تم الحفظ", type: "success" });
      } else {
        setToast({ message: res.error || "فشل الحفظ", type: "error" });
      }
    } catch {
      setToast({ message: "خطأ في الاتصال", type: "error" });
    } finally {
      setSaving(null);
    }
  };

  const getVal = (key: string, subKey?: string): any => {
    const v = editValues[key];
    if (subKey && typeof v === "object" && v !== null) return v[subKey] ?? "";
    return v ?? "";
  };

  const setVal = (key: string, value: any, subKey?: string) => {
    setEditValues((prev) => {
      if (subKey) {
        const existing = typeof prev[key] === "object" && prev[key] !== null ? { ...prev[key] } : {};
        existing[subKey] = value;
        return { ...prev, [key]: existing };
      }
      return { ...prev, [key]: value };
    });
  };

  if (loading) return <Spinner />;

  const renderNumberInput = (
    label: string,
    key: string,
    subKey?: string,
    placeholder?: string
  ) => (
    <div className="flex items-center justify-between gap-3">
      <label
        className="font-cairo text-sm whitespace-nowrap"
        style={{ color: "var(--theme-text-primary)" }}
      >
        {label}
      </label>
      <input
        type="number"
        className="themed-input w-32 font-cairo text-sm text-left"
        dir="ltr"
        value={getVal(key, subKey)}
        placeholder={placeholder}
        onChange={(e) => {
          const v = e.target.value === "" ? "" : Number(e.target.value);
          setVal(key, v, subKey);
        }}
      />
    </div>
  );

  const renderSaveButton = (key: string) => (
    <button
      onClick={() => saveSetting(key)}
      disabled={saving === key}
      className="themed-btn-primary px-4 py-2 rounded-xl font-cairo text-sm flex items-center gap-2 disabled:opacity-50 mt-3"
    >
      {saving === key ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Save className="w-4 h-4" />
      )}
      حفظ التعديلات
    </button>
  );

  const chatBudget = editValues["chat_budget"] || {};
  const costConfig = editValues["cost_config"] || {};

  const planLabels: Record<string, string> = {
    trial: "تجريبي",
    one_subject: "مادة واحدة",
    three_subjects: "3 مواد",
    all_subjects: "كل المواد",
  };

  return (
    <div className="space-y-6">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Pricing Section */}
      <div className="themed-card p-5 space-y-4">
        <h3
          className="font-cairo text-base font-bold flex items-center gap-2"
          style={{ color: "var(--theme-text-primary)" }}
        >
          💰 التسعير
        </h3>
        <div className="space-y-3">
          {renderNumberInput(
            "مادة واحدة (ج.م)",
            "pricing",
            "one_subject_price"
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1">
              {renderNumberInput(
                "3 مواد (ج.م)",
                "pricing",
                "three_subjects_price"
              )}
            </div>
            <div className="flex-1">
              {renderNumberInput(
                "خصم %",
                "pricing",
                "three_subjects_discount"
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1">
              {renderNumberInput(
                "كل المواد (ج.م)",
                "pricing",
                "all_subjects_price"
              )}
            </div>
            <div className="flex-1">
              {renderNumberInput(
                "خصم %",
                "pricing",
                "all_subjects_discount"
              )}
            </div>
          </div>
        </div>
        {renderSaveButton("pricing")}
      </div>

      {/* Trial Section */}
      <div className="themed-card p-5 space-y-4">
        <h3
          className="font-cairo text-base font-bold flex items-center gap-2"
          style={{ color: "var(--theme-text-primary)" }}
        >
          🆓 التجربة المجانية
        </h3>
        {renderNumberInput("أيام التجربة", "trial_days")}
        {renderSaveButton("trial_days")}
      </div>

      {/* Chat Budget Section */}
      <div className="themed-card p-5 space-y-4">
        <h3
          className="font-cairo text-base font-bold flex items-center gap-2"
          style={{ color: "var(--theme-text-primary)" }}
        >
          🤖 ميزانية الـ AI Chat
        </h3>
        {["trial", "one_subject", "three_subjects", "all_subjects"].map(
          (plan) => (
            <div
              key={plan}
              className="p-3 rounded-xl space-y-2"
              style={{
                background: "var(--theme-hover-overlay)",
                border: "1px solid var(--theme-surface-border)",
              }}
            >
              <p
                className="font-cairo text-sm font-semibold"
                style={{ color: "var(--theme-text-primary)" }}
              >
                {planLabels[plan] || plan}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center justify-between gap-2">
                  <label
                    className="font-cairo text-xs"
                    style={{ color: "var(--theme-text-secondary)" }}
                  >
                    رسائل يومية
                  </label>
                  <input
                    type="number"
                    className="themed-input w-24 font-cairo text-sm text-left"
                    dir="ltr"
                    value={
                      chatBudget[plan]?.daily_messages ?? ""
                    }
                    onChange={(e) => {
                      const updated = { ...chatBudget };
                      if (!updated[plan]) updated[plan] = {};
                      updated[plan].daily_messages =
                        e.target.value === "" ? "" : Number(e.target.value);
                      setEditValues((prev) => ({
                        ...prev,
                        chat_budget: updated,
                      }));
                    }}
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <label
                    className="font-cairo text-xs"
                    style={{ color: "var(--theme-text-secondary)" }}
                  >
                    توكنز يومية
                  </label>
                  <input
                    type="number"
                    className="themed-input w-24 font-cairo text-sm text-left"
                    dir="ltr"
                    value={
                      chatBudget[plan]?.daily_tokens ?? ""
                    }
                    onChange={(e) => {
                      const updated = { ...chatBudget };
                      if (!updated[plan]) updated[plan] = {};
                      updated[plan].daily_tokens =
                        e.target.value === "" ? "" : Number(e.target.value);
                      setEditValues((prev) => ({
                        ...prev,
                        chat_budget: updated,
                      }));
                    }}
                  />
                </div>
              </div>
            </div>
          )
        )}
        {renderSaveButton("chat_budget")}
      </div>

      {/* Cost Config Section */}
      <div className="themed-card p-5 space-y-4">
        <h3
          className="font-cairo text-base font-bold flex items-center gap-2"
          style={{ color: "var(--theme-text-primary)" }}
        >
          📊 تكاليف
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <label
              className="font-cairo text-sm whitespace-nowrap"
              style={{ color: "var(--theme-text-primary)" }}
            >
              سعر الدولار بالجنيه
            </label>
            <input
              type="number"
              step="0.01"
              className="themed-input w-32 font-cairo text-sm text-left"
              dir="ltr"
              value={costConfig.usd_to_egp ?? ""}
              onChange={(e) => {
                const updated = { ...costConfig };
                updated.usd_to_egp =
                  e.target.value === "" ? "" : Number(e.target.value);
                setEditValues((prev) => ({
                  ...prev,
                  cost_config: updated,
                }));
              }}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <label
              className="font-cairo text-sm whitespace-nowrap"
              style={{ color: "var(--theme-text-primary)" }}
            >
              عمولة Stripe %
            </label>
            <input
              type="number"
              step="0.01"
              className="themed-input w-32 font-cairo text-sm text-left"
              dir="ltr"
              value={costConfig.stripe_fee_percent ?? ""}
              onChange={(e) => {
                const updated = { ...costConfig };
                updated.stripe_fee_percent =
                  e.target.value === "" ? "" : Number(e.target.value);
                setEditValues((prev) => ({
                  ...prev,
                  cost_config: updated,
                }));
              }}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <label
              className="font-cairo text-sm whitespace-nowrap"
              style={{ color: "var(--theme-text-primary)" }}
            >
              عمولة Paymob %
            </label>
            <input
              type="number"
              step="0.01"
              className="themed-input w-32 font-cairo text-sm text-left"
              dir="ltr"
              value={costConfig.paymob_fee_percent ?? ""}
              onChange={(e) => {
                const updated = { ...costConfig };
                updated.paymob_fee_percent =
                  e.target.value === "" ? "" : Number(e.target.value);
                setEditValues((prev) => ({
                  ...prev,
                  cost_config: updated,
                }));
              }}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <label
              className="font-cairo text-sm whitespace-nowrap"
              style={{ color: "var(--theme-text-primary)" }}
            >
              تكلفة Claude/1k توكنز
            </label>
            <input
              type="number"
              step="0.0001"
              className="themed-input w-32 font-cairo text-sm text-left"
              dir="ltr"
              value={costConfig.claude_cost_per_1k ?? ""}
              onChange={(e) => {
                const updated = { ...costConfig };
                updated.claude_cost_per_1k =
                  e.target.value === "" ? "" : Number(e.target.value);
                setEditValues((prev) => ({
                  ...prev,
                  cost_config: updated,
                }));
              }}
            />
          </div>
        </div>
        {renderSaveButton("cost_config")}
      </div>

      {/* Raw settings fallback – show any keys not covered above */}
      {settings
        .filter(
          (s: any) =>
            !["pricing", "trial_days", "chat_budget", "cost_config"].includes(
              s.key
            )
        )
        .map((s: any) => (
          <div key={s.key} className="themed-card p-5 space-y-3">
            <h4
              className="font-cairo text-sm font-bold"
              style={{ color: "var(--theme-text-primary)" }}
            >
              {s.key}
            </h4>
            <textarea
              className="themed-input w-full font-cairo text-sm min-h-[80px]"
              dir="ltr"
              value={
                typeof editValues[s.key] === "object"
                  ? JSON.stringify(editValues[s.key], null, 2)
                  : String(editValues[s.key] ?? "")
              }
              onChange={(e) => {
                let v: any = e.target.value;
                try {
                  v = JSON.parse(v);
                } catch {
                  /* keep as string */
                }
                setEditValues((prev) => ({ ...prev, [s.key]: v }));
              }}
            />
            {renderSaveButton(s.key)}
          </div>
        ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECRETS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function SecretsTab() {
  const [secrets, setSecrets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const fetchSecrets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI("get_secrets");
      if (res.success) setSecrets(res.data?.secrets ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSecrets();
  }, [fetchSecrets]);

  const saveSecret = async (key: string, value: string, description?: string) => {
    setSaving(true);
    try {
      const params: any = { key, value };
      if (description !== undefined) params.description = description;
      const res = await adminAPI("update_secret", params);
      if (res.success) {
        setToast({ message: "✅ تم الحفظ", type: "success" });
        setEditingKey(null);
        setShowAdd(false);
        setNewKey("");
        setNewValue("");
        setNewDesc("");
        fetchSecrets();
      } else {
        setToast({ message: res.error || "فشل الحفظ", type: "error" });
      }
    } catch {
      setToast({ message: "خطأ في الاتصال", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <h3
          className="font-cairo text-lg font-bold"
          style={{ color: "var(--theme-text-primary)" }}
        >
          مفاتيح API ({secrets.length})
        </h3>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="themed-btn-primary px-4 py-2 rounded-xl font-cairo text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          إضافة مفتاح
        </button>
      </div>

      {/* Add New Secret */}
      {showAdd && (
        <div
          className="themed-card p-5 space-y-3"
          style={{ border: "2px solid var(--theme-primary)" }}
        >
          <h4
            className="font-cairo text-sm font-bold"
            style={{ color: "var(--theme-text-primary)" }}
          >
            إضافة مفتاح جديد
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label
                className="block font-cairo text-xs mb-1"
                style={{ color: "var(--theme-text-secondary)" }}
              >
                المفتاح
              </label>
              <input
                type="text"
                className="themed-input w-full font-cairo text-sm"
                dir="ltr"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="API_KEY_NAME"
              />
            </div>
            <div>
              <label
                className="block font-cairo text-xs mb-1"
                style={{ color: "var(--theme-text-secondary)" }}
              >
                القيمة
              </label>
              <input
                type="text"
                className="themed-input w-full font-cairo text-sm"
                dir="ltr"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="sk-..."
              />
            </div>
            <div>
              <label
                className="block font-cairo text-xs mb-1"
                style={{ color: "var(--theme-text-secondary)" }}
              >
                الوصف
              </label>
              <input
                type="text"
                className="themed-input w-full font-cairo text-sm"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="وصف اختياري"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={() => setShowAdd(false)}
              className="themed-btn-outline px-4 py-2 rounded-xl font-cairo text-sm"
            >
              إلغاء
            </button>
            <button
              onClick={() => saveSecret(newKey, newValue, newDesc)}
              disabled={saving || !newKey || !newValue}
              className="themed-btn-primary px-4 py-2 rounded-xl font-cairo text-sm flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              حفظ
            </button>
          </div>
        </div>
      )}

      {/* Secrets Table */}
      {secrets.length === 0 ? (
        <EmptyState message="لا توجد مفاتيح بعد" />
      ) : (
        <div className="themed-card overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid var(--theme-surface-border)",
                }}
              >
                {["المفتاح", "القيمة", "الوصف", "آخر تحديث", "إجراءات"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 font-cairo text-xs font-semibold"
                      style={{ color: "var(--theme-text-secondary)" }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {secrets.map((s: any) => (
                <tr
                  key={s.key}
                  style={{
                    borderBottom: "1px solid var(--theme-surface-border)",
                  }}
                >
                  <td
                    className="px-4 py-3 font-cairo text-sm font-mono"
                    dir="ltr"
                    style={{ color: "var(--theme-text-primary)" }}
                  >
                    {s.key}
                  </td>
                  <td className="px-4 py-3">
                    {editingKey === s.key ? (
                      <input
                        type="text"
                        className="themed-input w-full font-cairo text-sm"
                        dir="ltr"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        placeholder="أدخل القيمة الجديدة"
                        autoFocus
                      />
                    ) : (
                      <span
                        className="font-cairo text-sm font-mono"
                        dir="ltr"
                        style={{ color: "var(--theme-text-secondary)" }}
                      >
                        {s.masked_value || "••••••••"}
                      </span>
                    )}
                  </td>
                  <td
                    className="px-4 py-3 font-cairo text-xs"
                    style={{ color: "var(--theme-text-secondary)" }}
                  >
                    {s.description || "-"}
                  </td>
                  <td
                    className="px-4 py-3 font-cairo text-xs"
                    dir="ltr"
                    style={{ color: "var(--theme-text-secondary)" }}
                  >
                    {s.updated_at
                      ? new Date(s.updated_at).toLocaleDateString("ar-EG")
                      : "-"}
                  </td>
                  <td className="px-4 py-3">
                    {editingKey === s.key ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            saveSecret(s.key, editValue, editDesc || undefined)
                          }
                          disabled={saving || !editValue}
                          className="themed-btn-primary px-3 py-1.5 rounded-lg font-cairo text-xs flex items-center gap-1 disabled:opacity-50"
                        >
                          {saving ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Save className="w-3 h-3" />
                          )}
                          حفظ
                        </button>
                        <button
                          onClick={() => setEditingKey(null)}
                          className="themed-btn-outline px-3 py-1.5 rounded-lg font-cairo text-xs"
                        >
                          إلغاء
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingKey(s.key);
                          setEditValue("");
                          setEditDesc(s.description || "");
                        }}
                        className="themed-btn-outline px-3 py-1.5 rounded-lg font-cairo text-xs flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        تعديل
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// THEMES TAB
// ═══════════════════════════════════════════════════════════════════════════════
function ThemesTab() {
  const [themes, setThemes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [schedules, setSchedules] = useState<
    Record<string, { auto_activate_at: string; auto_deactivate_at: string }>
  >({});

  const fetchThemes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI("get_themes");
      if (res.success) {
        const t = res.data?.themes ?? [];
        setThemes(t);
        const sched: Record<string, any> = {};
        t.forEach((th: any) => {
          sched[th.slug] = {
            auto_activate_at: th.auto_activate_at
              ? new Date(th.auto_activate_at).toISOString().slice(0, 16)
              : "",
            auto_deactivate_at: th.auto_deactivate_at
              ? new Date(th.auto_deactivate_at).toISOString().slice(0, 16)
              : "",
          };
        });
        setSchedules(sched);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchThemes();
  }, [fetchThemes]);

  const activateTheme = async (slug: string) => {
    setSaving(slug);
    try {
      // Deactivate all others, activate this one
      const res = await adminAPI("update_theme", {
        slug,
        updates: { is_active: true },
      });
      if (res.success) {
        setToast({ message: "✅ تم التفعيل", type: "success" });
        fetchThemes();
      } else {
        setToast({ message: res.error || "فشل التفعيل", type: "error" });
      }
    } catch {
      setToast({ message: "خطأ في الاتصال", type: "error" });
    } finally {
      setSaving(null);
    }
  };

  const saveSchedule = async (slug: string) => {
    setSaving(slug + "_sched");
    try {
      const sched = schedules[slug] || {};
      const updates: any = {};
      if (sched.auto_activate_at)
        updates.auto_activate_at = new Date(sched.auto_activate_at).toISOString();
      else updates.auto_activate_at = null;
      if (sched.auto_deactivate_at)
        updates.auto_deactivate_at = new Date(sched.auto_deactivate_at).toISOString();
      else updates.auto_deactivate_at = null;

      const res = await adminAPI("update_theme", { slug, updates });
      if (res.success) {
        setToast({ message: "✅ تم حفظ الجدولة", type: "success" });
        fetchThemes();
      } else {
        setToast({ message: res.error || "فشل الحفظ", type: "error" });
      }
    } catch {
      setToast({ message: "خطأ في الاتصال", type: "error" });
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <Spinner />;
  if (themes.length === 0) return <EmptyState message="لا توجد ثيمات بعد" />;

  return (
    <div className="space-y-4">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <h3
        className="font-cairo text-lg font-bold"
        style={{ color: "var(--theme-text-primary)" }}
      >
        الثيمات ({themes.length})
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {themes.map((theme: any) => {
          const sched = schedules[theme.slug] || {
            auto_activate_at: "",
            auto_deactivate_at: "",
          };
          return (
            <div
              key={theme.id || theme.slug}
              className="themed-card p-5 space-y-4"
              style={
                theme.is_active
                  ? { border: "2px solid var(--theme-primary)" }
                  : {}
              }
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Palette
                      className="w-5 h-5"
                      style={{ color: "var(--theme-primary)" }}
                    />
                    <h4
                      className="font-cairo text-base font-bold"
                      style={{ color: "var(--theme-text-primary)" }}
                    >
                      {theme.name_ar || theme.slug}
                    </h4>
                  </div>
                  <p
                    className="font-cairo text-xs mt-0.5"
                    style={{ color: "var(--theme-text-secondary)" }}
                  >
                    {theme.name_en || ""} · {theme.slug}
                  </p>
                </div>
                {theme.is_active ? (
                  <StatusBadge label="مفعّل" color="#10B981" />
                ) : (
                  <button
                    onClick={() => activateTheme(theme.slug)}
                    disabled={saving === theme.slug}
                    className="themed-btn-primary px-3 py-1.5 rounded-lg font-cairo text-xs flex items-center gap-1 disabled:opacity-50"
                  >
                    {saving === theme.slug ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : null}
                    تفعيل
                  </button>
                )}
              </div>

              {/* Schedule */}
              <div
                className="p-3 rounded-xl space-y-2"
                style={{
                  background: "var(--theme-hover-overlay)",
                  border: "1px solid var(--theme-surface-border)",
                }}
              >
                <p
                  className="font-cairo text-xs font-semibold"
                  style={{ color: "var(--theme-text-secondary)" }}
                >
                  جدولة التفعيل / الإيقاف
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      className="block font-cairo text-xs mb-1"
                      style={{ color: "var(--theme-text-secondary)" }}
                    >
                      تفعيل تلقائي
                    </label>
                    <input
                      type="datetime-local"
                      className="themed-input w-full font-cairo text-xs"
                      dir="ltr"
                      value={sched.auto_activate_at}
                      onChange={(e) =>
                        setSchedules((prev) => ({
                          ...prev,
                          [theme.slug]: {
                            ...prev[theme.slug],
                            auto_activate_at: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label
                      className="block font-cairo text-xs mb-1"
                      style={{ color: "var(--theme-text-secondary)" }}
                    >
                      إيقاف تلقائي
                    </label>
                    <input
                      type="datetime-local"
                      className="themed-input w-full font-cairo text-xs"
                      dir="ltr"
                      value={sched.auto_deactivate_at}
                      onChange={(e) =>
                        setSchedules((prev) => ({
                          ...prev,
                          [theme.slug]: {
                            ...prev[theme.slug],
                            auto_deactivate_at: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                </div>
                <button
                  onClick={() => saveSchedule(theme.slug)}
                  disabled={saving === theme.slug + "_sched"}
                  className="themed-btn-outline px-3 py-1.5 rounded-lg font-cairo text-xs flex items-center gap-1 disabled:opacity-50 mt-1"
                >
                  {saving === theme.slug + "_sched" ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Save className="w-3 h-3" />
                  )}
                  حفظ الجدولة
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ADMIN PANEL
// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminPanel() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  // ── Auth guard ────────────────────────────────────────────────────────────
  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 font-cairo"
        dir="rtl"
      >
        <Shield
          className="w-16 h-16 mb-4"
          style={{ color: "var(--theme-text-secondary)", opacity: 0.4 }}
        />
        <h2
          className="text-xl font-bold mb-2"
          style={{ color: "var(--theme-text-primary)" }}
        >
          لوحة التحكم للمشرفين فقط
        </h2>
        <p
          className="text-sm mb-6"
          style={{ color: "var(--theme-text-secondary)" }}
        >
          يجب تسجيل الدخول بحساب مشرف للوصول لهذه الصفحة
        </p>
        <button
          onClick={() => router.push("/login")}
          className="themed-btn-primary px-6 py-3 rounded-xl font-cairo text-sm"
        >
          تسجيل الدخول
        </button>
      </div>
    );
  }

  // ── Tab rendering ─────────────────────────────────────────────────────────
  const renderTab = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewTab />;
      case "students":
        return <StudentsTab />;
      case "subscriptions":
        return <SubscriptionsTab />;
      case "subjects":
        return <SubjectsTab />;
      case "payments":
        return <PaymentsTab />;
      case "settings":
        return <SettingsTab />;
      case "secrets":
        return <SecretsTab />;
      case "themes":
        return <ThemesTab />;
      default:
        return null;
    }
  };

  return (
    <div
      className="min-h-screen font-cairo"
      dir="rtl"
      style={{ background: "var(--theme-surface-bg)" }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-50 px-4 py-3"
        style={{
          background: "var(--theme-surface-bg)",
          borderBottom: "1px solid var(--theme-surface-border)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "var(--theme-cta-gradient)" }}
              >
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1
                  className="text-lg font-bold"
                  style={{ color: "var(--theme-text-primary)" }}
                >
                  لوحة التحكم
                </h1>
                <p
                  className="text-xs"
                  style={{ color: "var(--theme-text-secondary)" }}
                >
                  إدارة منصة منهج AI
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push("/")}
              className="themed-btn-outline px-3 py-1.5 rounded-lg text-xs flex items-center gap-1"
            >
              العودة للرئيسية
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="overflow-x-auto -mx-4 px-4 scrollbar-hide">
            <div className="flex items-center gap-1 min-w-max pb-1">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                      isActive ? "text-white shadow-lg" : ""
                    }`}
                    style={
                      isActive
                        ? { background: "var(--theme-cta-gradient)" }
                        : {
                            color: "var(--theme-text-secondary)",
                            background: "transparent",
                          }
                    }
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto p-4 md:p-6">{renderTab()}</div>
    </div>
  );
}
