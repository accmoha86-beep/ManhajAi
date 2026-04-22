"use client";

import { useState } from "react";
import {
  ClipboardCheck, Clock, CheckCircle, ChevronLeft,
  Trophy, AlertCircle, Timer, RotateCcw,
} from "lucide-react";

interface Exam {
  id: string;
  subject: string;
  subjectIcon: string;
  title: string;
  questions: number;
  duration: number; // minutes
  difficulty: "سهل" | "متوسط" | "صعب";
  completed: boolean;
  score?: number;
}

const exams: Exam[] = [
  { id: "e1", subject: "الرياضيات", subjectIcon: "📐", title: "الباب الأول — التفاضل", questions: 20, duration: 30, difficulty: "متوسط", completed: true, score: 18 },
  { id: "e2", subject: "الرياضيات", subjectIcon: "📐", title: "الباب الثاني — التكامل", questions: 15, duration: 25, difficulty: "صعب", completed: true, score: 12 },
  { id: "e3", subject: "الفيزياء", subjectIcon: "⚛️", title: "قوانين نيوتن", questions: 20, duration: 30, difficulty: "سهل", completed: true, score: 19 },
  { id: "e4", subject: "الفيزياء", subjectIcon: "⚛️", title: "الكهربية", questions: 25, duration: 40, difficulty: "متوسط", completed: false },
  { id: "e5", subject: "الكيمياء", subjectIcon: "🧪", title: "الكيمياء العضوية", questions: 20, duration: 30, difficulty: "متوسط", completed: false },
  { id: "e6", subject: "الكيمياء", subjectIcon: "🧪", title: "الاتزان الكيميائي", questions: 15, duration: 20, difficulty: "سهل", completed: false },
];

const difficultyColors: Record<string, string> = {
  "سهل": "#10B981",
  "متوسط": "#F59E0B",
  "صعب": "#EF4444",
};

type ExamQuestion = {
  question: string;
  options: string[];
  correct: number;
};

const sampleQuestions: ExamQuestion[] = [
  { question: "ما مشتقة x⁴؟", options: ["4x³", "x³", "4x", "3x⁴"], correct: 0 },
  { question: "ما تكامل 2x؟", options: ["x²", "x² + C", "2x²", "x"], correct: 1 },
  { question: "قيمة sin(90°)؟", options: ["0", "1", "-1", "0.5"], correct: 1 },
  { question: "ما ناتج 5! ؟", options: ["120", "60", "24", "720"], correct: 0 },
  { question: "مشتقة e^x؟", options: ["e^x", "xe^(x-1)", "e", "ln(x)"], correct: 0 },
];

