"use client";
import { useState, useEffect, useCallback } from "react";
import {
  BookOpen,
  ChevronLeft,
  FileText,
  Loader2,
  AlertCircle,
  Search,
  Layers,
  PlayCircle,
  Brain,
  CheckCircle,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Hash,
} from "lucide-react";
import SubjectChat from "@/components/chat/SubjectChat";

// Load Cairo font for better Arabic readability
const STUDY_FONT_LINK = "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Subject {
  id: string;
  name: string;
  icon: string;
  description: string;
  lesson_count: number;
  question_count: number;
  color: string;
}

interface LessonSummary {
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
  lessons: LessonSummary[];
}

interface LessonContent {
  id: string;
  title: string;
  summary: {
    id?: string;
    content?: string;
    key_points?: string[];
    definitions?: { term: string; definition: string }[];
    laws?: { name: string; formula?: string; description: string }[];
    examples?: { title: string; content: string }[];
  } | null;
  question_count: number;
}

/* ------------------------------------------------------------------ */
/*  Helper: icon mapping                                               */
/* ------------------------------------------------------------------ */

const ICON_MAP: Record<string, React.ReactNode> = {
  BookOpen: <BookOpen size={28} />,
  Brain: <Brain size={28} />,
  Layers: <Layers size={28} />,
  FileText: <FileText size={28} />,
  Hash: <Hash size={28} />,
};

