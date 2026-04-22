"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  BookOpen, Clock, CheckCircle2, XCircle, ChevronLeft,
  ChevronRight, Loader2, Play, Trophy, Target, AlertCircle,
  History, RotateCcw, Star, ArrowRight,
} from "lucide-react";

interface Subject {
  id: string;
  name: string;
  icon: string;
  lesson_count: number;
}

interface ExamQuestion {
  id: string;
  question_text: string;
  type: string;
  options: { text: string; is_correct: boolean }[] | null;
  correct_answer: string | null;
  explanation: string | null;
  difficulty: string;
}

interface ExamResult {
  score: number;
  total_questions: number;
  correct_answers: number;
  points_earned: number;
  time_taken: number;
  answers: {
    question_id: string;
    selected: string;
    is_correct: boolean;
    correct_answer: string;
    explanation: string;
  }[];
}

interface HistoryItem {
  id: string;
  subject_name: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  time_taken_seconds: number;
  created_at: string;
}

type View = "select" | "exam" | "result" | "history";

export default function ExamsPage() {
  const [view, setView] = useState<View>("select");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [timer, setTimer] = useState(0);
  const [error, setError] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch subjects on mount
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await fetch("/api/subjects", { credentials: "include" });
        if (res.ok) {
          const json = await res.json();
          setSubjects(json.subjects || []);
        }
      } catch {
        // ignore
      }
    };
    fetchSubjects();
  }, []);

  // Timer
  useEffect(() => {
    if (view === "exam") {
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [view]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const startExam = async (subject: Subject) => {
    setSelectedSubject(subject);
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/exams?subject_id=${subject.id}&count=20`,
        { credentials: "include" }
      );
      const json = await res.json();
      if (res.ok && json.questions && json.questions.length > 0) {
        setQuestions(json.questions);
        setAnswers({});
        setCurrentQ(0);
        setTimer(0);
        setView("exam");
      } else {
        setError(json.error || "لا توجد أسئلة متاحة لهذه المادة بعد");
      }
    } catch {
      setError("فشل في جلب الأسئلة");
    } finally {
      setLoading(false);
    }
  };

  const selectAnswer = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const submitExam = useCallback(async () => {
    if (!selectedSubject) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setLoading(true);
    setError("");

    const formattedAnswers = questions.map((q) => ({
      question_id: q.id,
      selected: answers[q.id] || "",
    }));

    try {
      const res = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          subject_id: selectedSubject.id,
          answers: formattedAnswers,
          time_taken: timer,
        }),
      });
      const json = await res.json();
      if (res.ok && json.result) {
        setResult(json.result);
        setView("result");
      } else {
        setError(json.error || "فشل في تقديم الامتحان");
      }
    } catch {
      setError("فشل في الاتصال");
    } finally {
      setLoading(false);
    }
  }, [selectedSubject, questions, answers, timer]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/exams?action=history", {
        credentials: "include",
      });
      const json = await res.json();
      if (res.ok) {
        setHistory(json.history || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setView("history");
    }
  };

  const answeredCount = Object.keys(answers).length;
  const currentQuestion = questions[currentQ];

  return (
    <div className="p-6 font-cairo min-h-[calc(100vh-4rem)]" style={{ color: "var(--theme-text-primary)" }}>
      {error && (
        <div
          className="mb-4 p-3 rounded-lg text-sm font-bold flex items-center gap-2"
          style={{ background: "rgba(220,38,38,0.1)", color: "#DC2626", border: "1px solid rgba(220,38,38,0.3)" }}
        >
          <AlertCircle size={16} />
          {error}
          <button onClick={() => setError("")} className="mr-auto text-xs underline">
            إغلاق
          </button>
        </div>
      )}

      {/* ── SELECT SUBJECT ── */}
      {view === "select" && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold" style={{ color: "var(--theme-text-primary)" }}>
                📝 الامتحانات
              </h1>
              <p className="text-sm mt-1" style={{ color: "var(--theme-text-secondary)" }}>
                اختر مادة لبدء امتحان جديد
              </p>
            </div>
            <button onClick={fetchHistory} className="themed-btn-outline text-sm flex items-center gap-2">
              <History size={16} />
              سجل الامتحانات
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {subjects.map((subject) => (
              <button
                key={subject.id}
                onClick={() => startExam(subject)}
                disabled={loading}
                className="themed-card p-5 text-right w-full hover:shadow-lg transition-shadow cursor-pointer"
                style={{ border: "none" }}
              >
                <div className="flex items-center gap-4">
                  <div className="text-4xl">{subject.icon || "📖"}</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-extrabold" style={{ color: "var(--theme-text-primary)" }}>
                      {subject.name}
                    </h3>
                    <p className="text-xs mt-1" style={{ color: "var(--theme-text-secondary)" }}>
                      {subject.lesson_count || 0} درس متاح
                    </p>
                  </div>
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: "var(--theme-cta-gradient)" }}
                  >
                    <Play size={20} color="#fff" />
                  </div>
                </div>
              </button>
            ))}
          </div>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={30} className="animate-spin" style={{ color: "var(--theme-primary)" }} />
              <span className="mr-3 text-sm" style={{ color: "var(--theme-text-secondary)" }}>
                جارٍ تحضير الأسئلة...
              </span>
            </div>
          )}

          {subjects.length === 0 && !loading && (
            <div className="themed-card p-8 text-center">
              <div className="text-4xl mb-3">📝</div>
              <p className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>
                لا توجد مواد متاحة للامتحان حالياً
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── EXAM VIEW ── */}
      {view === "exam" && currentQuestion && (
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div className="themed-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">{selectedSubject?.icon || "📖"}</span>
                <span className="text-sm font-extrabold" style={{ color: "var(--theme-text-primary)" }}>
                  {selectedSubject?.name}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-sm" style={{ color: "var(--theme-text-secondary)" }}>
                  <Target size={16} />
                  {answeredCount}/{questions.length}
                </div>
                <div
                  className="flex items-center gap-1 text-sm font-bold px-3 py-1 rounded-lg"
                  style={{ background: "var(--theme-hover-overlay)", color: "var(--theme-primary)" }}
                >
                  <Clock size={16} />
                  {formatTime(timer)}
                </div>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: "var(--theme-surface-border)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${((currentQ + 1) / questions.length) * 100}%`,
                  background: "var(--theme-cta-gradient)",
                }}
              />
            </div>
          </div>

          {/* Question */}
          <div className="themed-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-extrabold"
                style={{ background: "var(--theme-cta-gradient)", color: "#fff" }}
              >
                {currentQ + 1}
              </div>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: currentQuestion.difficulty === "hard" ? "rgba(220,38,38,0.1)" : currentQuestion.difficulty === "medium" ? "rgba(245,158,11,0.1)" : "rgba(16,185,129,0.1)",
                  color: currentQuestion.difficulty === "hard" ? "#DC2626" : currentQuestion.difficulty === "medium" ? "#F59E0B" : "#10B981",
                }}
              >
                {currentQuestion.difficulty === "hard" ? "صعب" : currentQuestion.difficulty === "medium" ? "متوسط" : "سهل"}
              </span>
            </div>

            <h2 className="text-base font-extrabold mb-6 leading-relaxed" style={{ color: "var(--theme-text-primary)" }}>
              {currentQuestion.question_text}
            </h2>

            {/* Options */}
            {currentQuestion.options && (
              <div className="space-y-3">
                {currentQuestion.options.map((opt, i) => {
                  const isSelected = answers[currentQuestion.id] === opt.text;
                  const labels = ["أ", "ب", "ج", "د"];
                  return (
                    <button
                      key={i}
                      onClick={() => selectAnswer(currentQuestion.id, opt.text)}
                      className="w-full p-4 rounded-xl flex items-center gap-3 text-right transition-all cursor-pointer"
                      style={{
                        background: isSelected ? "var(--theme-hover-overlay)" : "transparent",
                        border: `2px solid ${isSelected ? "var(--theme-primary)" : "var(--theme-surface-border)"}`,
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-extrabold flex-shrink-0"
                        style={{
                          background: isSelected ? "var(--theme-cta-gradient)" : "var(--theme-surface-border)",
                          color: isSelected ? "#fff" : "var(--theme-text-muted)",
                        }}
                      >
                        {labels[i] || (i + 1).toString()}
                      </div>
                      <span className="text-sm font-bold" style={{ color: "var(--theme-text-primary)" }}>
                        {opt.text}
                      </span>
                      {isSelected && (
                        <CheckCircle2 size={18} className="mr-auto" style={{ color: "var(--theme-primary)" }} />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* True/False */}
            {currentQuestion.type === "true_false" && !currentQuestion.options && (
              <div className="grid grid-cols-2 gap-4">
                {["صح", "خطأ"].map((opt) => {
                  const isSelected = answers[currentQuestion.id] === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => selectAnswer(currentQuestion.id, opt)}
                      className="p-4 rounded-xl text-center font-extrabold transition-all cursor-pointer"
                      style={{
                        background: isSelected ? "var(--theme-hover-overlay)" : "transparent",
                        border: `2px solid ${isSelected ? "var(--theme-primary)" : "var(--theme-surface-border)"}`,
                        color: "var(--theme-text-primary)",
                      }}
                    >
                      {opt === "صح" ? "✅ صح" : "❌ خطأ"}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentQ((p) => Math.max(0, p - 1))}
              disabled={currentQ === 0}
              className="themed-btn-outline flex items-center gap-1"
              style={{ opacity: currentQ === 0 ? 0.5 : 1 }}
            >
              <ChevronRight size={18} />
              السابق
            </button>

            {/* Question nav dots */}
            <div className="flex items-center gap-1 flex-wrap justify-center max-w-[60%]">
              {questions.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentQ(i)}
                  className="w-7 h-7 rounded-full text-[0.6rem] font-bold transition-all cursor-pointer"
                  style={{
                    background:
                      i === currentQ
                        ? "var(--theme-cta-gradient)"
                        : answers[q.id]
                          ? "var(--theme-primary)"
                          : "var(--theme-surface-border)",
                    color: i === currentQ || answers[q.id] ? "#fff" : "var(--theme-text-muted)",
                    border: "none",
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            {currentQ < questions.length - 1 ? (
              <button
                onClick={() => setCurrentQ((p) => Math.min(questions.length - 1, p + 1))}
                className="themed-btn-primary flex items-center gap-1"
              >
                التالي
                <ChevronLeft size={18} />
              </button>
            ) : (
              <button
                onClick={submitExam}
                disabled={loading}
                className="themed-btn-primary flex items-center gap-1"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    تقديم الامتحان
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── RESULT VIEW ── */}
      {view === "result" && result && (
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Score Card */}
          <div className="themed-card p-8 text-center">
            <div className="text-5xl mb-4">
              {result.score >= 90 ? "🏆" : result.score >= 70 ? "🎉" : result.score >= 50 ? "👍" : "📚"}
            </div>
            <h2 className="text-2xl font-extrabold mb-2" style={{ color: "var(--theme-text-primary)" }}>
              {result.score >= 90
                ? "ممتاز! 🌟"
                : result.score >= 70
                  ? "جيد جداً!"
                  : result.score >= 50
                    ? "جيد، كمّل!"
                    : "محتاج مراجعة"}
            </h2>

            <div
              className="w-32 h-32 mx-auto rounded-full flex items-center justify-center mb-4"
              style={{
                background:
                  result.score >= 70
                    ? "rgba(16,185,129,0.15)"
                    : result.score >= 50
                      ? "rgba(245,158,11,0.15)"
                      : "rgba(220,38,38,0.15)",
              }}
            >
              <span
                className="text-4xl font-extrabold"
                style={{
                  color:
                    result.score >= 70
                      ? "#10B981"
                      : result.score >= 50
                        ? "#F59E0B"
                        : "#DC2626",
                }}
              >
                {Math.round(result.score)}%
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="text-center">
                <div className="text-2xl font-extrabold" style={{ color: "#10B981" }}>
                  {result.correct_answers}
                </div>
                <div className="text-xs" style={{ color: "var(--theme-text-secondary)" }}>
                  إجابة صحيحة
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-extrabold" style={{ color: "#DC2626" }}>
                  {result.total_questions - result.correct_answers}
                </div>
                <div className="text-xs" style={{ color: "var(--theme-text-secondary)" }}>
                  إجابة خاطئة
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-extrabold" style={{ color: "#F59E0B" }}>
                  +{result.points_earned || 0}
                </div>
                <div className="text-xs" style={{ color: "var(--theme-text-secondary)" }}>
                  نقطة
                </div>
              </div>
            </div>

            <div
              className="mt-4 text-sm flex items-center justify-center gap-2"
              style={{ color: "var(--theme-text-muted)" }}
            >
              <Clock size={14} />
              الوقت: {formatTime(result.time_taken || timer)}
            </div>
          </div>

          {/* Review Answers */}
          {result.answers && result.answers.length > 0 && (
            <div>
              <h3 className="text-lg font-extrabold mb-3" style={{ color: "var(--theme-text-primary)" }}>
                📋 مراجعة الإجابات
              </h3>
              <div className="space-y-3">
                {result.answers.map((a, i) => {
                  const q = questions[i];
                  return (
                    <div key={a.question_id || i} className="themed-card p-4">
                      <div className="flex items-start gap-2 mb-2">
                        {a.is_correct ? (
                          <CheckCircle2 size={18} style={{ color: "#10B981" }} className="flex-shrink-0 mt-0.5" />
                        ) : (
                          <XCircle size={18} style={{ color: "#DC2626" }} className="flex-shrink-0 mt-0.5" />
                        )}
                        <span className="text-sm font-bold" style={{ color: "var(--theme-text-primary)" }}>
                          {q?.question_text || `سؤال ${i + 1}`}
                        </span>
                      </div>
                      {!a.is_correct && (
                        <div className="mr-6 space-y-1">
                          <div className="text-xs" style={{ color: "#DC2626" }}>
                            إجابتك: {a.selected || "لم تُجب"}
                          </div>
                          <div className="text-xs" style={{ color: "#10B981" }}>
                            الإجابة الصحيحة: {a.correct_answer}
                          </div>
                        </div>
                      )}
                      {a.explanation && (
                        <div
                          className="mr-6 mt-2 text-xs p-2 rounded-lg"
                          style={{ background: "var(--theme-hover-overlay)", color: "var(--theme-text-secondary)" }}
                        >
                          💡 {a.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 justify-center">
            <button
              onClick={() => {
                setView("select");
                setResult(null);
                setQuestions([]);
              }}
              className="themed-btn-outline flex items-center gap-2"
            >
              <ArrowRight size={16} />
              رجوع للمواد
            </button>
            {selectedSubject && (
              <button
                onClick={() => startExam(selectedSubject)}
                className="themed-btn-primary flex items-center gap-2"
              >
                <RotateCcw size={16} />
                امتحان جديد
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── HISTORY VIEW ── */}
      {view === "history" && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-extrabold" style={{ color: "var(--theme-text-primary)" }}>
              📋 سجل الامتحانات
            </h1>
            <button onClick={() => setView("select")} className="themed-btn-outline text-sm flex items-center gap-2">
              <ArrowRight size={16} />
              رجوع
            </button>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={30} className="animate-spin" style={{ color: "var(--theme-primary)" }} />
            </div>
          )}

          {!loading && history.length > 0 && (
            <div className="space-y-3">
              {history.map((item) => (
                <div key={item.id} className="themed-card p-4 flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center font-extrabold text-lg"
                    style={{
                      background:
                        item.score >= 70
                          ? "rgba(16,185,129,0.15)"
                          : item.score >= 50
                            ? "rgba(245,158,11,0.15)"
                            : "rgba(220,38,38,0.15)",
                      color:
                        item.score >= 70
                          ? "#10B981"
                          : item.score >= 50
                            ? "#F59E0B"
                            : "#DC2626",
                    }}
                  >
                    {Math.round(item.score)}%
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-extrabold" style={{ color: "var(--theme-text-primary)" }}>
                      {item.subject_name}
                    </div>
                    <div className="text-xs mt-1 flex items-center gap-3" style={{ color: "var(--theme-text-muted)" }}>
                      <span className="flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        {item.correct_answers}/{item.total_questions}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {formatTime(item.time_taken_seconds || 0)}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs" style={{ color: "var(--theme-text-muted)" }}>
                    {new Date(item.created_at).toLocaleDateString("ar-EG")}
                  </div>
                  {item.score >= 90 && <Star size={18} style={{ color: "#F59E0B" }} />}
                </div>
              ))}
            </div>
          )}

          {!loading && history.length === 0 && (
            <div className="themed-card p-8 text-center">
              <div className="text-4xl mb-3">📝</div>
              <p className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>
                لم تقم بأي امتحان بعد. ابدأ أول امتحان الآن!
              </p>
              <button onClick={() => setView("select")} className="themed-btn-primary mt-4 px-6 py-2">
                <Play size={16} className="inline ml-2" />
                ابدأ امتحان
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
