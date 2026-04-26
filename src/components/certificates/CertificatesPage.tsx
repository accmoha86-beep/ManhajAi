"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Award, Share2, Download, Star, Loader2,
  Calendar, BookOpen, CheckCircle2, Trophy,
  Copy, ExternalLink, AlertCircle, X,
  MessageCircle,
} from "lucide-react";
import { showToast } from '@/components/shared/Toast';
import { useAuthStore } from "@/store/auth-store";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface Certificate {
  id: string;
  subject_name: string;
  subject_icon: string;
  score_percent: number;
  title_ar?: string;
  description_ar?: string;
  certificate_type?: string;
  issued_at: string;
  share_code?: string;
  created_at?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function formatArabicDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function scoreToStars(score: number): number {
  if (score >= 100) return 5;
  if (score >= 95) return 4;
  return 3;
}

function scorePercent(cert: Certificate): number {
  return Math.round(cert.score_percent || 0);
}

/* ------------------------------------------------------------------ */
/*  Canvas‑based certificate drawing                                   */
/* ------------------------------------------------------------------ */
async function drawCertificate(
  cert: Certificate,
  studentName: string,
): Promise<Blob> {
  const W = 1200;
  const H = 800;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // ── Background ──
  ctx.fillStyle = "#fffdf5";
  ctx.fillRect(0, 0, W, H);

  // ── Gold gradient border ──
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#f59e0b");
  grad.addColorStop(0.5, "#d97706");
  grad.addColorStop(1, "#b45309");
  ctx.strokeStyle = grad;
  ctx.lineWidth = 16;
  ctx.strokeRect(8, 8, W - 16, H - 16);

  // inner decorative border
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 2;
  ctx.strokeRect(28, 28, W - 56, H - 56);

  // ── Corner decorations ──
  const cornerSize = 40;
  ctx.fillStyle = "#f59e0b";
  // top-left
  ctx.fillRect(20, 20, cornerSize, 4);
  ctx.fillRect(20, 20, 4, cornerSize);
  // top-right
  ctx.fillRect(W - 20 - cornerSize, 20, cornerSize, 4);
  ctx.fillRect(W - 24, 20, 4, cornerSize);
  // bottom-left
  ctx.fillRect(20, H - 24, cornerSize, 4);
  ctx.fillRect(20, H - 20 - cornerSize, 4, cornerSize);
  // bottom-right
  ctx.fillRect(W - 20 - cornerSize, H - 24, cornerSize, 4);
  ctx.fillRect(W - 24, H - 20 - cornerSize, 4, cornerSize);

  // ── Trophy emoji at top ──
  ctx.font = "48px serif";
  ctx.textAlign = "center";
  ctx.fillText("🏆", W / 2, 80);

  // ── "شهادة تفوق" header ──
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.fillStyle = "#92400e";
  ctx.font = "bold 52px Cairo, Tajawal, sans-serif";
  ctx.fillText("شهادة تفوق", W / 2, 145);

  // decorative line
  const lineGrad = ctx.createLinearGradient(W / 2 - 200, 0, W / 2 + 200, 0);
  lineGrad.addColorStop(0, "transparent");
  lineGrad.addColorStop(0.3, "#d97706");
  lineGrad.addColorStop(0.7, "#d97706");
  lineGrad.addColorStop(1, "transparent");
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 200, 165);
  ctx.lineTo(W / 2 + 200, 165);
  ctx.stroke();

  // ── "يُشهد بأن" ──
  ctx.fillStyle = "#78716c";
  ctx.font = "28px Cairo, Tajawal, sans-serif";
  ctx.fillText("يُشهد بأن الطالب / الطالبة", W / 2, 220);

  // ── Student name ──
  ctx.fillStyle = "#1c1917";
  ctx.font = "bold 44px Cairo, Tajawal, sans-serif";
  ctx.fillText(studentName || "طالب منهج", W / 2, 280);

  // ── "قد حقق/ت التفوق في مادة" ──
  ctx.fillStyle = "#78716c";
  ctx.font = "28px Cairo, Tajawal, sans-serif";
  ctx.fillText("قد حقّق التفوق في مادة", W / 2, 340);

  // ── Subject name ──
  ctx.fillStyle = "#92400e";
  ctx.font = "bold 40px Cairo, Tajawal, sans-serif";
  ctx.fillText(`${cert.subject_icon} ${cert.subject_name}`, W / 2, 400);

  // ── Score ──
  ctx.fillStyle = "#78716c";
  ctx.font = "26px Cairo, Tajawal, sans-serif";
  ctx.fillText("بنسبة نجاح", W / 2, 460);

  ctx.fillStyle = "#15803d";
  ctx.font = "bold 56px Cairo, Tajawal, sans-serif";
  ctx.fillText(`${scorePercent(cert)}%`, W / 2, 530);

  // ── Stars ──
  const stars = scoreToStars(scorePercent(cert));
  ctx.font = "32px serif";
  const starsStr = "⭐".repeat(stars);
  ctx.fillText(starsStr, W / 2, 575);

  // ── Date ──
  ctx.fillStyle = "#78716c";
  ctx.font = "22px Cairo, Tajawal, sans-serif";
  ctx.fillText(formatArabicDate(cert.issued_at || cert.created_at || ''), W / 2, 640);

  // ── Manhaj AI branding ──
  ctx.fillStyle = "#d97706";
  ctx.font = "bold 26px Cairo, Tajawal, sans-serif";
  ctx.fillText("منصة منهج AI", W / 2, 710);

  ctx.fillStyle = "#a8a29e";
  ctx.font = "16px Cairo, Tajawal, sans-serif";
  ctx.fillText("www.manhaj.ai", W / 2, 740);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
      "image/png",
    );
  });
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export default function CertificatesPage() {
  const { user } = useAuthStore();
  const studentName = user?.fullName || "طالب منهج";

  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  /* ── Fetch certificates ── */
  const fetchCertificates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/certificates", { credentials: "include" });
      if (!res.ok) throw new Error("فشل في تحميل الشهادات");
      const data = await res.json();
      setCertificates(Array.isArray(data) ? data : data.certificates ?? []);
    } catch (err: any) {
      setError(err.message || "حصل خطأ أثناء تحميل الشهادات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  /* ── Download handler ── */
  const handleDownload = async (cert: Certificate) => {
    setDownloading(cert.id);
    try {
      const blob = await drawCertificate(cert, studentName);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `شهادة_${cert.subject_name}_${scorePercent(cert)}%.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      showToast("حصل خطأ أثناء تحميل الشهادة", "error");
    } finally {
      setDownloading(null);
    }
  };

  /* ── Share helpers ── */
  const getShareText = (cert: Certificate) =>
    `🎓 حصلت على شهادة تفوق في ${cert.subject_name} بنسبة ${scorePercent(cert)}% على منصة منهج AI! 🏆`;

  const shareWhatsApp = (cert: Certificate) => {
    const text = encodeURIComponent(getShareText(cert));
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const copyShareText = async (cert: Certificate) => {
    try {
      await navigator.clipboard.writeText(getShareText(cert));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* fallback */
      const ta = document.createElement("textarea");
      ta.value = getShareText(cert);
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  /* ── Render stars ── */
  const renderStars = (score: number) => {
    const count = scoreToStars(score);
    return (
      <div className="flex items-center gap-0.5 justify-center">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-5 h-5 transition-transform duration-200 ${
              i < count
                ? "fill-amber-400 text-amber-400 hover:scale-125"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  /* ================================================================ */
  /*  LOADING STATE                                                    */
  /* ================================================================ */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: "var(--theme-primary)" }} />
        <p className="text-lg" style={{ color: "var(--theme-text-secondary)" }}>
          جاري تحميل الشهادات...
        </p>
      </div>
    );
  }

  /* ================================================================ */
  /*  ERROR STATE                                                      */
  /* ================================================================ */
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-lg text-red-600">{error}</p>
        <button
          onClick={fetchCertificates}
          className="px-6 py-2 rounded-xl text-white font-medium"
          style={{ background: "var(--theme-cta-gradient, #f59e0b)" }}
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  /* ================================================================ */
  /*  EMPTY STATE                                                      */
  /* ================================================================ */
  if (certificates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-6 text-center px-4">
        <div className="w-24 h-24 rounded-full bg-amber-50 flex items-center justify-center">
          <Trophy className="w-12 h-12 text-amber-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--theme-text-primary)" }}>
            لا توجد شهادات بعد
          </h2>
          <p className="text-base max-w-md" style={{ color: "var(--theme-text-secondary)" }}>
            لسه ماحصلتش على شهادات. حقق 90% أو أعلى في أي امتحان عشان تحصل على شهادة تفوق! 💪
          </p>
        </div>
        <a
          href="/exams"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-medium transition-transform hover:scale-105"
          style={{ background: "var(--theme-cta-gradient, linear-gradient(135deg,#f59e0b,#d97706))" }}
        >
          <BookOpen className="w-5 h-5" />
          ابدأ الامتحانات
        </a>
      </div>
    );
  }

  /* ================================================================ */
  /*  CERTIFICATES GRID                                                */
  /* ================================================================ */
  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3" style={{ color: "var(--theme-text-primary)" }}>
            <Trophy className="w-8 h-8 text-amber-500" />
            شهاداتي
          </h1>
          <p className="mt-1" style={{ color: "var(--theme-text-secondary)" }}>
            شهادات التفوق — حققت 90% أو أعلى
          </p>
        </div>
        <span
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-amber-800 bg-amber-100 border border-amber-200"
        >
          <Award className="w-4 h-4" />
          {certificates.length} شهادة
        </span>
      </div>

      {/* ── Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {certificates.map((cert) => {
          const pct = scorePercent(cert);
          return (
            <div
              key={cert.id}
              onClick={() => setSelectedCert(cert)}
              className="group relative rounded-2xl p-[3px] cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
              style={{
                background: "linear-gradient(135deg, #f59e0b, #d97706, #b45309, #f59e0b)",
              }}
            >
              <div
                className="rounded-[14px] p-6 h-full flex flex-col gap-4"
                style={{ background: "var(--theme-surface-bg, #fffdf5)" }}
              >
                {/* Top row */}
                <div className="flex items-center justify-between">
                  <span className="text-xs px-3 py-1 rounded-full bg-amber-100 text-amber-800 font-bold">
                    شهادة تفوق
                  </span>
                  <span className="text-2xl">{cert.subject_icon || "📘"}</span>
                </div>

                {/* Subject */}
                <h3
                  className="text-xl font-bold"
                  style={{ color: "var(--theme-text-primary)" }}
                >
                  {cert.subject_name}
                </h3>

                {/* Score */}
                <div className="flex items-center justify-center py-3">
                  <div
                    className="relative w-24 h-24 rounded-full flex items-center justify-center border-4 border-amber-300"
                    style={{
                      background: "linear-gradient(135deg, #fef3c7, #fde68a)",
                    }}
                  >
                    <span className="text-3xl font-extrabold text-amber-800">
                      {pct}%
                    </span>
                  </div>
                </div>

                {/* Stars */}
                {renderStars(pct)}

                {/* Details */}
                <div className="flex items-center justify-between text-sm" style={{ color: "var(--theme-text-secondary)" }}>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    {pct}% نسبة النجاح
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatArabicDate(cert.issued_at || cert.created_at || '')}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-auto pt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(cert);
                    }}
                    disabled={downloading === cert.id}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors bg-amber-100 text-amber-800 hover:bg-amber-200 disabled:opacity-50"
                  >
                    {downloading === cert.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    تحميل
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      shareWhatsApp(cert);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors bg-green-100 text-green-800 hover:bg-green-200"
                  >
                    <Share2 className="w-4 h-4" />
                    مشاركة
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ================================================================ */}
      {/*  DETAIL MODAL                                                     */}
      {/* ================================================================ */}
      {selectedCert && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setSelectedCert(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95"
            style={{ background: "var(--theme-surface-bg, #ffffff)" }}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedCert(null)}
              className="absolute top-4 left-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/10 hover:bg-black/20 transition-colors"
            >
              <X className="w-5 h-5" style={{ color: "var(--theme-text-primary)" }} />
            </button>

            {/* Certificate preview */}
            <div
              className="p-8 text-center space-y-4"
              style={{
                background: "linear-gradient(180deg, #fffbeb 0%, var(--theme-surface-bg, #ffffff) 100%)",
              }}
            >
              {/* Gold decorative top */}
              <div className="flex justify-center">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg"
                  style={{
                    background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  }}
                >
                  <Trophy className="w-10 h-10 text-white" />
                </div>
              </div>

              <h2 className="text-2xl font-bold text-amber-800">شهادة تفوق</h2>

              <div
                className="w-16 mx-auto border-t-2"
                style={{ borderColor: "#d97706" }}
              />

              <p className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>
                يُشهد بأن الطالب / الطالبة
              </p>
              <p
                className="text-2xl font-bold"
                style={{ color: "var(--theme-text-primary)" }}
              >
                {studentName}
              </p>

              <p className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>
                قد حقّق التفوق في مادة
              </p>
              <p className="text-xl font-bold text-amber-800">
                {selectedCert.subject_icon} {selectedCert.subject_name}
              </p>

              {/* Big score */}
              <div className="py-3">
                <div
                  className="inline-flex items-center justify-center w-28 h-28 rounded-full border-4 border-amber-300"
                  style={{
                    background: "linear-gradient(135deg, #fef3c7, #fde68a)",
                  }}
                >
                  <span className="text-4xl font-extrabold text-amber-800">
                    {scorePercent(selectedCert)}%
                  </span>
                </div>
              </div>

              {renderStars(scorePercent(selectedCert))}

              <div className="flex items-center justify-center gap-2 text-sm" style={{ color: "var(--theme-text-secondary)" }}>
                <Calendar className="w-4 h-4" />
                {formatArabicDate(selectedCert.issued_at || selectedCert.created_at || '')}
              </div>

              <p className="text-xs text-amber-600 font-medium pt-2">
                منصة منهج AI
              </p>
            </div>

            {/* Action buttons */}
            <div
              className="p-4 flex flex-col gap-3 border-t"
              style={{ borderColor: "var(--theme-surface-border, #e5e7eb)" }}
            >
              {/* Download */}
              <button
                onClick={() => handleDownload(selectedCert)}
                disabled={downloading === selectedCert.id}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-white font-medium transition-transform hover:scale-[1.02] disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                }}
              >
                {downloading === selectedCert.id ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
                تحميل الشهادة
              </button>

              {/* Share row */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => shareWhatsApp(selectedCert)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-colors bg-green-100 text-green-800 hover:bg-green-200"
                >
                  <MessageCircle className="w-5 h-5" />
                  واتساب
                </button>
                <button
                  onClick={() => copyShareText(selectedCert)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-colors hover:opacity-80"
                  style={{ color: "var(--theme-text-primary)", background: "var(--theme-hover-overlay)" }}
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      تم النسخ!
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      نسخ النص
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