function SubjectIcon({ icon, size = 28 }: { icon: string; size?: number }) {
  const Component = { BookOpen, Brain, Layers, FileText, Hash }[icon];
  if (Component) return <Component size={size} />;
  return <BookOpen size={size} />;
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function SubjectsPage() {
  /* ---------- state ---------- */
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [errorSubjects, setErrorSubjects] = useState<string | null>(null);

  const [selectedSubject, setSelectedSubject] = useState<SubjectDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const [selectedLesson, setSelectedLesson] = useState<LessonContent | null>(null);
  const [loadingLesson, setLoadingLesson] = useState(false);
  const [errorLesson, setErrorLesson] = useState<string | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");

  /* ---------- fetch subjects ---------- */
  const fetchSubjects = useCallback(async () => {
    setLoadingSubjects(true);
    setErrorSubjects(null);
    try {
      const res = await fetch("/api/subjects", { credentials: "include" });
      if (!res.ok) throw new Error("فشل في تحميل المواد");
      const data = await res.json();
      setSubjects(data.subjects ?? data ?? []);
    } catch (err: any) {
      setErrorSubjects(err.message ?? "حدث خطأ غير متوقع");
    } finally {
      setLoadingSubjects(false);
    }
  }, []);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  /* ---------- fetch subject detail ---------- */
  const openSubject = useCallback(async (id: string) => {
    setLoadingDetail(true);
    setErrorDetail(null);
    setSelectedLesson(null);
    setActiveLessonId(null);
    try {
      const res = await fetch(`/api/subjects/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("فشل في تحميل تفاصيل المادة");
      const data = await res.json();
      setSelectedSubject(data.data ?? data.subject ?? data);
    } catch (err: any) {
      setErrorDetail(err.message ?? "حدث خطأ غير متوقع");
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  /* ---------- fetch lesson content ---------- */
  const openLesson = useCallback(
    async (lessonId: string) => {
      if (!selectedSubject) return;
      if (activeLessonId === lessonId) {
        // toggle off
        setActiveLessonId(null);
        setSelectedLesson(null);
        return;
      }
      setActiveLessonId(lessonId);
      setLoadingLesson(true);
      setErrorLesson(null);
      try {
        const res = await fetch(
          `/api/subjects/${selectedSubject.id}/lessons/${lessonId}`,
          { credentials: "include" }
        );
        if (!res.ok) throw new Error("فشل في تحميل محتوى الدرس");
        const data = await res.json();
        const raw = data.data ?? data.lesson ?? data;
        const lessonObj = raw.lesson ?? raw;
        setSelectedLesson({
          id: lessonObj.id || '',
          title: lessonObj.title || lessonObj.title_ar || '',
          summary: raw.summary || lessonObj.summary || null,
          question_count: (raw.questions || lessonObj.questions || []).length,
        } as LessonContent);
      } catch (err: any) {
        setErrorLesson(err.message ?? "حدث خطأ غير متوقع");
      } finally {
        setLoadingLesson(false);
      }
    },
    [selectedSubject, activeLessonId]
  );

  /* ---------- go back ---------- */
  const goBack = () => {
    setSelectedSubject(null);
    setSelectedLesson(null);
    setActiveLessonId(null);
    setErrorDetail(null);
    setErrorLesson(null);
  };

  /* ---------- filtered subjects ---------- */
  const filtered = subjects.filter(
    (s) =>
      s.name.includes(searchQuery) ||
      s.description.includes(searchQuery)
  );

  /* ================================================================ */
  /*  RENDER — Subject List                                            */
  /* ================================================================ */

  if (!selectedSubject && !loadingDetail) {
    return (
      <div className="min-h-screen p-4 md:p-8" dir="rtl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: "var(--theme-cta-gradient)" }}
          >
            <BookOpen size={22} className="text-white" />
          </div>
          <h1
            className="text-2xl font-extrabold"
            style={{ color: "var(--theme-text-primary)" }}
          >
            المواد الدراسية
          </h1>
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search
            size={18}
            className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40"
            style={{ color: "var(--theme-text-secondary)" }}
          />
          <input
            type="text"
            placeholder="ابحث عن مادة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 rounded-xl border outline-none text-sm transition-colors focus:ring-2"
            style={{
              background: "var(--theme-surface-bg)",
              borderColor: "var(--theme-surface-border)",
              color: "var(--theme-text-primary)",
            }}
          />
        </div>

        {/* Loading */}
        {loadingSubjects && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2
              size={36}
              className="animate-spin"
              style={{ color: "var(--theme-primary)" }}
            />
            <span
              className="text-sm"
              style={{ color: "var(--theme-text-secondary)" }}
            >
              جاري تحميل المواد...
            </span>
          </div>
        )}

        {/* Error */}
        {errorSubjects && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <AlertCircle size={40} className="text-red-500" />
            <p className="text-red-500 text-sm">{errorSubjects}</p>
            <button
              onClick={fetchSubjects}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: "var(--theme-cta-gradient)" }}
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* Empty */}
        {!loadingSubjects && !errorSubjects && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <BookOpen
              size={48}
              className="opacity-30"
              style={{ color: "var(--theme-text-secondary)" }}
            />
            <p
              className="text-sm"
              style={{ color: "var(--theme-text-secondary)" }}
            >
              {searchQuery
                ? "لا توجد نتائج مطابقة للبحث"
                : "لا توجد مواد دراسية متاحة حالياً"}
            </p>
          </div>
        )}

        {/* Subject Grid */}
        {!loadingSubjects && !errorSubjects && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((subject) => (
              <button
                key={subject.id}
                onClick={() => openSubject(subject.id)}
                className="group text-right rounded-2xl p-5 border transition-all duration-200 hover:shadow-lg"
                style={{
                  background: "var(--theme-surface-bg)",
                  borderColor: "var(--theme-surface-border)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor =
                    subject.color || "var(--theme-primary)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "var(--theme-surface-border)";
                }}
              >
                {/* Icon */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                  style={{
                    background: `${subject.color || "var(--theme-primary)"}18`,
                    color: subject.color || "var(--theme-primary)",
                  }}
                >
                  <SubjectIcon icon={subject.icon} size={26} />
                </div>

                {/* Name */}
                <h3
                  className="mb-1"
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 800,
                    color: "var(--theme-text-primary)",
                  }}
                >
                  {subject.name}
                </h3>

                {/* Description */}
                <p
                  className="text-sm mb-3 line-clamp-2 leading-relaxed"
                  style={{ color: "var(--theme-text-secondary)" }}
                >
                  {subject.description}
                </p>

                {/* Meta */}
                <div className="flex items-center gap-4 text-xs" style={{ color: "var(--theme-text-secondary)" }}>
                  <span className="flex items-center gap-1">
                    <Layers size={14} />
                    {subject.lesson_count} درس
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare size={14} />
                    {subject.question_count} سؤال
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ================================================================ */
  /*  RENDER — Loading Detail                                          */
  /* ================================================================ */

  if (loadingDetail) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-3"
        dir="rtl"
      >
        <Loader2
          size={36}
          className="animate-spin"
          style={{ color: "var(--theme-primary)" }}
        />
        <span
          className="text-sm"
          style={{ color: "var(--theme-text-secondary)" }}
        >
          جاري تحميل المادة...
        </span>
      </div>
    );
  }

  /* ================================================================ */
  /*  RENDER — Error Detail                                            */
  /* ================================================================ */

  if (errorDetail) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4"
        dir="rtl"
      >
        <AlertCircle size={40} className="text-red-500" />
        <p className="text-red-500 text-sm">{errorDetail}</p>
        <button
          onClick={goBack}
          className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--theme-cta-gradient)" }}
        >
          العودة للمواد
        </button>
      </div>
    );
  }

  /* ================================================================ */
  /*  RENDER — Subject Detail (Split Layout)                           */
  /* ================================================================ */

  if (!selectedSubject) return null;

  const sortedLessons = [...(selectedSubject.lessons || [])].sort(
    (a, b) => a.sort_order - b.sort_order
  );

  return (
    <div
      className="subject-split flex flex-col lg:flex-row gap-0 lg:gap-0"
      dir="rtl"
      style={{ height: "calc(100vh - 4rem)", overflow: "hidden" }}
    >
      {/* ============ RIGHT: Content (50%) ============ */}
      <div
        className="w-full lg:w-[50%] overflow-y-auto p-3 sm:p-4 md:p-6"
        style={{ height: "100%" }}
      >
        {/* Back + Header */}
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={goBack}
            className="w-9 h-9 rounded-xl flex items-center justify-center border transition-colors hover:opacity-80"
            style={{
              background: "var(--theme-surface-bg)",
              borderColor: "var(--theme-surface-border)",
              color: "var(--theme-text-primary)",
            }}
          >
            <ChevronLeft size={18} style={{ transform: "scaleX(-1)" }} />
          </button>

          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: "var(--theme-cta-gradient)",
            }}
          >
            <SubjectIcon icon={selectedSubject.icon} size={20} />
          </div>

          <div>
            <h1
              style={{
                fontSize: "1.25rem",
                fontWeight: 800,
                color: "var(--theme-text-primary)",
              }}
            >
              {selectedSubject.name}
            </h1>
            <p
              className="text-xs"
              style={{ color: "var(--theme-text-secondary)" }}
            >
              {selectedSubject.description}
            </p>
          </div>
        </div>

        {/* Lessons Header */}
        <div className="flex items-center gap-2 mb-4">
          <Layers size={18} style={{ color: "var(--theme-primary)" }} />
          <h2
            className="text-base font-bold"
            style={{ color: "var(--theme-text-primary)" }}
          >
            الدروس ({sortedLessons.length})
          </h2>
        </div>

        {sortedLessons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <BookOpen
              size={32}
              className="opacity-30"
              style={{ color: "var(--theme-text-secondary)" }}
            />
            <p
              className="text-sm"
              style={{ color: "var(--theme-text-secondary)" }}
            >
              لا توجد دروس متاحة حالياً لهذه المادة
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedLessons.map((lesson, idx) => (
              <div
                key={lesson.id}
                className="rounded-xl border overflow-hidden transition-all duration-200"
                style={{
                  borderColor:
                    activeLessonId === lesson.id
                      ? "var(--theme-primary)"
                      : "var(--theme-surface-border)",
                  background: "var(--theme-surface-bg)",
                  boxShadow:
                    activeLessonId === lesson.id
                      ? "0 2px 12px rgba(99,102,241,0.1)"
                      : "none",
                }}
              >
                {/* ─── Lesson Heading (clickable) ─── */}
                <button
                  onClick={() => openLesson(lesson.id)}
                  className="w-full text-right p-4 flex items-center gap-3 transition-all duration-150"
                  style={{
                    background:
                      activeLessonId === lesson.id
                        ? "var(--theme-primary-light, rgba(99,102,241,0.06))"
                        : "transparent",
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold"
                    style={{
                      background:
                        activeLessonId === lesson.id
                          ? "var(--theme-cta-gradient)"
                          : "var(--theme-surface-border)",
                      color:
                        activeLessonId === lesson.id
                          ? "#fff"
                          : "var(--theme-text-secondary)",
                    }}
                  >
                    {idx + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3
                      className="font-bold"
                      style={{
                        fontSize: "0.95rem",
                        color: "var(--theme-text-primary)",
                      }}
                    >
                      {lesson.title}
                    </h3>
                    <div
                      className="flex items-center gap-3 mt-1 text-xs"
                      style={{ color: "var(--theme-text-secondary)" }}
                    >
                      {lesson.has_summary && (
                        <span className="flex items-center gap-1">
                          <CheckCircle size={12} style={{ color: "var(--theme-primary)" }} />
                          ملخّص
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <MessageSquare size={12} />
                        {lesson.question_count} سؤال
                      </span>
                    </div>
                  </div>

                  <div
                    className="flex-shrink-0 transition-transform duration-200"
                    style={{
                      color: "var(--theme-text-secondary)",
                      transform:
                        activeLessonId === lesson.id
                          ? "rotate(180deg)"
                          : "rotate(0deg)",
                    }}
                  >
                    <ChevronDown size={18} />
                  </div>
                </button>

                {/* ─── Expanded Lesson Content ─── */}
                {activeLessonId === lesson.id && (
                  <div
                    className="border-t px-5 py-5"
                    style={{ fontFamily: "'Cairo', 'Segoe UI', Tahoma, sans-serif" }}
                    style={{ borderColor: "var(--theme-surface-border)" }}
                  >
                    {/* Loading */}
                    {loadingLesson && (
                      <div className="flex items-center justify-center py-8 gap-2">
                        <Loader2
                          size={20}
                          className="animate-spin"
                          style={{ color: "var(--theme-primary)" }}
                        />
                        <span
                          className="text-sm"
                          style={{ color: "var(--theme-text-secondary)" }}
                        >
                          جاري تحميل المحتوى...
                        </span>
                      </div>
                    )}

                    {/* Error */}
                    {!loadingLesson && errorLesson && (
                      <div className="flex flex-col items-center py-6 gap-2">
                        <AlertCircle
                          size={24}
                          style={{ color: "#ef4444" }}
                        />
                        <p className="text-sm text-red-500">{errorLesson}</p>
                      </div>
                    )}

                    {/* Content */}
                    {!loadingLesson && !errorLesson && selectedLesson && (
                      <div>
                        {/* ── Summary Section ── */}
                        <div className="mb-4">
                          <div
                            className="flex items-center gap-2 mb-3"
                          >
                            <Brain
                              size={16}
                              style={{ color: "var(--theme-primary)" }}
                            />
                            <h4
                              className="text-sm font-bold"
                              style={{ color: "var(--theme-primary)" }}
                            >
                              الملخّص
                            </h4>
                          </div>

                          {!selectedLesson.summary ? (
                            <div className="flex flex-col items-center py-6 gap-2">
                              <FileText
                                size={28}
                                className="opacity-30"
                                style={{
                                  color: "var(--theme-text-secondary)",
                                }}
                              />
                              <p
                                className="text-sm"
                                style={{
                                  color: "var(--theme-text-secondary)",
                                }}
                              >
                                لا يوجد ملخّص متاح لهذا الدرس بعد
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {/* TEXT/MARKDOWN CONTENT */}
                              {!selectedLesson.summary.key_points?.length &&
                                !selectedLesson.summary.definitions?.length &&
                                selectedLesson.summary.content && (
                                  <div className="space-y-1.5">
                                    {selectedLesson.summary.content
                                      .split("\n")
                                      .map(
                                        (
                                          line: string,
                                          i: number
                                        ) => {
                                          const t = line.trim();
                                          if (!t)
                                            return (
                                              <div
                                                key={i}
                                                className="h-1.5"
                                              />
                                            );
                                          if (t.startsWith("# "))
                                            return (
                                              <h2
                                                key={i}
                                                className="text-xl font-bold mt-5 mb-3"
                                                style={{
                                                  color:
                                                    "var(--theme-primary)",
                                                }}
                                              >
                                                {t.slice(2)}
                                              </h2>
                                            );
                                          if (t.startsWith("## "))
                                            return (
                                              <h3
                                                key={i}
                                                className="text-lg font-bold mt-4 mb-2 flex items-center gap-2"
                                                style={{
                                                  color:
                                                    "var(--theme-primary)",
                                                }}
                                              >
                                                <Brain size={15} />
                                                {t.slice(3)}
                                              </h3>
                                            );
                                          if (
                                            t.startsWith("### ") ||
                                            t.startsWith("#### ")
                                          )
                                            return (
                                              <h4
                                                key={i}
                                                className="text-base font-bold mt-3 mb-1"
                                                style={{
                                                  color:
                                                    "var(--theme-primary)",
                                                }}
                                              >
                                                {t.replace(
                                                  /^#{1,4}\s*/,
                                                  ""
                                                )}
                                              </h4>
                                            );
                                          if (
                                            /^[\u2022\-\*\u2726\u2727\u25CF\u25C6] /.test(
                                              t
                                            )
                                          )
                                            return (
                                              <div
                                                key={i}
                                                className="flex items-start gap-2.5 text-[16px] leading-[1.85]"
                                                style={{
                                                  color:
                                                    "var(--theme-text-primary)",
                                                }}
                                              >
                                                <CheckCircle
                                                  size={16}
                                                  className="mt-1.5 flex-shrink-0"
                                                  style={{
                                                    color:
                                                      "var(--theme-primary)",
                                                  }}
                                                />
                                                <span
                                                  dangerouslySetInnerHTML={{
                                                    __html: t
                                                      .replace(
                                                        /^[\u2022\-\*\u2726\u2727\u25CF\u25C6]\s*/,
                                                        ""
                                                      )
                                                      .replace(
                                                        /\*\*(.+?)\*\*/g,
                                                        "<strong>$1</strong>"
                                                      ),
                                                  }}
                                                />
                                              </div>
                                            );
                                          return (
                                            <p
                                              key={i}
                                              className="text-[16px] leading-[1.85]"
                                              style={{
                                                color:
                                                  "var(--theme-text-primary)",
                                              }}
                                              dangerouslySetInnerHTML={{
                                                __html: t.replace(
                                                  /\*\*(.+?)\*\*/g,
                                                  "<strong>$1</strong>"
                                                ),
                                              }}
                                            />
                                          );
                                        }
                                      )}
                                  </div>
                                )}

                              {/* STRUCTURED: Key Points */}
                              {selectedLesson.summary.key_points &&
                                selectedLesson.summary.key_points.length >
                                  0 && (
                                  <div>
                                    <h4
                                      className="text-base font-bold mb-3 flex items-center gap-2"
                                      style={{
                                        color: "var(--theme-primary)",
                                      }}
                                    >
                                      <CheckCircle size={17} />
                                      النقاط الرئيسية
                                    </h4>
                                    <ul className="space-y-1.5">
                                      {selectedLesson.summary.key_points.map(
                                        (
                                          point: string,
                                          i: number
                                        ) => (
                                          <li
                                            key={i}
                                            className="flex items-start gap-2.5 text-[16px] leading-[1.85]"
                                            style={{
                                              color:
                                                "var(--theme-text-primary)",
                                            }}
                                          >
                                            <span
                                              className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                                              style={{
                                                background:
                                                  "var(--theme-primary)",
                                              }}
                                            />
                                            {point}
                                          </li>
                                        )
                                      )}
                                    </ul>
                                  </div>
                                )}

                              {/* STRUCTURED: Definitions */}
                              {selectedLesson.summary.definitions &&
                                selectedLesson.summary.definitions.length >
                                  0 && (
                                  <div>
                                    <h4
                                      className="text-base font-bold mb-3 flex items-center gap-2"
                                      style={{
                                        color: "var(--theme-primary)",
                                      }}
                                    >
                                      <BookOpen size={17} />
                                      التعريفات
                                    </h4>
                                    <div className="space-y-2">
                                      {selectedLesson.summary.definitions.map(
                                        (
                                          def: {
                                            term: string;
                                            definition: string;
                                          },
                                          i: number
                                        ) => (
                                          <div
                                            key={i}
                                            className="rounded-xl p-4 text-[16px] leading-[1.85]"
                                            style={{
                                              background:
                                                "var(--theme-primary-light, rgba(99,102,241,0.04))",
                                              color:
                                                "var(--theme-text-primary)",
                                            }}
                                          >
                                            <strong
                                              style={{
                                                color:
                                                  "var(--theme-primary)",
                                              }}
                                            >
                                              {def.term}:
                                            </strong>{" "}
                                            {def.definition}
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}

                              {/* STRUCTURED: Laws */}
                              {selectedLesson.summary.laws &&
                                selectedLesson.summary.laws.length >
                                  0 && (
                                  <div>
                                    <h4
                                      className="text-base font-bold mb-3"
                                      style={{
                                        color: "var(--theme-primary)",
                                      }}
                                    >
                                      القوانين
                                    </h4>
                                    <div className="space-y-2">
                                      {selectedLesson.summary.laws.map(
                                        (
                                          law: {
                                            name: string;
                                            formula?: string;
                                            description: string;
                                          },
                                          i: number
                                        ) => (
                                          <div
                                            key={i}
                                            className="rounded-xl p-4 border text-[16px] leading-[1.85]"
                                            style={{
                                              borderColor:
                                                "var(--theme-surface-border)",
                                              color:
                                                "var(--theme-text-primary)",
                                            }}
                                          >
                                            <strong>{law.name}</strong>
                                            {law.formula && (
                                              <code className="block mt-1 text-xs p-1 rounded bg-gray-100">
                                                {law.formula}
                                              </code>
                                            )}
                                            <p className="mt-1 text-xs opacity-80">
                                              {law.description}
                                            </p>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}
                            </div>
                          )}
                        </div>

                        {/* ── Questions indicator ── */}
                        {selectedLesson.question_count > 0 && (
                          <div
                            className="rounded-lg p-3 flex items-center gap-2 text-sm"
                            style={{
                              background:
                                "var(--theme-primary-light, rgba(99,102,241,0.06))",
                              color: "var(--theme-primary)",
                            }}
                          >
                            <MessageSquare size={16} />
                            <span className="font-bold">
                              {selectedLesson.question_count} سؤال متاح
                            </span>
                            <span
                              className="text-xs"
                              style={{
                                color: "var(--theme-text-secondary)",
                              }}
                            >
                              — جرّب الامتحانات
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============ LEFT: AI Chat (50%) ============ */}
      <div
        className="w-full lg:w-[50%] lg:border-r chat-container"
        style={{
          borderColor: "var(--theme-surface-border)",
          height: "calc(100vh - 4rem)",
          minHeight: "400px",
        }}
      >
        {/* Chat Header */}
        <div
          className="flex items-center gap-2 px-4 py-3 border-b"
          style={{
            background: "var(--theme-surface-bg)",
            borderColor: "var(--theme-surface-border)",
          }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--theme-cta-gradient)" }}
          >
            <Brain size={16} className="text-white" />
          </div>
          <div>
            <h3
              className="text-sm font-bold"
              style={{ color: "var(--theme-text-primary)" }}
            >
              أستاذك الذكي
            </h3>
            <p
              className="text-xs"
              style={{ color: "var(--theme-text-secondary)" }}
            >
              اسأل عن {selectedSubject.name}
            </p>
          </div>
        </div>

        {/* Chat Component */}
        <div
          style={{
            height: "calc(100vh - 4rem - 3.5rem)",
            overflow: "hidden",
          }}
        >
          <SubjectChat
            subjectId={selectedSubject.id}
            subjectName={selectedSubject.name}
          />
        </div>
      </div>
    </div>
  );
}
