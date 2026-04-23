'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/store/auth-store';
import { LogIn, Phone, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!phone || !password) {
      setError('يرجى إدخال رقم الهاتف وكلمة المرور');
      return;
    }

    if (!/^01[0125]\d{8}$/.test(phone)) {
      setError('رقم الهاتف غير صحيح');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'فشل تسجيل الدخول');
        setLoading(false);
        return;
      }

      // Cookie is set server-side (httpOnly) by the login API
      login(
        {
          id: data.user.id,
          fullName: data.user.name,
          phone: data.user.phone,
          role: data.user.role,
          trialEndsAt: data.user.trialEndsAt || null,
          referralCode: data.user.referralCode || '',
          avatarUrl: data.user.avatarUrl || null,
        },
        data.token
      );
      // Use full page reload to ensure cookie is sent with next request
      const redirect = new URLSearchParams(window.location.search).get('redirect') || '/dashboard';
      window.location.href = redirect;
    } catch {
      setError('فشل الاتصال بالخادم');
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6"
      style={{ background: 'var(--theme-page-bg)' }}
    >
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: 'var(--theme-primary)' }}
        />
        <div
          className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: 'var(--theme-accent)' }}
        />
      </div>

      <div className="themed-card p-8 sm:p-10 w-full max-w-md relative" style={{ zIndex: 1 }}>
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            <Image
              src="/logo-horizontal.png"
              alt="منهج AI"
              width={180}
              height={50}
              className="h-12 w-auto"
              priority
            />
          </div>
          <h1
            className="text-3xl font-extrabold mb-2"
            style={{ color: 'var(--theme-text-primary)' }}
          >
            تسجيل الدخول
          </h1>
          <p className="text-base" style={{ color: 'var(--theme-text-secondary)' }}>
            أهلاً بيك! 👋 سجل دخولك عشان تكمل دراستك
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            className="mb-5 p-4 rounded-xl text-sm font-bold text-center"
            style={{ background: 'rgba(220,38,38,0.1)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.3)' }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Phone */}
          <div>
            <label className="block text-base font-bold mb-2" style={{ color: 'var(--theme-text-primary)' }}>
              📱 رقم الهاتف
            </label>
            <div className="relative">
              <Phone size={20} className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--theme-text-muted)' }} />
              <input
                type="tel"
                className="themed-input pr-12 text-lg"
                placeholder="01012345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                dir="ltr"
                style={{ textAlign: 'right', padding: '14px 48px 14px 16px', fontSize: '1.1rem' }}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-base font-bold mb-2" style={{ color: 'var(--theme-text-primary)' }}>
              🔒 كلمة المرور
            </label>
            <div className="relative">
              <Lock size={20} className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--theme-text-muted)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                className="themed-input pr-12 pl-12"
                placeholder="كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ padding: '14px 48px 14px 48px', fontSize: '1.1rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-4 top-1/2 -translate-y-1/2 cursor-pointer"
                style={{ color: 'var(--theme-text-muted)', background: 'none', border: 'none' }}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="themed-btn-primary w-full flex items-center justify-center gap-3 text-lg font-bold"
            style={{ opacity: loading ? 0.7 : 1, padding: '16px', borderRadius: '14px', fontSize: '1.15rem' }}
          >
            {loading ? (
              <>
                <Loader2 size={22} className="animate-spin" />
                <span>جارٍ تسجيل الدخول...</span>
              </>
            ) : (
              <>
                <LogIn size={22} />
                <span>دخول</span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px" style={{ background: 'var(--theme-surface-border)' }} />
          <span className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>أو</span>
          <div className="flex-1 h-px" style={{ background: 'var(--theme-surface-border)' }} />
        </div>

        {/* Register link */}
        <Link
          href="/register"
          className="block w-full text-center py-4 rounded-xl text-base font-bold transition-all"
          style={{
            background: 'var(--theme-hover-overlay)',
            color: 'var(--theme-primary)',
            border: '2px solid var(--theme-surface-border)',
          }}
        >
          🚀 إنشاء حساب جديد
        </Link>

        {/* Trial info */}
        <div className="text-center mt-5">
          <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>
            🎁 تجربة مجانية يومين — بدون أي رسوم!
          </p>
        </div>
      </div>
    </div>
  );
}
