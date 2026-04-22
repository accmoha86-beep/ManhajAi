"use client";

import { useState } from "react";
import {
  BookOpen, ChevronLeft, ChevronRight, FileText,
  ClipboardCheck, CheckCircle, Lock,
} from "lucide-react";
import SubjectChat from "@/components/chat/SubjectChat";

interface Lesson {
  id: string;
  title: string;
  locked: boolean;
  completed: boolean;
  summary?: string;
  quiz?: { question: string; options: string[]; correct: number }[];
}

interface Subject {
  id: string;
  name: string;
  icon: string;
  color: string;
  lessons: Lesson[];
}

const subjects: Subject[] = [
  {
    id: "math",
    name: "الرياضيات",
    icon: "📐",
    color: "#3B82F6",
    lessons: [
      { id: "m1", title: "التفاضل والتكامل", locked: false, completed: true,
        summary: "التفاضل هو دراسة معدل التغير. المشتقة الأولى تعطينا ميل المماس عند نقطة معينة على المنحنى. قواعد التفاضل الأساسية:\n\n• مشتقة الثابت = صفر\n• مشتقة xⁿ = n·xⁿ⁻¹\n• مشتقة sin(x) = cos(x)\n• مشتقة cos(x) = -sin(x)",
        quiz: [
          { question: "ما مشتقة x³؟", options: ["3x²", "x²", "3x", "2x³"], correct: 0 },
          { question: "ما مشتقة الثابت؟", options: ["1", "0", "x", "لا يوجد"], correct: 1 },
        ]
      },
      { id: "m2", title: "الهندسة الفراغية", locked: false, completed: true,
        summary: "الهندسة الفراغية تدرس الأشكال ثلاثية الأبعاد. تشمل المستوى، المستقيم في الفراغ، المسافة بين نقطتين في الفراغ.",
        quiz: [
          { question: "كم بُعد للفراغ؟", options: ["2", "3", "4", "1"], correct: 1 },
        ]
      },
      { id: "m3", title: "الجبر والعلاقات", locked: false, completed: false,
        summary: "المحددات والمصفوفات: طرق حل المعادلات الخطية باستخدام المصفوفات وقاعدة كرامر.",
        quiz: []
      },
      { id: "m4", title: "الاستاتيكا", locked: false, completed: false, summary: "علم الاتزان ودراسة القوى المؤثرة على الأجسام الساكنة.", quiz: [] },
      { id: "m5", title: "الديناميكا", locked: true, completed: false },
      { id: "m6", title: "حساب المثلثات", locked: true, completed: false },
    ],
  },
  {
    id: "physics",
    name: "الفيزياء",
    icon: "⚛️",
    color: "#8B5CF6",
    lessons: [
      { id: "p1", title: "قوانين نيوتن", locked: false, completed: true,
        summary: "قوانين نيوتن الثلاثة:\n1. الجسم الساكن يبقى ساكناً ما لم تؤثر عليه قوة\n2. F = ma\n3. لكل فعل رد فعل مساوٍ ومعاكس",
        quiz: [
          { question: "ما صيغة القانون الثاني لنيوتن؟", options: ["F=mv", "F=ma", "F=mg", "F=mω"], correct: 1 },
        ]
      },
      { id: "p2", title: "الكهربية والمغناطيسية", locked: false, completed: false,
        summary: "قانون كولوم: القوة بين شحنتين تتناسب طردياً مع حاصل ضرب الشحنتين وعكسياً مع مربع المسافة.", quiz: [] },
      { id: "p3", title: "الحرارة", locked: false, completed: false, summary: "دراسة انتقال الحرارة والقوانين الأساسية.", quiz: [] },
      { id: "p4", title: "الضوء", locked: true, completed: false },
    ],
  },
  {
    id: "chemistry",
    name: "الكيمياء",
    icon: "🧪",
    color: "#10B981",
    lessons: [
      { id: "c1", title: "الكيمياء العضوية", locked: false, completed: true,
        summary: "الكيمياء العضوية تدرس مركبات الكربون. الهيدروكربونات: ألكانات (روابط أحادية)، ألكينات (رابطة ثنائية)، ألكاينات (رابطة ثلاثية).",
        quiz: [
          { question: "ما نوع الرابطة في الألكانات؟", options: ["ثنائية", "أحادية", "ثلاثية", "تناسقية"], correct: 1 },
        ]
      },
      { id: "c2", title: "الاتزان الكيميائي", locked: false, completed: false,
        summary: "الاتزان الكيميائي يحدث عندما يتساوى معدل التفاعل الطردي مع العكسي.", quiz: [] },
      { id: "c3", title: "الكيمياء الكهربية", locked: true, completed: false },
    ],
  },
];

