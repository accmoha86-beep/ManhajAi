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
  Brain,
  CheckCircle,
  MessageSquare,
  ChevronDown,
  Hash,
  FolderOpen,
} from "lucide-react";
import SubjectChat from "@/components/chat/SubjectChat";

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
  title_ar?: string;
  sort_order: number;
  has_summary: boolean;
  question_count: number;
  questions_count?: number;
}

interface Unit {
  id: string;
  name_ar: string;
  sort_order: number;
  lessons: LessonSummary[];
}

interface SubjectDetail {
  id: string;
  name: string;
  name_ar?: string;
  icon: string;
  description: string;
  description_ar?: string;
  lessons?: LessonSummary[];
  units?: Unit[];
  unassigned_lessons?: LessonSummary[];
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

function SubjectIcon({ icon, size = 28 }: { icon: string; size?: number }) {
  const Component = { BookOpen, Brain, Layers, FileText, Hash }[icon];
  if (Component) return <Component size={size} />;
  return <BookOpen size={size} />;
}

/* ------------------------------------------------------------------ */
/*  Helper: normalize lesson fields                                    */
/* ------------------------------------------------------------------ */

function normLesson(l: any): LessonSummary {
  return {
    id: l.id,
    title: l.title || l.title_ar || '',
    sort_order: l.sort_order || 0,
    has_summary: l.has_summary ?? false,
    question_count: l.question_count ?? l.questions_count ?? 0,
  };
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

  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());
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
    setExpandedUnits(new Set());
    try {
      const res = await fetch(`/api/subjects/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("فشل في تحميل تفاصيل المادة");
      const json = await res.json();
      const raw = json.data ?? json;
      const subj = raw.subject ?? raw;

      // Build subject detail with units
      const detail: SubjectDetail = {
        id: subj.id || id,
        name: subj.name || subj.name_ar || '',
        icon: subj.icon || 'BookOpen',
        description: subj.description || subj.description_ar || '',
        units: (raw.units || []).map((u: any) => ({
          ...u,
          lessons: (u.lessons || []).map(normLesson),
        })),
        unassigned_lessons: (raw.unassigned_lessons || []).map(normLesson),
        // fallback: if old API returns flat lessons
        lessons: (raw.lessons || subj.lessons || []).map(normLesson),
      };

      setSelectedSubject(detail);

      // Auto-expand first unit
      if (detail.units && detail.units.length > 0) {
        setExpandedUnits(new Set([detail.units[0].id]));
      }
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

  /* ---------- toggle unit ---------- */
  const toggleUnit = (unitId: string) => {
    setExpandedUnits((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) next.delete(unitId);
      else next.add(unitId);
      return next;
    });
  };

  /* ---------- go back ---------- */
  const goBack = () => {
    setSelectedSubject(null);
    setSelectedLesson(null);
    setActiveLessonId(null);
    setErrorDetail(null);
    setErrorLesson(null);
    setExpandedUnits(new Set());
  };

  /* ---------- filtered subjects ---------- */
  const filtered = subjects.filter(
    (s) => s.name.includes(searchQuery) || s.description.includes(searchQuery)
  );

  /* ---------- has units? ---------- */
  const hasUnits = selectedSubject?.units && selectedSubject.units.length > 0;

  /* ---------- total lessons count ---------- */
  const allFlatLessons = [
    ...(selectedSubject?.lessons || []),
    ...(selectedSubject?.unassigned_lessons || []),
  ];
  const totalLessons = hasUnits
    ? (selectedSubject!.units!.reduce((sum, u) => sum + u.lessons.length, 0) +
       (selectedSubject!.unassigned_lessons?.length || 0))
    : allFlatLessons.length;

  /* ================================================================ */
  /*  Render: Lesson Card (reusable)                                   */
  /* ================================================================ */
  const renderLessonCard = (lesson: LessonSummary, idx: number) => (
    <div
      key={lesson.id}
      className="rounded-xl border overflow-hidden transition-all duration-200"
      style={{
        borderColor: activeLessonId === lesson.id ? "var(--theme-primary)" : "var(--theme-surface-border)",
        background: "var(--theme-surface-bg)",
        boxShadow: activeLessonId === lesson.id ? "0 2px 12px rgba(99,102,241,0.1)" : "none",
      }}
    >
      {/* ─── Lesson Heading (clickable) ─── */}
      <button
        onClick={() => openLesson(lesson.id)}
        className="w-full text-right p-3.5 flex items-center gap-3 transition-all duration-150"
        style={{
          background: activeLessonId === lesson.id
            ? "var(--theme-primary-light, rgba(99,102,241,0.06))"
            : "transparent",
        }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold"
          style={{
            background: activeLessonId === lesson.id ? "var(--theme-cta-gradient)" : "var(--theme-surface-border)",
            color: activeLessonId === lesson.id ? "#fff" : "var(--theme-text-secondary)",
          }}
        >
          {idx + 1}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-bold" style={{ fontSize: "0.95rem", color: "var(--theme-text-primary)" }}>
            {lesson.title}
          </h3>
          <div className="flex items-center gap-3 mt-0.5 text-xs" style={{ color: "var(--theme-text-secondary)" }}>
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
            transform: activeLessonId === lesson.id ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          <ChevronDown size={18} />
        </div>
      </button>

      {/* ─── Expanded Lesson Content ─── */}
      {activeLessonId === lesson.id && (
        <div
          className="border-t px-5 py-5"
          style={{
            borderColor: "var(--theme-surface-border)",
            fontFamily: "'Cairo', 'Segoe UI', Tahoma, sans-serif",
          }}
        >
          {loadingLesson && (
            <div className="flex items-center justify-center py-8 gap-2">
              <Loader2 size={20} className="animate-spin" style={{ color: "var(--theme-primary)" }} />
              <span className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>
                جاري تحميل المحتوى...
              </span>
            </div>
          )}

          {!loadingLesson && errorLesson && (
            <div className="flex flex-col items-center py-6 gap-2">
              <AlertCircle size={24} style={{ color: "#ef4444" }} />
              <p className="text-sm text-red-500">{errorLesson}</p>
            </div>
          )}

          {!loadingLesson && !errorLesson && selectedLesson && (
            <div>
              {/* ── Summary Section ── */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Brain size={16} style={{ color: "var(--theme-primary)" }} />
                  <h4 className="text-sm font-bold" style={{ color: "var(--theme-primary)" }}>
                    الملخّص
                  </h4>
                </div>

                {!selectedLesson.summary ? (
                  <div className="flex flex-col items-center py-6 gap-2">
                    <FileText size={28} className="opacity-30" style={{ color: "var(--theme-text-secondary)" }} />
                    <p className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>
                      لا يوجد ملخّص متاح لهذا الدرس بعد
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* TEXT/MARKDOWN CONTENT — Full Renderer */}
                    {!selectedLesson.summary.key_points?.length &&
                      !selectedLesson.summary.definitions?.length &&
                      selectedLesson.summary.content && (
                        <div className="space-y-2" style={{ fontFamily: "'Cairo', sans-serif" }}>
                          {(() => {
                            const lines = selectedLesson.summary.content.split("\n");
                            const elements: React.ReactNode[] = [];
                            let inCodeBlock = false;
                            let codeLines: string[] = [];
                            let inBlockquote = false;
                            let quoteLines: string[] = [];
                            let tableRows: string[][] = [];
                            let tableHeader: string[] = [];

                            const renderInline = (text: string) => {
                              return text
                                .replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight:800;color:var(--theme-primary)">$1</strong>')
                                .replace(/\*(.+?)\*/g, '<em>$1</em>')
                                .replace(/`([^`]+)`/g, '<code style="background:var(--theme-hover-overlay);padding:1px 6px;border-radius:4px;font-size:0.9em">$1</code>');
                            };

                            const flushQuote = (idx: number) => {
                              if (quoteLines.length > 0) {
                                elements.push(
                                  <div key={`quote-${idx}`} className="rounded-xl p-4 my-3" style={{
                                    background: "var(--theme-hover-overlay)",
                                    borderRight: "4px solid var(--theme-primary)",
                                  }}>
                                    {quoteLines.map((ql, qi) => (
                                      <p key={qi} className="text-[15px] leading-[1.9]" style={{ color: "var(--theme-text-primary)" }}
                                        dangerouslySetInnerHTML={{ __html: renderInline(ql) }}
                                      />
                                    ))}
                                  </div>
                                );
                                quoteLines = [];
                                inBlockquote = false;
                              }
                            };

                            const flushTable = (idx: number) => {
                              if (tableRows.length > 0 || tableHeader.length > 0) {
                                elements.push(
                                  <div key={`table-${idx}`} className="overflow-x-auto my-4 rounded-2xl" style={{
                                    border: "1px solid var(--theme-primary)",
                                    boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
                                  }}>
                                    <table className="w-full text-[15px]" dir="rtl" style={{ borderCollapse: "collapse", fontFamily: "'Cairo', sans-serif" }}>
                                      {tableHeader.length > 0 && (
                                        <thead>
                                          <tr style={{ background: "var(--theme-cta-gradient)" }}>
                                            {tableHeader.map((cell, ci) => (
                                              <th key={ci} className="px-4 py-3 text-white font-bold text-center" style={{
                                                borderBottom: "2px solid var(--theme-primary)",
                                                borderLeft: ci < tableHeader.length - 1 ? "1px solid rgba(255,255,255,0.2)" : "none",
                                                fontSize: "0.95rem",
                                              }}
                                                dangerouslySetInnerHTML={{ __html: renderInline(cell) }}
                                              />
                                            ))}
                                          </tr>
                                        </thead>
                                      )}
                                      <tbody>
                                        {tableRows.map((row, ri) => (
                                          <tr key={ri} style={{
                                            background: ri % 2 === 0 ? "var(--theme-hover-overlay)" : "var(--theme-bg, #fff)",
                                            transition: "background 0.2s",
                                          }}
                                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--theme-primary-light, rgba(99,102,241,0.08))"; }}
                                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ri % 2 === 0 ? "var(--theme-hover-overlay)" : "var(--theme-bg, #fff)"; }}
                                          >
                                            {row.map((cell, ci) => (
                                              <td key={ci} className="px-4 py-2.5 text-center" style={{
                                                borderBottom: "1px solid rgba(0,0,0,0.06)",
                                                borderLeft: ci < row.length - 1 ? "1px solid rgba(0,0,0,0.06)" : "none",
                                                color: "var(--theme-text-primary)",
                                                fontWeight: ci === 0 ? 700 : 400,
                                              }}
                                                dangerouslySetInnerHTML={{ __html: renderInline(cell) }}
                                              />
                                            ))}
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                );
                                tableHeader = [];
                                tableRows = [];
                              }
                            };

                            lines.forEach((line: string, i: number) => {
                              const t = line.trim();

                              // Code block toggle
                              if (t.startsWith("```")) {
                                if (inCodeBlock) {
                                  elements.push(
                                    <pre key={`code-${i}`} className="rounded-xl p-4 my-3 overflow-x-auto text-sm" dir="ltr" style={{
                                      background: "#1e1e2e", color: "#cdd6f4", fontFamily: "monospace", lineHeight: 1.7,
                                    }}>
                                      {codeLines.join("\n")}
                                    </pre>
                                  );
                                  codeLines = [];
                                  inCodeBlock = false;
                                } else {
                                  flushQuote(i);
                                  inCodeBlock = true;
                                }
                                return;
                              }
                              if (inCodeBlock) { codeLines.push(line); return; }

                              // Blockquote
                              if (t.startsWith("> ")) {
                                inBlockquote = true;
                                quoteLines.push(t.slice(2));
                                return;
                              } else if (inBlockquote) {
                                flushQuote(i);
                              }

                              // Empty line
                              if (!t) { elements.push(<div key={i} className="h-2" />); return; }

                              // Horizontal rule
                              if (/^-{3,}$|^\*{3,}$|^_{3,}$/.test(t)) {
                                elements.push(
                                  <div key={i} className="my-4 h-px" style={{ background: "linear-gradient(to left, transparent, var(--theme-primary), transparent)", opacity: 0.3 }} />
                                );
                                return;
                              }

                              // H1
                              if (t.startsWith("# ")) {
                                elements.push(
                                  <div key={i} className="rounded-2xl p-4 mt-6 mb-3" style={{ background: "var(--theme-cta-gradient)" }}>
                                    <h2 className="text-xl font-extrabold text-white">{t.slice(2)}</h2>
                                  </div>
                                );
                                return;
                              }
                              // H2
                              if (t.startsWith("## ")) {
                                elements.push(
                                  <div key={i} className="flex items-center gap-3 mt-6 mb-3 pb-2" style={{ borderBottom: "2px solid var(--theme-primary)" }}>
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--theme-cta-gradient)" }}>
                                      <Brain size={16} className="text-white" />
                                    </div>
                                    <h3 className="text-lg font-extrabold" style={{ color: "var(--theme-primary)" }}>{t.slice(3)}</h3>
                                  </div>
                                );
                                return;
                              }
                              // H3/H4
                              if (t.startsWith("### ") || t.startsWith("#### ")) {
                                elements.push(
                                  <h4 key={i} className="text-base font-bold mt-4 mb-2 flex items-center gap-2" style={{ color: "var(--theme-primary)" }}>
                                    <span className="w-2 h-2 rounded-full" style={{ background: "var(--theme-primary)" }} />
                                    {t.replace(/^#{1,4}\s*/, "")}
                                  </h4>
                                );
                                return;
                              }

                              // Bullet points
                              if (/^[\u2022\-\*\u25CF\u25C6] /.test(t)) {
                                elements.push(
                                  <div key={i} className="flex items-start gap-3 mr-2 text-[16px] leading-[1.85]" style={{ color: "var(--theme-text-primary)" }}>
                                    <CheckCircle size={16} className="mt-1.5 flex-shrink-0" style={{ color: "var(--theme-primary)" }} />
                                    <span dangerouslySetInnerHTML={{ __html: renderInline(t.replace(/^[\u2022\-\*\u25CF\u25C6]\s*/, "")) }} />
                                  </div>
                                );
                                return;
                              }

                              // Numbered list
                              if (/^\d+[.)]\s/.test(t)) {
                                const num = t.match(/^(\d+)/)?.[1] || "1";
                                const text = t.replace(/^\d+[.)]\s*/, "");
                                elements.push(
                                  <div key={i} className="flex items-start gap-3 mr-2 text-[16px] leading-[1.85]" style={{ color: "var(--theme-text-primary)" }}>
                                    <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-1" style={{ background: "var(--theme-primary)", color: "#fff" }}>{num}</span>
                                    <span dangerouslySetInnerHTML={{ __html: renderInline(text) }} />
                                  </div>
                                );
                                return;
                              }

                              // Table row
                              if (t.startsWith("|") && t.endsWith("|")) {
                                const cells = t.split("|").filter(c => c.trim() !== "").map(c => c.trim());
                                // Skip separator rows like |---|---|
                                if (cells.every(c => /^[-:]+$/.test(c))) return;
                                if (tableHeader.length === 0) {
                                  tableHeader = cells;
                                } else {
                                  tableRows.push(cells);
                                }
                                return;
                              }
                              // If we were in a table and this line is not a table row, flush
                              if (tableHeader.length > 0 || tableRows.length > 0) {
                                flushTable(i);
                              }

                              // Normal paragraph
                              elements.push(
                                <p key={i} className="text-[16px] leading-[1.9]" style={{ color: "var(--theme-text-primary)" }}
                                  dangerouslySetInnerHTML={{ __html: renderInline(t) }}
                                />
                              );
                            });

                            // Flush remaining
                            flushQuote(lines.length);
                            flushTable(lines.length);

                            return elements;
                          })()}
                        </div>
                      )}

                    {/* STRUCTURED: Key Points */}
                    {selectedLesson.summary.key_points && selectedLesson.summary.key_points.length > 0 && (
                      <div>
                        <h4 className="text-base font-bold mb-3 flex items-center gap-2" style={{ color: "var(--theme-primary)" }}>
                          <CheckCircle size={17} /> النقاط الرئيسية
                        </h4>
                        <ul className="space-y-1.5">
                          {selectedLesson.summary.key_points.map((point: string, i: number) => (
                            <li key={i} className="flex items-start gap-2.5 text-[16px] leading-[1.85]" style={{ color: "var(--theme-text-primary)" }}>
                              <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "var(--theme-primary)" }} />
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* STRUCTURED: Definitions */}
                    {selectedLesson.summary.definitions && selectedLesson.summary.definitions.length > 0 && (
                      <div>
                        <h4 className="text-base font-bold mb-3 flex items-center gap-2" style={{ color: "var(--theme-primary)" }}>
                          <BookOpen size={17} /> التعريفات
                        </h4>
                        <div className="space-y-2">
                          {selectedLesson.summary.definitions.map((def: { term: string; definition: string }, i: number) => (
                            <div key={i} className="rounded-xl p-4 text-[16px] leading-[1.85]"
                              style={{ background: "var(--theme-primary-light, rgba(99,102,241,0.04))", color: "var(--theme-text-primary)" }}
                            >
                              <strong style={{ color: "var(--theme-primary)" }}>{def.term}:</strong>{" "}
                              {def.definition}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* STRUCTURED: Laws */}
                    {selectedLesson.summary.laws && selectedLesson.summary.laws.length > 0 && (
                      <div>
                        <h4 className="text-base font-bold mb-3" style={{ color: "var(--theme-primary)" }}>القوانين</h4>
                        <div className="space-y-2">
                          {selectedLesson.summary.laws.map((law: { name: string; formula?: string; description: string }, i: number) => (
                            <div key={i} className="rounded-xl p-4 border text-[16px] leading-[1.85]"
                              style={{ borderColor: "var(--theme-surface-border)", color: "var(--theme-text-primary)" }}
                            >
                              <strong>{law.name}</strong>
                              {law.formula && <code className="block mt-1 text-xs p-1 rounded bg-gray-100">{law.formula}</code>}
                              <p className="mt-1 text-xs opacity-80">{law.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── Questions indicator ── */}
              {selectedLesson.question_count > 0 && (
                <div className="rounded-lg p-3 flex items-center gap-2 text-sm"
                  style={{ background: "var(--theme-primary-light, rgba(99,102,241,0.06))", color: "var(--theme-primary)" }}
                >
                  <MessageSquare size={16} />
                  <span className="font-bold">{selectedLesson.question_count} سؤال متاح</span>
                  <span className="text-xs" style={{ color: "var(--theme-text-secondary)" }}>— جرّب الامتحانات</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  /* ================================================================ */
  /*  RENDER — Subject List                                            */
  /* ================================================================ */

  if (!selectedSubject && !loadingDetail) {
    return (
      <div className="min-h-screen p-4 md:p-8" dir="rtl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "var(--theme-cta-gradient)" }}>
            <BookOpen size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-extrabold" style={{ color: "var(--theme-text-primary)" }}>
            المواد الدراسية
          </h1>
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40" style={{ color: "var(--theme-text-secondary)" }} />
          <input
            type="text"
            placeholder="ابحث عن مادة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 rounded-xl border outline-none text-sm transition-colors focus:ring-2"
            style={{ background: "var(--theme-surface-bg)", borderColor: "var(--theme-surface-border)", color: "var(--theme-text-primary)" }}
          />
        </div>

        {/* Loading */}
        {loadingSubjects && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={36} className="animate-spin" style={{ color: "var(--theme-primary)" }} />
            <span className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>جاري تحميل المواد...</span>
          </div>
        )}

        {/* Error */}
        {errorSubjects && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <AlertCircle size={36} style={{ color: "#ef4444" }} />
            <p className="text-sm text-red-500">{errorSubjects}</p>
            <button onClick={fetchSubjects} className="px-5 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--theme-cta-gradient)" }}>
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* Subject cards */}
        {!loadingSubjects && !errorSubjects && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((subject) => (
              <button
                key={subject.id}
                onClick={() => openSubject(subject.id)}
                className="group text-right rounded-2xl p-5 border transition-all duration-200 hover:shadow-lg"
                style={{ background: "var(--theme-surface-bg)", borderColor: "var(--theme-surface-border)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = subject.color || "var(--theme-primary)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--theme-surface-border)"; }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: `${subject.color || "var(--theme-primary)"}18`, color: subject.color || "var(--theme-primary)" }}
                >
                  <SubjectIcon icon={subject.icon} size={26} />
                </div>
                <h3 className="mb-1" style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--theme-text-primary)" }}>
                  {subject.name}
                </h3>
                <p className="text-sm mb-3 line-clamp-2 leading-relaxed" style={{ color: "var(--theme-text-secondary)" }}>
                  {subject.description}
                </p>
                <div className="flex items-center gap-4 text-xs" style={{ color: "var(--theme-text-secondary)" }}>
                  <span className="flex items-center gap-1"><Layers size={14} />{subject.lesson_count} درس</span>
                  <span className="flex items-center gap-1"><MessageSquare size={14} />{subject.question_count} سؤال</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ================================================================ */
  /*  RENDER — Loading / Error Detail                                  */
  /* ================================================================ */

  if (loadingDetail) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3" dir="rtl">
        <Loader2 size={36} className="animate-spin" style={{ color: "var(--theme-primary)" }} />
        <span className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>جاري تحميل المادة...</span>
      </div>
    );
  }

  if (errorDetail) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" dir="rtl">
        <AlertCircle size={40} className="text-red-500" />
        <p className="text-red-500 text-sm">{errorDetail}</p>
        <button onClick={goBack} className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90" style={{ background: "var(--theme-cta-gradient)" }}>
          العودة للمواد
        </button>
      </div>
    );
  }

  if (!selectedSubject) return null;

  /* ================================================================ */
  /*  RENDER — Subject Detail (Split Layout with Units)                */
  /* ================================================================ */

  return (
    <div className="subject-split flex flex-col lg:flex-row gap-0" dir="rtl" style={{ height: "calc(100vh - 4rem)", overflow: "hidden" }}>
      {/* Load Cairo font */}
      <link rel="stylesheet" href={STUDY_FONT_LINK} />

      {/* ============ RIGHT: Content (50%) ============ */}
      <div className="w-full lg:w-[50%] overflow-y-auto p-3 sm:p-4 md:p-6" style={{ height: "100%" }}>
        {/* Back + Header */}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={goBack}
            className="w-9 h-9 rounded-xl flex items-center justify-center border transition-colors hover:opacity-80"
            style={{ background: "var(--theme-surface-bg)", borderColor: "var(--theme-surface-border)", color: "var(--theme-text-primary)" }}
          >
            <ChevronLeft size={18} style={{ transform: "scaleX(-1)" }} />
          </button>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--theme-cta-gradient)" }}>
            <SubjectIcon icon={selectedSubject.icon} size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--theme-text-primary)" }}>
              {selectedSubject.name}
            </h1>
            <p className="text-xs" style={{ color: "var(--theme-text-secondary)" }}>
              {selectedSubject.description}
            </p>
          </div>
        </div>

        {/* Lessons Header */}
        <div className="flex items-center gap-2 mb-4">
          <Layers size={18} style={{ color: "var(--theme-primary)" }} />
          <h2 className="text-base font-bold" style={{ color: "var(--theme-text-primary)" }}>
            {hasUnits ? `الأبواب والدروس (${totalLessons})` : `الدروس (${totalLessons})`}
          </h2>
        </div>

        {totalLessons === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <BookOpen size={32} className="opacity-30" style={{ color: "var(--theme-text-secondary)" }} />
            <p className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>
              لا توجد دروس متاحة حالياً لهذه المادة
            </p>
          </div>
        ) : hasUnits ? (
          /* ═══════ UNITS ACCORDION ═══════ */
          <div className="space-y-3">
            {selectedSubject.units!.map((unit, unitIdx) => (
              <div
                key={unit.id}
                className="rounded-2xl border overflow-hidden"
                style={{
                  borderColor: expandedUnits.has(unit.id) ? "var(--theme-primary)" : "var(--theme-surface-border)",
                  background: "var(--theme-surface-bg)",
                }}
              >
                {/* ─── Unit Header ─── */}
                <button
                  onClick={() => toggleUnit(unit.id)}
                  className="w-full text-right p-4 flex items-center gap-3 transition-all duration-200"
                  style={{
                    background: expandedUnits.has(unit.id)
                      ? "var(--theme-primary-light, rgba(99,102,241,0.08))"
                      : "transparent",
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: expandedUnits.has(unit.id) ? "var(--theme-cta-gradient)" : "var(--theme-surface-border)",
                      color: expandedUnits.has(unit.id) ? "#fff" : "var(--theme-text-secondary)",
                    }}
                  >
                    <FolderOpen size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-extrabold" style={{ fontSize: "1.05rem", color: "var(--theme-text-primary)" }}>
                      الباب {unitIdx + 1}: {unit.name_ar}
                    </h3>
                    <p className="text-xs mt-0.5" style={{ color: "var(--theme-text-secondary)" }}>
                      {unit.lessons.length} درس
                      {unit.lessons.filter(l => l.has_summary).length > 0 &&
                        ` · ${unit.lessons.filter(l => l.has_summary).length} ملخّص`}
                    </p>
                  </div>
                  <div
                    className="flex-shrink-0 transition-transform duration-200"
                    style={{
                      color: "var(--theme-text-secondary)",
                      transform: expandedUnits.has(unit.id) ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  >
                    <ChevronDown size={20} />
                  </div>
                </button>

                {/* ─── Expanded: Lessons inside unit ─── */}
                {expandedUnits.has(unit.id) && (
                  <div className="border-t px-3 py-3 space-y-2" style={{ borderColor: "var(--theme-surface-border)" }}>
                    {unit.lessons.length === 0 ? (
                      <p className="text-sm text-center py-4" style={{ color: "var(--theme-text-secondary)" }}>
                        لا توجد دروس في هذا الباب بعد
                      </p>
                    ) : (
                      unit.lessons.map((lesson, idx) => renderLessonCard(lesson, idx))
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* ─── Unassigned Lessons ─── */}
            {selectedSubject.unassigned_lessons && selectedSubject.unassigned_lessons.length > 0 && (
              <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--theme-surface-border)", background: "var(--theme-surface-bg)" }}>
                <div className="p-4 flex items-center gap-3" style={{ background: "rgba(0,0,0,0.02)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--theme-surface-border)", color: "var(--theme-text-secondary)" }}>
                    <Layers size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold" style={{ fontSize: "1rem", color: "var(--theme-text-primary)" }}>
                      دروس أخرى
                    </h3>
                    <p className="text-xs" style={{ color: "var(--theme-text-secondary)" }}>
                      {selectedSubject.unassigned_lessons.length} درس
                    </p>
                  </div>
                </div>
                <div className="border-t px-3 py-3 space-y-2" style={{ borderColor: "var(--theme-surface-border)" }}>
                  {selectedSubject.unassigned_lessons.map((lesson, idx) => renderLessonCard(lesson, idx))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ═══════ FLAT LESSONS (fallback / no units) ═══════ */
          <div className="space-y-3">
            {allFlatLessons.sort((a, b) => a.sort_order - b.sort_order).map((lesson, idx) => renderLessonCard(lesson, idx))}
          </div>
        )}
      </div>

      {/* ============ LEFT: AI Chat (50%) ============ */}
      <div
        className="w-full lg:w-[50%] lg:border-r chat-container"
        style={{ borderColor: "var(--theme-surface-border)", height: "calc(100vh - 4rem)", minHeight: "400px" }}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ background: "var(--theme-surface-bg)", borderColor: "var(--theme-surface-border)" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--theme-cta-gradient)" }}>
            <Brain size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: "var(--theme-text-primary)" }}>أستاذك الذكي</h3>
            <p className="text-xs" style={{ color: "var(--theme-text-secondary)" }}>اسأل عن {selectedSubject.name}</p>
          </div>
        </div>
        <div style={{ height: "calc(100vh - 4rem - 3.5rem)", overflow: "hidden" }}>
          <SubjectChat subjectId={selectedSubject.id} subjectName={selectedSubject.name} />
        </div>
      </div>
    </div>
  );
}
