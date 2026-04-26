"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  BookOpen, Clock, CheckCircle2, XCircle, ChevronLeft,
  ChevronRight, Loader2, Play, Trophy, Target, AlertCircle,
  History, RotateCcw, Star, ArrowRight, Zap, Brain, Filter,
  Sparkles, BarChart3, Award,
} from "lucide-react";

interface Subject {
  id: string;
  name: string;
  icon: string;
  lesson_count: number;
  question_count?: number;
}

interface LessonOption {
  id: string;
  title: string;
  has_summary: boolean;
  question_count: number;
}

interface ExamQuestion {
  id: string;
  question_text: string;
  type: string;
  options: string[] | null;
  correct_answer: string | null;
  explanation: string | null;
  difficulty: string;
  is_ai_generated?: boolean;
}

interface ExamResult {
  score: number;
  total_questions: number;
  correct_answers: number;
  wrong_answers: number;
  points_earned: number;
  time_taken: number;
  answers: {
    question_id: string;
    question_text: string;
    selected: string;
    is_correct: boolean;
    correct_answer: string;
    explanation: string;
    options: string[];
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

type View = "select" | "config" | "exam" | "result" | "history";
type ExamMode = "bank" | "ai";
type Difficulty = "mixed" | "easy" | "medium" | "hard";

const EXAM_SIZES = [
  { value: 10, label: "سريع", icon: "⚡", desc: "10 أسئلة" },
  { value: 20, label: "عادي", icon: "📝", desc: "20 سؤال" },
  { value: 30, label: "شامل", icon: "📚", desc: "30 سؤال" },
];

const DIFFICULTIES: { value: Difficulty; label: string; icon: string; color: string }[] = [
  { value: "mixed", label: "متنوع", icon: "🎯", color: "#6366F1" },
  { value: "easy", label: "سهل", icon: "🟢", color: "#10B981" },
  { value: "medium", label: "متوسط", icon: "🟡", color: "#F59E0B" },
  { value: "hard", label: "صعب", icon: "🔴", color: "#DC2626" },
];

export default function ExamsPage() {
  const [view, setView] = useState<View>("select");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [lessons, setLessons] = useState<LessonOption[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<string>("");
  const [examMode, setExamMode] = useState<ExamMode>("bank");
  const [examSize, setExamSize] = useState(20);
  const [difficulty, setDifficulty] = useState<Difficulty>("mixed");
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [timer, setTimer] = useState(0);
  const [error, setError] = useState("");
  const [aiProgress, setAiProgress] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await fetch("/api/subjects", { credentials: "include" });
        if (res.ok) {
          const json = await res.json();
          setSubjects(json.subjects || []);
        }
      } catch { /* ignore */ }
    };
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (view === "exam") {
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [view]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const openConfig = async (subject: Subject) => {
    setSelectedSubject(subject);
    setSelectedLesson("");
    setExamMode("bank");
    setExamSize(20);
    setDifficulty("mixed");
    setError("");
    setView("config");

    // Fetch lessons for this subject
    try {
      const res = await fetch(`/api/subjects/${subject.id}`, { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        const allLessons: LessonOption[] = [];
        if (data.units) {
          for (const unit of data.units) {
            if (unit.lessons) {
              for (const l of unit.lessons) {
                allLessons.push({
                  id: l.id,
                  title: l.title_ar || l.title || '',
                  has_summary: !!l.has_summary,
                  question_count: l.question_count || 0,
                });
              }
            }
          }
        }
        if (data.ungroupedLessons) {
          for (const l of data.ungroupedLessons) {
            allLessons.push({
              id: l.id,
              title: l.title_ar || l.title || '',
              has_summary: !!l.has_summary,
              question_count: l.question_count || 0,
            });
          }
        }
        setLessons(allLessons);
      }
    } catch { /* ignore */ }
  };

  const startExam = async () => {
    if (!selectedSubject) return;
    setLoading(true);
    setError("");
    setAiProgress("");

    try {
      if (examMode === "ai") {
        // AI-generated exam
        setAiProgress("🤖 جارٍ توليد امتحان ذكي...");
        const res = await fetch("/api/exams/ai-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            subject_id: selectedSubject.id,
            lesson_id: selectedLesson || null,
            count: examSize,
            difficulty,
          }),
        });
        const json = await res.json();
        if (res.ok && json.questions && json.questions.length > 0) {
          setQuestions(json.questions);
          setAnswers({});
          setCurrentQ(0);
          setTimer(0);
          setAiProgress("");
          setView("exam");
        } else {
          setError(json.error || "فشل في توليد الامتحان");
          setAiProgress("");
        }
      } else {
        // From question bank
        const params = new URLSearchParams({
          subject_id: selectedSubject.id,
          count: String(examSize),
        });
        if (selectedLesson) params.set("lesson_id", selectedLesson);
        if (difficulty !== "mixed") params.set("difficulty", difficulty);

        const res = await fetch(`/api/exams?${params}`, { credentials: "include" });
        const json = await res.json();
        if (res.ok && json.questions && json.questions.length > 0) {
          setQuestions(json.questions);
          setAnswers({});
          setCurrentQ(0);
          setTimer(0);
          setView("exam");
        } else {
          setError(json.error || "لا توجد أسئلة كافية. جرب وضع AI لتوليد أسئلة جديدة.");
        }
      }
    } catch {
      setError("فشل في تحضير الامتحان");
      setAiProgress("");
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

    const isAiExam = questions.some(q => q.is_ai_generated);

    if (isAiExam) {
      // For AI exams, calculate score locally (questions have correct_answer)
      let correct = 0;
      const detailedAnswers = questions.map((q) => {
        const selected = answers[q.id] || "";
        // AI exam: correct_answer is index as string
        const correctOpt = q.options?.[parseInt(q.correct_answer || "0")] || "";
        const isCorrect = selected === correctOpt;
        if (isCorrect) correct++;
        return {
          question_id: q.id,
          question_text: q.question_text,
          selected,
          correct_answer: correctOpt,
          is_correct: isCorrect,
          explanation: q.explanation || "",
          options: q.options || [],
        };
      });

      const score = Math.round((correct / questions.length) * 100);
      setResult({
        score,
        total_questions: questions.length,
        correct_answers: correct,
        wrong_answers: questions.length - correct,
        points_earned: score >= 90 ? 25 : score >= 70 ? 15 : 10,
        time_taken: timer,
        answers: detailedAnswers,
      });
      setView("result");
      setLoading(false);
      return;
    }

    // DB exam — submit via API
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
        const r = json.result;
        setResult({
          score: r.score,
          total_questions: r.total || questions.length,
          correct_answers: r.correct ?? 0,
          wrong_answers: r.wrong ?? (questions.length - (r.correct ?? 0)),
          points_earned: r.points_earned || 0,
          time_taken: r.time_taken || timer,
          answers: r.answers || [],
        });
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
      const res = await fetch("/api/exams?action=history", { credentials: "include" });
      const json = await res.json();
      if (res.ok) setHistory(json.history || []);
    } catch { /* ignore */ }
    finally { setLoading(false); setView("history"); }
  };

