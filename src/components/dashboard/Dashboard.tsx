"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import Link from "next/link";
import {
  BookOpen, CheckSquare, Trophy, Flame, Clock,
  TrendingUp, ChevronLeft, Bot, Star,
  Target, Loader2, AlertCircle,
} from "lucide-react";

interface DashboardData {
  average_score: number;
  total_exams: number;
  total_points: number;
  streak_days: number;
  rank: number;
  subjects: {
    id: string;
    name: string;
    icon: string;
    color: string;
    progress: number;
    total_lessons: number;
    completed_lessons: number;
  }[];
  recent_activity: {
    type: string;
    text: string;
    time: string;
    score: string | null;
  }[];
  streak_week: { day: string; done: boolean }[];
}

const defaultStreakDays = [
  { day: "سبت", done: false },
  { day: "أحد", done: false },
  { day: "اثنين", done: false },
  { day: "ثلاثاء", done: false },
  { day: "أربعاء", done: false },
  { day: "خميس", done: false },
  { day: "جمعة", done: false },
];

export default function Dashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch("/api/student/dashboard", {
          credentials: "include",
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            const d = json.data;
            const transformed: DashboardData = {
              average_score: d.stats?.avg_score || 0,
              total_exams: d.stats?.exams_completed || 0,
              total_points: d.stats?.points || 0,
              streak_days: d.stats?.streak_days || 0,
              rank: 0,
              subjects: (d.subjects || []).map((s: { id: string; name: string; icon: string; color: string; lesson_count: number; completed_lessons: number }) => ({
                id: s.id,
                name: s.name,
                icon: s.icon,
                color: s.color || '#3B82F6',
                progress: s.lesson_count > 0 ? Math.round((s.completed_lessons / s.lesson_count) * 100) : 0,
                total_lessons: s.lesson_count || 0,
                completed_lessons: s.completed_lessons || 0,
              })),
              recent_activity: (d.recent_activity || []).map((a: { subject_icon: string; subject_name: string; score: number; created_at: string; correct_answers: number; total_questions: number }) => ({
                type: 'exam',
                text: `${a.subject_icon} ${a.subject_name} — ${a.score}%`,
                time: new Date(a.created_at).toLocaleDateString('ar-EG'),
                score: `${a.correct_answers}/${a.total_questions}`,
              })),
              streak_week: defaultStreakDays,
            };
            setData(transformed);
          }
        }
      } catch {
        setError("فشل في جلب البيانات");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const stats = [
    {
      label: "المعدل العام",
      value: data ? `${data.average_score || 0}%` : "0%",
      icon: TrendingUp,
      color: "#6366F1",
    },
    {
      label: "امتحانات مكتملة",
      value: data ? String(data.total_exams || 0) : "0",
      icon: CheckSquare,
      color: "#10B981",
    },
    {
      label: "نقاط مكتسبة",
      value: data ? (data.total_points || 0).toLocaleString() : "0",
      icon: Star,
      color: "#F59E0B",
    },
    {
      label: "أيام متتالية",
      value: data ? String(data.streak_days || 0) : "0",
      icon: Flame,
      color: "#EF4444",
    },
  ];

  const subjects = data?.subjects || [];
  const recentActivity = data?.recent_activity || [];
  const streakWeek = data?.streak_week || defaultStreakDays;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin mx-auto mb-4" style={{ color: "var(--theme-primary)" }} />
          <p className="text-sm font-bold" style={{ color: "var(--theme-text-secondary)" }}>
            جارٍ تحميل لوحة التحكم...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 font-cairo space-y-6" style={{ color: "var(--theme-text-primary)" }}>
      {/* Welcome Banner */}
      <div
        className="rounded-2xl p-6 relative overflow-hidden"
        style={{ background: "var(--theme-cta-gradient)", boxShadow: "var(--theme-btn-shadow)" }}
      >
        <div className="relative z-10">
          <h1 className="text-2xl font-extrabold text-white mb-2">
            أهلاً {user?.fullName || "طالب"} 👋
          </h1>
          <p className="text-white/80 text-sm mb-4">
            أستاذك الذكي جاهز يساعدك. ابدأ رحلة الدراسة اليوم! 🚀
          </p>
          <Link
            href="/subjects"
            className="themed-btn-outline inline-flex items-center gap-2 text-white border-white/40 hover:bg-white/20"
          >
            <Bot size={18} />
            <span>ابدأ الدراسة مع AI</span>
            <ChevronLeft size={16} />
          </Link>
        </div>
        <div className="absolute left-6 bottom-4 text-6xl opacity-20">🎓</div>
      </div>

      {error && (
        <div
          className="p-3 rounded-lg text-sm font-bold flex items-center gap-2"
          style={{ background: "rgba(234,179,8,0.1)", color: "#CA8A04", border: "1px solid rgba(234,179,8,0.3)" }}
        >
          <AlertCircle size={16} />
          {error} — يتم عرض بيانات افتراضية
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="themed-card p-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${card.color}15` }}
                >
                  <Icon size={22} style={{ color: card.color }} />
                </div>
                <div>
                  <div className="text-2xl font-extrabold" style={{ color: "var(--theme-text-primary)" }}>
                    {card.value}
                  </div>
                  <div className="text-xs" style={{ color: "var(--theme-text-secondary)" }}>
                    {card.label}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subjects Grid */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-extrabold mb-4" style={{ color: "var(--theme-text-primary)" }}>
            📚 موادك
          </h2>
          {subjects.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {subjects.map((subject, i) => (
                <Link
                  key={subject.id || i}
                  href="/subjects"
                  className="themed-card p-4 block hover:shadow-lg transition-shadow"
                  style={{ textDecoration: "none" }}
                >
                  <div className="text-3xl mb-3">{subject.icon || "📖"}</div>
                  <h3 className="text-xl font-extrabold mb-2" style={{ color: "var(--theme-text-primary)" }}>
                    {subject.name}
                  </h3>
                  <div className="text-xs mb-2" style={{ color: "var(--theme-text-secondary)" }}>
                    {subject.completed_lessons || 0}/{subject.total_lessons || 0} درس مكتمل
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--theme-surface-border)" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${subject.progress || 0}%`,
                        background: subject.color || "var(--theme-primary)",
                      }}
                    />
                  </div>
                  <div
                    className="text-xs font-bold mt-1 text-left"
                    style={{ color: subject.color || "var(--theme-primary)" }}
                  >
                    {subject.progress || 0}%
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="themed-card p-8 text-center">
              <div className="text-4xl mb-3">📚</div>
              <p className="text-sm font-bold mb-3" style={{ color: "var(--theme-text-secondary)" }}>
                لم يتم إضافة مواد بعد
              </p>
              <Link href="/subjects" className="themed-btn-primary inline-flex items-center gap-2 px-6 py-2">
                <BookOpen size={16} />
                <span>تصفح المواد</span>
              </Link>
            </div>
          )}
        </div>

        {/* Streak Tracker */}
        <div>
          <h2 className="text-lg font-extrabold mb-4" style={{ color: "var(--theme-text-primary)" }}>
            🔥 سلسلة الأيام
          </h2>
          <div className="themed-card p-4">
            <div className="flex items-center gap-2 mb-4">
              <Flame size={24} style={{ color: "#EF4444" }} />
              <span className="text-2xl font-extrabold" style={{ color: "var(--theme-text-primary)" }}>
                {data?.streak_days || 0} {(data?.streak_days || 0) === 1 ? "يوم" : "أيام"}
              </span>
              {(data?.streak_days || 0) > 0 && (
                <span className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>
                  متتالية! 🎉
                </span>
              )}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {streakWeek.map((d, i) => (
                <div key={i} className="text-center">
                  <div className="text-[0.6rem] mb-1" style={{ color: "var(--theme-text-muted)" }}>
                    {d.day}
                  </div>
                  <div
                    className="w-8 h-8 mx-auto rounded-lg flex items-center justify-center text-sm"
                    style={{
                      background: d.done ? "var(--theme-cta-gradient)" : "var(--theme-surface-border)",
                      color: d.done ? "#fff" : "var(--theme-text-muted)",
                    }}
                  >
                    {d.done ? "🔥" : "·"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rank card */}
          {data?.rank && data.rank > 0 && (
            <Link href="/leaderboard" className="themed-card p-4 mt-4 block" style={{ textDecoration: "none" }}>
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(245,158,11,0.15)" }}
                >
                  <Trophy size={22} style={{ color: "#F59E0B" }} />
                </div>
                <div>
                  <div className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>ترتيبك</div>
                  <div className="text-xl font-extrabold" style={{ color: "var(--theme-primary)" }}>
                    #{data.rank}
                  </div>
                </div>
                <ChevronLeft size={18} className="mr-auto" style={{ color: "var(--theme-text-muted)" }} />
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <div>
          <h2 className="text-lg font-extrabold mb-4" style={{ color: "var(--theme-text-primary)" }}>
            📋 النشاط الأخير
          </h2>
          <div className="themed-card divide-y" style={{ borderColor: "var(--theme-surface-border)" }}>
            {recentActivity.map((item, i) => (
              <div key={i} className="p-4 flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--theme-hover-overlay)" }}
                >
                  {item.type === "exam" ? (
                    <CheckSquare size={18} style={{ color: "var(--theme-primary)" }} />
                  ) : item.type === "lesson" ? (
                    <BookOpen size={18} style={{ color: "var(--theme-primary)" }} />
                  ) : (
                    <Bot size={18} style={{ color: "var(--theme-primary)" }} />
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold" style={{ color: "var(--theme-text-primary)" }}>
                    {item.text}
                  </div>
                  <div className="text-xs" style={{ color: "var(--theme-text-muted)" }}>
                    <Clock size={12} className="inline ml-1" />
                    {item.time}
                  </div>
                </div>
                {item.score && (
                  <div
                    className="text-sm font-extrabold px-3 py-1 rounded-lg"
                    style={{ background: "var(--theme-hover-overlay)", color: "var(--theme-primary)" }}
                  >
                    {item.score}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="text-center">
        <Link href="/exams" className="themed-btn-primary px-8 py-3 inline-flex items-center gap-2">
          <Target size={20} />
          <span>ابدأ امتحان جديد</span>
        </Link>
      </div>
    </div>
  );
}
