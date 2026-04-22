'use client';

import Link from 'next/link';
import { CheckCircle, BookOpen, ChevronLeft } from 'lucide-react';

export default function SubscriptionSuccess() {
  return (
    <div
      className="min-h-[80vh] flex flex-col items-center justify-center p-6 font-cairo text-center relative overflow-hidden"
      dir="rtl"
      style={{ color: 'var(--theme-text-primary)' }}
    >
      {/* Confetti CSS effect */}
      <style jsx>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .confetti-piece {
          position: absolute;
          width: 10px;
          height: 10px;
          top: -20px;
          animation: confetti-fall linear forwards;
        }
      `}</style>
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="confetti-piece"
          style={{
            left: `${Math.random() * 100}%`,
            backgroundColor: ['#10B981', '#F59E0B', '#6366F1', '#EF4444', '#EC4899', '#3B82F6'][i % 6],
            animationDuration: `${2 + Math.random() * 3}s`,
            animationDelay: `${Math.random() * 2}s`,
            borderRadius: i % 2 === 0 ? '50%' : '2px',
            width: `${6 + Math.random() * 8}px`,
            height: `${6 + Math.random() * 8}px`,
          }}
        />
      ))}

      {/* Success checkmark */}
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
        style={{
          background: 'rgba(16,185,129,0.15)',
          animation: 'pulse 2s ease-in-out infinite',
        }}
      >
        <CheckCircle size={56} style={{ color: '#10B981' }} />
      </div>

      <h1 className="text-3xl font-extrabold mb-3" style={{ color: 'var(--theme-text-primary)' }}>
        تم الاشتراك بنجاح! 🎉
      </h1>

      <p className="text-base mb-2" style={{ color: 'var(--theme-text-secondary)' }}>
        مبروك! تم تفعيل اشتراكك بنجاح
      </p>
      <p className="text-sm mb-8" style={{ color: 'var(--theme-text-muted)' }}>
        يمكنك الآن الوصول لجميع المواد والدروس والامتحانات
      </p>

      <Link
        href="/subjects"
        className="themed-btn-primary px-8 py-3 rounded-xl font-cairo text-base font-extrabold inline-flex items-center gap-2"
      >
        <BookOpen size={20} />
        ابدأ التعلم الآن
        <ChevronLeft size={18} />
      </Link>

      <Link
        href="/dashboard"
        className="mt-4 text-sm font-bold hover:underline"
        style={{ color: 'var(--theme-primary)' }}
      >
        الذهاب للوحة التحكم
      </Link>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
      `}</style>
    </div>
  );
}
