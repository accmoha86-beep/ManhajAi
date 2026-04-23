"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import {
  Trophy, Medal, Flame, Star, Loader2, MapPin,
  ChevronDown, Crown, TrendingUp, User,
} from "lucide-react";
import { GOVERNORATES } from "@/lib/constants";

interface LeaderEntry {
  rank: number;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  governorate: string | null;
  points: number;
  streak_days: number;
  is_current_user: boolean;
}

interface LeaderboardData {
  leaderboard: LeaderEntry[];
  current_user: { rank: number; points: number; streak_days: number } | null;
}

export default function LeaderboardPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [governorate, setGovernorate] = useState("");
  const [showFilter, setShowFilter] = useState(false);

  const fetchLeaderboard = async (gov?: string) => {
    setLoading(true);
    try {
      const url = gov
        ? `/api/leaderboard?governorate=${encodeURIComponent(gov)}`
        : "/api/leaderboard";
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const handleGovernorateChange = (gov: string) => {
    setGovernorate(gov);
    setShowFilter(false);
    fetchLeaderboard(gov || undefined);
  };

  const entries = data?.leaderboard || [];
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);
  const currentRank = data?.current_user?.rank || null;

  const podiumColors = [
    { bg: "rgba(245,158,11,0.15)", text: "#F59E0B", icon: Crown, medal: "🥇" },
    { bg: "rgba(148,163,184,0.15)", text: "#94A3B8", icon: Medal, medal: "🥈" },
    { bg: "rgba(180,83,9,0.15)", text: "#B45309", icon: Medal, medal: "🥉" },
  ];

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin mx-auto mb-4" style={{ color: "var(--theme-primary)" }} />
          <p className="text-sm font-bold" style={{ color: "var(--theme-text-secondary)" }}>
            جارٍ تحميل المتصدرين...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 font-cairo max-w-3xl mx-auto space-y-6" style={{ color: "var(--theme-text-primary)" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: "var(--theme-text-primary)" }}>
            🏆 لوحة المتصدرين
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--theme-text-secondary)" }}>
            أعلى {entries.length} طالب أداءً
          </p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className="themed-btn-outline text-sm flex items-center gap-2"
          >
            <MapPin size={14} />
            {governorate || "كل المحافظات"}
            <ChevronDown size={14} />
          </button>
          {showFilter && (
            <div
              className="absolute top-full left-0 mt-1 w-52 max-h-60 overflow-y-auto rounded-xl shadow-lg z-20"
              style={{ background: "var(--theme-surface-bg)", border: "1px solid var(--theme-surface-border)" }}
            >
              <button
                onClick={() => handleGovernorateChange("")}
                className="w-full p-2 text-right text-sm hover:opacity-80 transition-opacity"
                style={{
                  background: governorate === "" ? "var(--theme-hover-overlay)" : "transparent",
                  color: "var(--theme-text-primary)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                كل المحافظات
              </button>
              {GOVERNORATES.map((g) => (
                <button
                  key={g}
                  onClick={() => handleGovernorateChange(g)}
                  className="w-full p-2 text-right text-sm hover:opacity-80 transition-opacity"
                  style={{
                    background: governorate === g ? "var(--theme-hover-overlay)" : "transparent",
                    color: "var(--theme-text-primary)",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Current user rank */}
      {currentRank && (
        <div
          className="themed-card p-4 flex items-center gap-4"
          style={{ borderColor: "var(--theme-primary)", borderWidth: "2px" }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-extrabold"
            style={{ background: "var(--theme-cta-gradient)", color: "#fff" }}
          >
            #{currentRank}
          </div>
          <div className="flex-1">
            <div className="text-sm font-extrabold" style={{ color: "var(--theme-text-primary)" }}>
              ترتيبك الحالي
            </div>
            <div className="text-xs" style={{ color: "var(--theme-text-secondary)" }}>
              {(data?.current_user?.points || 0).toLocaleString()} نقطة
            </div>
          </div>
          <TrendingUp size={20} style={{ color: "var(--theme-primary)" }} />
        </div>
      )}

      {/* Podium — Top 3 */}
      {top3.length > 0 && (
        <div className="grid grid-cols-3 gap-4 items-end">
          {/* 2nd place — left */}
          {top3.length > 1 ? (
            <div className="themed-card p-4 text-center" style={{ minHeight: "160px" }}>
              <span className="text-3xl">{podiumColors[1].medal}</span>
              <div
                className="w-14 h-14 mx-auto mt-2 rounded-full flex items-center justify-center text-lg font-extrabold"
                style={{ background: podiumColors[1].bg, color: podiumColors[1].text }}
              >
                {top3[1].full_name?.[0] || <User size={20} />}
              </div>
              <div className="text-sm font-extrabold mt-2 truncate" style={{ color: "var(--theme-text-primary)" }}>
                {top3[1].full_name}
              </div>
              <div className="text-xs font-bold mt-1" style={{ color: podiumColors[1].text }}>
                {(top3[1].points || 0).toLocaleString()} نقطة
              </div>
            </div>
          ) : (
            <div />
          )}

          {/* 1st place — center (taller) */}
          {top3.length > 0 && (
            <div className="themed-card p-5 text-center -mb-2" style={{ minHeight: "200px" }}>
              <span className="text-4xl">{podiumColors[0].medal}</span>
              <div
                className="w-16 h-16 mx-auto mt-2 rounded-full flex items-center justify-center text-xl font-extrabold"
                style={{ background: podiumColors[0].bg, color: podiumColors[0].text }}
              >
                {top3[0].full_name?.[0] || <Crown size={24} />}
              </div>
              <div className="text-base font-extrabold mt-2 truncate" style={{ color: "var(--theme-text-primary)" }}>
                {top3[0].full_name}
              </div>
              <div className="text-sm font-bold mt-1" style={{ color: podiumColors[0].text }}>
                {(top3[0].points || 0).toLocaleString()} نقطة
              </div>
              {top3[0].streak_days > 0 && (
                <div className="text-xs flex items-center justify-center gap-1 mt-1" style={{ color: "#EF4444" }}>
                  <Flame size={12} />
                  {top3[0].streak_days} يوم
                </div>
              )}
              {top3[0].is_current_user && (
                <div
                  className="text-xs font-bold mt-2 px-2 py-0.5 rounded-full inline-block"
                  style={{ background: "var(--theme-cta-gradient)", color: "#fff" }}
                >
                  أنت هنا! ⭐
                </div>
              )}
            </div>
          )}

          {/* 3rd place — right */}
          {top3.length > 2 ? (
            <div className="themed-card p-4 text-center" style={{ minHeight: "140px" }}>
              <span className="text-3xl">{podiumColors[2].medal}</span>
              <div
                className="w-12 h-12 mx-auto mt-2 rounded-full flex items-center justify-center text-base font-extrabold"
                style={{ background: podiumColors[2].bg, color: podiumColors[2].text }}
              >
                {top3[2].full_name?.[0] || <User size={18} />}
              </div>
              <div className="text-sm font-extrabold mt-2 truncate" style={{ color: "var(--theme-text-primary)" }}>
                {top3[2].full_name}
              </div>
              <div className="text-xs font-bold mt-1" style={{ color: podiumColors[2].text }}>
                {(top3[2].points || 0).toLocaleString()} نقطة
              </div>
            </div>
          ) : (
            <div />
          )}
        </div>
      )}

      {/* Remaining entries */}
      {rest.length > 0 && (
        <div className="space-y-2">
          {rest.map((entry) => (
            <div
              key={entry.user_id}
              className="themed-card p-3 flex items-center gap-3"
              style={{
                borderColor: entry.is_current_user ? "var(--theme-primary)" : undefined,
                borderWidth: entry.is_current_user ? "2px" : undefined,
              }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-extrabold flex-shrink-0"
                style={{
                  background: entry.is_current_user ? "var(--theme-cta-gradient)" : "var(--theme-surface-border)",
                  color: entry.is_current_user ? "#fff" : "var(--theme-text-muted)",
                }}
              >
                {entry.rank}
              </div>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ background: "var(--theme-hover-overlay)", color: "var(--theme-primary)" }}
              >
                {entry.full_name?.[0] || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-extrabold truncate" style={{ color: "var(--theme-text-primary)" }}>
                  {entry.full_name}
                  {entry.is_current_user && (
                    <span
                      className="text-[0.6rem] font-bold mr-2 px-1.5 py-0.5 rounded-full"
                      style={{ background: "var(--theme-cta-gradient)", color: "#fff" }}
                    >
                      أنت هنا!
                    </span>
                  )}
                </div>
                {entry.governorate && (
                  <div className="text-xs flex items-center gap-1" style={{ color: "var(--theme-text-muted)" }}>
                    <MapPin size={10} />
                    {entry.governorate}
                  </div>
                )}
              </div>
              <div className="text-left flex-shrink-0">
                <div className="text-sm font-extrabold" style={{ color: "var(--theme-primary)" }}>
                  {(entry.points || 0).toLocaleString()}
                </div>
                <div className="text-[0.6rem]" style={{ color: "var(--theme-text-muted)" }}>
                  نقطة
                </div>
              </div>
              {entry.streak_days > 0 && (
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <Flame size={12} style={{ color: "#EF4444" }} />
                  <span className="text-xs font-bold" style={{ color: "#EF4444" }}>
                    {entry.streak_days}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {entries.length === 0 && !loading && (
        <div className="themed-card p-8 text-center">
          <div className="text-5xl mb-4">🏆</div>
          <p className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>
            لا يوجد متصدرين بعد. كن أول واحد!
          </p>
        </div>
      )}
    </div>
  );
}
