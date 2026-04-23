"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  CreditCard, Eye, EyeOff, Save, Loader2, Check, 
  AlertCircle, RefreshCw, Shield, Smartphone, DollarSign
} from "lucide-react";

interface PaymentConfig {
  key: string;
  value: string;
  label: string;
  description: string;
  group: 'stripe' | 'paymob';
  isSecret: boolean;
}

const PAYMENT_KEYS: Omit<PaymentConfig, 'value'>[] = [
  // Stripe
  { key: 'STRIPE_PUBLISHABLE_KEY', label: 'Stripe Publishable Key', description: 'المفتاح العام (pk_...)', group: 'stripe', isSecret: false },
  { key: 'STRIPE_SECRET_KEY', label: 'Stripe Secret Key', description: 'المفتاح السري (sk_...)', group: 'stripe', isSecret: true },
  { key: 'STRIPE_WEBHOOK_SECRET', label: 'Stripe Webhook Secret', description: 'سر الـ Webhook (whsec_...)', group: 'stripe', isSecret: true },
  // Paymob
  { key: 'PAYMOB_API_KEY', label: 'Paymob API Key', description: 'مفتاح API من لوحة Paymob', group: 'paymob', isSecret: true },
  { key: 'PAYMOB_VODAFONE_INTEGRATION_ID', label: 'Vodafone Cash Integration ID', description: 'رقم تكامل فودافون كاش', group: 'paymob', isSecret: false },
  { key: 'PAYMOB_FAWRY_INTEGRATION_ID', label: 'Fawry Integration ID', description: 'رقم تكامل فوري', group: 'paymob', isSecret: false },
  { key: 'PAYMOB_INSTAPAY_INTEGRATION_ID', label: 'InstaPay Integration ID', description: 'رقم تكامل إنستاباي', group: 'paymob', isSecret: false },
  { key: 'PAYMOB_IFRAME_ID', label: 'Paymob iFrame ID', description: 'رقم الـ iFrame', group: 'paymob', isSecret: false },
  { key: 'PAYMOB_HMAC_SECRET', label: 'Paymob HMAC Secret', description: 'سر التحقق من الـ Webhook', group: 'paymob', isSecret: true },
];

