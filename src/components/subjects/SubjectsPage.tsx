"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useUIStore } from "@/store/ui-store";
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
  Home,
  ArrowRight,
  GraduationCap,
} from "lucide-react";
import SubjectChat from "@/components/chat/SubjectChat";

const STUDY_FONT_LINK = "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Subject {
  id: string;
  name: string;
  name_en?: string;
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
  name_en?: string;
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
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function SubjectIcon({ icon, size = 28 }: { icon: string; size?: number }) {
  const Component = { BookOpen, Brain, Layers, FileText, Hash }[icon];
  if (Component) return <Component size={size} />;
  return <BookOpen size={size} />;
}

function normLesson(l: any): LessonSummary {
  return {
    id: l.id,
    title: l.title_ar || l.title || "بدون عنوان",
    sort_order: l.sort_order ?? 0,
    has_summary: l.has_summary ?? false,
    question_count: l.question_count ?? l.questions_count ?? 0,
  };
}

const UNIT_COLORS = [
  { bg: "linear-gradient(135deg, #6366F1, #8B5CF6)", light: "rgba(99,102,241,0.08)", accent: "#6366F1" },
  { bg: "linear-gradient(135deg, #3B82F6, #06B6D4)", light: "rgba(59,130,246,0.08)", accent: "#3B82F6" },
  { bg: "linear-gradient(135deg, #10B981, #34D399)", light: "rgba(16,185,129,0.08)", accent: "#10B981" },
  { bg: "linear-gradient(135deg, #F59E0B, #FBBF24)", light: "rgba(245,158,11,0.08)", accent: "#F59E0B" },
  { bg: "linear-gradient(135deg, #EF4444, #F87171)", light: "rgba(239,68,68,0.08)", accent: "#EF4444" },
  { bg: "linear-gradient(135deg, #EC4899, #F472B6)", light: "rgba(236,72,153,0.08)", accent: "#EC4899" },
  { bg: "linear-gradient(135deg, #8B5CF6, #A78BFA)", light: "rgba(139,92,246,0.08)", accent: "#8B5CF6" },
  { bg: "linear-gradient(135deg, #14B8A6, #5EEAD4)", light: "rgba(20,184,166,0.08)", accent: "#14B8A6" },
];

const UNIT_ICONS = ["📘", "📗", "📙", "📕", "📓", "📔", "📒", "📚"];

/* ================================================================== */
/*  Main Component                                                     */
/* ================================================================== */

