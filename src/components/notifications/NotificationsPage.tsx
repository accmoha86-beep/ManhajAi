"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bell, Megaphone, Tag, BookOpen, Clock,
  Loader2, CheckCircle, Circle, RefreshCw,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

const typeIcons: Record<string, React.ReactNode> = {
  announcement: <Megaphone size={20} />,
  discount: <Tag size={20} />,
  new_content: <BookOpen size={20} />,
  reminder: <Clock size={20} />,
};

const typeLabels: Record<string, string> = {
  announcement: "إعلان",
  discount: "خصم",
  new_content: "محتوى جديد",
  reminder: "تذكير",
};

export default function NotificationsPage() {
  const { token } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", {
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

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notification_id: notificationId }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
    } catch (e) {
      console.error("Failed to mark as read:", e);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "الآن";
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    if (days < 7) return `منذ ${days} يوم`;
    return date.toLocaleDateString("ar-EG");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--theme-primary)" }} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--theme-cta-gradient)" }}>
            <Bell size={20} color="#fff" />
          </div>
          <h1 className="text-xl font-extrabold" style={{ color: "var(--theme-text-primary)" }}>الإشعارات</h1>
        </div>
        <button onClick={fetchNotifications} className="p-2 rounded-lg" style={{ color: "var(--theme-text-muted)" }}>
          <RefreshCw size={18} />
        </button>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell size={48} className="mx-auto mb-4" style={{ color: "var(--theme-text-muted)", opacity: 0.5 }} />
          <p className="text-sm" style={{ color: "var(--theme-text-muted)" }}>لا توجد إشعارات</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => !notification.is_read && markAsRead(notification.id)}
              className="themed-card p-4 cursor-pointer transition-all hover:shadow-md"
              style={{
                borderRight: notification.is_read ? "none" : "3px solid var(--theme-primary)",
                opacity: notification.is_read ? 0.7 : 1,
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{
                    background: notification.is_read ? "var(--theme-surface-border)" : "var(--theme-hover-overlay)",
                    color: notification.is_read ? "var(--theme-text-muted)" : "var(--theme-primary)",
                  }}
                >
                  {typeIcons[notification.type] || <Bell size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-sm" style={{ color: "var(--theme-text-primary)" }}>
                      {notification.title}
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--theme-hover-overlay)", color: "var(--theme-text-muted)" }}>
                      {typeLabels[notification.type] || notification.type}
                    </span>
                  </div>
                  <p className="text-sm mb-2" style={{ color: "var(--theme-text-secondary)" }}>
                    {notification.body}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: "var(--theme-text-muted)" }}>
                      {formatDate(notification.created_at)}
                    </span>
                    {notification.is_read ? (
                      <CheckCircle size={14} style={{ color: "var(--theme-text-muted)" }} />
                    ) : (
                      <Circle size={14} style={{ color: "var(--theme-primary)" }} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
