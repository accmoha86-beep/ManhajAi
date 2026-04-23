"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bell,
  Megaphone,
  Tag,
  BookOpen,
  Clock,
  Check,
  CheckCheck,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Inbox,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type NotificationType = "announcement" | "discount" | "new_content" | "reminder";

interface Notification {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TYPE_META: Record<
  NotificationType,
  { label: string; emoji: string; icon: typeof Bell }
> = {
  announcement: { label: "إعلان", emoji: "📢", icon: Megaphone },
  discount: { label: "عرض", emoji: "💰", icon: Tag },
  new_content: { label: "محتوى جديد", emoji: "📚", icon: BookOpen },
  reminder: { label: "تذكير", emoji: "⏰", icon: Clock },
};

interface FilterTab {
  key: NotificationType | "all";
  label: string;
}

const FILTER_TABS: FilterTab[] = [
  { key: "all", label: "الكل" },
  { key: "announcement", label: "إعلانات" },
  { key: "discount", label: "عروض" },
  { key: "new_content", label: "محتوى جديد" },
  { key: "reminder", label: "تذكيرات" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  if (hours < 24) return `منذ ${hours} ساعة`;
  if (days < 7) return `منذ ${days} يوم`;
  return new Date(dateStr).toLocaleDateString("ar-EG");
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function NotificationsPage() {
  const { token } = useAuthStore();

  /* ---- state ---- */
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<NotificationType | "all">("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [markingAllRead, setMarkingAllRead] = useState(false);

  /* ---- fetch ---- */
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/notifications", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("فشل تحميل الإشعارات");
      const data = await res.json();
      setNotifications(data.notifications ?? []);
    } catch (err: any) {
      setError(err.message || "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  /* ---- mark single as read ---- */
  const markAsRead = useCallback(async (id: string) => {
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notification_id: id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch {
      /* silent – optimistic UI */
    }
  }, []);

  /* ---- mark all as read ---- */
  const markAllAsRead = useCallback(async () => {
    setMarkingAllRead(true);
    try {
      const unread = notifications.filter((n) => !n.is_read);
      await Promise.all(
        unread.map((n) =>
          fetch("/api/notifications/read", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ notification_id: n.id }),
          })
        )
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      /* silent */
    } finally {
      setMarkingAllRead(false);
    }
  }, [notifications]);

  /* ---- toggle expand ---- */
  const toggleExpand = useCallback(
    (id: string, isRead: boolean) => {
      if (!isRead) markAsRead(id);
      setExpandedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [markAsRead]
  );

  /* ---- derived ---- */
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const filtered =
    activeFilter === "all"
      ? notifications
      : notifications.filter((n) => n.type === activeFilter);

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  /* ---- Loading ---- */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2
          className="w-10 h-10 animate-spin"
          style={{ color: "var(--theme-primary)" }}
        />
        <p
          className="text-sm font-medium"
          style={{ color: "var(--theme-text-secondary)" }}
        >
          جاري تحميل الإشعارات...
        </p>
      </div>
    );
  }

  /* ---- Error ---- */
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-red-600 font-medium text-center">{error}</p>
        <button
          onClick={fetchNotifications}
          className="px-6 py-2 rounded-xl text-white text-sm font-semibold transition-transform hover:scale-105 active:scale-95"
          style={{ background: "var(--theme-cta-gradient)" }}
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 space-y-6" dir="rtl">
      {/* ============================================================ */}
      {/*  Header                                                       */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: "var(--theme-cta-gradient)" }}
          >
            <Bell className="w-5 h-5 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <h1
              className="text-xl md:text-2xl font-bold"
              style={{ color: "var(--theme-text-primary)" }}
            >
              الإشعارات
            </h1>
            {unreadCount > 0 && (
              <span
                className="inline-flex items-center justify-center text-xs font-bold text-white rounded-full min-w-[22px] h-[22px] px-1.5"
                style={{ background: "var(--theme-primary)" }}
              >
                {unreadCount}
              </span>
            )}
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            disabled={markingAllRead}
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-all hover:opacity-80 disabled:opacity-50"
            style={{
              color: "var(--theme-primary)",
              background: "var(--theme-surface-bg)",
              border: "1px solid var(--theme-surface-border)",
            }}
          >
            {markingAllRead ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCheck className="w-4 h-4" />
            )}
            تحديد الكل كمقروء
          </button>
        )}
      </div>

      {/* ============================================================ */}
      {/*  Filter Tabs                                                  */}
      {/* ============================================================ */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap"
              style={
                isActive
                  ? {
                      background: "var(--theme-cta-gradient)",
                      color: "#fff",
                    }
                  : {
                      background: "var(--theme-surface-bg)",
                      color: "var(--theme-text-secondary)",
                      border: "1px solid var(--theme-surface-border)",
                    }
              }
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ============================================================ */}
      {/*  Notification List / Empty                                    */}
      {/* ============================================================ */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: "var(--theme-surface-bg)",
              border: "1px solid var(--theme-surface-border)",
            }}
          >
            <Inbox
              className="w-8 h-8"
              style={{ color: "var(--theme-text-secondary)" }}
            />
          </div>
          <p
            className="text-base font-semibold"
            style={{ color: "var(--theme-text-secondary)" }}
          >
            مافيش إشعارات جديدة 📭
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((notification) => {
            const meta = TYPE_META[notification.type];
            const Icon = meta.icon;
            const isExpanded = expandedIds.has(notification.id);
            const isUnread = !notification.is_read;

            return (
              <button
                key={notification.id}
                onClick={() => toggleExpand(notification.id, notification.is_read)}
                className="w-full text-right rounded-2xl p-4 transition-all hover:shadow-md group"
                style={{
                  background: isUnread
                    ? "var(--theme-surface-bg)"
                    : "var(--theme-surface-bg)",
                  border: "1px solid var(--theme-surface-border)",
                  borderRight: isUnread
                    ? "4px solid var(--theme-primary)"
                    : "1px solid var(--theme-surface-border)",
                  boxShadow: isUnread
                    ? "0 0 0 1px color-mix(in srgb, var(--theme-primary) 10%, transparent)"
                    : undefined,
                }}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div
                    className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                    style={{
                      background: isUnread
                        ? "color-mix(in srgb, var(--theme-primary) 12%, transparent)"
                        : "var(--theme-surface-bg)",
                      border: isUnread
                        ? "none"
                        : "1px solid var(--theme-surface-border)",
                    }}
                  >
                    <span>{meta.emoji}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3
                        className={`text-sm leading-snug ${
                          isUnread ? "font-bold" : "font-medium"
                        }`}
                        style={{ color: "var(--theme-text-primary)" }}
                      >
                        {notification.title}
                      </h3>
                      <div className="flex items-center gap-2 shrink-0">
                        {isUnread && (
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ background: "var(--theme-primary)" }}
                          />
                        )}
                        {isExpanded ? (
                          <ChevronUp
                            className="w-4 h-4"
                            style={{ color: "var(--theme-text-secondary)" }}
                          />
                        ) : (
                          <ChevronDown
                            className="w-4 h-4"
                            style={{ color: "var(--theme-text-secondary)" }}
                          />
                        )}
                      </div>
                    </div>

                    <p
                      className={`text-sm leading-relaxed ${
                        isExpanded ? "" : "line-clamp-2"
                      }`}
                      style={{ color: "var(--theme-text-secondary)" }}
                    >
                      {notification.body}
                    </p>

                    {/* Footer: type badge + time */}
                    <div className="flex items-center gap-3 pt-1">
                      <span
                        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg font-medium"
                        style={{
                          background:
                            "color-mix(in srgb, var(--theme-primary) 8%, transparent)",
                          color: "var(--theme-primary)",
                        }}
                      >
                        <Icon className="w-3 h-3" />
                        {meta.label}
                      </span>
                      <span
                        className="text-xs flex items-center gap-1"
                        style={{ color: "var(--theme-text-secondary)" }}
                      >
                        <Clock className="w-3 h-3" />
                        {timeAgo(notification.created_at)}
                      </span>
                      {notification.is_read && (
                        <span
                          className="text-xs flex items-center gap-1"
                          style={{ color: "var(--theme-text-secondary)" }}
                        >
                          <Check className="w-3 h-3" />
                          مقروء
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
