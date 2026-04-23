"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/auth-store";
import Link from "next/link";
import {
  BookOpen, CheckSquare, Trophy, Flame, Clock,
  TrendingUp, ChevronLeft, Star,
  Target, Loader2, AlertCircle, BarChart3,
  ArrowRight, Zap, Brain, Rocket, Sun, Moon,
} from "lucide-react";
import PerformanceReport from "@/components/performance/PerformanceReport";

// ─── Types ──────────────────────────────────────────────────────────────────
interface DashboardStats {
  avg_score: number;
  exams_completed: number;
  points: number;
  streak_days: number;
}

interface SubjectItem {
  id: string;
  name: string;
  icon?: string;
  progress: number;
  lessons_count: number;
  completed_lessons: number;
}

interface ActivityItem {
  id: string;
  subject_name: string;
  subject_icon?: string;
  score: number;
  created_at: string;
  type?: string;
}

interface DashboardData {
  stats: DashboardStats;
  subjects: SubjectItem[];
  recent_activity: ActivityItem[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const ARABIC_DAYS = ["سبت", "أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة"];

function getGreeting(): { greeting: string; icon: React.ReactNode } {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) {
    return { greeting: "صباح الخير! يلا نبدأ يومنا بمذاكرة 📚", icon: <Sun className="w-5 h-5 text-yellow-400" /> };
  } else if (hour >= 12 && hour < 18) {
    return { greeting: "يلا نكمل شوية مذاكرة 💪", icon: <Sun className="w-5 h-5 text-orange-400" /> };
  } else if (hour >= 18 && hour < 24) {
    return { greeting: "مراجعة بالليل بتثبت المعلومة 🌙", icon: <Moon className="w-5 h-5 text-indigo-400" /> };
  } else {
    return { greeting: "بالتوفيق في المذاكرة 🌟", icon: <Star className="w-5 h-5 text-yellow-300" /> };
  }
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "الآن";
  if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `منذ ${diffDays} يوم`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return `منذ ${diffWeeks} أسبوع`;
  return `منذ ${Math.floor(diffDays / 30)} شهر`;
}

function getSubjectEmoji(icon?: string): string {
  return icon || "📘";
}

// ─── Animated Counter Hook ──────────────────────────────────────────────────
function useCountUp(target: number, duration: number = 1200, enabled: boolean = true): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!enabled) { setValue(0); return; }
    let start = 0;
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);
      setValue(current);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, enabled]);
  return value;
}

