"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle, Play, ChevronLeft, ChevronRight,
  Check, X, Loader2, BarChart3, BookOpen, RotateCcw,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";

interface SubjectAnalysis {
  subject_id: string;
  subject_name: string;
  weak_topics: string[];
  questions_count: number;
  avg_score: number;
}

interface ReviewQuestion {
  id: string;
  question_ar: string;
  type: string;
  options: string[];
  correct_answer: number;
  explanation_ar: string;
  difficulty: string;
  subject_name: string;
}

interface EmergencyData {
  subjects: SubjectAnalysis[];
  questions: ReviewQuestion[];
}

export default function EmergencyMode() {
  const { token } = useAuthStore();
  const [data, setData] = useState<EmergencyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"overview" | "review">("overview");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/emergency", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (res.ok) {
        setData(result);
      }
    } catch (e) {
      console.error("Failed to fetch emergency data:", e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const currentQuestion = data?.questions?.[currentIndex];
  const totalQuestions = data?.questions?.length ?? 0;
  const progress = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;

  const handleAnswer = (answerIndex: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(answerIndex);
    setShowExplanation(true);
    setAnswered((a) => a + 1);
    if (answerIndex === currentQuestion?.correct_answer) {
      setScore((s) => s + 1);
    }
  };

  const nextQuestion = () => {
    setSelectedAnswer(null);
    setShowExplanation(false);
    setCurrentIndex((i) => Math.min(i + 1, totalQuestions - 1));
  };

  const prevQuestion = () => {
    setSelectedAnswer(null);
    setShowExplanation(false);
    setCurrentIndex((i) => Math.max(i - 1, 0));
  };

  const startReview = () => {
    setMode("review");
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setScore(0);
    setAnswered(0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--theme-primary)" }} />
      </div>
    );
  }

  // Overview Mode
  if (mode === "overview") {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #EF4444, #F97316)" }}>
            <AlertTriangle size={24} color="#fff" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold" style={{ color: "var(--theme-text-primary)" }}>المراجعة الطارئة 🚨</h1>
            <p className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>تركز على نقاط ضعفك لتحسين أدائك</p>
          </div>
        </div>

        {/* Subject Analysis */}
        {(data?.subjects ?? []).length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold" style={{ color: "var(--theme-text-primary)" }}>📊 تحليل المواد</h2>
            {data?.subjects?.map((subject) => (
              <div key={subject.subject_id} className="themed-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <BookOpen size={16} style={{ color: "var(--theme-primary)" }} />
                    <span className="font-bold text-sm" style={{ color: "var(--theme-text-primary)" }}>{subject.subject_name}</span>
                  </div>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: subject.avg_score >= 70 ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                      color: subject.avg_score >= 70 ? "#10B981" : "#EF4444",
                    }}
                  >
                    {Math.round(subject.avg_score)}%
                  </span>
                </div>
                {subject.weak_topics?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {subject.weak_topics.map((topic, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--theme-hover-overlay)", color: "var(--theme-text-secondary)" }}>
                        {topic}
                      </span>
                    ))}
                  </div>
                )}
                <div className="text-xs mt-2" style={{ color: "var(--theme-text-muted)" }}>
                  {subject.questions_count} سؤال للمراجعة
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Start Button */}
        <button
          onClick={startReview}
          disabled={!data?.questions?.length}
          className="themed-btn-primary w-full py-4 flex items-center justify-center gap-3 text-lg"
          style={{ opacity: data?.questions?.length ? 1 : 0.5 }}
        >
          <Play size={22} />
          <span>ابدأ المراجعة ({totalQuestions} سؤال)</span>
        </button>
      </div>
    );
  }

  // Review Mode
  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span style={{ color: "var(--theme-text-muted)" }}>سؤال {currentIndex + 1} من {totalQuestions}</span>
          <div className="flex items-center gap-3">
            <span style={{ color: "#10B981" }}>✓ {score}</span>
            <span style={{ color: "#EF4444" }}>✗ {answered - score}</span>
          </div>
        </div>
        <div className="w-full h-2 rounded-full" style={{ background: "var(--theme-surface-border)" }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: "var(--theme-primary)" }} />
        </div>
      </div>

      {/* Score tracker */}
      <div className="flex items-center justify-between">
        <button onClick={() => { setMode("overview"); }} className="text-sm flex items-center gap-1" style={{ color: "var(--theme-text-muted)" }}>
          <RotateCcw size={14} /> العودة
        </button>
        <div className="flex items-center gap-2">
          <BarChart3 size={16} style={{ color: "var(--theme-primary)" }} />
          <span className="text-sm font-bold" style={{ color: "var(--theme-text-primary)" }}>
            {answered > 0 ? Math.round((score / answered) * 100) : 0}%
          </span>
        </div>
      </div>

      {/* Question Card */}
      {currentQuestion && (
        <div className="themed-card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--theme-hover-overlay)", color: "var(--theme-primary)" }}>
              {currentQuestion.subject_name}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--theme-hover-overlay)", color: "var(--theme-text-muted)" }}>
              {currentQuestion.difficulty === "easy" ? "سهل" : currentQuestion.difficulty === "hard" ? "صعب" : "متوسط"}
            </span>
          </div>

          <h3 className="text-base font-bold leading-relaxed" style={{ color: "var(--theme-text-primary)" }}>
            {currentQuestion.question_ar}
          </h3>

          {/* Options */}
          <div className="space-y-2">
            {currentQuestion.options?.map((option, idx) => {
              const isSelected = selectedAnswer === idx;
              const isCorrect = idx === currentQuestion.correct_answer;
              const showResult = selectedAnswer !== null;

              let bg = "var(--theme-surface-bg)";
              let border = "var(--theme-surface-border)";
              let textColor = "var(--theme-text-primary)";

              if (showResult) {
                if (isCorrect) {
                  bg = "rgba(16,185,129,0.1)";
                  border = "#10B981";
                  textColor = "#10B981";
                } else if (isSelected && !isCorrect) {
                  bg = "rgba(239,68,68,0.1)";
                  border = "#EF4444";
                  textColor = "#EF4444";
                }
              } else if (isSelected) {
                bg = "var(--theme-hover-overlay)";
                border = "var(--theme-primary)";
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  disabled={selectedAnswer !== null}
                  className="w-full p-3 rounded-lg text-right text-sm font-medium border transition-all flex items-center gap-3"
                  style={{ background: bg, borderColor: border, color: textColor }}
                >
                  <span className="w-7 h-7 rounded-full border flex items-center justify-center text-xs flex-shrink-0" style={{ borderColor: border }}>
                    {showResult && isCorrect ? <Check size={14} /> : showResult && isSelected ? <X size={14} /> : String.fromCharCode(1571 + idx)}
                  </span>
                  <span>{option}</span>
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {showExplanation && currentQuestion.explanation_ar && (
            <div className="p-3 rounded-lg text-sm" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", color: "var(--theme-text-primary)" }}>
              <strong style={{ color: "var(--theme-primary)" }}>💡 الشرح:</strong> {currentQuestion.explanation_ar}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        <button onClick={prevQuestion} disabled={currentIndex === 0} className="themed-btn-outline flex-1 py-3" style={{ opacity: currentIndex === 0 ? 0.5 : 1 }}>
          <ChevronRight size={18} className="inline" /> السابق
        </button>
        <button onClick={nextQuestion} disabled={currentIndex >= totalQuestions - 1} className="themed-btn-primary flex-1 py-3" style={{ opacity: currentIndex >= totalQuestions - 1 ? 0.5 : 1 }}>
          التالي <ChevronLeft size={18} className="inline" />
        </button>
      </div>
    </div>
  );
}
