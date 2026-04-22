"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X, FileText, BarChart3, Trophy, Star,
  TrendingUp, TrendingDown, Loader2, Target,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";

interface PerformanceData {
  total_exams: number;
  average_score: number;
  total_points: number;
  rank: number;
  weak_subjects: { name: string; avg_score: number }[];
  strong_subjects: { name: string; avg_score: number }[];
  subjects_table: { name: string; exams: number; avg_score: number; best_score: number }[];
  daily_trend: { date: string; score: number }[];
}

export default function PerformanceReport({ onClose }: { onClose: () => void }) {
  const { token } = useAuthStore();
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/performance", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (res.ok) {
        setData(result);
      }
    } catch (e) {
      console.error("Failed to fetch performance:", e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
        <div className="themed-card p-8">
          <Loader2 size={32} className="animate-spin mx-auto" style={{ color: "var(--theme-primary)" }} />
        </div>
      </div>
    );
  }

  const stats = [
    { icon: <FileText size={20} />, label: "الامتحانات", value: data?.total_exams ?? 0, color: "#3B82F6" },
    { icon: <Target size={20} />, label: "متوسط الدرجات", value: `${Math.round(data?.average_score ?? 0)}%`, color: "#10B981" },
    { icon: <Star size={20} />, label: "النقاط", value: data?.total_points ?? 0, color: "#F59E0B" },
    { icon: <Trophy size={20} />, label: "الترتيب", value: `#${data?.rank ?? '-'}`, color: "#8B5CF6" },
  ];

  const maxTrendScore = Math.max(...(data?.daily_trend?.map((d) => d.score) ?? [100]));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="themed-card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--theme-cta-gradient)" }}>
              <BarChart3 size={20} color="#fff" />
            </div>
            <h2 className="text-lg font-extrabold" style={{ color: "var(--theme-text-primary)" }}>تقرير الأداء</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:opacity-70" style={{ color: "var(--theme-text-muted)" }}>
            <X size={20} />
          </button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {stats.map((stat, i) => (
            <div key={i} className="themed-card p-3 text-center">
              <div className="w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center" style={{ background: `${stat.color}20`, color: stat.color }}>
                {stat.icon}
              </div>
              <div className="text-lg font-extrabold" style={{ color: "var(--theme-text-primary)" }}>{stat.value}</div>
              <div className="text-xs" style={{ color: "var(--theme-text-muted)" }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Weak / Strong Subjects */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="themed-card p-3">
            <h3 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: "#EF4444" }}>
              <TrendingDown size={16} /> نقاط الضعف
            </h3>
            {(data?.weak_subjects ?? []).length === 0 ? (
              <p className="text-xs" style={{ color: "var(--theme-text-muted)" }}>لا توجد بيانات</p>
            ) : (
              <div className="space-y-1">
                {data?.weak_subjects?.map((s, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span style={{ color: "var(--theme-text-primary)" }}>{s.name}</span>
                    <span style={{ color: "#EF4444" }}>{Math.round(s.avg_score)}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="themed-card p-3">
            <h3 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: "#10B981" }}>
              <TrendingUp size={16} /> نقاط القوة
            </h3>
            {(data?.strong_subjects ?? []).length === 0 ? (
              <p className="text-xs" style={{ color: "var(--theme-text-muted)" }}>لا توجد بيانات</p>
            ) : (
              <div className="space-y-1">
                {data?.strong_subjects?.map((s, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span style={{ color: "var(--theme-text-primary)" }}>{s.name}</span>
                    <span style={{ color: "#10B981" }}>{Math.round(s.avg_score)}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Subjects Table */}
        {(data?.subjects_table ?? []).length > 0 && (
          <div className="themed-card p-3 mb-6 overflow-x-auto">
            <h3 className="text-sm font-bold mb-3" style={{ color: "var(--theme-text-primary)" }}>📊 أداء المواد</h3>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--theme-surface-border)" }}>
                  <th className="text-right pb-2 font-bold" style={{ color: "var(--theme-text-muted)" }}>المادة</th>
                  <th className="text-center pb-2 font-bold" style={{ color: "var(--theme-text-muted)" }}>الامتحانات</th>
                  <th className="text-center pb-2 font-bold" style={{ color: "var(--theme-text-muted)" }}>المتوسط</th>
                  <th className="text-center pb-2 font-bold" style={{ color: "var(--theme-text-muted)" }}>الأفضل</th>
                </tr>
              </thead>
              <tbody>
                {data?.subjects_table?.map((s, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--theme-surface-border)" }}>
                    <td className="py-2 font-bold" style={{ color: "var(--theme-text-primary)" }}>{s.name}</td>
                    <td className="text-center py-2" style={{ color: "var(--theme-text-secondary)" }}>{s.exams}</td>
                    <td className="text-center py-2" style={{ color: s.avg_score >= 70 ? "#10B981" : "#EF4444" }}>{Math.round(s.avg_score)}%</td>
                    <td className="text-center py-2" style={{ color: "var(--theme-primary)" }}>{Math.round(s.best_score)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 7-Day Trend Chart */}
        {(data?.daily_trend ?? []).length > 0 && (
          <div className="themed-card p-3">
            <h3 className="text-sm font-bold mb-3" style={{ color: "var(--theme-text-primary)" }}>📈 الأداء في آخر 7 أيام</h3>
            <div className="flex items-end gap-2 h-32">
              {data?.daily_trend?.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-bold" style={{ color: "var(--theme-text-muted)" }}>
                    {Math.round(d.score)}%
                  </span>
                  <div
                    className="w-full rounded-t-md transition-all"
                    style={{
                      height: `${(d.score / maxTrendScore) * 100}%`,
                      minHeight: "4px",
                      background: d.score >= 70 ? "var(--theme-primary)" : "#EF4444",
                      opacity: 0.8,
                    }}
                  />
                  <span className="text-[9px]" style={{ color: "var(--theme-text-muted)" }}>
                    {new Date(d.date).toLocaleDateString("ar-EG", { weekday: "short" })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