export default function SubjectsPage() {
  // ─── Subject list ───
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [errorSubjects, setErrorSubjects] = useState<string | null>(null);

  // ─── Subject detail ───
  const [selectedSubject, setSelectedSubject] = useState<SubjectDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  // ─── Navigation ───
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [selectedUnitIndex, setSelectedUnitIndex] = useState(0);

  // ─── Lesson detail ───
  const [selectedLesson, setSelectedLesson] = useState<LessonContent | null>(null);
  const [loadingLesson, setLoadingLesson] = useState(false);
  const [errorLesson, setErrorLesson] = useState<string | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState(0);

  const setForceHideSidebar = useUIStore((s) => s.setForceHideSidebar);

  // ─── Sections of the currently selected lesson (for sidebar sub-items) ───
  const currentLessonSections = useMemo(() => {
    if (!selectedLesson?.summary?.content) return [];
    const lines = selectedLesson.summary.content.split("\n");
    const sections: { title: string; icon: string }[] = [];
    const getSIcon = (t: string) => {
      if (/مقدم|تعريف|تعرف/.test(t)) return "📖";
      if (/مهم|أساس|رئيس|محور/.test(t)) return "⭐";
      if (/مثال|تطبيق|تمرين/.test(t)) return "💡";
      if (/سؤال|تدريب|اختبار|متوقع/.test(t)) return "📝";
      if (/ملخص|خلاصة|مراجع|خريطة/.test(t)) return "🗺️";
      if (/قانون|معادل|صيغ/.test(t)) return "📐";
      if (/تجرب|عمل/.test(t)) return "🧪";
      if (/تحذير|ملاحظ|انتبه|نقاط/.test(t)) return "⚠️";
      if (/تفاعل|كيميا/.test(t)) return "⚗️";
      if (/رقم|عدد|إحصا/.test(t)) return "🔢";
      return "📌";
    };
    let hasContent = false;
    let currentLines: string[] = [];
    lines.forEach((line: string) => {
      const t = line.trim();
      if (t.startsWith("## ")) {
        if (currentLines.some(l => l.trim()) || sections.length > 0) {
          if (sections.length === 0 && hasContent) sections.push({ title: "المقدمة", icon: "📖" });
        }
        const title = t.slice(3).trim();
        sections.push({ title, icon: getSIcon(title) });
        currentLines = [];
      } else {
        if (t) hasContent = true;
        currentLines.push(line);
      }
    });
    return sections;
  }, [selectedLesson]);

  // ─── Hide sidebar when inside a subject, show when on list ───
  useEffect(() => {
    setForceHideSidebar(!!selectedSubject);
  }, [selectedSubject, setForceHideSidebar]);

  // ─── Restore sidebar on unmount ───
  useEffect(() => {
    return () => { setForceHideSidebar(false); };
  }, [setForceHideSidebar]);

  // ─── Fetch subjects ───
  const fetchSubjects = useCallback(async () => {
    setLoadingSubjects(true);
    setErrorSubjects(null);
    try {
      const res = await fetch("/api/subjects", { credentials: "include" });
      if (!res.ok) throw new Error("فشل تحميل المواد");
      const data = await res.json();
      setSubjects(data.data || data.subjects || data || []);
    } catch (err: any) {
      setErrorSubjects(err.message || "حدث خطأ");
    } finally {
      setLoadingSubjects(false);
    }
  }, []);

  useEffect(() => { fetchSubjects(); }, [fetchSubjects]);

  // ─── Open subject ───
  const openSubject = useCallback(async (id: string) => {
    setLoadingDetail(true);
    setErrorDetail(null);
    setSelectedLesson(null);
    setActiveLessonId(null);
    setSelectedUnit(null);
    setActiveSection(0);
    try {
      const res = await fetch(`/api/subjects/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("فشل تحميل المادة");
      const json = await res.json();
      const raw = json.data ?? json;
      const subj = raw.subject ?? raw;

      const detail: SubjectDetail = {
        id: subj.id,
        name: subj.name_ar || subj.name || "",
        name_en: subj.name_en || "",
        icon: subj.icon || "BookOpen",
        description: subj.description_ar || subj.description || "",
        units: (raw.units || []).map((u: any) => ({
          ...u,
          lessons: (u.lessons || []).map(normLesson),
        })),
        unassigned_lessons: (raw.ungroupedLessons || raw.unassigned_lessons || []).map(normLesson),
      };

      setSelectedSubject(detail);

      // Auto-expand all units in sidebar
      if (detail.units && detail.units.length > 0) {
        setExpandedUnits(new Set(detail.units.map((u: Unit) => u.id)));
      }
    } catch (err: any) {
      setErrorDetail(err.message || "حدث خطأ");
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  // ─── Toggle unit expand/collapse ───
  const toggleUnit = (unitId: string) => {
    setExpandedUnits(prev => {
      const next = new Set(prev);
      if (next.has(unitId)) next.delete(unitId); else next.add(unitId);
      return next;
    });
  };

  // ─── Open lesson ───
  const openLesson = useCallback(
    async (lessonId: string) => {
      if (!selectedSubject) return;
      setLoadingLesson(true);
      setErrorLesson(null);
      setActiveLessonId(lessonId);
      setActiveSection(0);
      try {
        const res = await fetch(
          `/api/subjects/${selectedSubject.id}/lessons/${lessonId}`,
          { credentials: "include" }
        );
        const data = await res.json();
        const raw = data.data ?? data.lesson ?? data;
        const lessonObj = raw.lesson ?? raw;
        setSelectedLesson({
          id: lessonObj.id,
          title: lessonObj.title_ar || lessonObj.title || "",
          summary: raw.summary || lessonObj.summary || null,
          question_count: lessonObj.question_count ?? lessonObj.questions_count ?? 0,
        });
        // Find parent unit
        if (selectedSubject?.units) {
          const pidx = selectedSubject.units.findIndex(u => u.lessons.some(l => l.id === lessonId));
          if (pidx >= 0) { setSelectedUnit(selectedSubject.units[pidx]); setSelectedUnitIndex(pidx); }
          else { setSelectedUnit(null); }
        }
      } catch (err: any) {
        setErrorLesson(err.message || "فشل تحميل الدرس");
      } finally {
        setLoadingLesson(false);
      }
    },
    [selectedSubject]
  );

  // ─── Navigation ───
  const goBack = () => {
    if (selectedLesson) {
      setSelectedLesson(null);
      setActiveLessonId(null);
      setActiveSection(0);
      setErrorLesson(null);
    } else {
      setSelectedSubject(null);
      setSelectedUnit(null);
      setSelectedLesson(null);
      setExpandedUnits(new Set());
    }
  };

  const goHome = () => {
    setSelectedSubject(null);
    setSelectedUnit(null);
    setSelectedLesson(null);
    setActiveLessonId(null);
    setExpandedUnits(new Set());
    setActiveSection(0);
  };

  const filtered = subjects.filter(
    (s) => s.name.includes(searchQuery) || s.description?.includes(searchQuery)
  );

  const hasUnits = selectedSubject?.units && selectedSubject.units.length > 0;
  const allFlatLessons = [
    ...(selectedSubject?.units?.flatMap((u) => u.lessons) || []),
    ...(selectedSubject?.unassigned_lessons || []),
  ];
  const totalLessons = allFlatLessons.length;



  /* ================================================================ */
  /*  Markdown Helpers                                                 */
  /* ================================================================ */

  const getSectionIcon = (title: string): string => {
    if (/مثال|أمثلة|تطبيق/.test(title)) return "💡";
    if (/تعريف/.test(title)) return "📝";
    if (/قانون|قوانين|معادل/.test(title)) return "⚖️";
    if (/خواص|خصائص|صفات/.test(title)) return "🔬";
    if (/تفاعل/.test(title)) return "⚗️";
    if (/ملاحظ|ملحوظ|تنبيه|مهم|انتبه/.test(title)) return "⚠️";
    if (/ملخص|خلاصة|مراجعة/.test(title)) return "📋";
    if (/تصنيف|أنواع|تقسيم|أقسام/.test(title)) return "📊";
    if (/استخدام|تطبيقات/.test(title)) return "🔧";
    if (/تجرب|عمل/.test(title)) return "🧪";
    return "📌";
  };

  const parseSummaryIntoSections = (rawContent: string) => {
    const lines = rawContent.split("\n");
    const sections: { title: string; icon: string; lines: string[] }[] = [];
    let current: { title: string; icon: string; lines: string[] } = { title: "المقدمة", icon: "📖", lines: [] };

    lines.forEach((line: string) => {
      const t = line.trim();
      if (t.startsWith("## ")) {
        if (current.lines.some((l: string) => l.trim()) || sections.length > 0) {
          sections.push(current);
        }
        const title = t.slice(3).trim();
        current = { title, icon: getSectionIcon(title), lines: [] };
      } else {
        current.lines.push(line);
      }
    });
    if (current.lines.some((l: string) => l.trim())) sections.push(current);
    return sections.filter((s: { lines: string[] }) => s.lines.some((l: string) => l.trim()));
  };

  const renderMarkdownLines = (lines: string[]): React.ReactNode[] => {
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
            {quoteLines.map((ql: string, qi: number) => (
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
                    {tableHeader.map((cell: string, ci: number) => (
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
                {tableRows.map((row: string[], ri: number) => (
                  <tr key={ri} style={{
                    background: ri % 2 === 0 ? "var(--theme-hover-overlay)" : "var(--theme-bg, #fff)",
                    transition: "background 0.2s",
                  }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--theme-primary-light, rgba(99,102,241,0.08))"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ri % 2 === 0 ? "var(--theme-hover-overlay)" : "var(--theme-bg, #fff)"; }}
                  >
                    {row.map((cell: string, ci: number) => (
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

      if (t.startsWith("> ")) {
        inBlockquote = true;
        quoteLines.push(t.slice(2));
        return;
      } else if (inBlockquote) {
        flushQuote(i);
      }

      if (!t) { elements.push(<div key={i} className="h-2" />); return; }

      if (/^-{3,}$|^\*{3,}$|^_{3,}$/.test(t)) {
        elements.push(
          <div key={i} className="my-4 h-px" style={{ background: "linear-gradient(to left, transparent, var(--theme-primary), transparent)", opacity: 0.3 }} />
        );
        return;
      }

      if (t.startsWith("# ") && !t.startsWith("## ")) {
        elements.push(
          <div key={i} className="rounded-2xl p-4 mt-6 mb-3" style={{ background: "var(--theme-cta-gradient)" }}>
            <h2 className="text-xl font-extrabold text-white">{t.slice(2)}</h2>
          </div>
        );
        return;
      }
      if (t.startsWith("### ") || t.startsWith("#### ")) {
        elements.push(
          <h4 key={i} className="text-base font-bold mt-4 mb-2 flex items-center gap-2" style={{ color: "var(--theme-primary)" }}>
            <span className="w-2 h-2 rounded-full" style={{ background: "var(--theme-primary)" }} />
            {t.replace(/^#{1,4}\s*/, "")}
          </h4>
        );
        return;
      }

      if (/^[\u2022\-\*\u25CF\u25C6] /.test(t)) {
        elements.push(
          <div key={i} className="flex items-start gap-3 mr-2 text-[16px] leading-[1.85]" style={{ color: "var(--theme-text-primary)" }}>
            <CheckCircle size={16} className="mt-1.5 flex-shrink-0" style={{ color: "var(--theme-primary)" }} />
            <span dangerouslySetInnerHTML={{ __html: renderInline(t.replace(/^[\u2022\-\*\u25CF\u25C6]\s*/, "")) }} />
          </div>
        );
        return;
      }

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

      if (t.startsWith("|") && t.endsWith("|")) {
        const cells = t.split("|").filter((c: string) => c.trim() !== "").map((c: string) => c.trim());
        if (cells.every((c: string) => /^[-:]+$/.test(c))) return;
        if (tableHeader.length === 0) {
          tableHeader = cells;
        } else {
          tableRows.push(cells);
        }
        return;
      }
      if (tableHeader.length > 0 || tableRows.length > 0) {
        flushTable(i);
      }

      elements.push(
        <p key={i} className="text-[16px] leading-[1.9]" style={{ color: "var(--theme-text-primary)" }}
          dangerouslySetInnerHTML={{ __html: renderInline(t) }}
        />
      );
    });

    flushQuote(lines.length);
    flushTable(lines.length);
    return elements;
  };


  /* ================================================================ */
  /*  Breadcrumb Component                                             */
  /* ================================================================ */

  const Breadcrumb = ({ items }: { items: { label: string; onClick?: () => void }[] }) => (
    <div className="flex items-center gap-2 text-sm mb-4 flex-wrap" style={{ color: "var(--theme-text-secondary)" }}>
      <button onClick={goHome} className="flex items-center gap-1 hover:opacity-70 transition-opacity">
        <Home size={14} />
        <span>الرئيسية</span>
      </button>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <ChevronLeft size={14} style={{ transform: "scaleX(-1)" }} />
          {item.onClick ? (
            <button onClick={item.onClick} className="hover:opacity-70 transition-opacity font-semibold" style={{ color: "var(--theme-primary)" }}>
              {item.label}
            </button>
          ) : (
            <span className="font-bold" style={{ color: "var(--theme-text-primary)" }}>{item.label}</span>
          )}
        </div>
      ))}
    </div>
  );

  /* ================================================================ */
  /*  RENDER — Lesson Detail Content                                   */
  /* ================================================================ */

  const renderLessonDetail = () => {
    if (loadingLesson) {
      return (
        <div className="flex items-center justify-center py-16 gap-2">
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--theme-primary)" }} />
          <span className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>جاري تحميل المحتوى...</span>
        </div>
      );
    }

    if (errorLesson) {
      return (
        <div className="flex flex-col items-center py-12 gap-3">
          <AlertCircle size={28} style={{ color: "#ef4444" }} />
          <p className="text-sm text-red-500">{errorLesson}</p>
          <button onClick={goBack} className="px-5 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--theme-cta-gradient)" }}>
            العودة
          </button>
        </div>
      );
    }

    if (!selectedLesson) return null;

    return (
      <div style={{ fontFamily: "'Cairo', 'Segoe UI', Tahoma, sans-serif" }}>
        {/* Lesson Title Banner */}
        <div className="rounded-2xl p-5 mb-5" style={{ background: "var(--theme-cta-gradient)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/20">
              <FileText size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white">{selectedLesson.title}</h2>
              <div className="flex items-center gap-3 mt-1 text-white/80 text-xs">
                {selectedLesson.summary && <span className="flex items-center gap-1"><CheckCircle size={12} /> ملخّص متاح</span>}
                {selectedLesson.question_count > 0 && <span className="flex items-center gap-1"><MessageSquare size={12} /> {selectedLesson.question_count} سؤال</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Summary Content */}
        {!selectedLesson.summary ? (
          <div className="flex flex-col items-center py-12 gap-3">
            <FileText size={36} className="opacity-30" style={{ color: "var(--theme-text-secondary)" }} />
            <p className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>لا يوجد ملخّص متاح لهذا الدرس بعد</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* TEXT/MARKDOWN with Section Tabs */}
            {!selectedLesson.summary.key_points?.length &&
              !selectedLesson.summary.definitions?.length &&
              selectedLesson.summary.content && (() => {
                const sections = parseSummaryIntoSections(selectedLesson.summary!.content!);

                if (sections.length <= 1) {
                  return (
                    <div className="space-y-2" style={{ fontFamily: "'Cairo', sans-serif" }}>
                      {renderMarkdownLines(selectedLesson.summary!.content!.split("\n"))}
                    </div>
                  );
                }

                const safeIdx = Math.min(activeSection, sections.length - 1);
                const currentSection = sections[safeIdx];

                return (
                  <div style={{ fontFamily: "'Cairo', sans-serif" }}>
                    {/* Section Tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-3 mb-5" style={{
                      borderBottom: "2px solid var(--theme-surface-border)",
                      scrollbarWidth: "none",
                      msOverflowStyle: "none" as any,
                    }}>
                      {sections.map((section: { title: string; icon: string; lines: string[] }, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => setActiveSection(idx)}
                          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-200"
                          style={{
                            background: safeIdx === idx ? "var(--theme-cta-gradient)" : "var(--theme-hover-overlay)",
                            color: safeIdx === idx ? "#fff" : "var(--theme-text-secondary)",
                            boxShadow: safeIdx === idx ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
                            transform: safeIdx === idx ? "scale(1.05)" : "scale(1)",
                            border: safeIdx === idx ? "none" : "1px solid var(--theme-surface-border)",
                          }}
                        >
                          <span>{section.icon}</span>
                          <span>{section.title}</span>
                        </button>
                      ))}
                    </div>

                    {/* Section Header */}
                    <div className="flex items-center gap-3 mb-4 pb-2" style={{ borderBottom: "2px solid var(--theme-primary)" }}>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg" style={{ background: "var(--theme-cta-gradient)" }}>
                        <span className="text-white">{currentSection.icon}</span>
                      </div>
                      <h3 className="text-lg font-extrabold" style={{ color: "var(--theme-primary)" }}>
                        {currentSection.title}
                      </h3>
                      <span className="mr-auto text-xs px-2.5 py-1 rounded-full font-bold" style={{
                        background: "var(--theme-hover-overlay)",
                        color: "var(--theme-text-secondary)",
                      }}>
                        {safeIdx + 1} / {sections.length}
                      </span>
                    </div>

                    {/* Section Content */}
                    <div className="space-y-2 min-h-[200px]">
                      {renderMarkdownLines(currentSection.lines)}
                    </div>

                    {/* Section Navigation */}
                    <div className="flex items-center justify-between mt-6 pt-4 gap-3" style={{ borderTop: "2px solid var(--theme-surface-border)" }}>
                      <button
                        disabled={safeIdx <= 0}
                        onClick={() => setActiveSection((p: number) => Math.max(0, p - 1))}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
                        style={{
                          background: safeIdx <= 0 ? "var(--theme-hover-overlay)" : "var(--theme-cta-gradient)",
                          color: safeIdx <= 0 ? "var(--theme-text-secondary)" : "#fff",
                          opacity: safeIdx <= 0 ? 0.5 : 1,
                          cursor: safeIdx <= 0 ? "not-allowed" : "pointer",
                        }}
                      >
                        <span style={{ transform: "scaleX(-1)" }}>←</span>
                        <span>القسم السابق</span>
                      </button>

                      <div className="flex gap-1.5">
                        {sections.map((_: any, idx: number) => (
                          <button
                            key={idx}
                            onClick={() => setActiveSection(idx)}
                            className="w-2.5 h-2.5 rounded-full transition-all duration-200"
                            style={{
                              background: safeIdx === idx ? "var(--theme-primary)" : "var(--theme-surface-border)",
                              transform: safeIdx === idx ? "scale(1.3)" : "scale(1)",
                            }}
                          />
                        ))}
                      </div>

                      <button
                        disabled={safeIdx >= sections.length - 1}
                        onClick={() => setActiveSection((p: number) => Math.min(sections.length - 1, p + 1))}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
                        style={{
                          background: safeIdx >= sections.length - 1 ? "var(--theme-hover-overlay)" : "var(--theme-cta-gradient)",
                          color: safeIdx >= sections.length - 1 ? "var(--theme-text-secondary)" : "#fff",
                          opacity: safeIdx >= sections.length - 1 ? 0.5 : 1,
                          cursor: safeIdx >= sections.length - 1 ? "not-allowed" : "pointer",
                        }}
                      >
                        <span>القسم التالي</span>
                        <span>←</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

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

        {/* Questions indicator */}
        {selectedLesson.question_count > 0 && (
          <div className="rounded-lg p-3 flex items-center gap-2 text-sm mt-5"
            style={{ background: "var(--theme-primary-light, rgba(99,102,241,0.06))", color: "var(--theme-primary)" }}
          >
            <MessageSquare size={16} />
            <span className="font-bold">{selectedLesson.question_count} سؤال متاح</span>
            <span className="text-xs" style={{ color: "var(--theme-text-secondary)" }}>— جرّب الامتحانات</span>
          </div>
        )}
      </div>
    );
  };


  /* ================================================================ */
  /*  RENDER — Subject List                                            */
  /* ================================================================ */

  if (!selectedSubject && !loadingDetail) {
    return (
      <div className="min-h-screen p-4 md:p-8" dir="rtl">
        <link rel="stylesheet" href={STUDY_FONT_LINK} />
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

        {loadingSubjects && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={36} className="animate-spin" style={{ color: "var(--theme-primary)" }} />
            <span className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>جاري تحميل المواد...</span>
          </div>
        )}

        {errorSubjects && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <AlertCircle size={36} style={{ color: "#ef4444" }} />
            <p className="text-sm text-red-500">{errorSubjects}</p>
            <button onClick={fetchSubjects} className="px-5 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--theme-cta-gradient)" }}>
              إعادة المحاولة
            </button>
          </div>
        )}

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
  /*  RENDER — Loading / Error                                         */
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
        <button onClick={goHome} className="px-5 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--theme-cta-gradient)" }}>
          العودة للمواد
        </button>
      </div>
    );
  }

  if (!selectedSubject) return null;

  // LTR detection for foreign language subjects
  const isLTR = ['English', 'French', 'German', 'Italian', 'Spanish'].some(
    lang => selectedSubject.name_en?.toLowerCase().includes(lang.toLowerCase())
  );
  const displayName = isLTR && selectedSubject.name_en ? selectedSubject.name_en : selectedSubject.name;

  /* ================================================================ */
  /*  RENDER — Subject Detail (Sidebar + Content + Chat)               */
  /* ================================================================ */

  return (
    <div className={`subject-split flex flex-col lg:flex-row gap-0`} dir={isLTR ? "ltr" : "rtl"} style={{ height: "calc(100vh - 4rem)", overflow: "hidden" }}>
      <link rel="stylesheet" href={STUDY_FONT_LINK} />

      {/* ============ RIGHT: Curriculum Sidebar (280px) ============ */}
      <aside
        className="hidden lg:flex flex-col w-[280px] flex-shrink-0 overflow-hidden"
        dir="rtl"
        style={{ background: "var(--theme-surface-bg)", borderColor: "var(--theme-surface-border)", height: "100%", borderLeft: isLTR ? "none" : "1px solid var(--theme-surface-border)", borderRight: isLTR ? "1px solid var(--theme-surface-border)" : "none" }}
      >
        {/* Subject Header */}
        <div className="p-4 border-b flex-shrink-0" style={{ borderColor: "var(--theme-surface-border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--theme-cta-gradient)" }}>
              <SubjectIcon icon={selectedSubject.icon} size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="font-extrabold text-sm truncate" style={{ color: "var(--theme-text-primary)" }}>
                {displayName}
              </h2>
              <p className="text-xs truncate" style={{ color: "var(--theme-text-secondary)" }}>
                {totalLessons} درس
              </p>
            </div>
          </div>
          <button
            onClick={goHome}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold border transition-all hover:shadow-sm"
            style={{ borderColor: "var(--theme-surface-border)", color: "var(--theme-text-secondary)" }}
          >
            <ArrowRight size={14} />
            <span>العودة للمواد</span>
          </button>
        </div>

        {/* Units + Lessons Tree */}
        <div className="flex-1 overflow-y-auto p-2" style={{ scrollbarWidth: "thin" }}>
          {hasUnits ? (
            <div className="space-y-1">
              {selectedSubject.units!.map((unit, idx) => {
                const color = UNIT_COLORS[idx % UNIT_COLORS.length];
                const isExpanded = expandedUnits.has(unit.id);
                return (
                  <div key={unit.id}>
                    <button
                      onClick={() => toggleUnit(unit.id)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-right transition-all hover:shadow-sm"
                      style={{
                        background: isExpanded ? color.light : "transparent",
                        border: isExpanded ? `1px solid ${color.accent}22` : "1px solid transparent",
                      }}
                    >
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ background: color.bg, color: "#fff" }}>
                        {idx + 1}
                      </div>
                      <span className="flex-1 text-xs font-bold truncate" style={{ color: "var(--theme-text-primary)" }}>
                        {unit.name_ar}
                      </span>
                      <ChevronDown size={14} className="flex-shrink-0 transition-transform duration-200" style={{ color: "var(--theme-text-secondary)", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }} />
                    </button>
                    {isExpanded && (
                      <div className="mr-4 mt-1 mb-2 space-y-0.5 border-r-2 pr-2" style={{ borderColor: color.accent + "33" }}>
                        {unit.lessons.sort((a, b) => a.sort_order - b.sort_order).map((lesson) => {
                          const isActive = activeLessonId === lesson.id;
                          return (
                            <div key={lesson.id}>
                              <button
                                onClick={() => openLesson(lesson.id)}
                                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-right transition-all"
                                style={{
                                  background: isActive ? color.accent + "15" : "transparent",
                                  borderRight: isActive ? `3px solid ${color.accent}` : "3px solid transparent",
                                }}
                              >
                                <span className="flex-1 text-xs truncate" style={{ color: isActive ? color.accent : "var(--theme-text-primary)", fontWeight: isActive ? 700 : 400 }}>
                                  {lesson.title}
                                </span>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {lesson.has_summary && <CheckCircle size={11} style={{ color: color.accent }} />}
                                  {lesson.question_count > 0 && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--theme-hover-overlay)", color: "var(--theme-text-secondary)" }}>
                                      {lesson.question_count}
                                    </span>
                                  )}
                                </div>
                              </button>
                              {/* Section sub-items under active lesson */}
                              {isActive && currentLessonSections.length > 0 && (
                                <div className="mr-5 mt-0.5 mb-1 space-y-0.5 border-r pr-2" style={{ borderColor: color.accent + "25" }}>
                                  {currentLessonSections.map((sec, si) => (
                                    <button
                                      key={si}
                                      onClick={() => setActiveSection(si)}
                                      className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-right transition-all"
                                      style={{
                                        background: activeSection === si ? color.accent + "18" : "transparent",
                                        borderRight: activeSection === si ? `2px solid ${color.accent}` : "2px solid transparent",
                                      }}
                                    >
                                      <span className="text-[11px] flex-shrink-0">{sec.icon}</span>
                                      <span className="flex-1 text-[10px] truncate" style={{ color: activeSection === si ? color.accent : "var(--theme-text-secondary)", fontWeight: activeSection === si ? 600 : 400 }}>
                                        {sec.title}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              {selectedSubject.unassigned_lessons && selectedSubject.unassigned_lessons.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-bold" style={{ color: "var(--theme-text-secondary)" }}>دروس أخرى</div>
                  <div className="mr-4 space-y-0.5">
                    {selectedSubject.unassigned_lessons.sort((a, b) => a.sort_order - b.sort_order).map((lesson) => {
                      const isActive = activeLessonId === lesson.id;
                      return (
                        <div key={lesson.id}>
                          <button onClick={() => openLesson(lesson.id)} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-right transition-all" style={{ background: isActive ? "var(--theme-hover-overlay)" : "transparent", borderRight: isActive ? "3px solid var(--theme-primary)" : "3px solid transparent" }}>
                            <span className="flex-1 text-xs truncate" style={{ color: isActive ? "var(--theme-primary)" : "var(--theme-text-primary)", fontWeight: isActive ? 700 : 400 }}>{lesson.title}</span>
                            {lesson.has_summary && <CheckCircle size={11} style={{ color: "var(--theme-primary)" }} />}
                          </button>
                          {isActive && currentLessonSections.length > 0 && (
                            <div className="mr-5 mt-0.5 mb-1 space-y-0.5 border-r pr-2" style={{ borderColor: "var(--theme-primary)" + "25" }}>
                              {currentLessonSections.map((sec, si) => (
                                <button key={si} onClick={() => setActiveSection(si)} className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-right transition-all" style={{ background: activeSection === si ? "var(--theme-primary)" + "18" : "transparent", borderRight: activeSection === si ? "2px solid var(--theme-primary)" : "2px solid transparent" }}>
                                  <span className="text-[11px] flex-shrink-0">{sec.icon}</span>
                                  <span className="flex-1 text-[10px] truncate" style={{ color: activeSection === si ? "var(--theme-primary)" : "var(--theme-text-secondary)", fontWeight: activeSection === si ? 600 : 400 }}>{sec.title}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-0.5">
              {allFlatLessons.sort((a, b) => a.sort_order - b.sort_order).map((lesson) => {
                const isActive = activeLessonId === lesson.id;
                return (
                  <div key={lesson.id}>
                    <button onClick={() => openLesson(lesson.id)} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-right transition-all" style={{ background: isActive ? "var(--theme-primary)" + "12" : "transparent", borderRight: isActive ? "3px solid var(--theme-primary)" : "3px solid transparent" }}>
                      <span className="flex-1 text-xs font-medium truncate" style={{ color: isActive ? "var(--theme-primary)" : "var(--theme-text-primary)", fontWeight: isActive ? 700 : 400 }}>{lesson.title}</span>
                      {lesson.has_summary && <CheckCircle size={11} style={{ color: "var(--theme-primary)" }} />}
                    </button>
                    {isActive && currentLessonSections.length > 0 && (
                      <div className="mr-5 mt-0.5 mb-1 space-y-0.5 border-r pr-2" style={{ borderColor: "var(--theme-primary)" + "25" }}>
                        {currentLessonSections.map((sec, si) => (
                          <button key={si} onClick={() => setActiveSection(si)} className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-right transition-all" style={{ background: activeSection === si ? "var(--theme-primary)" + "18" : "transparent", borderRight: activeSection === si ? "2px solid var(--theme-primary)" : "2px solid transparent" }}>
                            <span className="text-[11px] flex-shrink-0">{sec.icon}</span>
                            <span className="flex-1 text-[10px] truncate" style={{ color: activeSection === si ? "var(--theme-primary)" : "var(--theme-text-secondary)", fontWeight: activeSection === si ? 600 : 400 }}>{sec.title}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* ============ CENTER: Content Area ============ */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6" style={{ height: "100%" }}>
        {/* Mobile: back button */}
        <div className="lg:hidden flex items-center gap-2 mb-4">
          <button onClick={selectedLesson ? () => { setSelectedLesson(null); setActiveLessonId(null); setActiveSection(0); } : goHome} className="w-9 h-9 rounded-xl flex items-center justify-center border" style={{ background: "var(--theme-surface-bg)", borderColor: "var(--theme-surface-border)", color: "var(--theme-text-primary)" }}>
            <ArrowRight size={18} />
          </button>
          <h2 className="text-sm font-bold truncate" style={{ color: "var(--theme-text-primary)" }}>
            {selectedLesson ? selectedLesson.title : selectedSubject.name}
          </h2>
        </div>

        {/* Desktop breadcrumb */}
        <div className="hidden lg:block">
          <Breadcrumb items={[
            { label: selectedSubject.name, onClick: selectedLesson ? () => { setSelectedLesson(null); setActiveLessonId(null); setActiveSection(0); } : undefined },
            ...(selectedLesson && selectedUnit ? [{ label: selectedUnit.name_ar }] : []),
            ...(selectedLesson ? [{ label: selectedLesson.title }] : []),
          ]} />
        </div>

        {selectedLesson ? (
          renderLessonDetail()
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6" style={{ background: "var(--theme-cta-gradient)" }}>
              <GraduationCap size={36} className="text-white" />
            </div>
            <h2 className="text-xl font-extrabold mb-3" style={{ color: "var(--theme-text-primary)" }}>
              {selectedSubject.name}
            </h2>
            <p className="text-sm mb-6 max-w-md leading-relaxed" style={{ color: "var(--theme-text-secondary)" }}>
              {selectedSubject.description || "اختر درس من القائمة على اليمين لبدء المذاكرة"}
            </p>
            <div className="flex items-center gap-4 text-xs" style={{ color: "var(--theme-text-secondary)" }}>
              <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl" style={{ background: "var(--theme-hover-overlay)" }}>
                <Layers size={14} /> {totalLessons} درس
              </span>
              <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl" style={{ background: "var(--theme-hover-overlay)" }}>
                <CheckCircle size={14} /> {allFlatLessons.filter(l => l.has_summary).length} ملخّص
              </span>
            </div>
            <p className="text-xs mt-8 animate-pulse" style={{ color: "var(--theme-primary)" }}>
              👈 اختر درس من القائمة لبدء المذاكرة
            </p>

            {/* Mobile: lessons accordion */}
            <div className="lg:hidden w-full mt-8 space-y-2 text-right">
              {hasUnits ? (
                selectedSubject.units!.map((unit, idx) => {
                  const color = UNIT_COLORS[idx % UNIT_COLORS.length];
                  const isExpanded = expandedUnits.has(unit.id);
                  return (
                    <div key={unit.id} className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--theme-surface-border)" }}>
                      <button onClick={() => toggleUnit(unit.id)} className="w-full flex items-center gap-3 px-4 py-3 text-right" style={{ background: color.light }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold" style={{ background: color.bg, color: "#fff" }}>{idx + 1}</div>
                        <span className="flex-1 text-sm font-bold" style={{ color: "var(--theme-text-primary)" }}>{unit.name_ar}</span>
                        <ChevronDown size={16} style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0)", transition: "0.2s", color: "var(--theme-text-secondary)" }} />
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-3 space-y-1">
                          {unit.lessons.sort((a, b) => a.sort_order - b.sort_order).map((lesson) => {
                            const isActive = activeLessonId === lesson.id;
                            return (
                              <div key={lesson.id}>
                                <button onClick={() => openLesson(lesson.id)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-right" style={{ background: isActive ? color.accent + "15" : "var(--theme-surface-bg)" }}>
                                  <span className="flex-1 text-xs" style={{ color: isActive ? color.accent : "var(--theme-text-primary)", fontWeight: isActive ? 700 : 400 }}>{lesson.title}</span>
                                  {lesson.has_summary && <CheckCircle size={11} style={{ color: color.accent }} />}
                                </button>
                                {isActive && currentLessonSections.length > 0 && (
                                  <div className="mr-6 mt-0.5 mb-1 space-y-0.5 border-r pr-2" style={{ borderColor: color.accent + "25" }}>
                                    {currentLessonSections.map((sec, si) => (
                                      <button key={si} onClick={() => setActiveSection(si)} className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-right" style={{ background: activeSection === si ? color.accent + "18" : "transparent" }}>
                                        <span className="text-[11px]">{sec.icon}</span>
                                        <span className="text-[10px] truncate" style={{ color: activeSection === si ? color.accent : "var(--theme-text-secondary)", fontWeight: activeSection === si ? 600 : 400 }}>{sec.title}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                allFlatLessons.sort((a, b) => a.sort_order - b.sort_order).map((lesson) => (
                  <button key={lesson.id} onClick={() => openLesson(lesson.id)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-right" style={{ background: "var(--theme-surface-bg)", borderColor: "var(--theme-surface-border)" }}>
                    <span className="flex-1 text-sm" style={{ color: "var(--theme-text-primary)" }}>{lesson.title}</span>
                    {lesson.has_summary && <CheckCircle size={11} style={{ color: "var(--theme-primary)" }} />}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ============ LEFT: AI Chat ============ */}
      <div className="w-full lg:w-[38%] chat-container flex-shrink-0" dir="rtl" style={{ borderColor: "var(--theme-surface-border)", height: "calc(100vh - 4rem)", minHeight: "400px", borderRight: isLTR ? "none" : "1px solid var(--theme-surface-border)", borderLeft: isLTR ? "1px solid var(--theme-surface-border)" : "none" }}>
        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ background: "var(--theme-surface-bg)", borderColor: "var(--theme-surface-border)" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--theme-cta-gradient)" }}>
            <Brain size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: "var(--theme-text-primary)" }}>أستاذك الذكي</h3>
            <p className="text-xs" style={{ color: "var(--theme-text-secondary)" }}>اسأل عن {displayName}</p>
          </div>
        </div>
        <div style={{ height: "calc(100vh - 4rem - 3.5rem)", overflow: "hidden" }}>
          <SubjectChat subjectId={selectedSubject.id} subjectName={selectedSubject.name} />
        </div>
      </div>
    </div>
  );
}