export default function ExamsPage() {
  const [filter, setFilter] = useState<"all" | "completed" | "pending">("all");
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  const filteredExams = exams.filter((e) => {
    if (filter === "completed") return e.completed;
    if (filter === "pending") return !e.completed;
    return true;
  });

  const startExam = (exam: Exam) => {
    setActiveExam(exam);
    setAnswers({});
    setSubmitted(false);
    setTimeLeft(exam.duration * 60);
  };

  if (activeExam && !submitted) {
    return (
      <div className="p-6 font-cairo max-w-3xl mx-auto" style={{ color: "var(--theme-text-primary)" }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{activeExam.subjectIcon}</span>
            <h1 className="text-xl font-extrabold">{activeExam.title}</h1>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: "var(--theme-hover-overlay)" }}>
            <Timer size={18} style={{ color: "var(--theme-primary)" }} />
            <span className="font-bold" style={{ color: "var(--theme-primary)" }}>
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
            </span>
          </div>
        </div>

        <div className="space-y-6">
          {sampleQuestions.slice(0, Math.min(activeExam.questions, 5)).map((q, qi) => (
            <div key={qi} className="themed-card p-5">
              <div className="text-sm font-bold mb-3" style={{ color: "var(--theme-text-primary)" }}>
                {qi + 1}. {q.question}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {q.options.map((opt, oi) => (
                  <button key={oi}
                    onClick={() => setAnswers({ ...answers, [qi]: oi })}
                    className="p-3 rounded-lg text-sm font-bold text-right cursor-pointer transition-all"
                    style={{
                      background: answers[qi] === oi ? "var(--theme-hover-overlay)" : "var(--theme-surface-bg)",
                      border: `2px solid ${answers[qi] === oi ? "var(--theme-primary)" : "var(--theme-surface-border)"}`,
                      color: "var(--theme-text-primary)",
                    }}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={() => setActiveExam(null)}
            className="themed-btn-outline px-6 py-3 flex items-center gap-2">
            <RotateCcw size={18} /> إلغاء
          </button>
          <button onClick={() => setSubmitted(true)}
            className="themed-btn-primary flex-1 py-3 flex items-center justify-center gap-2 text-lg">
            <CheckCircle size={20} /> تسليم الامتحان
          </button>
        </div>
      </div>
    );
  }

  if (activeExam && submitted) {
    const score = sampleQuestions.slice(0, Math.min(activeExam.questions, 5))
      .filter((q, i) => answers[i] === q.correct).length;
    const total = Math.min(activeExam.questions, 5);
    const percent = Math.round((score / total) * 100);

    return (
      <div className="p-6 font-cairo max-w-md mx-auto text-center" style={{ color: "var(--theme-text-primary)" }}>
        <div className="themed-card p-8">
          <div className="text-5xl mb-4">{percent >= 80 ? "🎉" : percent >= 50 ? "👍" : "😔"}</div>
          <h2 className="text-2xl font-extrabold mb-2">النتيجة</h2>
          <div className="text-4xl font-extrabold mb-2" style={{ color: "var(--theme-primary)" }}>
            {score}/{total}
          </div>
          <div className="text-lg font-bold mb-6" style={{ color: percent >= 80 ? "#10B981" : percent >= 50 ? "#F59E0B" : "#EF4444" }}>
            {percent}%
          </div>
          <button onClick={() => setActiveExam(null)}
            className="themed-btn-primary px-8 py-3 flex items-center justify-center gap-2 mx-auto">
            <ChevronLeft size={18} /> العودة للامتحانات
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 font-cairo" style={{ color: "var(--theme-text-primary)" }}>
      <h1 className="text-2xl font-extrabold mb-6">✅ الامتحانات</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="themed-card p-4 text-center">
          <div className="text-2xl font-extrabold" style={{ color: "var(--theme-primary)" }}>
            {exams.filter((e) => e.completed).length}
          </div>
          <div className="text-xs" style={{ color: "var(--theme-text-secondary)" }}>مكتمل</div>
        </div>
        <div className="themed-card p-4 text-center">
          <div className="text-2xl font-extrabold" style={{ color: "#F59E0B" }}>
            {exams.filter((e) => !e.completed).length}
          </div>
          <div className="text-xs" style={{ color: "var(--theme-text-secondary)" }}>متبقي</div>
        </div>
        <div className="themed-card p-4 text-center">
          <div className="text-2xl font-extrabold" style={{ color: "#10B981" }}>
            {Math.round(exams.filter((e) => e.completed && e.score).reduce((a, e) => a + ((e.score || 0) / e.questions) * 100, 0) / (exams.filter((e) => e.completed).length || 1))}%
          </div>
          <div className="text-xs" style={{ color: "var(--theme-text-secondary)" }}>المعدل</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {[
          { key: "all", label: "الكل" },
          { key: "pending", label: "متاح" },
          { key: "completed", label: "مكتمل" },
        ].map((f) => (
          <button key={f.key}
            onClick={() => setFilter(f.key as typeof filter)}
            className="px-4 py-2 rounded-lg text-sm font-bold cursor-pointer transition-all"
            style={{
              background: filter === f.key ? "var(--theme-cta-gradient)" : "var(--theme-surface-bg)",
              color: filter === f.key ? "#fff" : "var(--theme-text-secondary)",
              border: `1px solid ${filter === f.key ? "transparent" : "var(--theme-surface-border)"}`,
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Exams Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredExams.map((exam) => (
          <div key={exam.id} className="themed-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">{exam.subjectIcon}</span>
              <span className="text-sm font-bold" style={{ color: "var(--theme-text-secondary)" }}>
                {exam.subject}
              </span>
            </div>
            <h3 className="text-lg font-bold mb-3" style={{ color: "var(--theme-text-primary)" }}>
              {exam.title}
            </h3>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-xs px-2 py-1 rounded-lg" style={{ background: "var(--theme-hover-overlay)", color: "var(--theme-text-secondary)" }}>
                <ClipboardCheck size={12} className="inline ml-1" />
                {exam.questions} سؤال
              </span>
              <span className="text-xs px-2 py-1 rounded-lg" style={{ background: "var(--theme-hover-overlay)", color: "var(--theme-text-secondary)" }}>
                <Clock size={12} className="inline ml-1" />
                {exam.duration} دقيقة
              </span>
              <span className="text-xs px-2 py-1 rounded-lg font-bold"
                style={{ background: `${difficultyColors[exam.difficulty]}15`, color: difficultyColors[exam.difficulty] }}>
                {exam.difficulty}
              </span>
            </div>
            {exam.completed ? (
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold" style={{ color: "#10B981" }}>
                  <CheckCircle size={16} className="inline ml-1" />
                  مكتمل
                </span>
                <span className="text-lg font-extrabold" style={{ color: "var(--theme-primary)" }}>
                  {exam.score}/{exam.questions}
                </span>
              </div>
            ) : (
              <button onClick={() => startExam(exam)}
                className="themed-btn-primary w-full py-2 flex items-center justify-center gap-2">
                <ClipboardCheck size={16} /> ابدأ الامتحان
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}