"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  AlertTriangle, Play, ChevronLeft, ChevronRight,
  Check, X, Loader2, BarChart3, BookOpen, RotateCcw,
  Zap, Brain, Target, Trophy, Clock, ArrowRight,
  CheckCircle, XCircle, RefreshCw, Star,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SubjectData {
  id: string;
  name: string;
  icon: string;
  avg_score: number;
  weak_topics: string[];
  question_count: number;
  key_points: string[];
}

interface EmergencyData {
  subjects: SubjectData[];
  total_exams: number;
  overall_score: number;
}

interface QuizQuestion {
  id?: string;
  question_ar: string;
  options: string[];
  correct_answer: number;
}

type ActiveTab = "analysis" | "review" | "quiz";

/* ------------------------------------------------------------------ */
/*  Motivational quotes                                                */
/* ------------------------------------------------------------------ */

const MOTIVATIONAL_QUOTES = [
  "اللي بيذاكر قبل الامتحان بيوم... بيندم على كل يوم ضاع 📖",
  "أنت أقوى من الامتحان 💪",
  "ركز وشد حيلك — النتيجة هتبقى حلوة إن شاء الله 🌟",
  "كل سؤال بتحله دلوقتي بيقربك خطوة للنجاح 🎯",
  "المذاكرة الذكية أهم من المذاكرة الطويلة 🧠",
  "خطوة بخطوة، هتوصل للقمة 🏆",
];

/* ------------------------------------------------------------------ */
/*  Helper: Score color                                                */
/* ------------------------------------------------------------------ */

function scoreColor(score: number): string {
  if (score < 50) return "#ef4444";
  if (score < 70) return "#f59e0b";
  return "#22c55e";
}

function scoreLabel(score: number): string {
  if (score < 50) return "محتاج مراجعة";
  if (score < 70) return "كويس بس ممكن أحسن";
  return "ممتاز 🎉";
}

/* ------------------------------------------------------------------ */
/*  Circular Progress                                                  */
/* ------------------------------------------------------------------ */

function CircularProgress({ score, size = 120 }: { score: number; size?: number }) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = scoreColor(score);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--theme-surface-border)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold" style={{ color }}>
          {Math.round(score)}%
        </span>
        <span className="text-xs" style={{ color: "var(--theme-text-secondary)" }}>
          المعدل العام
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Score Bar                                                          */
/* ------------------------------------------------------------------ */

