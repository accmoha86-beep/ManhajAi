"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import {
  Award, Share2, Download, Star, Loader2,
  Calendar, BookOpen, CheckCircle2, Trophy,
} from "lucide-react";

interface Certificate {
  id: string;
  subject_name: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  created_at: string;
  exam_id: string;
}

export default function CertificatesPage() {
  const { user } = useAuthStore();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [shareMsg, setShareMsg] = useState("");

  useEffect(() => {
    const fetchCertificates = async () => {
      try {
        // Fetch exam history and filter for >=90% scores
        const res = await fetch("/api/exams?action=history", {
          credentials: "include",
        });
        if (res.ok) {
          const json = await res.json();
          const history = json.history || [];
          // Filter scores >= 90% for certificates
          const certs = history
            .filter((h: { score: number }) => h.score >= 90)
            .map((h: {
              id: string;
              subject_name: string;
              score: number;
              total_questions: number;
              correct_answers: number;
              created_at: string;
            }) => ({
              id: h.id,
              subject_name: h.subject_name,
              score: h.score,
              total_questions: h.total_questions,
              correct_answers: h.correct_answers,
              created_at: h.created_at,
              exam_id: h.id,
            }));
          setCertificates(certs);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchCertificates();
  }, []);

  const handleShare = (cert: Certificate) => {
    const text = `🏆 حصلت على شهادة تفوق في ${cert.subject_name} بنسبة ${Math.round(cert.score)}% على منصة منهج AI!\n\n#منهج_AI #ثانوية_عامة`;

    if (navigator.share) {
      navigator.share({
        title: "شهادة تفوق — منهج AI",
        text,
      }).catch(() => {
        // fallback
      });
    } else {
      navigator.clipboard.writeText(text).then(() => {
        setShareMsg("تم نسخ النص ✅");
        setTimeout(() => setShareMsg(""), 2000);
      });
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin mx-auto mb-4" style={{ color: "var(--theme-primary)" }} />
          <p className="text-sm font-bold" style={{ color: "var(--theme-text-secondary)" }}>
            جارٍ تحميل الشهادات...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 font-cairo max-w-4xl mx-auto space-y-6" style={{ color: "var(--theme-text-primary)" }}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold" style={{ color: "var(--theme-text-primary)" }}>
          🏆 شهاداتي
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--theme-text-secondary)" }}>
          شهادات التفوق — يتم منحها عند تحقيق 90% أو أكثر في الامتحانات
        </p>
      </div>

      {shareMsg && (
        <div
          className="p-3 rounded-lg text-sm font-bold text-center"
          style={{
            background: "rgba(16,185,129,0.1)",
            color: "#10B981",
            border: "1px solid rgba(16,185,129,0.3)",
          }}
        >
          {shareMsg}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="themed-card p-4 text-center">
          <Award size={24} className="mx-auto mb-2" style={{ color: "#F59E0B" }} />
          <div className="text-2xl font-extrabold" style={{ color: "var(--theme-text-primary)" }}>
            {certificates.length}
          </div>
          <div className="text-xs" style={{ color: "var(--theme-text-secondary)" }}>
            شهادات محققة
          </div>
        </div>
        <div className="themed-card p-4 text-center">
          <Star size={24} className="mx-auto mb-2" style={{ color: "#6366F1" }} />
          <div className="text-2xl font-extrabold" style={{ color: "var(--theme-text-primary)" }}>
            {certificates.length > 0
              ? Math.round(
                  certificates.reduce((s, c) => s + c.score, 0) / certificates.length
                )
              : 0}
            %
          </div>
          <div className="text-xs" style={{ color: "var(--theme-text-secondary)" }}>
            متوسط الدرجات
          </div>
        </div>
        <div className="themed-card p-4 text-center hidden sm:block">
          <Trophy size={24} className="mx-auto mb-2" style={{ color: "#10B981" }} />
          <div className="text-2xl font-extrabold" style={{ color: "var(--theme-text-primary)" }}>
            {certificates.filter((c) => c.score >= 95).length}
          </div>
          <div className="text-xs" style={{ color: "var(--theme-text-secondary)" }}>
            امتياز (+95%)
          </div>
        </div>
      </div>

      {/* Certificate detail modal */}
      {selectedCert && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setSelectedCert(null)}
        >
          <div
            className="themed-card p-8 max-w-md w-full text-center relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Certificate card */}
            <div
              className="rounded-2xl p-8 mb-6"
              style={{
                background: "var(--theme-cta-gradient)",
                boxShadow: "var(--theme-btn-shadow)",
              }}
            >
              <Award size={48} color="#fff" className="mx-auto mb-3" />
              <h2 className="text-xl font-extrabold text-white mb-1">شهادة تفوق</h2>
              <p className="text-white/80 text-sm mb-4">منصة منهج AI — التعليم الذكي</p>
              <div className="bg-white/20 rounded-xl p-4 backdrop-blur-sm">
                <div className="text-white text-sm mb-1">يشهد بتفوق</div>
                <div className="text-white text-xl font-extrabold mb-2">
                  {user?.fullName || "الطالب"}
                </div>
                <div className="text-white/80 text-sm">
                  في مادة {selectedCert.subject_name}
                </div>
                <div className="text-white text-3xl font-extrabold mt-3">
                  {Math.round(selectedCert.score)}%
                </div>
              </div>
              <div className="text-white/60 text-xs mt-4">
                {formatDate(selectedCert.created_at)}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 justify-center">
              <button
                onClick={() => handleShare(selectedCert)}
                className="themed-btn-primary flex items-center gap-2 px-6 py-2"
              >
                <Share2 size={16} />
                مشاركة
              </button>
              <button
                onClick={() => setSelectedCert(null)}
                className="themed-btn-outline px-6 py-2"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Certificates List */}
      {certificates.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {certificates.map((cert) => (
            <button
              key={cert.id}
              onClick={() => setSelectedCert(cert)}
              className="themed-card p-5 text-right block w-full hover:shadow-lg transition-shadow cursor-pointer"
              style={{ border: "none" }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: cert.score >= 95 ? "rgba(245,158,11,0.15)" : "rgba(16,185,129,0.15)",
                  }}
                >
                  {cert.score >= 95 ? (
                    <Trophy size={24} style={{ color: "#F59E0B" }} />
                  ) : (
                    <Award size={24} style={{ color: "#10B981" }} />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-extrabold mb-1" style={{ color: "var(--theme-text-primary)" }}>
                    {cert.subject_name}
                  </h3>
                  <div className="flex items-center gap-3 text-xs" style={{ color: "var(--theme-text-muted)" }}>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      {cert.correct_answers}/{cert.total_questions}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {formatDate(cert.created_at)}
                    </span>
                  </div>
                </div>
                <div
                  className="text-lg font-extrabold px-3 py-1 rounded-lg"
                  style={{
                    background: cert.score >= 95 ? "rgba(245,158,11,0.15)" : "rgba(16,185,129,0.15)",
                    color: cert.score >= 95 ? "#F59E0B" : "#10B981",
                  }}
                >
                  {Math.round(cert.score)}%
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                {cert.score >= 95 && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B" }}
                  >
                    ⭐ امتياز
                  </span>
                )}
                <span
                  className="text-xs flex items-center gap-1 mr-auto"
                  style={{ color: "var(--theme-primary)" }}
                >
                  <Share2 size={12} />
                  عرض ومشاركة
                </span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="themed-card p-12 text-center">
          <div className="text-5xl mb-4">🏆</div>
          <h3 className="text-lg font-extrabold mb-2" style={{ color: "var(--theme-text-primary)" }}>
            لم تحصل على شهادات بعد
          </h3>
          <p className="text-sm mb-6" style={{ color: "var(--theme-text-secondary)" }}>
            احصل على 90% أو أكثر في أي امتحان لتحصل على شهادة تفوق
          </p>
          <a href="/exams" className="themed-btn-primary px-8 py-3 inline-flex items-center gap-2">
            <BookOpen size={18} />
            ابدأ امتحان الآن
          </a>
        </div>
      )}
    </div>
  );
}
