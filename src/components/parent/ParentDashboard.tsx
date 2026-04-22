"use client";

import { useState } from "react";
import {
  Users, Phone, Key, Loader2, LogIn,
  BarChart3, BookOpen, Trophy, TrendingUp,
} from "lucide-react";

interface StudentData {
  student_name: string;
  phone: string;
  total_exams: number;
  average_score: number;
  total_points: number;
  rank: number;
  subjects: {
    name: string;
    exams: number;
    avg_score: number;
  }[];
  recent_exams: {
    subject_name: string;
    score: number;
    total_questions: number;
    date: string;
  }[];
}

export default function ParentDashboard() {
  const [phone, setPhone] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<StudentData | null>(null);

  const handleLogin = async () => {
    setError("");
    if (!phone || !accessCode) {
      setError("رقم الهاتف وكود الوصول مطلوبان");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/parent?phone=${encodeURIComponent(phone)}&code=${encodeURIComponent(accessCode)}`);
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || "فشل في تسجيل الدخول");
      } else {
        setData(result);
      }
    } catch {
      setError("فشل الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  // Login form
  if (!data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="themed-card p-8 w-full max-w-md space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #8B5CF6, #6366F1)" }}>
              <Users size={28} color="#fff" />
            </div>
            <h1 className="text-xl font-extrabold mb-1" style={{ color: "var(--theme-text-primary)" }}>متابعة ولي الأمر</h1>
            <p className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>أدخل بيانات الطالب للمتابعة</p>
          </div>

          {error && (
            <div className="p-3 rounded-lg text-sm font-bold text-center" style={{ background: "rgba(220,38,38,0.1)", color: "#DC2626", border: "1px solid rgba(220,38,38,0.3)" }}>
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-bold mb-2" style={{ color: "var(--theme-text-primary)" }}>📱 رقم هاتف الطالب</label>
            <div className="relative">
              <Phone size={18} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--theme-text-muted)" }} />
              <input className="themed-input pr-10" placeholder="01xxxxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" style={{ textAlign: "right" }} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2" style={{ color: "var(--theme-text-primary)" }}>🔑 كود الوصول</label>
            <div className="relative">
              <Key size={18} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--theme-text-muted)" }} />
              <input className="themed-input pr-10" placeholder="كود الوصول من الطالب" value={accessCode} onChange={(e) => setAccessCode(e.target.value)} dir="ltr" style={{ textAlign: "right" }} />
            </div>
          </div>

          <button onClick={handleLogin} disabled={loading} className="themed-btn-primary w-full py-3 flex items-center justify-center gap-2 text-lg" style={{ opacity: loading ? 0.7 : 1 }}>
            {loading ? <Loader2 size={20} className="animate-spin" /> : <LogIn size={20} />}
            <span>{loading ? "جارٍ الدخول..." : "دخول"}</span>
          </button>
        </div>
      </div>
    );
  }

  // Dashboard
  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="themed-card p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #8B5CF6, #6366F1)" }}>
            <Users size={24} color="#fff" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold" style={{ color: "var(--theme-text-primary)" }}>{data.student_name}</h1>
            <p className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>📱 {data.phone}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: <BarChart3 size={18} />, label: "الامتحانات", value: data.total_exams, color: "#3B82F6" },
          { icon: <TrendingUp size={18} />, label: "المتوسط", value: `${Math.round(data.average_score)}%`, color: "#10B981" },
          { icon: <Trophy size={18} />, label: "النقاط", value: data.total_points, color: "#F59E0B" },
          { icon: <Trophy size={18} />, label: "الترتيب", value: `#${data.rank}`, color: "#8B5CF6" },
        ].map((stat, i) => (
          <div key={i} className="themed-card p-3 text-center">
            <div className="w-8 h-8 rounded-lg mx-auto mb-1 flex items-center justify-center" style={{ background: `${stat.color}20`, color: stat.color }}>{stat.icon}</div>
            <div className="text-lg font-extrabold" style={{ color: "var(--theme-text-primary)" }}>{stat.value}</div>
            <div className="text-xs" style={{ color: "var(--theme-text-muted)" }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Subjects Performance */}
      {data.subjects?.length > 0 && (
        <div className="themed-card p-4">
          <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--theme-text-primary)" }}>
            <BookOpen size={16} style={{ color: "var(--theme-primary)" }} /> أداء المواد
          </h2>
          <div className="space-y-3">
            {data.subjects.map((subject, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm font-bold" style={{ color: "var(--theme-text-primary)" }}>{subject.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs" style={{ color: "var(--theme-text-muted)" }}>{subject.exams} امتحان</span>
                  <span className="text-sm font-bold" style={{ color: subject.avg_score >= 70 ? "#10B981" : "#EF4444" }}>
                    {Math.round(subject.avg_score)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Exams */}
      {data.recent_exams?.length > 0 && (
        <div className="themed-card p-4">
          <h2 className="text-sm font-bold mb-3" style={{ color: "var(--theme-text-primary)" }}>📝 آخر الامتحانات</h2>
          <div className="space-y-2">
            {data.recent_exams.map((exam, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg" style={{ background: "var(--theme-surface-bg)" }}>
                <div>
                  <span className="text-sm font-bold" style={{ color: "var(--theme-text-primary)" }}>{exam.subject_name}</span>
                  <span className="text-xs mr-2" style={{ color: "var(--theme-text-muted)" }}>{new Date(exam.date).toLocaleDateString("ar-EG")}</span>
                </div>
                <span className="text-sm font-bold" style={{ color: exam.score >= 70 ? "#10B981" : "#EF4444" }}>
                  {Math.round(exam.score)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