export default function AdminPayments() {
  const [configs, setConfigs] = useState<PaymentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");

  const loadSecrets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/secrets', { credentials: 'include' });
      const data = await res.json();
      
      const secretsMap: Record<string, string> = {};
      if (data.secrets) {
        for (const s of data.secrets) {
          secretsMap[s.key] = s.value || '';
        }
      }

      setConfigs(PAYMENT_KEYS.map(pk => ({
        ...pk,
        value: secretsMap[pk.key] || '',
      })));
    } catch {
      setError('فشل في تحميل الإعدادات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSecrets(); }, [loadSecrets]);

  const saveKey = async (key: string, value: string) => {
    setSaving(key);
    setError("");
    try {
      const res = await fetch('/api/admin/secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ key, value }),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(key);
        setTimeout(() => setSaved(null), 2000);
      } else {
        setError(data.error || 'فشل في الحفظ');
      }
    } catch {
      setError('فشل في الاتصال');
    } finally {
      setSaving(null);
    }
  };

  const updateValue = (key: string, value: string) => {
    setConfigs(prev => prev.map(c => c.key === key ? { ...c, value } : c));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin" size={32} style={{ color: 'var(--theme-primary)' }} />
      </div>
    );
  }

  const stripeConfigs = configs.filter(c => c.group === 'stripe');
  const paymobConfigs = configs.filter(c => c.group === 'paymob');
  const stripeConfigured = stripeConfigs.some(c => c.value && c.value.length > 5);
  const paymobConfigured = paymobConfigs.some(c => c.value && c.value.length > 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold" style={{ color: 'var(--theme-text-primary)' }}>
            💳 إعدادات الدفع
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--theme-text-muted)' }}>
            أدخل مفاتيح API لتفعيل طرق الدفع المختلفة
          </p>
        </div>
        <button
          onClick={loadSecrets}
          className="p-2 rounded-xl transition-all hover:scale-105"
          style={{ background: 'var(--theme-hover-overlay)' }}
        >
          <RefreshCw size={18} style={{ color: 'var(--theme-text-secondary)' }} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl text-sm" style={{ background: '#EF444410', color: '#EF4444' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Stripe Section */}
      <div className="themed-card overflow-hidden">
        <div className="p-4 flex items-center gap-3" style={{ 
          background: stripeConfigured ? '#10B98110' : 'var(--theme-hover-overlay)',
          borderBottom: '1px solid var(--theme-surface-border)'
        }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#635BFF20' }}>
            <CreditCard size={22} style={{ color: '#635BFF' }} />
          </div>
          <div className="flex-1">
            <h3 className="font-extrabold" style={{ color: 'var(--theme-text-primary)' }}>
              Stripe — بطاقات الائتمان
            </h3>
            <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
              Visa, Mastercard, Apple Pay, Google Pay
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold ${stripeConfigured ? 'text-green-600' : 'text-yellow-600'}`}
            style={{ background: stripeConfigured ? '#10B98120' : '#F59E0B20' }}>
            {stripeConfigured ? '✅ مُفعّل' : '⚠️ غير مُفعّل'}
          </div>
        </div>
        <div className="p-4 space-y-4">
          {stripeConfigs.map(config => (
            <KeyInput
              key={config.key}
              config={config}
              saving={saving === config.key}
              saved={saved === config.key}
              showSecret={showSecret[config.key] || false}
              onToggleShow={() => setShowSecret(prev => ({ ...prev, [config.key]: !prev[config.key] }))}
              onChange={(val) => updateValue(config.key, val)}
              onSave={() => saveKey(config.key, config.value)}
            />
          ))}
          <div className="flex items-start gap-2 p-3 rounded-xl text-xs" style={{ background: 'var(--theme-hover-overlay)' }}>
            <Shield size={14} className="mt-0.5" style={{ color: 'var(--theme-primary)' }} />
            <div style={{ color: 'var(--theme-text-muted)' }}>
              <strong>Webhook URL:</strong>
              <code className="block mt-1 text-xs" dir="ltr" style={{ color: 'var(--theme-text-secondary)' }}>
                https://manhaj-ai.com/api/webhook/stripe
              </code>
              <span className="block mt-1">ضع هذا الرابط في Stripe Dashboard → Developers → Webhooks</span>
            </div>
          </div>
        </div>
      </div>

      {/* Paymob Section */}
      <div className="themed-card overflow-hidden">
        <div className="p-4 flex items-center gap-3" style={{ 
          background: paymobConfigured ? '#10B98110' : 'var(--theme-hover-overlay)',
          borderBottom: '1px solid var(--theme-surface-border)'
        }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#00897B20' }}>
            <Smartphone size={22} style={{ color: '#00897B' }} />
          </div>
          <div className="flex-1">
            <h3 className="font-extrabold" style={{ color: 'var(--theme-text-primary)' }}>
              Paymob — الدفع المحلي
            </h3>
            <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
              فودافون كاش، فوري، إنستاباي
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold ${paymobConfigured ? 'text-green-600' : 'text-yellow-600'}`}
            style={{ background: paymobConfigured ? '#10B98120' : '#F59E0B20' }}>
            {paymobConfigured ? '✅ مُفعّل' : '⚠️ غير مُفعّل'}
          </div>
        </div>
        <div className="p-4 space-y-4">
          {paymobConfigs.map(config => (
            <KeyInput
              key={config.key}
              config={config}
              saving={saving === config.key}
              saved={saved === config.key}
              showSecret={showSecret[config.key] || false}
              onToggleShow={() => setShowSecret(prev => ({ ...prev, [config.key]: !prev[config.key] }))}
              onChange={(val) => updateValue(config.key, val)}
              onSave={() => saveKey(config.key, config.value)}
            />
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="themed-card p-5">
        <h3 className="font-extrabold mb-3 flex items-center gap-2" style={{ color: 'var(--theme-text-primary)' }}>
          <DollarSign size={18} style={{ color: 'var(--theme-primary)' }} />
          كيفية إعداد الدفع
        </h3>
        <div className="space-y-3 text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
          <div>
            <strong className="block mb-1">Stripe (بطاقات):</strong>
            <ol className="list-decimal list-inside space-y-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
              <li>أنشئ حساب على <a href="https://stripe.com" target="_blank" className="underline" style={{ color: 'var(--theme-primary)' }}>stripe.com</a></li>
              <li>من Dashboard → Developers → API Keys</li>
              <li>انسخ Publishable Key و Secret Key وألصقهم هنا</li>
              <li>أضف Webhook endpoint: <code dir="ltr">https://manhaj-ai.com/api/webhook/stripe</code></li>
              <li>Events: <code dir="ltr">checkout.session.completed</code></li>
            </ol>
          </div>
          <div>
            <strong className="block mb-1">Paymob (فودافون/فوري/إنستاباي):</strong>
            <ol className="list-decimal list-inside space-y-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
              <li>أنشئ حساب على <a href="https://accept.paymob.com" target="_blank" className="underline" style={{ color: 'var(--theme-primary)' }}>accept.paymob.com</a></li>
              <li>فعّل Integration IDs لكل طريقة دفع</li>
              <li>انسخ API Key و Integration IDs وألصقهم هنا</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

function KeyInput({ config, saving, saved, showSecret, onToggleShow, onChange, onSave }: {
  config: PaymentConfig;
  saving: boolean;
  saved: boolean;
  showSecret: boolean;
  onToggleShow: () => void;
  onChange: (val: string) => void;
  onSave: () => void;
}) {
  const hasValue = config.value && config.value.length > 2;

  return (
    <div>
      <label className="block text-sm font-bold mb-1" style={{ color: 'var(--theme-text-primary)' }}>
        {config.label}
        {hasValue && <Check size={14} className="inline mr-2" style={{ color: '#10B981' }} />}
      </label>
      <p className="text-xs mb-2" style={{ color: 'var(--theme-text-muted)' }}>{config.description}</p>
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type={config.isSecret && !showSecret ? 'password' : 'text'}
            value={config.value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`أدخل ${config.label}...`}
            className="w-full px-3 py-2.5 rounded-xl text-sm"
            dir="ltr"
            style={{
              background: 'var(--theme-hover-overlay)',
              border: '1px solid var(--theme-surface-border)',
              color: 'var(--theme-text-primary)',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
            }}
          />
          {config.isSecret && (
            <button
              onClick={onToggleShow}
              className="absolute top-1/2 -translate-y-1/2 left-3 p-1"
              type="button"
            >
              {showSecret ? <EyeOff size={16} style={{ color: 'var(--theme-text-muted)' }} /> : <Eye size={16} style={{ color: 'var(--theme-text-muted)' }} />}
            </button>
          )}
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-1"
          style={{
            background: saved ? '#10B981' : 'var(--theme-cta-gradient)',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : saved ? (
            <><Check size={16} /> تم</>
          ) : (
            <><Save size={16} /> حفظ</>
          )}
        </button>
      </div>
    </div>
  );
}
