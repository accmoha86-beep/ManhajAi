"use client";

import { useState, useEffect } from "react";
import {
  BookOpen, ChevronLeft, FileText, Loader2, AlertCircle,
  Search, Layers, Bot, PlayCircle,
} from "lucide-react";
import SubjectChat from "@/components/chat/SubjectChat";

interface Subject {
  id: string;
  name: string;
  icon: string;
  description: string;
  lesson_count: number;
}

interface Lesson {
  id: string;
  title: string;
  sort_order: number;
  has_summary: boolean;
  question_count: number;
}

interface SubjectDetail {
  id: string;
  name: string;
  icon: string;
  description: string;
  lessons: Lesson[];
}

interface LessonContent {
  id: string;
  title: string;
  summary: {
    key_points: string[];
    definitions: { term: string; definition: string }[];
    laws?: { name: string; formula?: string; description: string }[];
    examples?: { title: string; content: string }[];
  } | null;
  question_count: number;
}

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<SubjectDetail | null>(null);
  const [loadingSubject, setLoadingSubject] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<LessonContent | null>(null);
  const [loadingLesson, setLoadingLesson] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await fetch("/api/subjects", { credentials: "include" });
        if (res.ok) {
          const json = await res.json();
          setSubjects(json.subjects || []);
        }
      } catch {
        setError("فشل في جلب المواد");
      } finally {
        setLoading(false);
      }
    };
    fetchSubjects();
  }, []);

  const handleSelectSubject = async (subjectId: string) => {
    setLoadingSubject(true);
    setSelectedLesson(null);
    setError("");
    try {
      const res = await fetch(`/api/subjects/${subjectId}`, {
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        setSelectedSubject(json.data);
      } else {
        setError("فشل في جلب تفاصيل المادة");
      }
    } catch {
      setError("فشل في الاتصال");
    } finally {
      setLoadingSubject(false);
    }
  };

  const handleSelectLesson = async (lessonId: string) => {
    if (!selectedSubject) return;
    setLoadingLesson(true);
    setError("");
    try {
      const res = await fetch(
        `/api/subjects/${selectedSubject.id}/lessons/${lessonId}`,
        { credentials: "include" }
      );
      if (res.ok) {
        const json = await res.json();
        setSelectedLesson(json.data);
      } else {
        setError("فشل في جلب محتوى الدرس");
      }
    } catch {
      setError("فشل في الاتصال");
    } finally {
      setLoadingLesson(false);
    }
  };

  const filteredSubjects = subjects.filter((s) =>
    s.name.includes(searchQuery)
  );

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin mx-auto mb-4" style={{ color: "var(--theme-primary)" }} />
          <p className="text-sm font-bold" style={{ color: "var(--theme-text-secondary)" }}>
            جارٍ تحميل المواد...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]" style={{ color: "var(--theme-text-primary)" }}>
      {/* Main Content — 62% */}
      <div className="w-[62%] overflow-y-auto p-6 space-y-6" style={{ borderLeft: "1px solid var(--theme-surface-border)" }}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold" style={{ color: "var(--theme-text-primary)" }}>
              📚 المواد الدراسية
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--theme-text-secondary)" }}>
              اختر مادة ثم درس لبدء المذاكرة
            </p>
          </div>
          {selectedSubject && (
            <button
              onClick={() => {
                setSelectedSubject(null);
                setSelectedLesson(null);
              }}
              className="themed-btn-outline text-sm flex items-center gap-1"
            >
              كل المواد
            </button>
          )}
        </div>

        {/* Search */}
        {!selectedSubject && (
          <div className="relative">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--theme-text-muted)" }} />
            <input
              className="themed-input pr-10 w-full"
              placeholder="ابحث عن مادة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}

        {error && (
          <div
            className="p-3 rounded-lg text-sm font-bold flex items-center gap-2"
            style={{ background: "rgba(220,38,38,0.1)", color: "#DC2626", border: "1px solid rgba(220,38,38,0.3)" }}
          >
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Subject List */}
        {!selectedSubject && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredSubjects.length > 0 ? (
              filteredSubjects.map((subject) => (
                <button
                  key={subject.id}
                  onClick={() => handleSelectSubject(subject.id)}
                  className="themed-card p-5 text-right block w-full hover:shadow-lg transition-shadow cursor-pointer"
                  style={{ border: "none" }}
                >
                  <div className="text-3xl mb-3">{subject.icon || "📖"}</div>
                  <h3 className="text-lg font-extrabold mb-1" style={{ color: "var(--theme-text-primary)" }}>
                    {subject.name}
                  </h3>
                  <p className="text-xs mb-3" style={{ color: "var(--theme-text-secondary)" }}>
                    {subject.description || ""}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1" style={{ color: "var(--theme-text-muted)" }}>
                      <Layers size={14} />
                      {subject.lesson_count || 0} درس
                    </span>
                    <span className="text-xs font-bold flex items-center gap-1" style={{ color: "var(--theme-primary)" }}>
                      عرض الدروس
                      <ChevronLeft size={14} />
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="col-span-2 themed-card p-8 text-center">
                <div className="text-4xl mb-3">📚</div>
                <p className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>
                  لا توجد مواد متاحة حالياً
                </p>
              </div>
            )}
          </div>
        )}

        {/* Loading Subject */}
        {loadingSubject && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={30} className="animate-spin" style={{ color: "var(--theme-primary)" }} />
          </div>
        )}

        {/* Subject Detail: Lesson list */}
        {selectedSubject && !loadingSubject && !selectedLesson && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{selectedSubject.icon || "📖"}</span>
              <div>
                <h2 className="text-xl font-extrabold" style={{ color: "var(--theme-text-primary)" }}>
                  {selectedSubject.name}
                </h2>
                <p className="text-xs" style={{ color: "var(--theme-text-secondary)" }}>
                  {selectedSubject.lessons?.length || 0} درس
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {(selectedSubject.lessons || []).map((lesson, i) => (
                <button
                  key={lesson.id}
                  onClick={() => handleSelectLesson(lesson.id)}
                  className="themed-card p-4 w-full text-right flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer"
                  style={{ border: "none" }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-extrabold"
                    style={{ background: "var(--theme-cta-gradient)", color: "#fff" }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-extrabold" style={{ color: "var(--theme-text-primary)" }}>
                      {lesson.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      {lesson.has_summary && (
                        <span className="text-xs flex items-center gap-1" style={{ color: "var(--theme-text-muted)" }}>
                          <FileText size={12} />
                          ملخص
                        </span>
                      )}
                      {lesson.question_count > 0 && (
                        <span className="text-xs flex items-center gap-1" style={{ color: "var(--theme-text-muted)" }}>
                          <PlayCircle size={12} />
                          {lesson.question_count} سؤال
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronLeft size={18} style={{ color: "var(--theme-text-muted)" }} />
                </button>
              ))}
              {(selectedSubject.lessons || []).length === 0 && (
                <div className="themed-card p-8 text-center">
                  <p className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>
                    لا توجد دروس متاحة حالياً لهذه المادة
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading lesson */}
        {loadingLesson && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={30} className="animate-spin" style={{ color: "var(--theme-primary)" }} />
          </div>
        )}

        {/* Lesson Content */}
        {selectedLesson && !loadingLesson && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedLesson(null)}
                className="themed-btn-outline text-sm"
              >
                ← رجوع للدروس
              </button>
              <h2 className="text-lg font-extrabold" style={{ color: "var(--theme-text-primary)" }}>
                {selectedLesson.title}
              </h2>
            </div>

            {selectedLesson.summary ? (
              <div className="space-y-5">
                {/* Key points */}
                {selectedLesson.summary.key_points?.length > 0 && (
                  <div className="themed-card p-5">
                    <h3 className="text-base font-extrabold mb-3 flex items-center gap-2" style={{ color: "var(--theme-text-primary)" }}>
                      💡 النقاط الرئيسية
                    </h3>
                    <ul className="space-y-2">
                      {selectedLesson.summary.key_points.map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "var(--theme-text-secondary)" }}>
                          <span className="mt-1 w-2 h-2 rounded-full flex-shrink-0" style={{ background: "var(--theme-primary)" }} />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Definitions */}
                {selectedLesson.summary.definitions?.length > 0 && (
                  <div className="themed-card p-5">
                    <h3 className="text-base font-extrabold mb-3 flex items-center gap-2" style={{ color: "var(--theme-text-primary)" }}>
                      📝 التعريفات
                    </h3>
                    <div className="space-y-3">
                      {selectedLesson.summary.definitions.map((d, i) => (
                        <div key={i} className="p-3 rounded-lg" style={{ background: "var(--theme-hover-overlay)" }}>
                          <div className="text-sm font-extrabold mb-1" style={{ color: "var(--theme-primary)" }}>
                            {d.term}
                          </div>
                          <div className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>
                            {d.definition}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Laws */}
                {selectedLesson.summary.laws && selectedLesson.summary.laws.length > 0 && (
                  <div className="themed-card p-5">
                    <h3 className="text-base font-extrabold mb-3 flex items-center gap-2" style={{ color: "var(--theme-text-primary)" }}>
                      ⚖️ القوانين
                    </h3>
                    <div className="space-y-3">
                      {selectedLesson.summary.laws.map((l, i) => (
                        <div key={i} className="p-3 rounded-lg" style={{ background: "var(--theme-hover-overlay)" }}>
                          <div className="text-sm font-extrabold mb-1" style={{ color: "var(--theme-primary)" }}>
                            {l.name}
                          </div>
                          {l.formula && (
                            <div className="text-sm font-mono mb-1 px-2 py-1 rounded" style={{ background: "var(--theme-surface-border)", color: "var(--theme-text-primary)" }}>
                              {l.formula}
                            </div>
                          )}
                          <div className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>
                            {l.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Examples */}
                {selectedLesson.summary.examples && selectedLesson.summary.examples.length > 0 && (
                  <div className="themed-card p-5">
                    <h3 className="text-base font-extrabold mb-3 flex items-center gap-2" style={{ color: "var(--theme-text-primary)" }}>
                      📌 أمثلة
                    </h3>
                    <div className="space-y-3">
                      {selectedLesson.summary.examples.map((ex, i) => (
                        <div key={i} className="p-3 rounded-lg" style={{ background: "var(--theme-hover-overlay)" }}>
                          <div className="text-sm font-extrabold mb-1" style={{ color: "var(--theme-text-primary)" }}>
                            {ex.title}
                          </div>
                          <div className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>
                            {ex.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="themed-card p-8 text-center">
                <div className="text-4xl mb-3">📝</div>
                <p className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>
                  لم يتم إعداد ملخص لهذا الدرس بعد. اسأل المساعد الذكي عن أي شيء!
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chat Panel — 38% */}
      <div className="w-[38%] flex flex-col h-full overflow-hidden">
        <SubjectChat subjectId={selectedSubject?.id || null} subjectName={selectedSubject?.name || null} />
      </div>
    </div>
  );
}
