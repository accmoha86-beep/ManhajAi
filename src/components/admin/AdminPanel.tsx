'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, BookOpen, Settings, BarChart3, Shield, Bell, Tag, Layers, FileText, Download,
  Plus, Trash2, Edit, ToggleLeft, ToggleRight, Eye, EyeOff, Search, RefreshCw,
  ChevronDown, ChevronUp, X, Check, AlertTriangle, Loader2, Upload
} from 'lucide-react';
import AdminNotifications from '@/components/admin/AdminNotifications';

// ==================== Types ====================
interface TabDef {
  key: string;
  label: string;
  icon?: any;
}

// ==================== Admin API Helper ====================
async function adminAPI(action: string, params: Record<string, any> = {}) {
  const res = await fetch('/api/admin/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...params }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `API Error ${res.status}`);
  }
  return res.json();
}

// ==================== Main AdminPanel ====================
export default function AdminPanel() {
  const TABS: TabDef[] = [
    { key: 'dashboard', label: '📊 لوحة التحكم' },
    { key: 'students', label: '👥 الطلاب' },
    { key: 'subjects', label: '📚 المواد' },
    { key: 'exams', label: '📝 الامتحانات' },
    { key: 'questions', label: '❓ الأسئلة' },
    { key: 'settings', label: '⚙️ الإعدادات' },
    { key: 'notifications', label: '🔔 الإشعارات' },
    { key: 'coupons', label: '🏷️ الكوبونات' },
    { key: 'grades', label: '📋 المراحل الدراسية' },
    { key: 'content', label: '📄 توليد المحتوى' },
    { key: 'reports', label: '📊 التقارير' },
  ];

  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);

  return (
    <div className="font-cairo min-h-screen" dir="rtl">
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 p-4 border-b" style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-card)' }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: activeTab === tab.key ? 'var(--theme-primary)' : 'var(--theme-bg)',
              color: activeTab === tab.key ? '#fff' : 'var(--theme-text-primary)',
              border: `1px solid ${activeTab === tab.key ? 'var(--theme-primary)' : 'var(--theme-border)'}`,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-4 md:p-6">
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'students' && <StudentsTab />}
        {activeTab === 'subjects' && <SubjectsTab />}
        {activeTab === 'exams' && <ExamsTab />}
        {activeTab === 'questions' && <QuestionsTab />}
        {activeTab === 'settings' && <SettingsTab />}
        {activeTab === 'notifications' && <NotificationsAdminTab />}
        {activeTab === 'coupons' && <CouponsTab />}
        {activeTab === 'grades' && <GradesTab />}
        {activeTab === 'content' && <ContentTab />}
        {activeTab === 'reports' && <ReportsTab />}
      </div>
    </div>
  );
}

