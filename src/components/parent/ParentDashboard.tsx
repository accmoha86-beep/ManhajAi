"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Users, BookOpen, Trophy, Flame, BarChart3,
  Key, Copy, CheckCircle, Loader2, AlertCircle,
  Calendar, TrendingUp, Shield, CreditCard,
  ArrowRight, Star, Clock, User,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";

interface ParentStats {
  avg_score: number;
  total_exams: number;
  total_points: number;
  streak_days: number;
}

interface SubjectData {
  name: string;
  icon: string;
  lesson_count: number;
  avg_score: number;
}

interface ExamData {
  subject_name: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  created_at: string;
}

interface SubscriptionData {
  plan_name: string;
  status: string;
  expires_at: string;
}

interface ParentData {
  student_name: string;
  student_phone: string;
  stats: ParentStats;
  subjects: SubjectData[];
  recent_exams: ExamData[];
  subscription: SubscriptionData | null;
}

export default function ParentDashboard() {
  const { user } = useAuthStore();

  // Access code entry state
  const [phone, setPhone] = useState("");
  const [accessCode, setAccessCode] = useState("");

  // Dashboard data state
  const [parentData, setParentData] = useState<ParentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Generate code state (for authenticated students)
  const [generatedCode, setGeneratedCode] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);

  const fetchParentData = useCallback(async () => {
    if (!phone.trim() || !accessCode.trim()) {
      setError("يرجى إدخال رقم الهاتف وكود الوصول");
      return;
    }

    setLoading(true);
    setError("");
    setParentData(null);

    try {
      const res = await fetch(
        `/api/parent?phone=${encodeURIComponent(phone.trim())}&code=${encodeURIComponent(accessCode.trim())}`,
        { credentials: "include" }
      );

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error("كود الوصول غير صحيح أو منتهي الصلاحية");
        }
        if (res.status === 404) {
          throw new Error("لم يتم العثور على بيانات الطالب");
        }
        throw new Error("حدث خطأ في جلب البيانات");
      }

      const data = await res.json();
      setParentData(data);
    } catch (err: any) {
      setError(err.message || "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }, [phone, accessCode]);

  const generateAccessCode = async () => {
    setGenerating(true);
    setGenerateError("");
    setGeneratedCode("");

    try {
      const res = await fetch("/api/parent", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        throw new Error("فشل في إنشاء كود الوصول");
      }

      const data = await res.json();
      setGeneratedCode(data.code || data.access_code || "");
    } catch (err: any) {
      setGenerateError(err.message || "حدث خطأ غير متوقع");
    } finally {
      setGenerating(false);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = generatedCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 75) return "bg-green-500";
    if (score >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getScoreBgLight = (score: number) => {
    if (score >= 75) return "bg-green-50";
    if (score >= 50) return "bg-yellow-50";
    return "bg-red-50";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return { label: "نشط", bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" };
      case "trial":
        return { label: "تجربة", bg: "bg-primary/10", text: "text-primary", dot: "bg-primary" };
      case "expired":
        return { label: "منتهي", bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" };
      default:
        return { label: status, bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-500" };
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("ar-SA", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchParentData();
  };

  const handleLogout = () => {
    setParentData(null);
    setPhone("");
    setAccessCode("");
    setError("");
  };

  // ─── ACCESS CODE ENTRY FORM ───
  if (!parentData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div
              className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: "var(--theme-cta-gradient)" }}
            >
              <Users className="w-10 h-10 text-white" />
            </div>
            <h1
              className="text-2xl font-bold mb-2"
              style={{ color: "var(--theme-text-primary)", fontFamily: "Cairo, sans-serif" }}
            >
              لوحة ولي الأمر
            </h1>
            <p
              className="text-sm"
              style={{ color: "var(--theme-text-secondary)" }}
            >
              تابع تقدم ابنك/بنتك الدراسي
            </p>
          </div>

          {/* Form Card */}
          <div
            className="rounded-2xl p-6 border"
            style={{
              background: "var(--theme-surface-bg)",
              borderColor: "var(--theme-surface-border)",
            }}
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: "var(--theme-text-primary)" }}
                >
                  رقم الهاتف
                </label>
                <div className="relative">
                  <User
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5"
                    style={{ color: "var(--theme-text-tertiary)" }}
                  />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="رقم هاتف ولي الأمر"
                    className="w-full pr-10 pl-4 py-3 rounded-xl border text-sm outline-none transition-all focus:ring-2"
                    style={{
                      background: "var(--theme-input-bg, #f9fafb)",
                      borderColor: "var(--theme-surface-border)",
                      color: "var(--theme-text-primary)",
                      fontFamily: "Cairo, sans-serif",
                    }}
                    dir="rtl"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: "var(--theme-text-primary)" }}
                >
                  كود الوصول
                </label>
                <div className="relative">
                  <Key
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5"
                    style={{ color: "var(--theme-text-tertiary)" }}
                  />
                  <input
                    type="text"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    placeholder="كود الوصول"
                    maxLength={6}
                    className="w-full pr-10 pl-4 py-3 rounded-xl border text-sm outline-none transition-all focus:ring-2 tracking-widest text-center"
                    style={{
                      background: "var(--theme-input-bg, #f9fafb)",
                      borderColor: "var(--theme-surface-border)",
                      color: "var(--theme-text-primary)",
                      fontFamily: "Cairo, sans-serif",
                      letterSpacing: "0.3em",
                    }}
                    dir="ltr"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                style={{
                  background: "var(--theme-cta-gradient)",
                  fontFamily: "Cairo, sans-serif",
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    جاري التحميل...
                  </>
                ) : (
                  <>
                    <BarChart3 className="w-5 h-5" />
                    عرض تقدم الطالب
                  </>
                )}
              </button>
            </form>

            {/* Info Box */}
            <div
              className="mt-5 p-4 rounded-xl border flex items-start gap-3"
              style={{
                background: "var(--theme-info-bg, #eff6ff)",
                borderColor: "var(--theme-info-border, #bfdbfe)",
              }}
            >
              <Shield className="w-5 h-5 flex-shrink-0" style={{ color: "var(--theme-primary)" }} mt-0.5" />
              <p className="text-xs leading-relaxed" style={{ color: "var(--theme-text-secondary)" }}>
                للحصول على كود الوصول، اطلب من ابنك/بنتك الدخول على الإعدادات واختيار &quot;لوحة ولي الأمر&quot;
              </p>
            </div>
          </div>

          {/* Student Generate Code Section */}
          {user && (
            <div
              className="mt-6 rounded-2xl p-6 border"
              style={{
                background: "var(--theme-surface-bg)",
                borderColor: "var(--theme-surface-border)",
              }}
            >
              <h3
                className="text-base font-bold mb-3 flex items-center gap-2"
                style={{ color: "var(--theme-text-primary)", fontFamily: "Cairo, sans-serif" }}
              >
                <Key className="w-5 h-5" style={{ color: "var(--theme-primary)" }} />
                إنشاء كود لولي الأمر
              </h3>
              <p className="text-xs mb-4" style={{ color: "var(--theme-text-secondary)" }}>
                أنشئ كود وصول ليتمكن ولي أمرك من متابعة تقدمك الدراسي
              </p>

              {generatedCode ? (
                <div className="space-y-3">
                  <div
                    className="p-4 rounded-xl border-2 border-dashed text-center"
                    style={{ borderColor: "var(--theme-primary)" }}
                  >
                    <p className="text-xs mb-2" style={{ color: "var(--theme-text-secondary)" }}>
                      كود الوصول
                    </p>
                    <p
                      className="text-3xl font-bold tracking-[0.4em]"
                      style={{ color: "var(--theme-primary)", fontFamily: "Cairo, sans-serif" }}
                      dir="ltr"
                    >
                      {generatedCode}
                    </p>
                  </div>
                  <button
                    onClick={copyCode}
                    className="w-full py-2.5 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition-all hover:opacity-80"
                    style={{
                      borderColor: "var(--theme-surface-border)",
                      color: "var(--theme-text-primary)",
                      fontFamily: "Cairo, sans-serif",
                    }}
                  >
                    {codeCopied ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        تم النسخ!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        نسخ الكود
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <>
                  {generateError && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 mb-3">
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <p className="text-xs text-red-700">{generateError}</p>
                    </div>
                  )}
                  <button
                    onClick={generateAccessCode}
                    disabled={generating}
                    className="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                    style={{
                      background: "var(--theme-cta-gradient)",
                      fontFamily: "Cairo, sans-serif",
                    }}
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        جاري الإنشاء...
                      </>
                    ) : (
                      <>
                        <Key className="w-5 h-5" />
                        إنشاء كود وصول لولي الأمر
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── DASHBOARD VIEW ───
  const { stats, subjects, recent_exams, subscription, student_name } = parentData;

  const statCards = [
    {
      label: "متوسط الدرجات",
      value: `${Math.round(stats.avg_score)}%`,
      icon: TrendingUp,
      color: getScoreColor(stats.avg_score),
      bgColor: getScoreBgLight(stats.avg_score),
    },
    {
      label: "الامتحانات",
      value: stats.total_exams.toString(),
      icon: BookOpen,
      color: "text-primary",
      bgColor: "bg-primary/5",
    },
    {
      label: "النقاط",
      value: stats.total_points.toLocaleString("ar-SA"),
      icon: Star,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      label: "أيام الاستمرار",
      value: stats.streak_days.toString(),
      icon: Flame,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  ];

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1
              className="text-xl md:text-2xl font-bold flex items-center gap-2"
              style={{ color: "var(--theme-text-primary)", fontFamily: "Cairo, sans-serif" }}
            >
              <Users className="w-6 h-6" style={{ color: "var(--theme-primary)" }} />
              تقدم الطالب: {student_name}
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--theme-text-secondary)" }}>
              آخر تحديث: {formatDate(new Date().toISOString())}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-xl border text-sm font-medium flex items-center gap-2 transition-all hover:opacity-80"
            style={{
              borderColor: "var(--theme-surface-border)",
              color: "var(--theme-text-secondary)",
              fontFamily: "Cairo, sans-serif",
            }}
          >
            <ArrowRight className="w-4 h-4" />
            خروج
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl p-4 border transition-all hover:shadow-md"
              style={{
                background: "var(--theme-surface-bg)",
                borderColor: "var(--theme-surface-border)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${card.bgColor} flex items-center justify-center`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
              <p
                className={`text-2xl font-bold ${card.color}`}
                style={{ fontFamily: "Cairo, sans-serif" }}
              >
                {card.value}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--theme-text-secondary)" }}>
                {card.label}
              </p>
            </div>
          ))}
        </div>

        {/* Subjects Section */}
        {subjects.length > 0 && (
          <div
            className="rounded-2xl p-5 md:p-6 border"
            style={{
              background: "var(--theme-surface-bg)",
              borderColor: "var(--theme-surface-border)",
            }}
          >
            <h2
              className="text-lg font-bold mb-4 flex items-center gap-2"
              style={{ color: "var(--theme-text-primary)", fontFamily: "Cairo, sans-serif" }}
            >
              <BookOpen className="w-5 h-5" style={{ color: "var(--theme-primary)" }} />
              المواد الدراسية
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {subjects.map((subject) => (
                <div
                  key={subject.name}
                  className="rounded-xl p-4 border transition-all hover:shadow-sm"
                  style={{ borderColor: "var(--theme-surface-border)" }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{subject.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h3
                        className="text-sm font-semibold truncate"
                        style={{ color: "var(--theme-text-primary)", fontFamily: "Cairo, sans-serif" }}
                      >
                        {subject.name}
                      </h3>
                      <p className="text-xs" style={{ color: "var(--theme-text-tertiary)" }}>
                        {subject.lesson_count} درس
                      </p>
                    </div>
                    <span
                      className={`text-lg font-bold ${getScoreColor(subject.avg_score)}`}
                      style={{ fontFamily: "Cairo, sans-serif" }}
                    >
                      {Math.round(subject.avg_score)}%
                    </span>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${getScoreBarColor(subject.avg_score)}`}
                      style={{ width: `${Math.min(100, Math.round(subject.avg_score))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Exams Section */}
        {recent_exams.length > 0 && (
          <div
            className="rounded-2xl p-5 md:p-6 border"
            style={{
              background: "var(--theme-surface-bg)",
              borderColor: "var(--theme-surface-border)",
            }}
          >
            <h2
              className="text-lg font-bold mb-4 flex items-center gap-2"
              style={{ color: "var(--theme-text-primary)", fontFamily: "Cairo, sans-serif" }}
            >
              <Trophy className="w-5 h-5" style={{ color: "var(--theme-primary)" }} />
              آخر الامتحانات
            </h2>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderColor: "var(--theme-surface-border)" }} className="border-b">
                    <th
                      className="text-right py-3 px-4 font-semibold"
                      style={{ color: "var(--theme-text-secondary)", fontFamily: "Cairo, sans-serif" }}
                    >
                      المادة
                    </th>
                    <th
                      className="text-right py-3 px-4 font-semibold"
                      style={{ color: "var(--theme-text-secondary)", fontFamily: "Cairo, sans-serif" }}
                    >
                      الدرجة
                    </th>
                    <th
                      className="text-right py-3 px-4 font-semibold"
                      style={{ color: "var(--theme-text-secondary)", fontFamily: "Cairo, sans-serif" }}
                    >
                      الإجابات الصحيحة
                    </th>
                    <th
                      className="text-right py-3 px-4 font-semibold"
                      style={{ color: "var(--theme-text-secondary)", fontFamily: "Cairo, sans-serif" }}
                    >
                      التاريخ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recent_exams.map((exam, idx) => {
                    const scorePercent = exam.total_questions > 0
                      ? Math.round((exam.correct_answers / exam.total_questions) * 100)
                      : exam.score;
                    return (
                      <tr
                        key={idx}
                        className="border-b last:border-0 transition-colors hover:bg-black/[0.02]"
                        style={{ borderColor: "var(--theme-surface-border)" }}
                      >
                        <td
                          className="py-3 px-4 font-medium"
                          style={{ color: "var(--theme-text-primary)", fontFamily: "Cairo, sans-serif" }}
                        >
                          {exam.subject_name}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${getScoreColor(scorePercent)} ${getScoreBgLight(scorePercent)}`}
                          >
                            {scorePercent}%
                          </span>
                        </td>
                        <td
                          className="py-3 px-4"
                          style={{ color: "var(--theme-text-secondary)" }}
                        >
                          {exam.correct_answers} / {exam.total_questions}
                        </td>
                        <td className="py-3 px-4" style={{ color: "var(--theme-text-tertiary)" }}>
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(exam.created_at)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {recent_exams.map((exam, idx) => {
                const scorePercent = exam.total_questions > 0
                  ? Math.round((exam.correct_answers / exam.total_questions) * 100)
                  : exam.score;
                return (
                  <div
                    key={idx}
                    className="rounded-xl p-3 border"
                    style={{ borderColor: "var(--theme-surface-border)" }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-sm font-semibold"
                        style={{ color: "var(--theme-text-primary)", fontFamily: "Cairo, sans-serif" }}
                      >
                        {exam.subject_name}
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${getScoreColor(scorePercent)} ${getScoreBgLight(scorePercent)}`}
                      >
                        {scorePercent}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs" style={{ color: "var(--theme-text-tertiary)" }}>
                      <span>{exam.correct_answers} / {exam.total_questions} صحيحة</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(exam.created_at)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty Exams State */}
        {recent_exams.length === 0 && (
          <div
            className="rounded-2xl p-8 border text-center"
            style={{
              background: "var(--theme-surface-bg)",
              borderColor: "var(--theme-surface-border)",
            }}
          >
            <Trophy className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--theme-text-tertiary)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--theme-text-secondary)", fontFamily: "Cairo, sans-serif" }}>
              لا توجد امتحانات حتى الآن
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--theme-text-tertiary)" }}>
              سيظهر هنا سجل الامتحانات عندما يبدأ الطالب بحلها
            </p>
          </div>
        )}

        {/* Subscription Status */}
        {subscription && (
          <div
            className="rounded-2xl p-5 md:p-6 border"
            style={{
              background: "var(--theme-surface-bg)",
              borderColor: "var(--theme-surface-border)",
            }}
          >
            <h2
              className="text-lg font-bold mb-4 flex items-center gap-2"
              style={{ color: "var(--theme-text-primary)", fontFamily: "Cairo, sans-serif" }}
            >
              <CreditCard className="w-5 h-5" style={{ color: "var(--theme-primary)" }} />
              حالة الاشتراك
            </h2>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <span
                    className="text-base font-semibold"
                    style={{ color: "var(--theme-text-primary)", fontFamily: "Cairo, sans-serif" }}
                  >
                    {subscription.plan_name}
                  </span>
                  {(() => {
                    const badge = getStatusBadge(subscription.status);
                    return (
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        {badge.label}
                      </span>
                    );
                  })()}
                </div>
                {subscription.expires_at && (
                  <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--theme-text-tertiary)" }}>
                    <Calendar className="w-3.5 h-3.5" />
                    ينتهي في: {formatDate(subscription.expires_at)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* No Subscription */}
        {!subscription && (
          <div
            className="rounded-2xl p-5 md:p-6 border"
            style={{
              background: "var(--theme-surface-bg)",
              borderColor: "var(--theme-surface-border)",
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <p
                  className="text-sm font-semibold"
                  style={{ color: "var(--theme-text-primary)", fontFamily: "Cairo, sans-serif" }}
                >
                  لا يوجد اشتراك نشط
                </p>
                <p className="text-xs" style={{ color: "var(--theme-text-tertiary)" }}>
                  الطالب يستخدم النسخة المجانية حالياً
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Print Footer */}
        <div
          className="text-center py-4 print:block hidden"
          style={{ color: "var(--theme-text-tertiary)" }}
        >
          <p className="text-xs">تم إنشاء هذا التقرير من منصة منهج</p>
        </div>
      </div>
    </div>
  );
}
