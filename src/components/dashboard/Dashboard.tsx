"use client";

import { useAuthStore } from "@/store/auth-store";
import Link from "next/link";
import {
  BookOpen, CheckSquare, Trophy, Flame, Clock,
  TrendingUp, ChevronLeft, Bot, Award, Star,
  Calendar, Target,
} from "lucide-react";

const statCards = [
  { label: "المعدل العام", value: "92%", icon: TrendingUp, color: "#6366F1" },
  { label: "امتحانات مكتملة", value: "47", icon: CheckSquare, color: "#10B981" },
  { label: "نقاط مكتسبة", value: "1,850", icon: Star, color: "#F59E0B" },
  { label: "أيام متتالية", value: "12", icon: Flame, color: "#EF4444" },
];

const subjects = [
  { name: "الرياضيات", icon: "📐", progress: 75, lessons: 24, completed: 18, color: "#3B82F6" },
  { name: "الفيزياء", icon: "⚛️", progress: 60, lessons: 20, completed: 12, color: "#8B5CF6" },
  { name: "الكيمياء", icon: "🧪", progress: 45, lessons: 18, completed: 8, color: "#10B981" },
];

const recentActivity = [
  { type: "exam", text: "أكملت امتحان الرياضيات — الباب الثاني", time: "منذ ساعتين", score: "18/20" },
  { type: "lesson", text: "درست ملخص الفيزياء — قوانين نيوتن", time: "منذ 4 ساعات", score: null },
  { type: "chat", text: "سألت أستاذك الذكي عن الكيمياء العضوية", time: "أمس", score: null },
  { type: "exam", text: "أكملت اختبار الكيمياء — الباب الأول", time: "أمس", score: "16/20" },
];

const streakDays = [
  { day: "سبت", done: true },
  { day: "أحد", done: true },
  { day: "اثنين", done: true },
  { day: "ثلاثاء", done: true },
  { day: "أربعاء", done: false },
  { day: "خميس", done: false },
  { day: "جمعة", done: false },
];

export default function Dashboard() {
  const { user } = useAuthStore();

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

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {subjects.map((subject, i) => (
              <Link key={i} href="/subjects" className="themed-card p-4 block hover:shadow-lg transition-shadow" style={{ textDecoration: "none" }}>
                <div className="text-3xl mb-3">{subject.icon}</div>
                <h3 className="text-xl font-extrabold mb-2" style={{ color: "var(--theme-text-primary)" }}>
                  {subject.name}
                </h3>
                <div className="text-xs mb-2" style={{ color: "var(--theme-text-secondary)" }}>
                  {subject.completed}/{subject.lessons} درس مكتمل
                </div>
                {/* Progress bar */}
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--theme-surface-border)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${subject.progress}%`, background: subject.color }}
                  />
                </div>
                <div className="text-xs font-bold mt-1 text-left" style={{ color: subject.color }}>
                  {subject.progress}%
                </div>
              </Link>
            ))}
          </div>
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
                4 أيام
              </span>
              <span className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>
                متتالية! 🎉
              </span>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {streakDays.map((d, i) => (
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
        </div>
      </div>

      {/* Recent Activity */}
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
                {item.type === "exam" ? <CheckSquare size={18} style={{ color: "var(--theme-primary)" }} /> :
                 item.type === "lesson" ? <BookOpen size={18} style={{ color: "var(--theme-primary)" }} /> :
                 <Bot size={18} style={{ color: "var(--theme-primary)" }} />}
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
                <div className="text-sm font-extrabold px-3 py-1 rounded-lg"
                  style={{ background: "var(--theme-hover-overlay)", color: "var(--theme-primary)" }}>
                  {item.score}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Performance Report */}
      <div className="text-center">
        <button className="themed-btn-primary px-8 py-3 inline-flex items-center gap-2">
          <Target size={20} />
          <span>عرض تقرير الأداء الكامل</span>
        </button>
      </div>
    </div>
  );
}