// ─── Circular Mini Gauge ────────────────────────────────────────────────────
function MiniGauge({ value, size = 48 }: { value: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value, 100) / 100;
  const offset = circumference * (1 - progress);

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={4}
        className="opacity-15"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="url(#gaugeGradient)"
        strokeWidth={4}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-1000 ease-out"
      />
      <defs>
        <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--theme-primary, #6366f1)" />
          <stop offset="100%" stopColor="var(--theme-accent, #a855f7)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ─── Skeleton Loader ────────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" dir="rtl">
      {/* Welcome skeleton */}
      <div className="rounded-2xl p-6" style={{ background: "var(--theme-surface-bg)" }}>
        <div className="h-7 w-48 rounded-lg mb-2" style={{ background: "var(--theme-surface-border)" }} />
        <div className="h-4 w-64 rounded-lg" style={{ background: "var(--theme-surface-border)" }} />
      </div>
      {/* Stats skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl p-5 h-28" style={{ background: "var(--theme-surface-bg)" }}>
            <div className="h-4 w-20 rounded mb-3" style={{ background: "var(--theme-surface-border)" }} />
            <div className="h-8 w-16 rounded" style={{ background: "var(--theme-surface-border)" }} />
          </div>
        ))}
      </div>
      {/* Streak skeleton */}
      <div className="rounded-2xl p-6 h-24" style={{ background: "var(--theme-surface-bg)" }} />
      {/* Subjects skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl p-5 h-40" style={{ background: "var(--theme-surface-bg)" }}>
            <div className="h-4 w-24 rounded mb-4" style={{ background: "var(--theme-surface-border)" }} />
            <div className="h-3 w-full rounded mb-2" style={{ background: "var(--theme-surface-border)" }} />
            <div className="h-3 w-3/4 rounded" style={{ background: "var(--theme-surface-border)" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── Main Dashboard Component ───────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPerformance, setShowPerformance] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/student/dashboard", { credentials: "include" });
      if (!res.ok) throw new Error("فشل في تحميل البيانات");
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "حدث خطأ");
      setData(json.data);
    } catch (err: any) {
      setError(err.message || "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Animated stat values
  const animAvg = useCountUp(data?.stats.avg_score ?? 0, 1400, !loading && !!data);
  const animExams = useCountUp(data?.stats.exams_completed ?? 0, 1200, !loading && !!data);
  const animPoints = useCountUp(data?.stats.points ?? 0, 1600, !loading && !!data);
  const animStreak = useCountUp(data?.stats.streak_days ?? 0, 1000, !loading && !!data);

  const { greeting, icon: greetingIcon } = getGreeting();

  // ─── Loading State ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--theme-primary)" }} />
          <span style={{ color: "var(--theme-text-secondary)" }}>جاري تحميل لوحة المعلومات...</span>
        </div>
        <DashboardSkeleton />
      </div>
    );
  }

  // ─── Error State ────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6" dir="rtl">
        <div
          className="rounded-2xl p-8 text-center border"
          style={{
            background: "var(--theme-surface-bg)",
            borderColor: "var(--theme-surface-border)",
          }}
        >
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-2" style={{ color: "var(--theme-text-primary)" }}>
            حدث خطأ في تحميل لوحة المعلومات
          </h3>
          <p className="mb-6" style={{ color: "var(--theme-text-secondary)" }}>
            {error}
          </p>
          <button
            onClick={fetchDashboard}
            className="px-6 py-2.5 rounded-xl font-semibold text-white transition-transform hover:scale-105"
            style={{ background: "var(--theme-cta-gradient)" }}
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  const stats = data?.stats ?? { avg_score: 0, exams_completed: 0, points: 0, streak_days: 0 };
  const subjects = data?.subjects ?? [];
  const recentActivity = data?.recent_activity ?? [];

  // Calculate which days in the current week had activity for the streak bar
  const today = new Date();
  const todayDayIndex = (today.getDay() + 1) % 7; // Sat=0, Sun=1, ..., Fri=6
  const activeDays = Array.from({ length: 7 }, (_, i) => i < stats.streak_days && i <= todayDayIndex);

  // ─── Stats Config ───────────────────────────────────────────────────────
  const statsConfig = [
    {
      label: "متوسط الدرجات",
      value: animAvg,
      suffix: "%",
      icon: TrendingUp,
      gradient: "from-blue-500/20 to-cyan-500/20",
      iconColor: "#3b82f6",
      gauge: true,
    },
    {
      label: "الامتحانات",
      value: animExams,
      suffix: "",
      icon: BookOpen,
      gradient: "from-emerald-500/20 to-green-500/20",
      iconColor: "#10b981",
    },
    {
      label: "النقاط",
      value: animPoints,
      suffix: "",
      icon: Trophy,
      gradient: "from-amber-500/20 to-yellow-500/20",
      iconColor: "#f59e0b",
    },
    {
      label: "أيام الاستمرار",
      value: animStreak,
      suffix: "",
      icon: Flame,
      gradient: "from-red-500/20 to-orange-500/20",
      iconColor: "#ef4444",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6" dir="rtl">
      {/* ═══ 1. Welcome Banner ═══════════════════════════════════════════ */}
      <section
        className="rounded-2xl p-6 border relative overflow-hidden"
        style={{
          background: "var(--theme-surface-bg)",
          borderColor: "var(--theme-surface-border)",
        }}
      >
        {/* Decorative gradient blob */}
        <div
          className="absolute -top-16 -left-16 w-48 h-48 rounded-full opacity-20 blur-3xl"
          style={{ background: "var(--theme-cta-gradient)" }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl md:text-2xl font-bold" style={{ color: "var(--theme-text-primary)" }}>
              أهلاً {user?.fullName || "طالب"}! 👋
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {greetingIcon}
            <p className="text-sm md:text-base" style={{ color: "var(--theme-text-secondary)" }}>
              {greeting}
            </p>
          </div>
        </div>
      </section>

      {/* ═══ 2. Stats Cards Row ═══════════════════════════════════════════ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsConfig.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-2xl p-4 md:p-5 border transition-transform hover:scale-[1.02]"
              style={{
                background: "var(--theme-surface-bg)",
                borderColor: "var(--theme-surface-border)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${stat.gradient}`}
                >
                  <Icon className="w-5 h-5" style={{ color: stat.iconColor }} />
                </div>
                {stat.gauge && <MiniGauge value={stats.avg_score} size={42} />}
              </div>
              <p className="text-xs mb-1" style={{ color: "var(--theme-text-secondary)" }}>
                {stat.label}
              </p>
              <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--theme-text-primary)" }}>
                {stat.value.toLocaleString("ar-EG")}
                {stat.suffix && (
                  <span className="text-base mr-0.5" style={{ color: "var(--theme-text-secondary)" }}>
                    {stat.suffix}
                  </span>
                )}
              </p>
            </div>
          );
        })}
      </section>

      {/* ═══ 3. Streak Week Bar ═══════════════════════════════════════════ */}
      <section
        className="rounded-2xl p-5 border"
        style={{
          background: "var(--theme-surface-bg)",
          borderColor: "var(--theme-surface-border)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <h3 className="font-bold text-sm" style={{ color: "var(--theme-text-primary)" }}>
              سلسلة المذاكرة
            </h3>
          </div>
          <span className="text-xs px-3 py-1 rounded-full font-semibold" style={{
            background: stats.streak_days > 0 ? "rgba(249,115,22,0.15)" : "rgba(156,163,175,0.15)",
            color: stats.streak_days > 0 ? "#f97316" : "var(--theme-text-secondary)",
          }}>
            {stats.streak_days > 0 ? `🔥 ${stats.streak_days} يوم` : "ابدأ سلسلتك!"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          {ARABIC_DAYS.map((day, i) => {
            const isActive = activeDays[i];
            const isToday = i === todayDayIndex;
            return (
              <div key={day} className="flex flex-col items-center gap-1.5 flex-1">
                <div
                  className={`
                    w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs font-bold
                    transition-all duration-500
                    ${isToday ? "ring-2 ring-offset-2" : ""}
                  `}
                  style={{
                    background: isActive
                      ? "linear-gradient(135deg, #f97316, #ef4444)"
                      : "var(--theme-surface-border)",
                    color: isActive ? "#fff" : "var(--theme-text-secondary)",
                    outline: isToday ? "2px solid #f97316" : undefined,
                    outlineOffset: isToday ? "2px" : undefined,
                  }}
                >
                  {isActive ? (
                    <Flame className={`w-4 h-4 ${isToday ? "animate-pulse" : ""}`} />
                  ) : (
                    <span className="opacity-50">·</span>
                  )}
                </div>
                <span
                  className={`text-[10px] md:text-xs ${isToday ? "font-bold" : ""}`}
                  style={{
                    color: isToday ? "var(--theme-text-primary)" : "var(--theme-text-secondary)",
                  }}
                >
                  {day}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══ 4. Subjects Progress Section ════════════════════════════════ */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-base" style={{ color: "var(--theme-text-primary)" }}>
            المواد الدراسية
          </h2>
          <Link
            href="/subjects"
            className="flex items-center gap-1 text-sm font-semibold transition-colors hover:opacity-80"
            style={{ color: "var(--theme-primary)" }}
          >
            عرض الكل
            <ChevronLeft className="w-4 h-4" />
          </Link>
        </div>

        {subjects.length === 0 ? (
          <div
            className="rounded-2xl p-8 border text-center"
            style={{
              background: "var(--theme-surface-bg)",
              borderColor: "var(--theme-surface-border)",
            }}
          >
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" style={{ color: "var(--theme-text-secondary)" }} />
            <p className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>
              لم يتم إضافة مواد بعد
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.slice(0, 6).map((subject) => {
              const progress = Math.min(subject.progress ?? 0, 100);
              return (
                <div
                  key={subject.id}
                  className="rounded-2xl p-5 border transition-all hover:shadow-lg hover:scale-[1.01] group"
                  style={{
                    background: "var(--theme-surface-bg)",
                    borderColor: "var(--theme-surface-border)",
                  }}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-2xl">{getSubjectEmoji(subject.icon)}</span>
                    <div className="flex-1 min-w-0">
                      <h3
                        className="font-bold text-sm truncate"
                        style={{ color: "var(--theme-text-primary)" }}
                      >
                        {subject.name}
                      </h3>
                      <p className="text-xs mt-0.5" style={{ color: "var(--theme-text-secondary)" }}>
                        {subject.completed_lessons ?? 0} / {subject.lessons_count} درس
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs" style={{ color: "var(--theme-text-secondary)" }}>
                        التقدم
                      </span>
                      <span className="text-xs font-bold" style={{ color: "var(--theme-primary)" }}>
                        {progress}%
                      </span>
                    </div>
                    <div
                      className="w-full h-2 rounded-full overflow-hidden"
                      style={{ background: "var(--theme-surface-border)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{
                          width: `${progress}%`,
                          background: "var(--theme-cta-gradient)",
                        }}
                      />
                    </div>
                  </div>

                  <Link
                    href="/subjects"
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
                    style={{
                      background: "var(--theme-cta-gradient)",
                      color: "#fff",
                    }}
                  >
                    ابدأ المذاكرة
                    <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ═══ 5. Recent Activity ═══════════════════════════════════════════ */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-base" style={{ color: "var(--theme-text-primary)" }}>
            النشاط الأخير
          </h2>
          <Clock className="w-4 h-4" style={{ color: "var(--theme-text-secondary)" }} />
        </div>

        <div
          className="rounded-2xl border overflow-hidden"
          style={{
            background: "var(--theme-surface-bg)",
            borderColor: "var(--theme-surface-border)",
          }}
        >
          {recentActivity.length === 0 ? (
            <div className="p-8 text-center">
              <Target className="w-10 h-10 mx-auto mb-3 opacity-40" style={{ color: "var(--theme-text-secondary)" }} />
              <p className="text-sm font-semibold mb-1" style={{ color: "var(--theme-text-primary)" }}>
                لا يوجد نشاط بعد
              </p>
              <p className="text-xs" style={{ color: "var(--theme-text-secondary)" }}>
                ابدأ أول امتحان من صفحة المواد
              </p>
              <Link
                href="/subjects"
                className="inline-flex items-center gap-1 mt-4 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-transform hover:scale-105"
                style={{ background: "var(--theme-cta-gradient)" }}
              >
                تصفح المواد
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              </Link>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--theme-surface-border)" }}>
              {recentActivity.slice(0, 5).map((activity, index) => {
                const scoreColor =
                  activity.score >= 80
                    ? "#10b981"
                    : activity.score >= 60
                    ? "#f59e0b"
                    : "#ef4444";
                return (
                  <div
                    key={activity.id || index}
                    className="flex items-center gap-3 p-4 transition-colors hover:bg-black/5"
                  >
                    <span className="text-xl flex-shrink-0">
                      {getSubjectEmoji(activity.subject_icon)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--theme-text-primary)" }}>
                        {activity.subject_name}
                      </p>
                      <p className="text-xs" style={{ color: "var(--theme-text-secondary)" }}>
                        {timeAgo(activity.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-sm font-bold tabular-nums px-2.5 py-1 rounded-lg"
                        style={{
                          color: scoreColor,
                          background: `${scoreColor}18`,
                        }}
                      >
                        {activity.score}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ═══ 6. Quick Actions Banner ═════════════════════════════════════ */}
      <section
        className="rounded-2xl p-6 relative overflow-hidden"
        style={{ background: "var(--theme-cta-gradient)" }}
      >
        {/* Decorative shapes */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -translate-x-12 -translate-y-12" />
        <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/10 rounded-full translate-x-8 translate-y-8" />

        <div className="relative z-10">
          <h3 className="text-lg font-bold text-white mb-1">
            ابدأ مذاكرتك الآن 🚀
          </h3>
          <p className="text-sm text-white/80 mb-5">
            اختر من الخيارات التالية وابدأ فوراً
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/subjects"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/20 backdrop-blur-sm text-white text-sm font-semibold transition-all hover:bg-white/30 hover:scale-105"
            >
              <BookOpen className="w-4 h-4" />
              اختر مادة
            </Link>
            <Link
              href="/exams"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/20 backdrop-blur-sm text-white text-sm font-semibold transition-all hover:bg-white/30 hover:scale-105"
            >
              <Zap className="w-4 h-4" />
              امتحان سريع
            </Link>
            <Link
              href="/emergency"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/20 backdrop-blur-sm text-white text-sm font-semibold transition-all hover:bg-white/30 hover:scale-105"
            >
              <Brain className="w-4 h-4" />
              وضع الطوارئ
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ 7. Performance Report Button ════════════════════════════════ */}
      <section className="flex justify-center pb-4">
        <button
          onClick={() => setShowPerformance(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl border font-semibold text-sm transition-all hover:shadow-lg hover:scale-[1.02]"
          style={{
            background: "var(--theme-surface-bg)",
            borderColor: "var(--theme-surface-border)",
            color: "var(--theme-text-primary)",
          }}
        >
          <BarChart3 className="w-5 h-5" style={{ color: "var(--theme-primary)" }} />
          📊 تقرير الأداء
        </button>
      </section>

      {/* ═══ Performance Report Modal ════════════════════════════════════ */}
      {showPerformance && (
        <PerformanceReport onClose={() => setShowPerformance(false)} />
      )}
    </div>
  );
}