  const answeredCount = Object.keys(answers).length;
  const currentQuestion = questions[currentQ];
  const totalQuestions = questions.length;

  // Helper: get option label by index
  const getCorrectOptionText = (q: ExamQuestion) => {
    const idx = parseInt(q.correct_answer || "0");
    return q.options?.[idx] || q.correct_answer || "";
  };

  return (
    <div className="p-4 md:p-6 font-cairo min-h-[calc(100vh-4rem)]" style={{ color: "var(--theme-text-primary)" }}>
      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm font-bold flex items-center gap-2" style={{ background: "rgba(220,38,38,0.1)", color: "#DC2626", border: "1px solid rgba(220,38,38,0.3)" }}>
          <AlertCircle size={16} />
          {error}
          <button onClick={() => setError("")} className="mr-auto text-xs underline">إغلاق</button>
        </div>
      )}

      {/* ── SELECT SUBJECT ── */}
      {view === "select" && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-extrabold flex items-center gap-2" style={{ color: "var(--theme-text-primary)" }}>
                <Brain size={28} style={{ color: "var(--theme-primary)" }} />
                الامتحانات الذكية
              </h1>
              <p className="text-sm mt-1" style={{ color: "var(--theme-text-secondary)" }}>
                اختر مادة → حدد نوع الامتحان → ابدأ التحدي! 🚀
              </p>
            </div>
            <button onClick={fetchHistory} className="themed-btn-outline text-sm flex items-center gap-2">
              <History size={16} />
              سجل الامتحانات
            </button>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: "📝", label: "مواد متاحة", value: subjects.length },
              { icon: "❓", label: "بنك الأسئلة", value: subjects.reduce((s, sub) => s + (sub.question_count || 0), 0) || "200+" },
              { icon: "🤖", label: "وضع AI", value: "متاح" },
              { icon: "🏆", label: "أنماط", value: "3 مستويات" },
            ].map((stat, i) => (
              <div key={i} className="themed-card p-3 text-center">
                <div className="text-xl mb-1">{stat.icon}</div>
                <div className="text-lg font-extrabold" style={{ color: "var(--theme-primary)" }}>{stat.value}</div>
                <div className="text-xs" style={{ color: "var(--theme-text-muted)" }}>{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((subject) => (
              <button
                key={subject.id}
                onClick={() => openConfig(subject)}
                disabled={loading}
                className="themed-card p-5 text-right w-full hover:shadow-lg transition-all cursor-pointer group"
                style={{ border: "none" }}
              >
                <div className="flex items-center gap-4">
                  <div className="text-4xl group-hover:scale-110 transition-transform">{subject.icon || "📖"}</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-extrabold" style={{ color: "var(--theme-text-primary)" }}>
                      {subject.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--theme-hover-overlay)", color: "var(--theme-text-secondary)" }}>
                        {subject.lesson_count || 0} درس
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.1)", color: "#10B981" }}>
                        {subject.question_count || 0} سؤال
                      </span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity" style={{ background: "var(--theme-cta-gradient)" }}>
                    <Play size={18} color="#fff" />
                  </div>
                </div>
              </button>
            ))}
          </div>

          {subjects.length === 0 && !loading && (
            <div className="themed-card p-8 text-center">
              <div className="text-4xl mb-3">📝</div>
              <p className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>لا توجد مواد متاحة حالياً</p>
            </div>
          )}
        </div>
      )}

      {/* ── CONFIG VIEW ── */}
      {view === "config" && selectedSubject && (
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <button onClick={() => setView("select")} className="themed-btn-outline p-2 rounded-xl">
              <ArrowRight size={20} />
            </button>
            <div>
              <h2 className="text-xl font-extrabold flex items-center gap-2" style={{ color: "var(--theme-text-primary)" }}>
                <span className="text-2xl">{selectedSubject.icon || "📖"}</span>
                إعداد الامتحان — {selectedSubject.name}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--theme-text-secondary)" }}>
                حدد نوع الامتحان وابدأ التحدي
              </p>
            </div>
          </div>

          {/* Exam Mode */}
          <div className="themed-card p-5">
            <h3 className="text-sm font-extrabold mb-3 flex items-center gap-2" style={{ color: "var(--theme-text-primary)" }}>
              <Sparkles size={16} style={{ color: "var(--theme-primary)" }} />
              وضع الامتحان
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setExamMode("bank")}
                className="p-4 rounded-xl text-center transition-all cursor-pointer"
                style={{
                  background: examMode === "bank" ? "var(--theme-hover-overlay)" : "transparent",
                  border: `2px solid ${examMode === "bank" ? "var(--theme-primary)" : "var(--theme-surface-border)"}`,
                }}
              >
                <div className="text-3xl mb-2">📦</div>
                <div className="text-sm font-extrabold" style={{ color: "var(--theme-text-primary)" }}>بنك الأسئلة</div>
                <div className="text-xs mt-1" style={{ color: "var(--theme-text-muted)" }}>أسئلة من قاعدة البيانات</div>
              </button>
              <button
                onClick={() => setExamMode("ai")}
                className="p-4 rounded-xl text-center transition-all cursor-pointer relative overflow-hidden"
                style={{
                  background: examMode === "ai" ? "var(--theme-hover-overlay)" : "transparent",
                  border: `2px solid ${examMode === "ai" ? "var(--theme-primary)" : "var(--theme-surface-border)"}`,
                }}
              >
                <div className="absolute top-1 left-1 text-[0.6rem] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "var(--theme-cta-gradient)", color: "#fff" }}>
                  جديد
                </div>
                <div className="text-3xl mb-2">🤖</div>
                <div className="text-sm font-extrabold" style={{ color: "var(--theme-text-primary)" }}>امتحان AI</div>
                <div className="text-xs mt-1" style={{ color: "var(--theme-text-muted)" }}>أسئلة ذكية من المنهج</div>
              </button>
            </div>
          </div>

          {/* Exam Size */}
          <div className="themed-card p-5">
            <h3 className="text-sm font-extrabold mb-3 flex items-center gap-2" style={{ color: "var(--theme-text-primary)" }}>
              <BarChart3 size={16} style={{ color: "var(--theme-primary)" }} />
              عدد الأسئلة
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {EXAM_SIZES.map((size) => (
                <button
                  key={size.value}
                  onClick={() => setExamSize(size.value)}
                  className="p-3 rounded-xl text-center transition-all cursor-pointer"
                  style={{
                    background: examSize === size.value ? "var(--theme-hover-overlay)" : "transparent",
                    border: `2px solid ${examSize === size.value ? "var(--theme-primary)" : "var(--theme-surface-border)"}`,
                  }}
                >
                  <div className="text-xl">{size.icon}</div>
                  <div className="text-sm font-extrabold mt-1" style={{ color: "var(--theme-text-primary)" }}>{size.label}</div>
                  <div className="text-xs" style={{ color: "var(--theme-text-muted)" }}>{size.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div className="themed-card p-5">
            <h3 className="text-sm font-extrabold mb-3 flex items-center gap-2" style={{ color: "var(--theme-text-primary)" }}>
              <Target size={16} style={{ color: "var(--theme-primary)" }} />
              مستوى الصعوبة
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setDifficulty(d.value)}
                  className="p-3 rounded-xl text-center transition-all cursor-pointer"
                  style={{
                    background: difficulty === d.value ? `${d.color}15` : "transparent",
                    border: `2px solid ${difficulty === d.value ? d.color : "var(--theme-surface-border)"}`,
                  }}
                >
                  <div className="text-lg">{d.icon}</div>
                  <div className="text-xs font-extrabold mt-1" style={{ color: difficulty === d.value ? d.color : "var(--theme-text-primary)" }}>
                    {d.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Lesson Filter */}
          {lessons.length > 0 && (
            <div className="themed-card p-5">
              <h3 className="text-sm font-extrabold mb-3 flex items-center gap-2" style={{ color: "var(--theme-text-primary)" }}>
                <Filter size={16} style={{ color: "var(--theme-primary)" }} />
                تحديد الدرس (اختياري)
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                <button
                  onClick={() => setSelectedLesson("")}
                  className="w-full p-3 rounded-lg text-right text-sm transition-all cursor-pointer flex items-center gap-2"
                  style={{
                    background: !selectedLesson ? "var(--theme-hover-overlay)" : "transparent",
                    border: `1px solid ${!selectedLesson ? "var(--theme-primary)" : "var(--theme-surface-border)"}`,
                  }}
                >
                  <span className="text-base">📚</span>
                  <span className="font-bold" style={{ color: "var(--theme-text-primary)" }}>كل الدروس</span>
                </button>
                {lessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    onClick={() => setSelectedLesson(lesson.id)}
                    className="w-full p-3 rounded-lg text-right text-sm transition-all cursor-pointer flex items-center gap-2"
                    style={{
                      background: selectedLesson === lesson.id ? "var(--theme-hover-overlay)" : "transparent",
                      border: `1px solid ${selectedLesson === lesson.id ? "var(--theme-primary)" : "var(--theme-surface-border)"}`,
                    }}
                  >
                    <span className="text-base">📖</span>
                    <span className="font-bold flex-1" style={{ color: "var(--theme-text-primary)" }}>{lesson.title}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--theme-hover-overlay)", color: "var(--theme-text-muted)" }}>
                      {lesson.question_count} سؤال
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Start Button */}
          <button
            onClick={startExam}
            disabled={loading}
            className="w-full py-4 rounded-xl text-lg font-extrabold text-white transition-all flex items-center justify-center gap-3 cursor-pointer"
            style={{ background: "var(--theme-cta-gradient)", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? (
              <>
                <Loader2 size={22} className="animate-spin" />
                {aiProgress || "جارٍ التحضير..."}
              </>
            ) : (
              <>
                {examMode === "ai" ? <Sparkles size={22} /> : <Play size={22} />}
                {examMode === "ai" ? "🤖 ابدأ امتحان AI" : "🚀 ابدأ الامتحان"}
              </>
            )}
          </button>
        </div>
      )}

      {/* ── EXAM VIEW ── */}
      {view === "exam" && currentQuestion && (
        <div className="max-w-3xl mx-auto space-y-5">
          {/* Header */}
          <div className="themed-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">{selectedSubject?.icon || "📖"}</span>
                <div>
                  <span className="text-sm font-extrabold" style={{ color: "var(--theme-text-primary)" }}>
                    {selectedSubject?.name}
                  </span>
                  {questions[0]?.is_ai_generated && (
                    <span className="mr-2 text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(99,102,241,0.1)", color: "#6366F1" }}>
                      🤖 AI
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-sm" style={{ color: "var(--theme-text-secondary)" }}>
                  <Target size={16} />
                  {answeredCount}/{totalQuestions}
                </div>
                <div className="flex items-center gap-1 text-sm font-bold px-3 py-1 rounded-lg" style={{ background: "var(--theme-hover-overlay)", color: "var(--theme-primary)" }}>
                  <Clock size={16} />
                  {formatTime(timer)}
                </div>
              </div>
            </div>
            <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: "var(--theme-surface-border)" }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${((currentQ + 1) / totalQuestions) * 100}%`, background: "var(--theme-cta-gradient)" }} />
            </div>
          </div>

          {/* Question */}
          <div className="themed-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-extrabold" style={{ background: "var(--theme-cta-gradient)", color: "#fff" }}>
                {currentQ + 1}
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{
                background: currentQuestion.difficulty === "hard" ? "rgba(220,38,38,0.1)" : currentQuestion.difficulty === "medium" ? "rgba(245,158,11,0.1)" : "rgba(16,185,129,0.1)",
                color: currentQuestion.difficulty === "hard" ? "#DC2626" : currentQuestion.difficulty === "medium" ? "#F59E0B" : "#10B981",
              }}>
                {currentQuestion.difficulty === "hard" ? "صعب" : currentQuestion.difficulty === "medium" ? "متوسط" : "سهل"}
              </span>
              <span className="text-xs mr-auto" style={{ color: "var(--theme-text-muted)" }}>
                {currentQ + 1} من {totalQuestions}
              </span>
            </div>

            <h2 className="text-base font-extrabold mb-6 leading-relaxed" style={{ color: "var(--theme-text-primary)", lineHeight: "1.85" }}>
              {currentQuestion.question_text}
            </h2>

            {/* MCQ Options */}
            {currentQuestion.options && (
              <div className="space-y-3">
                {currentQuestion.options.map((opt, i) => {
                  const optText = typeof opt === "string" ? opt : (opt as any).text;
                  const isSelected = answers[currentQuestion.id] === optText;
                  const labels = ["أ", "ب", "ج", "د"];
                  return (
                    <button
                      key={i}
                      onClick={() => selectAnswer(currentQuestion.id, optText)}
                      className="w-full p-4 rounded-xl flex items-center gap-3 text-right transition-all cursor-pointer"
                      style={{
                        background: isSelected ? "var(--theme-hover-overlay)" : "transparent",
                        border: `2px solid ${isSelected ? "var(--theme-primary)" : "var(--theme-surface-border)"}`,
                      }}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-extrabold flex-shrink-0" style={{
                        background: isSelected ? "var(--theme-cta-gradient)" : "var(--theme-surface-border)",
                        color: isSelected ? "#fff" : "var(--theme-text-muted)",
                      }}>
                        {labels[i] || (i + 1).toString()}
                      </div>
                      <span className="text-sm font-bold flex-1" style={{ color: "var(--theme-text-primary)" }}>{optText}</span>
                      {isSelected && <CheckCircle2 size={18} className="flex-shrink-0" style={{ color: "var(--theme-primary)" }} />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* True/False fallback (if no options) */}
            {currentQuestion.type === "true_false" && !currentQuestion.options && (
              <div className="grid grid-cols-2 gap-4">
                {["صح", "خطأ"].map((opt) => {
                  const isSelected = answers[currentQuestion.id] === opt;
                  return (
                    <button key={opt} onClick={() => selectAnswer(currentQuestion.id, opt)} className="p-4 rounded-xl text-center font-extrabold transition-all cursor-pointer" style={{
                      background: isSelected ? "var(--theme-hover-overlay)" : "transparent",
                      border: `2px solid ${isSelected ? "var(--theme-primary)" : "var(--theme-surface-border)"}`,
                      color: "var(--theme-text-primary)",
                    }}>
                      {opt === "صح" ? "✅ صح" : "❌ خطأ"}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Fallback — question has no options (shouldn't happen) */}
            {!currentQuestion.options && currentQuestion.type !== "true_false" && (
              <div className="p-4 rounded-xl text-center" style={{ background: "var(--theme-hover-overlay)", border: "2px solid var(--theme-surface-border)" }}>
                <p className="text-sm font-bold mb-2" style={{ color: "var(--theme-text-secondary)" }}>⚠️ هذا السؤال مقالي ولا يمكن تصحيحه تلقائياً</p>
                <button onClick={() => setCurrentQ(p => Math.min(questions.length - 1, p + 1))} className="themed-btn-sm">تخطي ← التالي</button>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button onClick={() => setCurrentQ((p) => Math.max(0, p - 1))} disabled={currentQ === 0} className="themed-btn-outline flex items-center gap-1" style={{ opacity: currentQ === 0 ? 0.5 : 1 }}>
              <ChevronRight size={18} /> السابق
            </button>

            <div className="flex items-center gap-1 flex-wrap justify-center max-w-[55%]">
              {questions.map((q, i) => (
                <button key={q.id} onClick={() => setCurrentQ(i)} className="w-7 h-7 rounded-full text-[0.6rem] font-bold transition-all cursor-pointer" style={{
                  background: i === currentQ ? "var(--theme-cta-gradient)" : answers[q.id] ? "var(--theme-primary)" : "var(--theme-surface-border)",
                  color: i === currentQ || answers[q.id] ? "#fff" : "var(--theme-text-muted)",
                  border: "none",
                }}>
                  {i + 1}
                </button>
              ))}
            </div>

            {currentQ < totalQuestions - 1 ? (
              <button onClick={() => setCurrentQ((p) => Math.min(totalQuestions - 1, p + 1))} className="themed-btn-primary flex items-center gap-1">
                التالي <ChevronLeft size={18} />
              </button>
            ) : (
              <button onClick={submitExam} disabled={loading} className="themed-btn-primary flex items-center gap-1">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle2 size={18} /> تقديم الامتحان</>}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── RESULT VIEW ── */}
      {view === "result" && result && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="themed-card p-8 text-center">
            <div className="text-5xl mb-4">
              {result.score >= 90 ? "🏆" : result.score >= 70 ? "🎉" : result.score >= 50 ? "👍" : "📚"}
            </div>
            <h2 className="text-2xl font-extrabold mb-2" style={{ color: "var(--theme-text-primary)" }}>
              {result.score >= 90 ? "ممتاز! 🌟" : result.score >= 70 ? "جيد جداً!" : result.score >= 50 ? "جيد، كمّل!" : "محتاج مراجعة"}
            </h2>

            <div className="w-32 h-32 mx-auto rounded-full flex items-center justify-center mb-4" style={{
              background: result.score >= 70 ? "rgba(16,185,129,0.15)" : result.score >= 50 ? "rgba(245,158,11,0.15)" : "rgba(220,38,38,0.15)",
            }}>
              <span className="text-4xl font-extrabold" style={{
                color: result.score >= 70 ? "#10B981" : result.score >= 50 ? "#F59E0B" : "#DC2626",
              }}>
                {Math.round(result.score)}%
              </span>
            </div>

            <div className="grid grid-cols-4 gap-3 mt-6">
              {[
                { value: result.correct_answers, label: "صحيحة", color: "#10B981", icon: "✅" },
                { value: result.wrong_answers, label: "خاطئة", color: "#DC2626", icon: "❌" },
                { value: `+${result.points_earned || 0}`, label: "نقطة", color: "#F59E0B", icon: "⭐" },
                { value: formatTime(result.time_taken || timer), label: "الوقت", color: "var(--theme-primary)", icon: "⏱️" },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <div className="text-lg">{s.icon}</div>
                  <div className="text-xl font-extrabold" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs" style={{ color: "var(--theme-text-secondary)" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Review Answers */}
          {result.answers && result.answers.length > 0 && (
            <div>
              <h3 className="text-lg font-extrabold mb-3 flex items-center gap-2" style={{ color: "var(--theme-text-primary)" }}>
                📋 مراجعة الإجابات
              </h3>
              <div className="space-y-3">
                {result.answers.map((a, i) => {
                  const q = questions[i];
                  const correctText = a.correct_answer || (q ? getCorrectOptionText(q) : "");
                  return (
                    <div key={a.question_id || i} className="themed-card p-4">
                      <div className="flex items-start gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5" style={{
                          background: a.is_correct ? "rgba(16,185,129,0.15)" : "rgba(220,38,38,0.15)",
                          color: a.is_correct ? "#10B981" : "#DC2626",
                        }}>
                          {i + 1}
                        </div>
                        <span className="text-sm font-bold leading-relaxed" style={{ color: "var(--theme-text-primary)" }}>
                          {a.question_text || q?.question_text || `سؤال ${i + 1}`}
                        </span>
                        {a.is_correct ? (
                          <CheckCircle2 size={18} style={{ color: "#10B981" }} className="flex-shrink-0 mr-auto" />
                        ) : (
                          <XCircle size={18} style={{ color: "#DC2626" }} className="flex-shrink-0 mr-auto" />
                        )}
                      </div>
                      {!a.is_correct && (
                        <div className="mr-8 space-y-1 mt-2">
                          <div className="text-xs flex items-center gap-1" style={{ color: "#DC2626" }}>
                            <XCircle size={12} /> إجابتك: {a.selected || "لم تُجب"}
                          </div>
                          <div className="text-xs flex items-center gap-1" style={{ color: "#10B981" }}>
                            <CheckCircle2 size={12} /> الصحيحة: {correctText}
                          </div>
                        </div>
                      )}
                      {a.explanation && (
                        <div className="mr-8 mt-2 text-xs p-2 rounded-lg" style={{ background: "var(--theme-hover-overlay)", color: "var(--theme-text-secondary)" }}>
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
          <div className="flex items-center gap-3 justify-center flex-wrap">
            <button onClick={() => { setView("select"); setResult(null); setQuestions([]); }} className="themed-btn-outline flex items-center gap-2">
              <ArrowRight size={16} /> رجوع للمواد
            </button>
            {selectedSubject && (
              <button onClick={() => { setView("config"); setResult(null); setQuestions([]); }} className="themed-btn-primary flex items-center gap-2">
                <RotateCcw size={16} /> امتحان جديد
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── HISTORY VIEW ── */}
      {view === "history" && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-extrabold flex items-center gap-2" style={{ color: "var(--theme-text-primary)" }}>
              <Award size={24} style={{ color: "var(--theme-primary)" }} />
              سجل الامتحانات
            </h1>
            <button onClick={() => setView("select")} className="themed-btn-outline text-sm flex items-center gap-2">
              <ArrowRight size={16} /> رجوع
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
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center font-extrabold text-lg" style={{
                    background: item.score >= 70 ? "rgba(16,185,129,0.15)" : item.score >= 50 ? "rgba(245,158,11,0.15)" : "rgba(220,38,38,0.15)",
                    color: item.score >= 70 ? "#10B981" : item.score >= 50 ? "#F59E0B" : "#DC2626",
                  }}>
                    {Math.round(item.score)}%
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-extrabold" style={{ color: "var(--theme-text-primary)" }}>{item.subject_name}</div>
                    <div className="text-xs mt-1 flex items-center gap-3" style={{ color: "var(--theme-text-muted)" }}>
                      <span className="flex items-center gap-1"><CheckCircle2 size={12} /> {item.correct_answers}/{item.total_questions}</span>
                      <span className="flex items-center gap-1"><Clock size={12} /> {formatTime(item.time_taken_seconds || 0)}</span>
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
              <p className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>لم تقم بأي امتحان بعد. ابدأ أول امتحان الآن!</p>
              <button onClick={() => setView("select")} className="themed-btn-primary mt-4 px-6 py-2">
                <Play size={16} className="inline ml-2" /> ابدأ امتحان
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