function ScoreBar({ score }: { score: number }) {
  const color = scoreColor(score);
  return (
    <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: "var(--theme-surface-border)" }}>
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${Math.min(score, 100)}%`, background: color }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function EmergencyMode() {
  const { user } = useAuthStore();

  /* ---- state ---- */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<EmergencyData | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("analysis");

  // Review mode state
  const [reviewSubject, setReviewSubject] = useState<SubjectData | null>(null);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [understoodCards, setUnderstoodCards] = useState<Set<number>>(new Set());

  // Quiz mode state
  const [quizSubject, setQuizSubject] = useState<SubjectData | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<(number | null)[]>([]);
  const [showQuizResult, setShowQuizResult] = useState(false);
  const [quizTimer, setQuizTimer] = useState(0);
  const [quizTimerActive, setQuizTimerActive] = useState(false);

  // Motivational quote
  const randomQuote = useMemo(
    () => MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)],
    []
  );

  /* ---- fetch emergency data ---- */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/emergency", { credentials: "include" });
      if (!res.ok) throw new Error("فشل في تحميل البيانات");
      const json = await res.json();
      if (json?.subjects && json.subjects.length > 0) {
        setData(json);
      } else {
        setData(null);
      }
    } catch (err: any) {
      setError(err.message || "حصل خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ---- quiz timer ---- */
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (quizTimerActive) {
      interval = setInterval(() => setQuizTimer((t) => t + 1), 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [quizTimerActive]);

  /* ---- fetch quiz questions ---- */
  const startQuiz = useCallback(async (subject: SubjectData) => {
    setQuizSubject(subject);
    setQuizLoading(true);
    setQuizIndex(0);
    setSelectedAnswer(null);
    setQuizAnswers([]);
    setShowQuizResult(false);
    setQuizTimer(0);
    setQuizTimerActive(false);
    try {
      const res = await fetch(`/api/exams?subject_id=${subject.id}&limit=10`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("فشل في تحميل الأسئلة");
      const json = await res.json();
      const questions: QuizQuestion[] = Array.isArray(json)
        ? json
        : json?.questions ?? json?.data ?? [];
      if (questions.length === 0) {
        setQuizQuestions([]);
      } else {
        setQuizQuestions(questions.slice(0, 10));
        setQuizAnswers(new Array(Math.min(questions.length, 10)).fill(null));
        setQuizTimerActive(true);
      }
    } catch {
      setQuizQuestions([]);
    } finally {
      setQuizLoading(false);
    }
  }, []);

  /* ---- start review ---- */
  const startReview = useCallback((subject: SubjectData) => {
    setReviewSubject(subject);
    setReviewIndex(0);
    setFlipped(false);
    setUnderstoodCards(new Set());
    setActiveTab("review");
  }, []);

  /* ---- quiz answer handler ---- */
  const handleAnswer = useCallback(
    (optionIndex: number) => {
      if (selectedAnswer !== null) return; // already answered
      setSelectedAnswer(optionIndex);
      setQuizAnswers((prev) => {
        const copy = [...prev];
        copy[quizIndex] = optionIndex;
        return copy;
      });
    },
    [selectedAnswer, quizIndex]
  );

  const nextQuestion = useCallback(() => {
    if (quizIndex < quizQuestions.length - 1) {
      setQuizIndex((i) => i + 1);
      setSelectedAnswer(null);
    } else {
      setShowQuizResult(true);
      setQuizTimerActive(false);
    }
  }, [quizIndex, quizQuestions.length]);

  const resetQuiz = useCallback(() => {
    setQuizSubject(null);
    setQuizQuestions([]);
    setQuizIndex(0);
    setSelectedAnswer(null);
    setQuizAnswers([]);
    setShowQuizResult(false);
    setQuizTimer(0);
    setQuizTimerActive(false);
  }, []);

  /* ---- format time ---- */
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  /* ---- quiz score ---- */
  const quizScore = useMemo(() => {
    if (quizQuestions.length === 0) return 0;
    let correct = 0;
    quizAnswers.forEach((a, i) => {
      if (a !== null && a === quizQuestions[i]?.correct_answer) correct++;
    });
    return correct;
  }, [quizAnswers, quizQuestions]);

  /* ================================================================ */
  /*  Render helpers                                                    */
  /* ================================================================ */

  /* ---- Loading ---- */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: "var(--theme-primary)" }} />
        <p className="text-lg font-medium" style={{ color: "var(--theme-text-secondary)" }}>
          جاري تحضير وضع الطوارئ...
        </p>
      </div>
    );
  }

  /* ---- Error ---- */
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="w-12 h-12 text-red-500" />
        <p className="text-lg font-medium text-red-500">{error}</p>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-medium"
          style={{ background: "var(--theme-cta-gradient, linear-gradient(135deg, #6366f1, #8b5cf6))" }}
        >
          <RefreshCw className="w-4 h-4" />
          حاول تاني
        </button>
      </div>
    );
  }

  /* ---- Empty data ---- */
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 px-4 text-center">
        <div className="text-6xl">📝</div>
        <h2 className="text-xl font-bold" style={{ color: "var(--theme-text-primary)" }}>
          لسه ماعملتش امتحانات كفاية
        </h2>
        <p className="text-base max-w-md" style={{ color: "var(--theme-text-secondary)" }}>
          ابدأ بحل امتحانات عشان نقدر نحلل أداءك ونجهزلك مراجعة سريعة مناسبة ليك!
        </p>
        <button
          onClick={() => (window.location.href = "/exams")}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-medium"
          style={{ background: "var(--theme-cta-gradient, linear-gradient(135deg, #6366f1, #8b5cf6))" }}
        >
          <Play className="w-5 h-5" />
          ابدأ حل امتحانات
        </button>
      </div>
    );
  }

  /* ---- Tabs config ---- */
  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: "analysis", label: "تحليل الأداء", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "review", label: "مراجعة سريعة", icon: <BookOpen className="w-4 h-4" /> },
    { id: "quiz", label: "كويز سريع", icon: <Zap className="w-4 h-4" /> },
  ];

  /* ================================================================ */
  /*  Tab 1: Performance Analysis                                      */
  /* ================================================================ */

  const renderAnalysis = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {data.subjects.map((subject) => (
        <div
          key={subject.id}
          className="rounded-2xl p-5 border transition-all hover:shadow-lg"
          style={{
            background: "var(--theme-surface-bg)",
            borderColor: "var(--theme-surface-border)",
          }}
        >
          {/* Subject header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{subject.icon || "📘"}</span>
              <div>
                <h3 className="font-bold text-base" style={{ color: "var(--theme-text-primary)" }}>
                  {subject.name}
                </h3>
                <span className="text-xs" style={{ color: "var(--theme-text-secondary)" }}>
                  {subject.question_count} سؤال متاح
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-lg font-bold" style={{ color: scoreColor(subject.avg_score) }}>
                {Math.round(subject.avg_score)}%
              </span>
              <span className="text-[10px]" style={{ color: "var(--theme-text-secondary)" }}>
                {scoreLabel(subject.avg_score)}
              </span>
            </div>
          </div>

          {/* Score bar */}
          <ScoreBar score={subject.avg_score} />

          {/* Weak topics */}
          {subject.weak_topics.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium mb-1.5" style={{ color: "var(--theme-text-secondary)" }}>
                نقاط الضعف:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {subject.weak_topics.map((topic, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{
                      background: "rgba(239, 68, 68, 0.1)",
                      color: "#ef4444",
                    }}
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => startReview(subject)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-white"
              style={{
                background: "var(--theme-cta-gradient, linear-gradient(135deg, #6366f1, #8b5cf6))",
              }}
            >
              <BookOpen className="w-3.5 h-3.5" />
              ابدأ مراجعة
            </button>
            <button
              onClick={() => {
                setActiveTab("quiz");
                startQuiz(subject);
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border"
              style={{
                borderColor: "var(--theme-surface-border)",
                color: "var(--theme-text-primary)",
                background: "var(--theme-surface-bg)",
              }}
            >
              <Zap className="w-3.5 h-3.5" />
              كويز
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  /* ================================================================ */
  /*  Tab 2: Quick Review (Flashcards)                                 */
  /* ================================================================ */

  const renderReview = () => {
    // No subject selected — pick one
    if (!reviewSubject) {
      return (
        <div className="space-y-4">
          <p className="text-center font-medium" style={{ color: "var(--theme-text-secondary)" }}>
            اختار المادة اللي عايز تراجعها:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {data.subjects.map((s) => (
              <button
                key={s.id}
                onClick={() => startReview(s)}
                className="flex items-center gap-3 p-4 rounded-2xl border transition-all hover:shadow-md text-right"
                style={{
                  background: "var(--theme-surface-bg)",
                  borderColor: "var(--theme-surface-border)",
                }}
              >
                <span className="text-3xl">{s.icon || "📘"}</span>
                <div>
                  <p className="font-bold" style={{ color: "var(--theme-text-primary)" }}>
                    {s.name}
                  </p>
                  <p className="text-xs" style={{ color: "var(--theme-text-secondary)" }}>
                    {s.key_points?.length || 0} نقطة للمراجعة
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      );
    }

    const points = reviewSubject.key_points || [];
    if (points.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <BookOpen className="w-12 h-12" style={{ color: "var(--theme-text-secondary)" }} />
          <p className="font-medium" style={{ color: "var(--theme-text-secondary)" }}>
            مفيش نقاط مراجعة متاحة للمادة دي حالياً
          </p>
          <button
            onClick={() => setReviewSubject(null)}
            className="px-4 py-2 rounded-xl text-sm font-medium border"
            style={{ borderColor: "var(--theme-surface-border)", color: "var(--theme-text-primary)" }}
          >
            اختار مادة تانية
          </button>
        </div>
      );
    }

    const current = points[reviewIndex];
    const total = points.length;
    const progress = ((reviewIndex + 1) / total) * 100;

    return (
      <div className="max-w-xl mx-auto space-y-5">
        {/* Subject header + back */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setReviewSubject(null)}
            className="flex items-center gap-1 text-sm font-medium"
            style={{ color: "var(--theme-text-secondary)" }}
          >
            <ChevronRight className="w-4 h-4" />
            رجوع
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl">{reviewSubject.icon || "📘"}</span>
            <span className="font-bold" style={{ color: "var(--theme-text-primary)" }}>
              {reviewSubject.name}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs" style={{ color: "var(--theme-text-secondary)" }}>
            <span>
              {reviewIndex + 1} / {total}
            </span>
            <span>
              ✅ فهمت: {understoodCards.size} / {total}
            </span>
          </div>
          <div className="w-full h-2 rounded-full" style={{ background: "var(--theme-surface-border)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: "var(--theme-cta-gradient, linear-gradient(135deg, #6366f1, #8b5cf6))",
              }}
            />
          </div>
        </div>

        {/* Flashcard */}
        <div
          className="relative rounded-2xl border overflow-hidden cursor-pointer select-none"
          style={{
            background: "var(--theme-surface-bg)",
            borderColor: "var(--theme-surface-border)",
            minHeight: 220,
            perspective: "1000px",
          }}
          onClick={() => setFlipped((f) => !f)}
        >
          <div
            className="flex flex-col items-center justify-center p-8 text-center transition-all duration-500"
            style={{
              transform: flipped ? "rotateX(180deg)" : "rotateX(0)",
              opacity: flipped ? 0 : 1,
              position: flipped ? "absolute" : "relative",
              inset: 0,
            }}
          >
            <Brain className="w-8 h-8 mb-3" style={{ color: "var(--theme-primary)" }} />
            <p className="text-lg font-bold leading-relaxed" style={{ color: "var(--theme-text-primary)" }}>
              {current}
            </p>
            <p className="text-xs mt-4" style={{ color: "var(--theme-text-secondary)" }}>
              اضغط عشان تقلب الكارت
            </p>
          </div>
          <div
            className="flex flex-col items-center justify-center p-8 text-center transition-all duration-500"
            style={{
              transform: flipped ? "rotateX(0)" : "rotateX(-180deg)",
              opacity: flipped ? 1 : 0,
              position: !flipped ? "absolute" : "relative",
              inset: 0,
            }}
          >
            <Target className="w-8 h-8 mb-3 text-green-500" />
            <p className="text-lg font-bold leading-relaxed" style={{ color: "var(--theme-text-primary)" }}>
              {current}
            </p>
            <p className="text-xs mt-4" style={{ color: "var(--theme-text-secondary)" }}>
              هل فهمت النقطة دي؟
            </p>
          </div>
        </div>

        {/* Navigation + actions */}
        <div className="flex items-center justify-between gap-3">
          <button
            disabled={reviewIndex === 0}
            onClick={() => {
              setReviewIndex((i) => i - 1);
              setFlipped(false);
            }}
            className="p-2.5 rounded-xl border disabled:opacity-30 transition-colors"
            style={{ borderColor: "var(--theme-surface-border)", color: "var(--theme-text-primary)" }}
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="flex gap-2 flex-1 justify-center">
            <button
              onClick={() => {
                setUnderstoodCards((prev) => {
                  const next = new Set(prev);
                  next.add(reviewIndex);
                  return next;
                });
                if (reviewIndex < total - 1) {
                  setReviewIndex((i) => i + 1);
                  setFlipped(false);
                }
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-white"
              style={{ background: "#22c55e" }}
            >
              <CheckCircle className="w-4 h-4" />
              فهمت ✅
            </button>
            <button
              onClick={() => {
                setUnderstoodCards((prev) => {
                  const next = new Set(prev);
                  next.delete(reviewIndex);
                  return next;
                });
                if (reviewIndex < total - 1) {
                  setReviewIndex((i) => i + 1);
                  setFlipped(false);
                }
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium border"
              style={{ borderColor: "var(--theme-surface-border)", color: "var(--theme-text-primary)" }}
            >
              <RotateCcw className="w-4 h-4" />
              مراجعة تاني 🔄
            </button>
          </div>

          <button
            disabled={reviewIndex === total - 1}
            onClick={() => {
              setReviewIndex((i) => i + 1);
              setFlipped(false);
            }}
            className="p-2.5 rounded-xl border disabled:opacity-30 transition-colors"
            style={{ borderColor: "var(--theme-surface-border)", color: "var(--theme-text-primary)" }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Completed review */}
        {understoodCards.size === total && (
          <div
            className="rounded-2xl p-5 text-center border"
            style={{ background: "rgba(34,197,94,0.08)", borderColor: "rgba(34,197,94,0.3)" }}
          >
            <Trophy className="w-10 h-10 mx-auto mb-2 text-green-500" />
            <p className="font-bold text-green-600 text-lg">أحسنت! خلصت مراجعة {reviewSubject.name} 🎉</p>
            <p className="text-sm text-green-600 mt-1">جرب تحل كويز سريع دلوقتي عشان تثبت المعلومات</p>
            <button
              onClick={() => {
                setActiveTab("quiz");
                startQuiz(reviewSubject);
              }}
              className="mt-3 px-5 py-2 rounded-xl text-sm font-medium text-white"
              style={{ background: "var(--theme-cta-gradient, linear-gradient(135deg, #6366f1, #8b5cf6))" }}
            >
              <Zap className="w-4 h-4 inline ml-1" />
              ابدأ كويز سريع
            </button>
          </div>
        )}
      </div>
    );
  };

  /* ================================================================ */
  /*  Tab 3: Quick Quiz                                                */
  /* ================================================================ */

  const renderQuiz = () => {
    // Subject selection
    if (!quizSubject) {
      return (
        <div className="space-y-4">
          <p className="text-center font-medium" style={{ color: "var(--theme-text-secondary)" }}>
            اختار المادة عشان تبدأ الكويز:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {data.subjects.map((s) => (
              <button
                key={s.id}
                onClick={() => startQuiz(s)}
                className="flex items-center gap-3 p-4 rounded-2xl border transition-all hover:shadow-md text-right"
                style={{
                  background: "var(--theme-surface-bg)",
                  borderColor: "var(--theme-surface-border)",
                }}
              >
                <span className="text-3xl">{s.icon || "📘"}</span>
                <div>
                  <p className="font-bold" style={{ color: "var(--theme-text-primary)" }}>
                    {s.name}
                  </p>
                  <p className="text-xs" style={{ color: "var(--theme-text-secondary)" }}>
                    {s.question_count} سؤال متاح
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      );
    }

    // Loading quiz
    if (quizLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--theme-primary)" }} />
          <p style={{ color: "var(--theme-text-secondary)" }}>جاري تحميل الأسئلة...</p>
        </div>
      );
    }

    // No questions available
    if (quizQuestions.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Zap className="w-12 h-12" style={{ color: "var(--theme-text-secondary)" }} />
          <p className="font-medium" style={{ color: "var(--theme-text-secondary)" }}>
            مفيش أسئلة متاحة للمادة دي حالياً
          </p>
          <button
            onClick={resetQuiz}
            className="px-4 py-2 rounded-xl text-sm font-medium border"
            style={{ borderColor: "var(--theme-surface-border)", color: "var(--theme-text-primary)" }}
          >
            اختار مادة تانية
          </button>
        </div>
      );
    }

    // Quiz results
    if (showQuizResult) {
      const pct = Math.round((quizScore / quizQuestions.length) * 100);
      return (
        <div className="max-w-lg mx-auto space-y-6 text-center">
          <div
            className="rounded-2xl p-8 border"
            style={{
              background: "var(--theme-surface-bg)",
              borderColor: "var(--theme-surface-border)",
            }}
          >
            <div className="mb-4">
              {pct >= 70 ? (
                <Trophy className="w-16 h-16 mx-auto text-yellow-500" />
              ) : pct >= 50 ? (
                <Star className="w-16 h-16 mx-auto text-yellow-500" />
              ) : (
                <Target className="w-16 h-16 mx-auto text-red-500" />
              )}
            </div>
            <h3 className="text-2xl font-bold mb-1" style={{ color: "var(--theme-text-primary)" }}>
              نتيجة الكويز
            </h3>
            <p className="text-sm mb-4" style={{ color: "var(--theme-text-secondary)" }}>
              {quizSubject.name} — {formatTime(quizTimer)}
            </p>

            <CircularProgress score={pct} size={140} />

            <p className="text-lg font-bold mt-4" style={{ color: scoreColor(pct) }}>
              {quizScore} / {quizQuestions.length} إجابات صح
            </p>
            <p className="text-sm mt-1" style={{ color: "var(--theme-text-secondary)" }}>
              {pct >= 70
                ? "ممتاز! أداء رائع 🎉 كمّل كده"
                : pct >= 50
                ? "كويس! بس محتاج تراجع شوية كمان 💪"
                : "محتاج تراجع أكتر — ما تقلقش، كل مرة بتتحسن 📈"}
            </p>
          </div>

          {/* Review wrong answers */}
          <div className="space-y-3">
            {quizQuestions.map((q, i) => {
              const isCorrect = quizAnswers[i] === q.correct_answer;
              if (isCorrect) return null;
              return (
                <div
                  key={i}
                  className="rounded-xl p-4 border text-right"
                  style={{
                    background: "rgba(239, 68, 68, 0.05)",
                    borderColor: "rgba(239, 68, 68, 0.2)",
                  }}
                >
                  <p className="font-medium text-sm mb-2" style={{ color: "var(--theme-text-primary)" }}>
                    {i + 1}. {q.question_ar}
                  </p>
                  <p className="text-xs text-red-500">
                    ❌ إجابتك: {quizAnswers[i] !== null ? q.options[quizAnswers[i]!] : "بدون إجابة"}
                  </p>
                  <p className="text-xs text-green-600">
                    ✅ الإجابة الصح: {q.options[q.correct_answer]}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => startQuiz(quizSubject)}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-medium text-white"
              style={{ background: "var(--theme-cta-gradient, linear-gradient(135deg, #6366f1, #8b5cf6))" }}
            >
              <RefreshCw className="w-4 h-4" />
              حاول تاني
            </button>
            <button
              onClick={resetQuiz}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-medium border"
              style={{ borderColor: "var(--theme-surface-border)", color: "var(--theme-text-primary)" }}
            >
              اختار مادة تانية
            </button>
          </div>
        </div>
      );
    }

    // Current question
    const q = quizQuestions[quizIndex];
    const isAnswered = selectedAnswer !== null;
    const isCorrect = isAnswered && selectedAnswer === q.correct_answer;

    return (
      <div className="max-w-xl mx-auto space-y-5">
        {/* Header: subject + timer + progress */}
        <div className="flex items-center justify-between">
          <button
            onClick={resetQuiz}
            className="flex items-center gap-1 text-sm font-medium"
            style={{ color: "var(--theme-text-secondary)" }}
          >
            <X className="w-4 h-4" />
            إلغاء
          </button>
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium"
              style={{ background: "var(--theme-surface-bg)", color: "var(--theme-text-secondary)" }}
            >
              <Clock className="w-3 h-3" />
              {formatTime(quizTimer)}
            </div>
            <span className="text-sm font-bold" style={{ color: "var(--theme-text-primary)" }}>
              {quizIndex + 1} / {quizQuestions.length}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 rounded-full" style={{ background: "var(--theme-surface-border)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${((quizIndex + 1) / quizQuestions.length) * 100}%`,
              background: "var(--theme-cta-gradient, linear-gradient(135deg, #6366f1, #8b5cf6))",
            }}
          />
        </div>

        {/* Question card */}
        <div
          className="rounded-2xl p-6 border"
          style={{ background: "var(--theme-surface-bg)", borderColor: "var(--theme-surface-border)" }}
        >
          <p className="text-lg font-bold leading-relaxed mb-6" style={{ color: "var(--theme-text-primary)" }}>
            {q.question_ar}
          </p>

          {/* Options */}
          <div className="space-y-3">
            {q.options.map((option, oi) => {
              let optBg = "var(--theme-surface-bg)";
              let optBorder = "var(--theme-surface-border)";
              let optIcon = null;

              if (isAnswered) {
                if (oi === q.correct_answer) {
                  optBg = "rgba(34,197,94,0.1)";
                  optBorder = "#22c55e";
                  optIcon = <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />;
                } else if (oi === selectedAnswer && oi !== q.correct_answer) {
                  optBg = "rgba(239,68,68,0.1)";
                  optBorder = "#ef4444";
                  optIcon = <XCircle className="w-5 h-5 text-red-500 shrink-0" />;
                }
              }

              return (
                <button
                  key={oi}
                  onClick={() => handleAnswer(oi)}
                  disabled={isAnswered}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border text-right transition-all disabled:cursor-default"
                  style={{
                    background: optBg,
                    borderColor: optBorder,
                  }}
                >
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{
                      background: isAnswered && oi === q.correct_answer ? "#22c55e" : "var(--theme-surface-border)",
                      color:
                        isAnswered && oi === q.correct_answer ? "white" : "var(--theme-text-secondary)",
                    }}
                  >
                    {["أ", "ب", "ج", "د"][oi] || oi + 1}
                  </span>
                  <span
                    className="flex-1 font-medium text-sm"
                    style={{ color: "var(--theme-text-primary)" }}
                  >
                    {option}
                  </span>
                  {optIcon}
                </button>
              );
            })}
          </div>
        </div>

        {/* Feedback + next */}
        {isAnswered && (
          <div className="space-y-3">
            <div
              className="rounded-xl p-3 text-center text-sm font-medium"
              style={{
                background: isCorrect ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                color: isCorrect ? "#22c55e" : "#ef4444",
              }}
            >
              {isCorrect ? "إجابة صحيحة! 🎉 أحسنت" : "إجابة غلط 😔 — الإجابة الصح موضحة فوق"}
            </div>
            <button
              onClick={nextQuestion}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-medium"
              style={{ background: "var(--theme-cta-gradient, linear-gradient(135deg, #6366f1, #8b5cf6))" }}
            >
              {quizIndex < quizQuestions.length - 1 ? (
                <>
                  السؤال التالي
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  عرض النتيجة
                  <Trophy className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    );
  };

  /* ================================================================ */
  /*  Main render                                                      */
  /* ================================================================ */

  return (
    <div className="min-h-screen pb-20" dir="rtl">
      {/* Emergency red gradient overlay */}
      <div
        className="absolute inset-x-0 top-0 h-48 pointer-events-none"
        style={{
          background: "linear-gradient(180deg, rgba(239,68,68,0.08) 0%, transparent 100%)",
        }}
      />

      <div className="relative max-w-4xl mx-auto px-4 pt-8 space-y-6">
        {/* ---- Header ---- */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center gap-3">
            <span className="text-4xl animate-pulse">🚨</span>
            <h1 className="text-2xl md:text-3xl font-bold" style={{ color: "var(--theme-text-primary)" }}>
              وضع الطوارئ — المراجعة السريعة
            </h1>
            <span className="text-4xl animate-pulse">🚨</span>
          </div>
          <p className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>
            راجع أهم النقاط قبل الامتحان
          </p>

          {/* Overall score gauge */}
          <div className="flex justify-center pt-2">
            <CircularProgress score={data.overall_score} size={130} />
          </div>

          {/* Stats row */}
          <div className="flex justify-center gap-6 text-sm" style={{ color: "var(--theme-text-secondary)" }}>
            <div className="flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4" />
              <span>{data.total_exams} امتحان</span>
            </div>
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" />
              <span>{data.subjects.length} مادة</span>
            </div>
          </div>
        </div>

        {/* ---- Tab Navigation ---- */}
        <div
          className="flex rounded-2xl p-1 gap-1 border"
          style={{
            background: "var(--theme-surface-bg)",
            borderColor: "var(--theme-surface-border)",
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background:
                  activeTab === tab.id
                    ? "var(--theme-cta-gradient, linear-gradient(135deg, #6366f1, #8b5cf6))"
                    : "transparent",
                color:
                  activeTab === tab.id ? "white" : "var(--theme-text-secondary)",
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ---- Tab Content ---- */}
        <div className="min-h-[40vh]">
          {activeTab === "analysis" && renderAnalysis()}
          {activeTab === "review" && renderReview()}
          {activeTab === "quiz" && renderQuiz()}
        </div>

        {/* ---- Motivational Quote ---- */}
        <div
          className="rounded-2xl p-5 text-center border"
          style={{
            background: "var(--theme-surface-bg)",
            borderColor: "var(--theme-surface-border)",
          }}
        >
          <p className="text-base font-medium leading-relaxed" style={{ color: "var(--theme-text-primary)" }}>
            💡 {randomQuote}
          </p>
        </div>
      </div>

      {/* Pulse animation style */}
      <style jsx>{`
        @keyframes pulse-emergency {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
