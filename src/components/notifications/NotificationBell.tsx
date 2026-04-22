"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import Link from "next/link";

export default function NotificationBell() {
  const { token, isAuthenticated } = useAuthStore();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const fetchCount = async () => {
      try {
        const res = await fetch("/api/notifications/unread", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          setUnreadCount(data.count || 0);
        }
      } catch {
        // Silently fail
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 60000); // Poll every 60 seconds
    return () => clearInterval(interval);
  }, [token, isAuthenticated]);

  if (!isAuthenticated) return null;

  return (
    <Link href="/notifications" className="relative p-2">
      <Bell size={20} color="#fff" />
      {unreadCount > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1"
          style={{ background: "#EF4444" }}
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
