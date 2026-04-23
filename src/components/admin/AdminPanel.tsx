"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useUIStore } from "@/store/ui-store";
import {
  BarChart3, Users, CreditCard, BookOpen, GraduationCap,
  Palette, TrendingUp, DollarSign, Eye, Check,
  Shield, Plus, Edit, Trash2, Search, Loader2, Save,
  Settings, Package, Key, ToggleLeft, ToggleRight, X,
  CheckCircle, XCircle, RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { ThemeSlug as Theme } from "@/store/ui-store";

// ===== ADMIN API HELPER =====
async function adminAPI(action: string, params: Record<string, unknown> = {}) {
  const res = await fetch('/api/admin/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...params }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'فشل في العملية');
  return data.data;
}

// ===== TABS =====
const tabs = [
  { key: "overview", label: "نظرة عامة", icon: BarChart3 },
  { key: "subscriptions", label: "الاشتراكات", icon: CreditCard },
  { key: "grades", label: "الصفوف", icon: GraduationCap },
  { key: "subjects", label: "المواد", icon: BookOpen },
  { key: "payments", label: "المدفوعات", icon: DollarSign },
  { key: "themes", label: "الثيمات", icon: Palette },
  { key: "payment_config", label: "💳 إعدادات الدفع", icon: Settings },
  { key: "plans", label: "📦 الخطط", icon: Package },
];

// ===== STATIC DATA (for tabs that still use mock data) =====
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

// ═══════════════════════════════════════════
// PaymentsConfigTab Component
// ═══════════════════════════════════════════
const STRIPE_KEYS = [
  { key: 'STRIPE_SECRET_KEY', label: 'المفتاح السري (Secret Key)' },
  { key: 'STRIPE_PUBLISHABLE_KEY', label: 'المفتاح العام (Publishable Key)' },
  { key: 'STRIPE_WEBHOOK_SECRET', label: 'مفتاح Webhook' },
];

const PAYMOB_KEYS = [
  { key: 'PAYMOB_API_KEY', label: 'مفتاح API' },
  { key: 'PAYMOB_VODAFONE_INTEGRATION_ID', label: 'معرف تكامل فودافون كاش' },
  { key: 'PAYMOB_FAWRY_INTEGRATION_ID', label: 'معرف تكامل فوري' },
  { key: 'PAYMOB_INSTAPAY_INTEGRATION_ID', label: 'معرف تكامل إنستاباي' },
  { key: 'PAYMOB_IFRAME_ID', label: 'معرف iFrame' },
  { key: 'PAYMOB_HMAC_SECRET', label: 'مفتاح HMAC' },
];

const PAYMENT_METHODS = [
  { key: 'payment_stripe_enabled', label: 'بطاقة بنكية (Stripe)', icon: '💳' },
  { key: 'payment_vodafone_enabled', label: 'فودافون كاش', icon: '📱' },
  { key: 'payment_fawry_enabled', label: 'فوري', icon: '🏪' },
  { key: 'payment_instapay_enabled', label: 'إنستاباي', icon: '🏦' },
];

function PaymentsConfigTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [configuredKeys, setConfiguredKeys] = useState<Set<string>>(new Set());
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [secretValues, setSecretValues] = useState<Record<string, string>>({});
  const [methodToggles, setMethodToggles] = useState<Record<string, boolean>>({});

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminAPI('get_payment_config');
      const configured = new Set<string>();
      (data.secrets || []).forEach((s: Record<string, unknown>) => {
        if (s.has_value) configured.add(s.key as string);
      });
      setConfiguredKeys(configured);
      const toggles: Record<string, boolean> = {};
      (data.settings || []).forEach((s: Record<string, unknown>) => {
        toggles[s.key as string] = s.value === 'true';
      });
      setMethodToggles(toggles);
    } catch {
      setMessage('فشل في تحميل الإعدادات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const saveSecret = async (key: string, value: string) => {
    if (!value.trim()) return;
    setSaving(true);
    try {
      await adminAPI('update_payment_config', { secret_key: key, secret_value: value });
      const next = new Set(Array.from(configuredKeys)); next.add(key); setConfiguredKeys(next);
      setEditingKey(null);
      setSecretValues(prev => ({ ...prev, [key]: '' }));
      setMessage('تم حفظ المفتاح بنجاح ✅');
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'فشل في الحفظ');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const toggleMethod = async (key: string, val: boolean) => {
    try {
      await adminAPI('update_payment_config', { setting_key: key, setting_value: String(val) });
      setMethodToggles(prev => ({ ...prev, [key]: val }));
    } catch {
      setMessage('فشل في تحديث الإعداد');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="animate-spin" size={32} style={{ color: 'var(--theme-primary)' }} />
    </div>
  );

  const renderSecretRow = (item: { key: string; label: string }) => {
    const isConfigured = configuredKeys.has(item.key);
    const isEditing = editingKey === item.key;
    return (
      <div key={item.key} className="flex items-center gap-3 py-3" style={{ borderBottom: '1px solid var(--theme-surface-border)' }}>
        <div className="flex-1">
          <div className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>{item.label}</div>
          <div className="text-xs font-mono" style={{ color: 'var(--theme-text-muted)' }}>{item.key}</div>
        </div>
        {isConfigured && !isEditing && (
          <span className="flex items-center gap-1 text-xs font-bold" style={{ color: '#10B981' }}>
            <CheckCircle size={14} /> مهيأ
          </span>
        )}
        {!isConfigured && !isEditing && (
          <span className="flex items-center gap-1 text-xs font-bold" style={{ color: '#EF4444' }}>
            <XCircle size={14} /> غير مهيأ
          </span>
        )}
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type="password"
              className="themed-input text-xs py-1 px-2"
              style={{ width: '220px', fontFamily: 'monospace' }}
              placeholder="أدخل القيمة..."
              value={secretValues[item.key] || ''}
              onChange={e => setSecretValues(prev => ({ ...prev, [item.key]: e.target.value }))}
            />
            <button
              onClick={() => saveSecret(item.key, secretValues[item.key] || '')}
              disabled={saving}
              className="themed-btn-primary px-3 py-1 text-xs flex items-center gap-1"
            >
              {saving ? <Loader2 className="animate-spin" size={12} /> : <Save size={12} />}
              حفظ
            </button>
            <button onClick={() => setEditingKey(null)} className="p-1 rounded" style={{ color: 'var(--theme-text-muted)' }}>
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditingKey(item.key)}
            className="themed-btn-outline px-3 py-1 text-xs flex items-center gap-1"
          >
            <Edit size={12} /> تعديل
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {message && (
        <div className="themed-card p-3 text-sm font-bold text-center" style={{ color: message.includes('✅') ? '#10B981' : '#EF4444' }}>
          {message}
        </div>
      )}

      {/* Stripe Section */}
      <div className="themed-card p-5">
        <h3 className="text-lg font-extrabold mb-4 flex items-center gap-2" style={{ color: 'var(--theme-text-primary)' }}>
          💳 إعدادات Stripe
        </h3>
        <div>{STRIPE_KEYS.map(renderSecretRow)}</div>
      </div>

      {/* Paymob Section */}
      <div className="themed-card p-5">
        <h3 className="text-lg font-extrabold mb-4 flex items-center gap-2" style={{ color: 'var(--theme-text-primary)' }}>
          🏦 إعدادات Paymob
        </h3>
        <div>{PAYMOB_KEYS.map(renderSecretRow)}</div>
      </div>

      {/* Payment Methods Toggle */}
      <div className="themed-card p-5">
        <h3 className="text-lg font-extrabold mb-4 flex items-center gap-2" style={{ color: 'var(--theme-text-primary)' }}>
          🔀 طرق الدفع المتاحة
        </h3>
        <div className="space-y-3">
          {PAYMENT_METHODS.map(method => {
            const isOn = !!methodToggles[method.key];
            return (
              <div key={method.key} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--theme-surface-border)' }}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">{method.icon}</span>
                  <span className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>{method.label}</span>
                </div>
                <button onClick={() => toggleMethod(method.key, !isOn)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  {isOn
                    ? <ToggleRight size={28} style={{ color: '#10B981' }} />
                    : <ToggleLeft size={28} style={{ color: 'var(--theme-text-muted)' }} />
                  }
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Refresh */}
      <button onClick={loadConfig} className="themed-btn-outline px-4 py-2 flex items-center gap-2 text-sm mx-auto">
        <RefreshCw size={14} /> تحديث البيانات
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════
// SubscriptionPlansTab Component
// ═══════════════════════════════════════════
interface Plan {
  id: string;
  name_ar: string;
  name_en?: string;
  max_subjects: number;
  price_monthly: number;
  price_term?: number;
  price_annual?: number;
  discount_percent: number;
  features_ar: string[];
  is_active: boolean;
}

function SubscriptionPlansTab() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    name_ar: '', name_en: '', max_subjects: 1,
    price_monthly: 89, price_term: 0, price_annual: 0,
    discount_percent: 0, features_text: '', is_active: true,
  });

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminAPI('get_plans');
      setPlans(data.plans || []);
    } catch {
      setMessage('فشل في تحميل الخطط');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  const resetForm = () => {
    setFormData({ name_ar: '', name_en: '', max_subjects: 1, price_monthly: 89, price_term: 0, price_annual: 0, discount_percent: 0, features_text: '', is_active: true });
    setEditingPlan(null);
    setShowForm(false);
  };

  const openEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      name_ar: plan.name_ar,
      name_en: plan.name_en || '',
      max_subjects: plan.max_subjects,
      price_monthly: plan.price_monthly,
      price_term: plan.price_term || 0,
      price_annual: plan.price_annual || 0,
      discount_percent: plan.discount_percent,
      features_text: (plan.features_ar || []).join('\n'),
      is_active: plan.is_active,
    });
    setShowForm(true);
  };

  const savePlan = async () => {
    try {
      const features_ar = formData.features_text.split('\n').map(f => f.trim()).filter(Boolean);
      const payload = {
        name_ar: formData.name_ar, name_en: formData.name_en || null,
        max_subjects: formData.max_subjects, price_monthly: formData.price_monthly,
        price_term: formData.price_term || null, price_annual: formData.price_annual || null,
        discount_percent: formData.discount_percent, features_ar, is_active: formData.is_active,
      };
      if (editingPlan) {
        await adminAPI('update_plan', { id: editingPlan.id, ...payload });
      } else {
        await adminAPI('create_plan', payload);
      }
      setMessage(editingPlan ? 'تم تحديث الخطة ✅' : 'تم إنشاء الخطة ✅');
      resetForm();
      loadPlans();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'فشل في الحفظ');
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const deletePlan = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الخطة؟')) return;
    try {
      await adminAPI('delete_plan', { id });
      setMessage('تم حذف الخطة ✅');
      loadPlans();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'فشل في الحذف');
    }
    setTimeout(() => setMessage(''), 3000);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="animate-spin" size={32} style={{ color: 'var(--theme-primary)' }} />
    </div>
  );

  return (
    <div className="space-y-6">
      {message && (
        <div className="themed-card p-3 text-sm font-bold text-center" style={{ color: message.includes('✅') ? '#10B981' : '#EF4444' }}>
          {message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-extrabold" style={{ color: 'var(--theme-text-primary)' }}>📦 خطط الاشتراك</h3>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="themed-btn-primary px-4 py-2 text-sm flex items-center gap-2">
          <Plus size={16} /> إضافة خطة
        </button>
      </div>

      {/* Plans Table */}
      <div className="themed-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--theme-hover-overlay)' }}>
              <th className="p-3 text-right font-bold" style={{ color: 'var(--theme-text-secondary)' }}>الاسم</th>
              <th className="p-3 text-right font-bold" style={{ color: 'var(--theme-text-secondary)' }}>المواد</th>
              <th className="p-3 text-right font-bold" style={{ color: 'var(--theme-text-secondary)' }}>شهري</th>
              <th className="p-3 text-right font-bold" style={{ color: 'var(--theme-text-secondary)' }}>ترم</th>
              <th className="p-3 text-right font-bold" style={{ color: 'var(--theme-text-secondary)' }}>سنوي</th>
              <th className="p-3 text-right font-bold" style={{ color: 'var(--theme-text-secondary)' }}>خصم %</th>
              <th className="p-3 text-right font-bold" style={{ color: 'var(--theme-text-secondary)' }}>الحالة</th>
              <th className="p-3 text-right font-bold" style={{ color: 'var(--theme-text-secondary)' }}>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {plans.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-sm" style={{ color: 'var(--theme-text-muted)' }}>
                  لا توجد خطط بعد — أضف خطة جديدة
                </td>
              </tr>
            ) : plans.map(plan => (
              <tr key={plan.id} style={{ borderBottom: '1px solid var(--theme-surface-border)' }}>
                <td className="p-3 font-bold" style={{ color: 'var(--theme-text-primary)' }}>{plan.name_ar}</td>
                <td className="p-3" style={{ color: 'var(--theme-text-secondary)' }}>{plan.max_subjects}</td>
                <td className="p-3 font-bold" style={{ color: 'var(--theme-primary)' }}>{plan.price_monthly} ج.م</td>
                <td className="p-3" style={{ color: 'var(--theme-text-secondary)' }}>{plan.price_term ? `${plan.price_term} ج.م` : '—'}</td>
                <td className="p-3" style={{ color: 'var(--theme-text-secondary)' }}>{plan.price_annual ? `${plan.price_annual} ج.م` : '—'}</td>
                <td className="p-3" style={{ color: 'var(--theme-text-secondary)' }}>{plan.discount_percent}%</td>
                <td className="p-3">
                  <span className="px-2 py-1 rounded-lg text-xs font-bold"
                    style={{ background: plan.is_active ? '#10B98115' : '#EF444415', color: plan.is_active ? '#10B981' : '#EF4444' }}>
                    {plan.is_active ? 'نشط' : 'معطل'}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(plan)} className="p-1.5 rounded-lg" style={{ background: 'var(--theme-hover-overlay)', border: 'none', cursor: 'pointer' }}>
                      <Edit size={14} style={{ color: 'var(--theme-primary)' }} />
                    </button>
                    <button onClick={() => deletePlan(plan.id)} className="p-1.5 rounded-lg" style={{ background: 'rgba(220,38,38,0.1)', border: 'none', cursor: 'pointer' }}>
                      <Trash2 size={14} style={{ color: '#DC2626' }} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Plan Form */}
      {showForm && (
        <div className="themed-card p-5 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold" style={{ color: 'var(--theme-text-primary)' }}>
              {editingPlan ? '✏️ تعديل الخطة' : '➕ خطة جديدة'}
            </h4>
            <button onClick={resetForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--theme-text-muted)' }}>
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold mb-1 block" style={{ color: 'var(--theme-text-secondary)' }}>الاسم بالعربية *</label>
              <input className="themed-input w-full" value={formData.name_ar} onChange={e => setFormData(p => ({ ...p, name_ar: e.target.value }))} placeholder="مثال: خطة المادة الواحدة" />
            </div>
            <div>
              <label className="text-xs font-bold mb-1 block" style={{ color: 'var(--theme-text-secondary)' }}>الاسم بالإنجليزية</label>
              <input className="themed-input w-full" value={formData.name_en} onChange={e => setFormData(p => ({ ...p, name_en: e.target.value }))} placeholder="e.g. Single Subject" />
            </div>
            <div>
              <label className="text-xs font-bold mb-1 block" style={{ color: 'var(--theme-text-secondary)' }}>عدد المواد</label>
              <input type="number" min={1} className="themed-input w-full" value={formData.max_subjects} onChange={e => setFormData(p => ({ ...p, max_subjects: parseInt(e.target.value) || 1 }))} />
            </div>
            <div>
              <label className="text-xs font-bold mb-1 block" style={{ color: 'var(--theme-text-secondary)' }}>السعر الشهري (ج.م)</label>
              <input type="number" min={0} className="themed-input w-full" value={formData.price_monthly} onChange={e => setFormData(p => ({ ...p, price_monthly: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="text-xs font-bold mb-1 block" style={{ color: 'var(--theme-text-secondary)' }}>سعر الترم (ج.م)</label>
              <input type="number" min={0} className="themed-input w-full" value={formData.price_term} onChange={e => setFormData(p => ({ ...p, price_term: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="text-xs font-bold mb-1 block" style={{ color: 'var(--theme-text-secondary)' }}>السعر السنوي (ج.م)</label>
              <input type="number" min={0} className="themed-input w-full" value={formData.price_annual} onChange={e => setFormData(p => ({ ...p, price_annual: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="text-xs font-bold mb-1 block" style={{ color: 'var(--theme-text-secondary)' }}>نسبة الخصم %</label>
              <input type="number" min={0} max={100} className="themed-input w-full" value={formData.discount_percent} onChange={e => setFormData(p => ({ ...p, discount_percent: parseInt(e.target.value) || 0 }))} />
            </div>
            <div className="flex items-center gap-3 pt-5">
              <label className="text-sm font-bold" style={{ color: 'var(--theme-text-secondary)' }}>نشط</label>
              <button onClick={() => setFormData(p => ({ ...p, is_active: !p.is_active }))} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                {formData.is_active
                  ? <ToggleRight size={28} style={{ color: '#10B981' }} />
                  : <ToggleLeft size={28} style={{ color: 'var(--theme-text-muted)' }} />
                }
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold mb-1 block" style={{ color: 'var(--theme-text-secondary)' }}>المميزات (سطر لكل ميزة)</label>
            <textarea className="themed-input w-full" rows={4} value={formData.features_text}
              onChange={e => setFormData(p => ({ ...p, features_text: e.target.value }))}
              placeholder={"شرح تفاعلي بالذكاء الاصطناعي\nامتحانات ذكية\nتقارير مفصلة"} />
          </div>

          {/* Price Preview */}
          <div className="themed-card p-4" style={{ background: 'var(--theme-hover-overlay)' }}>
            <h5 className="text-xs font-bold mb-2" style={{ color: 'var(--theme-text-secondary)' }}>معاينة الأسعار:</h5>
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div>
                <div className="font-bold" style={{ color: 'var(--theme-primary)' }}>{formData.price_monthly} ج.م</div>
                <div className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>شهري</div>
              </div>
              <div>
                <div className="font-bold" style={{ color: 'var(--theme-primary)' }}>{formData.price_term || '—'} {formData.price_term ? 'ج.م' : ''}</div>
                <div className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>ترم</div>
              </div>
              <div>
                <div className="font-bold" style={{ color: 'var(--theme-primary)' }}>{formData.price_annual || '—'} {formData.price_annual ? 'ج.م' : ''}</div>
                <div className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>سنوي</div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button onClick={resetForm} className="themed-btn-outline px-4 py-2 text-sm">إلغاء</button>
            <button onClick={savePlan} disabled={!formData.name_ar.trim()} className="themed-btn-primary px-6 py-2 text-sm flex items-center gap-2">
              <Save size={14} /> {editingPlan ? 'تحديث' : 'إنشاء'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// Main AdminPanel
// ═══════════════════════════════════════════
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

      {/* ═══ PAYMENT CONFIG TAB ═══ */}
      {activeTab === "payment_config" && <PaymentsConfigTab />}

      {/* ═══ SUBSCRIPTION PLANS TAB ═══ */}
      {activeTab === "plans" && <SubscriptionPlansTab />}
    </div>
  );
}