export default function SubjectsPage() {
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "lesson">("list");
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const openSubject = (subject: Subject) => {
    setSelectedSubject(subject);
    setSelectedLesson(null);
    setViewMode("list");
  };

  const openLesson = (lesson: Lesson) => {
    if (lesson.locked) return;
    setSelectedLesson(lesson);
    setViewMode("lesson");
    setQuizAnswers({});
    setQuizSubmitted(false);
  };

  const goBack = () => {
    if (viewMode === "lesson") {
      setViewMode("list");
      setSelectedLesson(null);
    } else {
      setSelectedSubject(null);
    }
  };

  // If no subject selected, show subject list
  if (!selectedSubject) {
    return (
      <div className="p-6 font-cairo" style={{ color: "var(--theme-text-primary)" }}>
        <h1 className="text-2xl font-extrabold mb-6">📚 المواد الدراسية</h1>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {subjects.map((subject) => (
            <button
              key={subject.id}
              onClick={() => openSubject(subject)}
              className="themed-card p-6 text-right cursor-pointer hover:shadow-lg transition-shadow"
              style={{ border: "none" }}
            >
              <div className="text-4xl mb-4">{subject.icon}</div>
              <h2 className="text-xl font-extrabold mb-2" style={{ color: "var(--theme-text-primary)" }}>
                {subject.name}
              </h2>
              <div className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>
                {subject.lessons.length} دروس ·{" "}
                {subject.lessons.filter((l) => l.completed).length} مكتمل
              </div>
              {/* Progress bar */}
              <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: "var(--theme-surface-border)" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(subject.lessons.filter((l) => l.completed).length / subject.lessons.length) * 100}%`,
                    background: subject.color,
                  }}
                />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Subject selected — split layout
  return (
    <div className="flex font-cairo" style={{ height: "calc(100vh - 4rem)" }}>
      {/* RIGHT: Content area (62%) */}
      <div className="flex-1 overflow-y-auto" style={{ width: "62%", borderLeft: "1px solid var(--theme-border)" }}>
        <div className="p-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-6">
            <button
              onClick={goBack}
              className="flex items-center gap-1 text-sm font-bold cursor-pointer"
              style={{ color: "var(--theme-primary)", background: "none", border: "none" }}
            >
              <ChevronRight size={16} />
              {viewMode === "lesson" ? selectedSubject.name : "المواد"}
            </button>
            {viewMode === "lesson" && selectedLesson && (
              <>
                <span style={{ color: "var(--theme-text-muted)" }}>/</span>
                <span className="text-sm font-bold" style={{ color: "var(--theme-text-primary)" }}>
                  {selectedLesson.title}
                </span>
              </>
            )}
          </div>

          {/* Lessons List View */}
          {viewMode === "list" && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">{selectedSubject.icon}</span>
                <h1 className="text-xl font-extrabold" style={{ color: "var(--theme-text-primary)" }}>
                  {selectedSubject.name}
                </h1>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedSubject.lessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    onClick={() => openLesson(lesson)}
                    disabled={lesson.locked}
                    className="themed-card p-4 text-right cursor-pointer flex items-center gap-3 hover:shadow-md transition-shadow"
                    style={{
                      opacity: lesson.locked ? 0.5 : 1,
                      cursor: lesson.locked ? "not-allowed" : "pointer",
                      border: "none",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: lesson.completed
                          ? "rgba(16,185,129,0.15)"
                          : lesson.locked
                          ? "var(--theme-surface-border)"
                          : "var(--theme-hover-overlay)",
                      }}
                    >
                      {lesson.locked ? (
                        <Lock size={18} style={{ color: "var(--theme-text-muted)" }} />
                      ) : lesson.completed ? (
                        <CheckCircle size={18} style={{ color: "#10B981" }} />
                      ) : (
                        <BookOpen size={18} style={{ color: "var(--theme-primary)" }} />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-sm" style={{ color: "var(--theme-text-primary)" }}>
                        {lesson.title}
                      </div>
                      <div className="text-xs" style={{ color: "var(--theme-text-muted)" }}>
                        {lesson.locked ? "🔒 مقفل" : lesson.completed ? "✅ مكتمل" : "📖 متاح"}
                      </div>
                    </div>
                    {!lesson.locked && <ChevronLeft size={16} style={{ color: "var(--theme-text-muted)" }} />}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Lesson Detail View */}
          {viewMode === "lesson" && selectedLesson && (
            <>
              <h1 className="text-xl font-extrabold mb-6" style={{ color: "var(--theme-text-primary)" }}>
                {selectedLesson.title}
              </h1>

              {/* Summary */}
              {selectedLesson.summary && (
                <div className="themed-card p-6 mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText size={20} style={{ color: "var(--theme-primary)" }} />
                    <h2 className="text-lg font-bold" style={{ color: "var(--theme-text-primary)" }}>
                      📝 ملخص الدرس
                    </h2>
                  </div>
                  <div
                    className="text-sm leading-relaxed whitespace-pre-line"
                    style={{ color: "var(--theme-text-secondary)" }}
                  >
                    {selectedLesson.summary}
                  </div>
                </div>
              )}

              {/* Quiz */}
              {selectedLesson.quiz && selectedLesson.quiz.length > 0 && (
                <div className="themed-card p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <ClipboardCheck size={20} style={{ color: "var(--theme-primary)" }} />
                    <h2 className="text-lg font-bold" style={{ color: "var(--theme-text-primary)" }}>
                      ✅ اختبر نفسك
                    </h2>
                  </div>
                  <div className="space-y-6">
                    {selectedLesson.quiz.map((q, qi) => (
                      <div key={qi}>
                        <div className="text-sm font-bold mb-3" style={{ color: "var(--theme-text-primary)" }}>
                          {qi + 1}. {q.question}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {q.options.map((opt, oi) => {
                            const selected = quizAnswers[qi] === oi;
                            const isCorrect = q.correct === oi;
                            let bg = "var(--theme-surface-bg)";
                            let borderColor = "var(--theme-surface-border)";
                            if (quizSubmitted && selected && isCorrect) {
                              bg = "rgba(16,185,129,0.15)";
                              borderColor = "#10B981";
                            } else if (quizSubmitted && selected && !isCorrect) {
                              bg = "rgba(220,38,38,0.15)";
                              borderColor = "#DC2626";
                            } else if (quizSubmitted && isCorrect) {
                              bg = "rgba(16,185,129,0.1)";
                              borderColor = "#10B981";
                            } else if (selected) {
                              bg = "var(--theme-hover-overlay)";
                              borderColor = "var(--theme-primary)";
                            }
                            return (
                              <button
                                key={oi}
                                onClick={() => {
                                  if (!quizSubmitted) setQuizAnswers({ ...quizAnswers, [qi]: oi });
                                }}
                                className="p-3 rounded-lg text-sm font-bold text-right cursor-pointer transition-all"
                                style={{ background: bg, border: `2px solid ${borderColor}`, color: "var(--theme-text-primary)" }}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => setQuizSubmitted(true)}
                      disabled={Object.keys(quizAnswers).length < (selectedLesson.quiz?.length || 0)}
                      className="themed-btn-primary px-6 py-2 flex items-center gap-2"
                      style={{ opacity: Object.keys(quizAnswers).length < (selectedLesson.quiz?.length || 0) ? 0.5 : 1 }}
                    >
                      <CheckCircle size={18} />
                      <span>تحقق من إجاباتك</span>
                    </button>
                    {quizSubmitted && (
                      <div className="p-3 rounded-lg text-sm font-bold text-center"
                        style={{
                          background: "rgba(16,185,129,0.1)",
                          color: "#059669",
                          border: "1px solid rgba(16,185,129,0.3)",
                        }}>
                        🎉 نتيجتك:{" "}
                        {selectedLesson.quiz?.filter((q, i) => quizAnswers[i] === q.correct).length}/
                        {selectedLesson.quiz?.length}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* LEFT: AI Chat (38%) */}
      <div style={{ width: "38%" }}>
        <SubjectChat
          subjectId={selectedSubject.id}
          subjectName={selectedSubject.name}
          subjectIcon={selectedSubject.icon}
        />
      </div>
    </div>
  );
}