'use client';

import Link from 'next/link';
import { XCircle, RefreshCw, Home } from 'lucide-react';

export default function SubscriptionCancel() {
  return (
    <div
      className="min-h-[80vh] flex flex-col items-center justify-center p-6 font-cairo text-center"
      dir="rtl"
      style={{ color: 'var(--theme-text-primary)' }}
    >
      {/* Red X icon */}
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
        style={{ background: 'rgba(239,68,68,0.12)' }}
      >
        <XCircle size={56} style={{ color: '#EF4444' }} />
      </div>

      <h1 className="text-3xl font-extrabold mb-3" style={{ color: 'var(--theme-text-primary)' }}>
        تم إلغاء عملية الدفع
      </h1>

      <p className="text-base mb-8" style={{ color: 'var(--theme-text-secondary)' }}>
        لم يتم خصم أي مبلغ من حسابك. يمكنك المحاولة مرة أخرى في أي وقت.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Link
          href="/subscribe"
          className="themed-btn-primary px-8 py-3 rounded-xl font-cairo text-base font-extrabold inline-flex items-center gap-2"
        >
          <RefreshCw size={18} />
          حاول مرة أخرى
        </Link>

        <Link
          href="/"
          className="themed-btn-outline px-6 py-3 rounded-xl font-cairo text-sm font-bold inline-flex items-center gap-2"
        >
          <Home size={16} />
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}
