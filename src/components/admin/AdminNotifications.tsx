"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bell, Send, Loader2, Plus, Users,
  Megaphone, Tag, BookOpen, Clock,
  CheckCircle, Eye,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";

interface AdminNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  audience: string;
  channel: string;
  read_count: number;
  total_count: number;
  created_at: string;
}

const typeOptions = [
  { value: "announcement", label: "إعلان", icon: <Megaphone size={16} /> },
  { value: "discount", label: "خصم", icon: <Tag size={16} /> },
  { value: "new_content", label: "محتوى جديد", icon: <BookOpen size={16} /> },
  { value: "reminder", label: "تذكير", icon: <Clock size={16} /> },
];

const audienceOptions = [
  { value: "all", label: "الجميع" },
  { value: "subject", label: "مادة معينة" },
  { value: "governorate", label: "محافظة معينة" },
  { value: "expiring", label: "اشتراكات منتهية قريبًا" },
  { value: "trial", label: "فترة تجربة" },
  { value: "inactive", label: "غير نشطين" },
];

const channelOptions = [
  { value: "site", label: "الموقع فقط" },
  { value: "whatsapp", label: "واتساب فقط" },
  { value: "both", label: "الموقع + واتساب" },
];

export default function AdminNotifications() {
  const { token } = useAuthStore();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [sending, setSending] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("announcement");
  const [audience, setAudience] = useState("all");
  const [channel, setChannel] = useState("site");

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setNotifications(data.notifications || []);
      }
    } catch (e) {
      console.error("Failed to fetch notifications:", e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleSend = async () => {
    if (!title || !body) return;
    setSending(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, body, type, audience, channel }),
      });
      if (res.ok) {
        setShowForm(false);
        setTitle("");
        setBody("");
        fetchNotifications();
      }
    } catch (e) {
      console.error("Failed to send notification:", e);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--theme-primary)" }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell size={20} style={{ color: "var(--theme-primary)" }} />
          <h2 className="text-lg font-bold" style={{ color: "var(--theme-text-primary)" }}>إدارة الإشعارات</h2>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="themed-btn-primary py-2 px-4 flex items-center gap-2 text-sm">
          <Plus size={16} /> إشعار جديد
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="themed-card p-5 space-y-4">
          <h3 className="font-bold text-sm" style={{ color: "var(--theme-text-primary)" }}>✏️ إنشاء إشعار جديد</h3>

          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: "var(--theme-text-secondary)" }}>العنوان</label>
            <input className="themed-input" placeholder="عنوان الإشعار" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: "var(--theme-text-secondary)" }}>المحتوى</label>
            <textarea className="themed-input min-h-[80px]" placeholder="محتوى الإشعار" value={body} onChange={(e) => setBody(e.target.value)} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: "var(--theme-text-secondary)" }}>النوع</label>
              <div className="flex flex-wrap gap-1">
                {typeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setType(opt.value)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs border"
                    style={{
                      background: type === opt.value ? "var(--theme-primary)" : "var(--theme-surface-bg)",
                      color: type === opt.value ? "#fff" : "var(--theme-text-primary)",
                      borderColor: type === opt.value ? "var(--theme-primary)" : "var(--theme-surface-border)",
                    }}
                  >
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: "var(--theme-text-secondary)" }}>الجمهور</label>
              <select className="themed-input text-xs" value={audience} onChange={(e) => setAudience(e.target.value)}>
                {audienceOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: "var(--theme-text-secondary)" }}>القناة</label>
              <select className="themed-input text-xs" value={channel} onChange={(e) => setChannel(e.target.value)}>
                {channelOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowForm(false)} className="themed-btn-outline py-2 px-4 text-sm">إلغاء</button>
            <button onClick={handleSend} disabled={sending || !title || !body} className="themed-btn-primary py-2 px-4 flex items-center gap-2 text-sm" style={{ opacity: sending || !title || !body ? 0.5 : 1 }}>
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              إرسال
            </button>
          </div>
        </div>
      )}

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell size={40} className="mx-auto mb-3" style={{ color: "var(--theme-text-muted)", opacity: 0.5 }} />
            <p className="text-sm" style={{ color: "var(--theme-text-muted)" }}>لا توجد إشعارات</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className="themed-card p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-sm" style={{ color: "var(--theme-text-primary)" }}>{n.title}</h4>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--theme-hover-overlay)", color: "var(--theme-text-muted)" }}>
                      {typeOptions.find((t) => t.value === n.type)?.label || n.type}
                    </span>
                  </div>
                  <p className="text-sm mb-2" style={{ color: "var(--theme-text-secondary)" }}>{n.body}</p>
                  <div className="flex items-center gap-4 text-xs" style={{ color: "var(--theme-text-muted)" }}>
                    <span className="flex items-center gap-1"><Users size={12} /> {audienceOptions.find((a) => a.value === n.audience)?.label || n.audience}</span>
                    <span className="flex items-center gap-1"><Eye size={12} /> قرأ {n.read_count || 0} من {n.total_count || 0}</span>
                    <span className="flex items-center gap-1"><CheckCircle size={12} /> {new Date(n.created_at).toLocaleDateString("ar-EG")}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
