'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import { LogIn, Phone, Lock, Eye, EyeOff } from 'lucide-react';

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

      // Set auth cookie for middleware
      document.cookie = `auth-token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;

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
      router.push('/dashboard');
    } catch {
      setError('فشل الاتصال بالخادم');
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6"
      style={{ background: 'var(--theme-page-bg)' }}
    >
      <div className="themed-card p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'var(--theme-cta-gradient)' }}
          >
            <LogIn size={28} color="#fff" />
          </div>
          <h1
            className="text-2xl font-extrabold mb-2"
            style={{ color: 'var(--theme-text-primary)' }}
          >
            تسجيل الدخول
          </h1>
          <p className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
            أهلاً بيك! سجل دخولك عشان تكمل دراستك
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            className="mb-4 p-3 rounded-lg text-sm font-bold text-center"
            style={{ background: 'rgba(220,38,38,0.1)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.3)' }}
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Phone */}
          <div>
            <label className="block text-sm font-bold mb-2" style={{ color: 'var(--theme-text-primary)' }}>
              📱 رقم الهاتف
            </label>
            <div className="relative">
              <Phone size={18} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--theme-text-muted)' }} />
              <input
                type="tel"
                className="themed-input pr-10"
                placeholder="01xxxxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                dir="ltr"
                style={{ textAlign: 'right' }}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-bold mb-2" style={{ color: 'var(--theme-text-primary)' }}>
              🔒 كلمة المرور
            </label>
            <div className="relative">
              <Lock size={18} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--theme-text-muted)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                className="themed-input pr-10 pl-10"
                placeholder="كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 cursor-pointer"
                style={{ color: 'var(--theme-text-muted)', background: 'none', border: 'none' }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="themed-btn-primary w-full flex items-center justify-center gap-2 py-3 text-lg"
            style={{ opacity: loading ? 0.7 : 1 }}
          >
            {loading ? (
              <span>جارٍ تسجيل الدخول...</span>
            ) : (
              <>
                <LogIn size={20} />
                <span>دخول</span>
              </>
            )}
          </button>
        </form>

        {/* Register link */}
        <div className="text-center mt-6">
          <span className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
            {'مش عندك حساب؟ '}
          </span>
          <Link href="/register" className="text-sm font-bold" style={{ color: 'var(--theme-primary)' }}>
            سجل الآن ✨
          </Link>
        </div>
      </div>
    </div>
  );
}