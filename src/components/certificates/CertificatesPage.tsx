"use client";

import { Award, Download, Share2, Lock, CheckCircle } from "lucide-react";

interface Certificate {
  id: string;
  title: string;
  subject: string;
  subjectIcon: string;
  date: string;
  grade: string;
  earned: boolean;
}

const certs: Certificate[] = [
  { id: "c1", title: "التفوق في الرياضيات", subject: "الرياضيات", subjectIcon: "📐", date: "2025-03-15", grade: "امتياز", earned: true },
  { id: "c2", title: "إتمام الفيزياء — الباب الأول", subject: "الفيزياء", subjectIcon: "⚛️", date: "2025-03-10", grade: "جيد جداً", earned: true },
  { id: "c3", title: "نجم الأسبوع", subject: "عام", subjectIcon: "⭐", date: "2025-03-08", grade: "تميز", earned: true },
  { id: "c4", title: "إتمام الكيمياء العضوية", subject: "الكيمياء", subjectIcon: "🧪", date: "", grade: "", earned: false },
  { id: "c5", title: "حل 100 سؤال", subject: "عام", subjectIcon: "🎯", date: "", grade: "", earned: false },
];

export default function CertificatesPage() {
  return (
    <div className="p-6 font-cairo" style={{ color: "var(--theme-text-primary)" }}>
      <h1 className="text-2xl font-extrabold mb-6">🏅 الشهادات</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="themed-card p-4 text-center">
          <div className="text-3xl mb-2">🏅</div>
          <div className="text-2xl font-extrabold" style={{ color: "var(--theme-primary)" }}>
            {certs.filter((c) => c.earned).length}
          </div>
          <div className="text-xs" style={{ color: "var(--theme-text-secondary)" }}>شهادات مكتسبة</div>
        </div>
        <div className="themed-card p-4 text-center">
          <div className="text-3xl mb-2">🔒</div>
          <div className="text-2xl font-extrabold" style={{ color: "var(--theme-text-muted)" }}>
            {certs.filter((c) => !c.earned).length}
          </div>
          <div className="text-xs" style={{ color: "var(--theme-text-secondary)" }}>متبقية</div>
        </div>
        <div className="themed-card p-4 text-center">
          <div className="text-3xl mb-2">⭐</div>
          <div className="text-2xl font-extrabold" style={{ color: "#F59E0B" }}>
            {Math.round((certs.filter((c) => c.earned).length / certs.length) * 100)}%
          </div>
          <div className="text-xs" style={{ color: "var(--theme-text-secondary)" }}>نسبة الإنجاز</div>
        </div>
      </div>

      {/* Certificates Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {certs.map((cert) => (
          <div key={cert.id} className="themed-card p-5 relative"
            style={{ opacity: cert.earned ? 1 : 0.6 }}>
            {cert.earned && (
              <div className="absolute top-3 left-3">
                <CheckCircle size={20} style={{ color: "#10B981" }} />
              </div>
            )}
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">{cert.earned ? "🏅" : "🔒"}</div>
              <div className="text-xl">{cert.subjectIcon}</div>
            </div>
            <h3 className="text-lg font-bold text-center mb-2" style={{ color: "var(--theme-text-primary)" }}>
              {cert.title}
            </h3>
            <div className="text-sm text-center mb-1" style={{ color: "var(--theme-text-secondary)" }}>
              {cert.subject}
            </div>
            {cert.earned ? (
              <>
                <div className="text-xs text-center mb-4" style={{ color: "var(--theme-text-muted)" }}>
                  {cert.date} · {cert.grade}
                </div>
                <div className="flex gap-2">
                  <button className="themed-btn-outline flex-1 py-2 flex items-center justify-center gap-1 text-xs">
                    <Download size={14} /> تحميل
                  </button>
                  <button className="themed-btn-primary flex-1 py-2 flex items-center justify-center gap-1 text-xs">
                    <Share2 size={14} /> مشاركة
                  </button>
                </div>
              </>
            ) : (
              <div className="text-xs text-center mt-2 font-bold" style={{ color: "var(--theme-text-muted)" }}>
                <Lock size={14} className="inline ml-1" />
                أكمل المطلوب لفتح الشهادة
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}