// ==================== Shared Card Component ====================
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl p-4 md:p-6 ${className}`}
      style={{
        backgroundColor: 'var(--theme-card)',
        border: '1px solid var(--theme-border)',
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-bold mb-4 font-cairo" style={{ color: 'var(--theme-text-primary)' }}>
      {children}
    </h2>
  );
}

// ==================== Dashboard Tab ====================
function DashboardTab() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await adminAPI('get_stats');
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" size={32} style={{ color: 'var(--theme-primary)' }} /></div>;

  const statCards = [
    { label: 'إجمالي الطلاب', value: stats?.total_students || 0, icon: Users, color: '#4472C4' },
    { label: 'الطلاب النشطين', value: stats?.active_students || 0, icon: Users, color: '#10B981' },
    { label: 'المواد المنشورة', value: stats?.published_subjects || 0, icon: BookOpen, color: '#F59E0B' },
    { label: 'إجمالي الامتحانات', value: stats?.total_exams || 0, icon: BarChart3, color: '#8B5CF6' },
  ];

  return (
    <div className="space-y-6">
      <SectionTitle>📊 لوحة التحكم</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <Card key={i}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: s.color + '20' }}>
                <s.icon size={24} style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>{s.label}</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--theme-text-primary)' }}>{s.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ==================== Students Tab ====================
function StudentsTab() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const data = await adminAPI('get_students');
      setStudents(data.students || data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleBan = async (userId: string, isBanned: boolean) => {
    try {
      await adminAPI(isBanned ? 'unban_student' : 'ban_student', { user_id: userId });
      loadStudents();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = students.filter((s: any) =>
    (s.full_name || '').includes(searchTerm) || (s.phone || '').includes(searchTerm)
  );

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" size={32} style={{ color: 'var(--theme-primary)' }} /></div>;

  return (
    <div className="space-y-4">
      <SectionTitle>👥 إدارة الطلاب</SectionTitle>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2" size={18} style={{ color: 'var(--theme-text-secondary)' }} />
          <input
            type="text"
            placeholder="بحث بالاسم أو الهاتف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2 rounded-lg border font-cairo"
            style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text-primary)' }}
          />
        </div>
        <button onClick={loadStudents} className="p-2 rounded-lg" style={{ backgroundColor: 'var(--theme-primary)', color: '#fff' }}>
          <RefreshCw size={18} />
        </button>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '2px solid var(--theme-border)' }}>
                <th className="text-right p-3 font-cairo" style={{ color: 'var(--theme-text-secondary)' }}>الاسم</th>
                <th className="text-right p-3 font-cairo" style={{ color: 'var(--theme-text-secondary)' }}>الهاتف</th>
                <th className="text-right p-3 font-cairo" style={{ color: 'var(--theme-text-secondary)' }}>المحافظة</th>
                <th className="text-right p-3 font-cairo" style={{ color: 'var(--theme-text-secondary)' }}>الحالة</th>
                <th className="text-right p-3 font-cairo" style={{ color: 'var(--theme-text-secondary)' }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s: any) => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--theme-border)' }}>
                  <td className="p-3 font-cairo" style={{ color: 'var(--theme-text-primary)' }}>{s.full_name}</td>
                  <td className="p-3 font-cairo" style={{ color: 'var(--theme-text-primary)' }}>{s.phone}</td>
                  <td className="p-3 font-cairo" style={{ color: 'var(--theme-text-secondary)' }}>{s.governorate || '-'}</td>
                  <td className="p-3">
                    <span className="px-2 py-1 rounded text-xs font-cairo" style={{
                      backgroundColor: s.is_banned ? '#EF444420' : '#10B98120',
                      color: s.is_banned ? '#EF4444' : '#10B981',
                    }}>
                      {s.is_banned ? 'محظور' : 'نشط'}
                    </span>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => toggleBan(s.id, s.is_banned)}
                      className="px-3 py-1 rounded text-xs font-cairo"
                      style={{
                        backgroundColor: s.is_banned ? '#10B98120' : '#EF444420',
                        color: s.is_banned ? '#10B981' : '#EF4444',
                      }}
                    >
                      {s.is_banned ? 'إلغاء الحظر' : 'حظر'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center p-4 font-cairo" style={{ color: 'var(--theme-text-secondary)' }}>لا توجد نتائج</p>
          )}
        </div>
      </Card>
    </div>
  );
}

// ==================== Subjects Tab ====================
function SubjectsTab() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name_ar: '', name_en: '', description_ar: '', icon: '📘', is_published: true });
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => { loadSubjects(); }, []);

  const loadSubjects = async () => {
    setLoading(true);
    try {
      const data = await adminAPI('get_subjects');
      setSubjects(data.subjects || data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    try {
      if (editId) {
        await adminAPI('update_subject', { id: editId, ...formData });
      } else {
        await adminAPI('create_subject', formData);
      }
      setShowForm(false);
      setEditId(null);
      setFormData({ name_ar: '', name_en: '', description_ar: '', icon: '📘', is_published: true });
      loadSubjects();
    } catch (err) { console.error(err); }
  };

  const togglePublish = async (id: string, current: boolean) => {
    try {
      await adminAPI('update_subject', { id, is_published: !current });
      loadSubjects();
    } catch (err) { console.error(err); }
  };

  const startEdit = (s: any) => {
    setFormData({ name_ar: s.name_ar, name_en: s.name_en || '', description_ar: s.description_ar || '', icon: s.icon || '📘', is_published: s.is_published });
    setEditId(s.id);
    setShowForm(true);
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" size={32} style={{ color: 'var(--theme-primary)' }} /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionTitle>📚 إدارة المواد</SectionTitle>
        <button onClick={() => { setShowForm(true); setEditId(null); setFormData({ name_ar: '', name_en: '', description_ar: '', icon: '📘', is_published: true }); }} className="flex items-center gap-2 px-4 py-2 rounded-lg font-cairo text-sm" style={{ backgroundColor: 'var(--theme-primary)', color: '#fff' }}>
          <Plus size={16} /> إضافة مادة
        </button>
      </div>

      {showForm && (
        <Card>
          <h3 className="font-bold mb-3 font-cairo" style={{ color: 'var(--theme-text-primary)' }}>{editId ? 'تعديل المادة' : 'إضافة مادة جديدة'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input placeholder="اسم المادة (عربي)" value={formData.name_ar} onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })} className="p-2 rounded-lg border font-cairo" style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text-primary)' }} />
            <input placeholder="اسم المادة (إنجليزي)" value={formData.name_en} onChange={(e) => setFormData({ ...formData, name_en: e.target.value })} className="p-2 rounded-lg border font-cairo" style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text-primary)' }} />
            <input placeholder="الأيقونة (إيموجي)" value={formData.icon} onChange={(e) => setFormData({ ...formData, icon: e.target.value })} className="p-2 rounded-lg border font-cairo" style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text-primary)' }} />
            <textarea placeholder="الوصف" value={formData.description_ar} onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })} className="p-2 rounded-lg border font-cairo md:col-span-2" style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text-primary)' }} />
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleSave} className="px-4 py-2 rounded-lg font-cairo text-sm" style={{ backgroundColor: 'var(--theme-primary)', color: '#fff' }}>حفظ</button>
            <button onClick={() => { setShowForm(false); setEditId(null); }} className="px-4 py-2 rounded-lg font-cairo text-sm" style={{ backgroundColor: 'var(--theme-bg)', color: 'var(--theme-text-primary)', border: '1px solid var(--theme-border)' }}>إلغاء</button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map((s: any) => (
          <Card key={s.id}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{s.icon || '📘'}</span>
                <h3 className="font-bold font-cairo" style={{ color: 'var(--theme-text-primary)' }}>{s.name_ar}</h3>
              </div>
              <span className="px-2 py-1 rounded text-xs font-cairo" style={{
                backgroundColor: s.is_published ? '#10B98120' : '#EF444420',
                color: s.is_published ? '#10B981' : '#EF4444',
              }}>
                {s.is_published ? 'منشور' : 'مخفي'}
              </span>
            </div>
            <p className="text-sm mb-3 font-cairo" style={{ color: 'var(--theme-text-secondary)' }}>{s.description_ar || 'بدون وصف'}</p>
            <div className="flex gap-2">
              <button onClick={() => startEdit(s)} className="px-3 py-1 rounded text-xs font-cairo" style={{ backgroundColor: 'var(--theme-primary)' + '20', color: 'var(--theme-primary)' }}>
                <Edit size={14} />
              </button>
              <button onClick={() => togglePublish(s.id, s.is_published)} className="px-3 py-1 rounded text-xs font-cairo" style={{ backgroundColor: s.is_published ? '#EF444420' : '#10B98120', color: s.is_published ? '#EF4444' : '#10B981' }}>
                {s.is_published ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ==================== Exams Tab ====================
function ExamsTab() {
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadExams(); }, []);

  const loadExams = async () => {
    setLoading(true);
    try {
      const data = await adminAPI('get_exams');
      setExams(data.exams || data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" size={32} style={{ color: 'var(--theme-primary)' }} /></div>;

  return (
    <div className="space-y-4">
      <SectionTitle>📝 الامتحانات</SectionTitle>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '2px solid var(--theme-border)' }}>
                <th className="text-right p-3 font-cairo" style={{ color: 'var(--theme-text-secondary)' }}>الطالب</th>
                <th className="text-right p-3 font-cairo" style={{ color: 'var(--theme-text-secondary)' }}>المادة</th>
                <th className="text-right p-3 font-cairo" style={{ color: 'var(--theme-text-secondary)' }}>الدرجة</th>
                <th className="text-right p-3 font-cairo" style={{ color: 'var(--theme-text-secondary)' }}>التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((e: any, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--theme-border)' }}>
                  <td className="p-3 font-cairo" style={{ color: 'var(--theme-text-primary)' }}>{e.user_name || e.user_id?.substring(0, 8)}</td>
                  <td className="p-3 font-cairo" style={{ color: 'var(--theme-text-primary)' }}>{e.subject_name || '-'}</td>
                  <td className="p-3">
                    <span className="px-2 py-1 rounded text-xs font-bold" style={{
                      backgroundColor: (e.score_percent || 0) >= 70 ? '#10B98120' : '#EF444420',
                      color: (e.score_percent || 0) >= 70 ? '#10B981' : '#EF4444',
                    }}>
                      {e.score_percent || 0}%
                    </span>
                  </td>
                  <td className="p-3 font-cairo text-sm" style={{ color: 'var(--theme-text-secondary)' }}>{e.created_at ? new Date(e.created_at).toLocaleDateString('ar-EG') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {exams.length === 0 && <p className="text-center p-4 font-cairo" style={{ color: 'var(--theme-text-secondary)' }}>لا توجد امتحانات بعد</p>}
        </div>
      </Card>
    </div>
  );
}

// ==================== Questions Tab ====================
function QuestionsTab() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadQuestions(); }, []);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const data = await adminAPI('get_questions');
      setQuestions(data.questions || data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" size={32} style={{ color: 'var(--theme-primary)' }} /></div>;

  return (
    <div className="space-y-4">
      <SectionTitle>❓ بنك الأسئلة</SectionTitle>
      <Card>
        <p className="font-cairo" style={{ color: 'var(--theme-text-secondary)' }}>إجمالي الأسئلة: {questions.length}</p>
        <div className="mt-4 space-y-3">
          {questions.slice(0, 20).map((q: any, i: number) => (
            <div key={i} className="p-3 rounded-lg" style={{ backgroundColor: 'var(--theme-bg)', border: '1px solid var(--theme-border)' }}>
              <p className="font-cairo text-sm" style={{ color: 'var(--theme-text-primary)' }}>{q.question_text || q.text || '-'}</p>
              <p className="font-cairo text-xs mt-1" style={{ color: 'var(--theme-text-secondary)' }}>النوع: {q.question_type || '-'} | الصعوبة: {q.difficulty || '-'}</p>
            </div>
          ))}
          {questions.length === 0 && <p className="text-center font-cairo" style={{ color: 'var(--theme-text-secondary)' }}>لا توجد أسئلة</p>}
        </div>
      </Card>
    </div>
  );
}

// ==================== Settings Tab ====================
function SettingsTab() {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await adminAPI('get_settings');
      setSettings(data.settings || data || {});
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await adminAPI('update_settings', { settings });
      setMessage('تم حفظ الإعدادات بنجاح ✅');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('خطأ في حفظ الإعدادات ❌');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" size={32} style={{ color: 'var(--theme-primary)' }} /></div>;

  const settingFields = [
    { key: 'price_per_subject', label: 'سعر المادة شهرياً (ج.م)', type: 'number' },
    { key: 'discount_3_subjects', label: 'خصم 3 مواد أو أكثر (%)', type: 'number' },
    { key: 'discount_all_subjects', label: 'خصم جميع المواد (%)', type: 'number' },
    { key: 'whatsapp_number', label: 'رقم واتساب الدعم', type: 'text' },
    { key: 'exam_questions_count', label: 'عدد أسئلة الامتحان', type: 'number' },
    { key: 'exam_time_minutes', label: 'وقت الامتحان (دقيقة)', type: 'number' },
    { key: 'passing_score', label: 'درجة النجاح (%)', type: 'number' },
  ];

  return (
    <div className="space-y-4">
      <SectionTitle>⚙️ الإعدادات</SectionTitle>
      {message && (
        <div className="p-3 rounded-lg text-center font-cairo text-sm" style={{ backgroundColor: message.includes('✅') ? '#10B98120' : '#EF444420', color: message.includes('✅') ? '#10B981' : '#EF4444' }}>
          {message}
        </div>
      )}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {settingFields.map((field) => (
            <div key={field.key}>
              <label className="block text-sm mb-1 font-cairo" style={{ color: 'var(--theme-text-secondary)' }}>{field.label}</label>
              <input
                type={field.type}
                value={settings[field.key] || ''}
                onChange={(e) => setSettings({ ...settings, [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value })}
                className="w-full p-2 rounded-lg border font-cairo"
                style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text-primary)' }}
              />
            </div>
          ))}
        </div>
        <button
          onClick={saveSettings}
          disabled={saving}
          className="mt-4 px-6 py-2 rounded-lg font-cairo text-sm flex items-center gap-2"
          style={{ backgroundColor: 'var(--theme-primary)', color: '#fff', opacity: saving ? 0.6 : 1 }}
        >
          {saving ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
          حفظ الإعدادات
        </button>
      </Card>
    </div>
  );
}

// ==================== Notifications Admin Tab ====================
function NotificationsAdminTab() {
  return <AdminNotifications />;
}

// ==================== Coupons Tab ====================
function CouponsTab() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    discount_percent: 10,
    max_uses: 100,
    expires_at: '',
    description_ar: '',
  });
  const [message, setMessage] = useState('');

  useEffect(() => { loadCoupons(); }, []);

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const data = await adminAPI('get_coupons');
      setCoupons(data.coupons || data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const createCoupon = async () => {
    try {
      await adminAPI('create_coupon', formData);
      setShowForm(false);
      setFormData({ code: '', discount_percent: 10, max_uses: 100, expires_at: '', description_ar: '' });
      setMessage('تم إنشاء الكوبون بنجاح ✅');
      setTimeout(() => setMessage(''), 3000);
      loadCoupons();
    } catch (err: any) {
      setMessage('خطأ: ' + (err.message || 'فشل الإنشاء') + ' ❌');
    }
  };

  const toggleCoupon = async (id: string, isActive: boolean) => {
    try {
      await adminAPI('update_coupon', { id, is_active: !isActive });
      loadCoupons();
    } catch (err) { console.error(err); }
  };

  const deleteCoupon = async (id: string) => {
    if (!confirm('هل تريد حذف هذا الكوبون؟')) return;
    try {
      await adminAPI('delete_coupon', { id });
      loadCoupons();
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" size={32} style={{ color: 'var(--theme-primary)' }} /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionTitle>🏷️ إدارة الكوبونات</SectionTitle>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg font-cairo text-sm" style={{ backgroundColor: 'var(--theme-primary)', color: '#fff' }}>
          <Plus size={16} /> كوبون جديد
        </button>
      </div>

      {message && (
        <div className="p-3 rounded-lg text-center font-cairo text-sm" style={{ backgroundColor: message.includes('✅') ? '#10B98120' : '#EF444420', color: message.includes('✅') ? '#10B981' : '#EF4444' }}>
          {message}
        </div>
      )}

      {showForm && (
        <Card>
          <h3 className="font-bold mb-3 font-cairo" style={{ color: 'var(--theme-text-primary)' }}>إنشاء كوبون جديد</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1 font-cairo" style={{ color: 'var(--theme-text-secondary)' }}>كود الخصم</label>
              <input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="مثال: STUDENT50" className="w-full p-2 rounded-lg border font-cairo" style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text-primary)' }} />
            </div>
            <div>
              <label className="block text-sm mb-1 font-cairo" style={{ color: 'var(--theme-text-secondary)' }}>نسبة الخصم (%)</label>
              <input type="number" value={formData.discount_percent} onChange={(e) => setFormData({ ...formData, discount_percent: Number(e.target.value) })} className="w-full p-2 rounded-lg border font-cairo" style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text-primary)' }} />
            </div>
            <div>
              <label className="block text-sm mb-1 font-cairo" style={{ color: 'var(--theme-text-secondary)' }}>الحد الأقصى للاستخدام</label>
              <input type="number" value={formData.max_uses} onChange={(e) => setFormData({ ...formData, max_uses: Number(e.target.value) })} className="w-full p-2 rounded-lg border font-cairo" style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text-primary)' }} />
            </div>
            <div>
              <label className="block text-sm mb-1 font-cairo" style={{ color: 'var(--theme-text-secondary)' }}>تاريخ الانتهاء</label>
              <input type="date" value={formData.expires_at} onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })} className="w-full p-2 rounded-lg border font-cairo" style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text-primary)' }} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm mb-1 font-cairo" style={{ color: 'var(--theme-text-secondary)' }}>الوصف</label>
              <input value={formData.description_ar} onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })} placeholder="وصف الكوبون..." className="w-full p-2 rounded-lg border font-cairo" style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text-primary)' }} />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={createCoupon} className="px-4 py-2 rounded-lg font-cairo text-sm" style={{ backgroundColor: 'var(--theme-primary)', color: '#fff' }}>إنشاء</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg font-cairo text-sm" style={{ backgroundColor: 'var(--theme-bg)', color: 'var(--theme-text-primary)', border: '1px solid var(--theme-border)' }}>إلغاء</button>
          </div>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '2px solid var(--theme-border)' }}>
                <th className="text-right p-3 font-cairo" style={{ color: 'var(--theme-text-secondary)' }}>الكود</th>
                <th className="text-right p-3 font-cairo" style={{ color: 'var(--theme-text-secondary)' }}>الخصم</th>
                <th className="text-right p-3 font-cairo" style={{ color: 'var(--theme-text-secondary)' }}>الاستخدام</th>
                <th className="text-right p-3 font-cairo" style={{ color: 'var(--theme-text-secondary)' }}>الحالة</th>
                <th className="text-right p-3 font-cairo" style={{ color: 'var(--theme-text-secondary)' }}>الانتهاء</th>
                <th className="text-right p-3 font-cairo" style={{ color: 'var(--theme-text-secondary)' }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c: any) => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--theme-border)' }}>
                  <td className="p-3 font-cairo font-bold" style={{ color: 'var(--theme-primary)' }}>{c.code}</td>
                  <td className="p-3 font-cairo" style={{ color: 'var(--theme-text-primary)' }}>{c.discount_percent}%</td>
                  <td className="p-3 font-cairo" style={{ color: 'var(--theme-text-primary)' }}>{c.used_count || 0} / {c.max_uses || '∞'}</td>
                  <td className="p-3">
                    <span className="px-2 py-1 rounded text-xs font-cairo" style={{
                      backgroundColor: c.is_active ? '#10B98120' : '#EF444420',
                      color: c.is_active ? '#10B981' : '#EF4444',
                    }}>
                      {c.is_active ? 'نشط' : 'معطل'}
                    </span>
                  </td>
                  <td className="p-3 font-cairo text-sm" style={{ color: 'var(--theme-text-secondary)' }}>{c.expires_at ? new Date(c.expires_at).toLocaleDateString('ar-EG') : 'بدون'}</td>
                  <td className="p-3 flex gap-2">
                    <button onClick={() => toggleCoupon(c.id, c.is_active)} className="p-1 rounded" style={{ color: c.is_active ? '#EF4444' : '#10B981' }}>
                      {c.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    </button>
                    <button onClick={() => deleteCoupon(c.id)} className="p-1 rounded" style={{ color: '#EF4444' }}>
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {coupons.length === 0 && <p className="text-center p-4 font-cairo" style={{ color: 'var(--theme-text-secondary)' }}>لا توجد كوبونات</p>}
        </div>
      </Card>
    </div>
  );
}

// ==================== Grades Tab ====================
function GradesTab() {
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => { loadGrades(); }, []);

  const loadGrades = async () => {
    setLoading(true);
    try {
      const data = await adminAPI('get_grades');
      setGrades(data.grades || data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const updateGrade = async (id: string, field: string, value: boolean) => {
    try {
      await adminAPI('update_grade', { id, [field]: value });
      setMessage('تم التحديث ✅');
      setTimeout(() => setMessage(''), 2000);
      loadGrades();
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" size={32} style={{ color: 'var(--theme-primary)' }} /></div>;

  const gradeLabels: Record<number, string> = { 1: 'الصف الأول الثانوي', 2: 'الصف الثاني الثانوي', 3: 'الصف الثالث الثانوي' };

  return (
    <div className="space-y-4">
      <SectionTitle>📋 المراحل الدراسية</SectionTitle>
      {message && (
        <div className="p-3 rounded-lg text-center font-cairo text-sm" style={{ backgroundColor: '#10B98120', color: '#10B981' }}>{message}</div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {grades.map((g: any) => (
          <Card key={g.id}>
            <h3 className="font-bold mb-4 font-cairo text-lg" style={{ color: 'var(--theme-text-primary)' }}>
              {gradeLabels[g.level] || `الصف ${g.level}`}
            </h3>
            <div className="space-y-3">
              {[
                { key: 'is_published', label: 'منشور' },
                { key: 'has_terms', label: 'يحتوي على ترمات' },
                { key: 'term1_published', label: 'الترم الأول منشور' },
                { key: 'term2_published', label: 'الترم الثاني منشور' },
              ].map((field) => (
                <div key={field.key} className="flex items-center justify-between">
                  <span className="font-cairo text-sm" style={{ color: 'var(--theme-text-primary)' }}>{field.label}</span>
                  <button
                    onClick={() => updateGrade(g.id, field.key, !g[field.key])}
                    style={{ color: g[field.key] ? '#10B981' : '#9CA3AF' }}
                  >
                    {g[field.key] ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                  </button>
                </div>
              ))}
            </div>
          </Card>
        ))}
        {grades.length === 0 && (
          <p className="col-span-3 text-center p-8 font-cairo" style={{ color: 'var(--theme-text-secondary)' }}>لا توجد مراحل دراسية</p>
        )}
      </div>
    </div>
  );
}

// ==================== Content Tab ====================
function ContentTab() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedLesson, setSelectedLesson] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const data = await adminAPI('get_subjects');
        setSubjects(data.subjects || data || []);
      } catch (err) { console.error(err); }
    };
    loadSubjects();
  }, []);

  useEffect(() => {
    if (!selectedSubject) { setLessons([]); return; }
    const loadLessons = async () => {
      try {
        const data = await adminAPI('get_lessons', { subject_id: selectedSubject });
        setLessons(data.lessons || data || []);
      } catch (err) { console.error(err); }
    };
    loadLessons();
  }, [selectedSubject]);

  const generateContent = async () => {
    if (!selectedSubject || !selectedLesson) {
      setMessage('اختر المادة والدرس أولاً ❌');
      return;
    }
    setGenerating(true);
    setMessage('');
    try {
      const data = await adminAPI('generate_content', { subject_id: selectedSubject, lesson_id: selectedLesson });
      setResult(data);
      setMessage('تم توليد المحتوى بنجاح! ✅');
    } catch (err: any) {
      setMessage('خطأ في التوليد: ' + (err.message || '') + ' ❌');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <SectionTitle>📄 توليد المحتوى بالذكاء الاصطناعي</SectionTitle>

      {message && (
        <div className="p-3 rounded-lg text-center font-cairo text-sm" style={{ backgroundColor: message.includes('✅') ? '#10B98120' : '#EF444420', color: message.includes('✅') ? '#10B981' : '#EF4444' }}>
          {message}
        </div>
      )}

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1 font-cairo" style={{ color: 'var(--theme-text-secondary)' }}>اختر المادة</label>
            <select
              value={selectedSubject}
              onChange={(e) => { setSelectedSubject(e.target.value); setSelectedLesson(''); }}
              className="w-full p-2 rounded-lg border font-cairo"
              style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text-primary)' }}
            >
              <option value="">-- اختر المادة --</option>
              {subjects.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name_ar}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1 font-cairo" style={{ color: 'var(--theme-text-secondary)' }}>اختر الدرس</label>
            <select
              value={selectedLesson}
              onChange={(e) => setSelectedLesson(e.target.value)}
              className="w-full p-2 rounded-lg border font-cairo"
              style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text-primary)' }}
              disabled={!selectedSubject}
            >
              <option value="">-- اختر الدرس --</option>
              {lessons.map((l: any) => (
                <option key={l.id} value={l.id}>{l.title_ar || l.title}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg font-cairo text-sm" style={{ backgroundColor: 'var(--theme-bg)', color: 'var(--theme-text-primary)', border: '1px solid var(--theme-border)' }}>
            <Upload size={16} /> رفع ملف PDF
          </button>
          <button
            onClick={generateContent}
            disabled={generating || !selectedSubject || !selectedLesson}
            className="flex items-center gap-2 px-6 py-2 rounded-lg font-cairo text-sm"
            style={{ backgroundColor: 'var(--theme-primary)', color: '#fff', opacity: generating ? 0.6 : 1 }}
          >
            {generating ? <Loader2 className="animate-spin" size={16} /> : <FileText size={16} />}
            {generating ? 'جاري التوليد...' : 'توليد المحتوى بالذكاء الاصطناعي'}
          </button>
        </div>
      </Card>

      {result && (
        <Card>
          <h3 className="font-bold mb-3 font-cairo" style={{ color: 'var(--theme-text-primary)' }}>📝 نتائج التوليد</h3>
          <div className="space-y-2">
            <p className="font-cairo text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
              عدد الملخصات: {result.summaries_count || 0}
            </p>
            <p className="font-cairo text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
              عدد الأسئلة: {result.questions_count || 0}
            </p>
            {result.summary_preview && (
              <div className="p-3 rounded-lg mt-2" style={{ backgroundColor: 'var(--theme-bg)' }}>
                <p className="font-cairo text-sm" style={{ color: 'var(--theme-text-primary)' }}>{result.summary_preview}</p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

// ==================== Reports Tab ====================
function ReportsTab() {
  const [downloading, setDownloading] = useState(false);

  const downloadReport = async () => {
    setDownloading(true);
    try {
      const res = await fetch('/api/admin/reports');
      if (!res.ok) throw new Error('فشل تحميل التقرير');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `manhaj-ai-report-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('فشل تحميل التقرير');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      <SectionTitle>📊 التقارير</SectionTitle>
      <Card>
        <div className="text-center py-8">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-bold mb-2 font-cairo" style={{ color: 'var(--theme-text-primary)' }}>
            تقرير شامل - Excel
          </h3>
          <p className="font-cairo text-sm mb-6" style={{ color: 'var(--theme-text-secondary)' }}>
            تقرير كامل يحتوي على 5 أوراق عمل:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 mb-6 max-w-3xl mx-auto">
            {[
              { icon: '👥', label: 'الطلاب' },
              { icon: '💰', label: 'الملخص المالي' },
              { icon: '📚', label: 'تحليل المواد' },
              { icon: '⚠️', label: 'طلاب معرضين للخطر' },
              { icon: '💎', label: 'أكثر الطلاب ربحية' },
            ].map((sheet, i) => (
              <div key={i} className="p-3 rounded-lg" style={{ backgroundColor: 'var(--theme-bg)', border: '1px solid var(--theme-border)' }}>
                <span className="text-2xl">{sheet.icon}</span>
                <p className="font-cairo text-xs mt-1" style={{ color: 'var(--theme-text-primary)' }}>{sheet.label}</p>
              </div>
            ))}
          </div>
          <button
            onClick={downloadReport}
            disabled={downloading}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-cairo text-lg"
            style={{ backgroundColor: 'var(--theme-primary)', color: '#fff', opacity: downloading ? 0.6 : 1 }}
          >
            {downloading ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
            {downloading ? 'جاري التحميل...' : '📥 تحميل تقرير Excel كامل'}
          </button>
        </div>
      </Card>
    </div>
  );
}
