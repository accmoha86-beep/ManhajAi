"use client";

import { useState } from "react";
import { Trophy, Medal, Crown, TrendingUp, Star } from "lucide-react";

const students = [
  { rank: 1, name: "أحمد محمد", points: 2850, streak: 25, avatar: "👨‍🎓" },
  { rank: 2, name: "فاطمة علي", points: 2720, streak: 22, avatar: "👩‍🎓" },
  { rank: 3, name: "محمد حسن", points: 2680, streak: 20, avatar: "👨‍🎓" },
  { rank: 4, name: "مريم أحمد", points: 2450, streak: 18, avatar: "👩‍🎓" },
  { rank: 5, name: "عمر خالد", points: 2300, streak: 15, avatar: "👨‍🎓" },
  { rank: 6, name: "نور الدين", points: 2100, streak: 14, avatar: "👨‍🎓" },
  { rank: 7, name: "سارة محمود", points: 1950, streak: 12, avatar: "👩‍🎓" },
  { rank: 8, name: "يوسف إبراهيم", points: 1850, streak: 10, avatar: "👨‍🎓" },
  { rank: 9, name: "هنا عبدالله", points: 1750, streak: 8, avatar: "👩‍🎓" },
  { rank: 10, name: "كريم سعيد", points: 1600, streak: 6, avatar: "👨‍🎓" },
];

const periods = [
  { key: "week", label: "هذا الأسبوع" },
  { key: "month", label: "هذا الشهر" },
  { key: "all", label: "كل الوقت" },
];

export default function LeaderboardPage() {
  const [period, setPeriod] = useState("week");

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown size={24} style={{ color: "#FFD700" }} />;
    if (rank === 2) return <Medal size={24} style={{ color: "#C0C0C0" }} />;
    if (rank === 3) return <Medal size={24} style={{ color: "#CD7F32" }} />;
    return <span className="text-lg font-extrabold" style={{ color: "var(--theme-text-muted)" }}>{rank}</span>;
  };

  const getRankBg = (rank: number) => {
    if (rank === 1) return "linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,215,0,0.05))";
    if (rank === 2) return "linear-gradient(135deg, rgba(192,192,192,0.15), rgba(192,192,192,0.05))";
    if (rank === 3) return "linear-gradient(135deg, rgba(205,127,50,0.15), rgba(205,127,50,0.05))";
    return undefined;
  };

  return (
    <div className="p-6 font-cairo" style={{ color: "var(--theme-text-primary)" }}>
      <h1 className="text-2xl font-extrabold mb-6">👥 المتصدرين</h1>

      {/* Top 3 Podium */}
      <div className="grid grid-cols-3 gap-4 mb-8 max-w-xl mx-auto">
        {[students[1], students[0], students[2]].map((s, i) => {
          const order = [2, 1, 3][i];
          const isFirst = order === 1;
          return (
            <div key={s.rank} className="themed-card p-4 text-center"
              style={{
                transform: isFirst ? "scale(1.08)" : "none",
                border: isFirst ? "2px solid #FFD700" : undefined,
                boxShadow: isFirst ? "0 4px 20px rgba(255,215,0,0.2)" : undefined,
              }}>
              <div className="text-3xl mb-2">{s.avatar}</div>
              <div className="mb-2">{getRankIcon(s.rank)}</div>
              <div className="text-sm font-bold mb-1" style={{ color: "var(--theme-text-primary)" }}>{s.name}</div>
              <div className="text-lg font-extrabold" style={{ color: "var(--theme-primary)" }}>{s.points}</div>
              <div className="text-xs" style={{ color: "var(--theme-text-muted)" }}>نقطة</div>
            </div>
          );
        })}
      </div>

      {/* Period Filter */}
      <div className="flex gap-2 mb-6">
        {periods.map((p) => (
          <button key={p.key}
            onClick={() => setPeriod(p.key)}
            className="px-4 py-2 rounded-lg text-sm font-bold cursor-pointer transition-all"
            style={{
              background: period === p.key ? "var(--theme-cta-gradient)" : "var(--theme-surface-bg)",
              color: period === p.key ? "#fff" : "var(--theme-text-secondary)",
              border: `1px solid ${period === p.key ? "transparent" : "var(--theme-surface-border)"}`,
            }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Full List */}
      <div className="themed-card overflow-hidden">
        {students.map((s) => (
          <div key={s.rank}
            className="flex items-center gap-4 p-4 transition-colors"
            style={{
              background: getRankBg(s.rank),
              borderBottom: "1px solid var(--theme-surface-border)",
            }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--theme-hover-overlay)" }}>
              {getRankIcon(s.rank)}
            </div>
            <div className="text-2xl">{s.avatar}</div>
            <div className="flex-1">
              <div className="font-bold" style={{ color: "var(--theme-text-primary)" }}>{s.name}</div>
              <div className="text-xs" style={{ color: "var(--theme-text-muted)" }}>
                🔥 {s.streak} يوم متتالي
              </div>
            </div>
            <div className="text-left">
              <div className="text-lg font-extrabold" style={{ color: "var(--theme-primary)" }}>
                {s.points.toLocaleString()}
              </div>
              <div className="text-xs" style={{ color: "var(--theme-text-muted)" }}>نقطة</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}