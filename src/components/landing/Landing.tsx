'use client';

import { useState, useEffect } from 'react';

import { useUIStore } from '@/store/ui-store';
import Link from 'next/link';
import {
  Bot, FileText, ClipboardCheck, Trophy, Zap, Award,
  Calculator, Atom, FlaskConical, BookOpen,
  Star, Check, GraduationCap, Sparkles, Brain, Timer,
} from 'lucide-react';

/* ============================================================
   THEME HERO ILLUSTRATIONS
   ============================================================ */

const DefaultHero = () => (
  <div className="relative w-full max-w-[520px] mx-auto rounded-[20px] overflow-hidden"
    style={{
      height: '440px',
      background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0f172a 100%)',
      boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 80px rgba(99,102,241,0.2)',
    }}>
    <div className="absolute top-[15%] right-[10%] w-[220px] h-[220px] rounded-full"
      style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.4), transparent 70%)', filter: 'blur(40px)' }} />
    <div className="absolute bottom-[20%] left-[5%] w-[180px] h-[180px] rounded-full"
      style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.3), transparent 70%)', filter: 'blur(35px)' }} />
    {/* Dashboard mockup */}
    <div className="absolute top-8 right-6 w-[55%] rounded-xl p-4"
      style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
          <GraduationCap size={16} color="#fff" />
        </div>
        <div>
          <div className="text-white/90 text-xs font-bold">لوحة التحكم</div>
          <div className="text-white/40 text-[0.6rem]">أدائك هذا الأسبوع</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[{ v: '92%', l: 'المعدل' }, { v: '47', l: 'امتحان' }, { v: '🔥 12', l: 'يوم متتالي' }, { v: '⭐ 850', l: 'نقطة' }].map((s, i) => (
          <div key={i} className="rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="text-white font-extrabold text-sm">{s.v}</div>
            <div className="text-white/50 text-[0.55rem]">{s.l}</div>
          </div>
        ))}
      </div>
    </div>
    {/* AI Chat mockup */}
    <div className="absolute bottom-6 left-6 w-[50%] rounded-xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
      <div className="px-3 py-2 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Bot size={14} className="text-indigo-400" />
        <span className="text-white/80 text-[0.65rem] font-bold">أستاذك الذكي</span>
        <span className="mr-auto w-2 h-2 rounded-full bg-green-400" />
      </div>
      <div className="p-3 space-y-2">
        <div className="rounded-lg px-3 py-1.5 text-[0.6rem] text-white/80 max-w-[85%] mr-auto" style={{ background: 'rgba(99,102,241,0.3)' }}>
          اشرحلي قانون نيوتن الثالث 🤔
        </div>
        <div className="rounded-lg px-3 py-1.5 text-[0.6rem] text-white/80 max-w-[85%]" style={{ background: 'rgba(255,255,255,0.08)' }}>
          لكل فعل رد فعل مساوٍ في المقدار ومعاكس في الاتجاه ✨
        </div>
      </div>
    </div>
    {/* Floating elements */}
    <div className="absolute top-4 left-4 text-2xl anim-float">🎓</div>
    <div className="absolute bottom-4 right-4 text-xl anim-float" style={{ animationDelay: '2s' }}>⚡</div>
  </div>
);

const GoldenHero = () => (
  <div className="relative w-full max-w-[520px] mx-auto rounded-[20px] overflow-hidden"
    style={{
      height: '440px',
      background: 'linear-gradient(135deg, #0D1F0D 0%, #1B3A1B 50%, #0A1A0A 100%)',
      boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 60px rgba(212,160,23,0.2)',
    }}>
    <div className="absolute top-[10%] right-[15%] w-[200px] h-[200px] rounded-full"
      style={{ background: 'radial-gradient(circle, rgba(212,160,23,0.35), transparent 70%)', filter: 'blur(40px)' }} />
    <div className="absolute bottom-[15%] left-[10%] w-[160px] h-[160px] rounded-full"
      style={{ background: 'radial-gradient(circle, rgba(250,204,21,0.25), transparent 70%)', filter: 'blur(35px)' }} />
    {/* Islamic pattern */}
    <svg className="absolute inset-0 w-full h-full opacity-[0.08]" viewBox="0 0 520 440">
      <path d="M260 60L290 110H350L305 145L320 200L260 168L200 200L215 145L170 110H230Z" fill="none" stroke="#D4A017" strokeWidth="1" />
      <circle cx="260" cy="130" r="50" fill="none" stroke="#FACC15" strokeWidth="0.5" opacity="0.5" />
    </svg>
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
      <div className="text-6xl mb-4">☪️</div>
      <div className="text-[#FACC15] text-2xl font-extrabold mb-2">تعلّم بنور المعرفة</div>
      <div className="text-[#C8D6A0] text-sm">منصة تعليمية ذهبية</div>
    </div>
    <div className="absolute top-4 right-8 text-3xl anim-float" style={{ animationDuration: '8s' }}>🏮</div>
    <div className="absolute bottom-6 left-8 text-2xl anim-float" style={{ animationDuration: '10s', animationDelay: '2s' }}>🌙</div>
  </div>
);

const ExamsHero = () => (
  <div className="relative w-full max-w-[520px] mx-auto rounded-[20px] overflow-hidden"
    style={{
      height: '440px',
      background: 'linear-gradient(135deg, #1C1917 0%, #292524 50%, #1C1917 100%)',
      boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 60px rgba(220,38,38,0.2)',
    }}>
    <div className="absolute top-[15%] right-[10%] w-[200px] h-[200px] rounded-full"
      style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.35), transparent 70%)', filter: 'blur(40px)' }} />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
      <div className="text-5xl mb-4">⏰</div>
      <div className="text-[#FCA5A5] text-2xl font-extrabold mb-2">وقت الامتحانات</div>
      <div className="text-white/60 text-sm mb-4">استعد مع أقوى بنك أسئلة</div>
      <div className="flex gap-3 justify-center">
        {['فيزياء', 'كيمياء', 'رياضيات'].map((s, i) => (
          <div key={i} className="rounded-lg px-3 py-2 text-sm font-bold text-white"
            style={{ background: 'rgba(220,38,38,0.3)', border: '1px solid rgba(220,38,38,0.4)' }}>
            {s}
          </div>
        ))}
      </div>
    </div>
    <div className="absolute top-6 left-6 text-2xl">📝</div>
    <div className="absolute bottom-6 right-6 text-2xl">✅</div>
  </div>
);

const GraduationHero = () => (
  <div className="relative w-full max-w-[520px] mx-auto rounded-[20px] overflow-hidden"
    style={{
      height: '440px',
      background: 'linear-gradient(135deg, #14532D 0%, #166534 50%, #14532D 100%)',
      boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 60px rgba(5,150,105,0.2)',
    }}>
    <div className="absolute top-[15%] right-[15%] w-[200px] h-[200px] rounded-full"
      style={{ background: 'radial-gradient(circle, rgba(5,150,105,0.35), transparent 70%)', filter: 'blur(40px)' }} />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
      <div className="text-6xl mb-4">🎓</div>
      <div className="text-[#6EE7B7] text-2xl font-extrabold mb-2">مبروك التخرج!</div>
      <div className="text-white/60 text-sm mb-4">رحلة النجاح تبدأ من هنا</div>
      <div className="flex gap-2 justify-center flex-wrap">
        {['🏅', '🎉', '⭐', '🎊'].map((e, i) => (
          <span key={i} className="text-3xl anim-float" style={{ animationDelay: `${i * 0.5}s` }}>{e}</span>
        ))}
      </div>
    </div>
  </div>
);

const DarkHero = () => (
  <div className="relative w-full max-w-[520px] mx-auto rounded-[20px] overflow-hidden"
    style={{
      height: '440px',
      background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)',
      boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 80px rgba(99,102,241,0.15)',
    }}>
    {/* Stars */}
    {Array.from({ length: 20 }, (_, i) => (
      <div key={i} className="absolute rounded-full bg-white"
        style={{
          width: Math.random() * 3 + 1 + 'px',
          height: Math.random() * 3 + 1 + 'px',
          top: Math.random() * 100 + '%',
          left: Math.random() * 100 + '%',
          opacity: Math.random() * 0.5 + 0.2,
          animation: `typing ${2 + Math.random() * 3}s ease-in-out infinite`,
          animationDelay: `${Math.random() * 2}s`,
        }} />
    ))}
    <div className="absolute top-[10%] right-[20%] w-[250px] h-[250px] rounded-full"
      style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.2), transparent 70%)', filter: 'blur(60px)' }} />
    <div className="absolute bottom-[10%] left-[10%] w-[200px] h-[200px] rounded-full"
      style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.2), transparent 70%)', filter: 'blur(50px)' }} />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
      <div className="text-5xl mb-4">🌌</div>
      <div className="text-[#A5B4FC] text-2xl font-extrabold mb-2">الوضع الليلي</div>
      <div className="text-white/50 text-sm">ادرس براحة في أي وقت</div>
    </div>
  </div>
);

const heroMap: Record<string, React.FC> = {
  default: DefaultHero,
  golden: GoldenHero,
  exams: ExamsHero,
  graduation: GraduationHero,
  dark: DarkHero,
};

/* ============================================================
   LANDING FEATURES & DATA
   ============================================================ */

const features = [
  { icon: Bot, title: 'أستاذك الذكي', desc: 'ذكاء اصطناعي يفهم المنهج المصري ويشرحلك بأسلوب بسيط' },
  { icon: FileText, title: 'ملخصات ذكية', desc: 'ملخصات مُنشأة بالذكاء الاصطناعي لكل درس' },
  { icon: ClipboardCheck, title: 'بنك أسئلة', desc: 'آلاف الأسئلة مع إجابات نموذجية وشرح مفصل' },
  { icon: Trophy, title: 'تنافس وتحفيز', desc: 'لوحة متصدرين وشهادات إنجاز' },
  { icon: Zap, title: 'سرعة وأداء', desc: 'منصة سريعة تعمل على جميع الأجهزة' },
  { icon: Award, title: 'متابعة مستمرة', desc: 'تقارير أداء مفصلة لمتابعة تقدمك' },
];

const subjects = [
  { name: 'الرياضيات', icon: Calculator, color: '#3B82F6' },
  { name: 'الفيزياء', icon: Atom, color: '#8B5CF6' },
  { name: 'الكيمياء', icon: FlaskConical, color: '#10B981' },
];

const stats = [
  { value: '+1,200', label: 'طالب مسجل' },
  { value: '+5,000', label: 'سؤال في بنك الأسئلة' },
  { value: '+200', label: 'ملخص ذكي' },
  { value: '95%', label: 'نسبة رضا الطلاب' },
];

const defaultPlans = [
  { name: 'مادة واحدة', price: '89', period: 'شهرياً', features: ['مادة واحدة', 'ملخصات ذكية', 'بنك أسئلة', '50 سؤال AI يومياً'], popular: false },
  { name: 'كل المواد', price: '349', period: 'شهرياً', features: ['كل المواد', 'ملخصات ذكية', 'بنك أسئلة', '50 سؤال AI يومياً', 'تقارير أداء', 'شهادات إنجاز'], popular: true },
  { name: '3 مواد', price: '219', period: 'شهرياً', features: ['3 مواد', 'ملخصات ذكية', 'بنك أسئلة', '50 سؤال AI يومياً', 'تقارير أداء'], popular: false },
];

/* ============================================================
   LANDING COMPONENT
   ============================================================ */

export default function Landing() {
  const theme = useUIStore((s: any) => s.theme);
  const HeroIllustration = heroMap[theme] || DefaultHero;
  const [plans, setPlans] = useState(defaultPlans);

  useEffect(() => {
    fetch('/api/subscription/plans')
      .then(r => r.json())
      .then(data => {
        if (data.plans?.length) {
          const mapped = data.plans.map((p: any) => ({
            name: p.name_ar || p.name,
            price: String(p.price_monthly || 0),
            period: 'شهرياً',
            features: p.features || [],
            popular: p.is_popular || false,
          }));
          // Sort: cheapest first, popular middle
          mapped.sort((a: any, b: any) => Number(a.price) - Number(b.price));
          setPlans(mapped);
        }
      })
      .catch(() => {/* use defaults */});
  }, []);

  return (
    <div className="font-cairo" style={{ color: 'var(--theme-text-primary)' }}>
      {/* ═══ HERO SECTION ═══ */}
      <section
        className="themed-hero-bg relative overflow-hidden"
        style={{ padding: '5rem 2rem 4rem', minHeight: '85vh', display: 'flex', alignItems: 'center' }}
      >
        <div className="max-w-[1200px] mx-auto w-full flex flex-col lg:flex-row items-center gap-12">
          {/* Text - Right side (RTL) */}
          <div className="flex-1 text-center lg:text-right">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-6 text-sm font-bold text-white/90"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}>
              <Sparkles size={16} />
              <span>منصة #1 للثانوية العامة</span>
            </div>

            <h1 className="text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-6">
              ادرس بذكاء مع
              <span className="block mt-2" style={{ color: 'var(--theme-topbar-accent)', textShadow: '0 2px 20px rgba(255,255,255,0.2)' }}>
                أستاذك الذكي 🤖
              </span>
            </h1>

            <p className="text-lg text-white/70 leading-relaxed mb-8 max-w-[500px] lg:max-w-none">
              منصة تعليمية مدعومة بالذكاء الاصطناعي مصممة خصيصاً لطلاب الثانوية العامة في مصر.
              ملخصات ذكية، بنك أسئلة ضخم، وأستاذ AI يشرحلك 24/7
            </p>

            <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
              <Link
                href="/register"
                className="themed-btn-primary text-lg px-8 py-4 flex items-center gap-2"
              >
                <Zap size={20} />
                ابدأ مجاناً — يومين تجربة
              </Link>
              <Link
                href="/subjects"
                className="themed-btn-outline text-lg px-8 py-4 flex items-center gap-2 text-white border-white/40 hover:bg-white/20"
              >
                <BookOpen size={20} />
                تصفح المواد
              </Link>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-6 mt-10 justify-center lg:justify-start">
              {stats.map((s, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl font-extrabold" style={{ color: 'var(--theme-topbar-accent)' }}>{s.value}</div>
                  <div className="text-white/50 text-sm">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero Illustration - Left side (RTL) */}
          <div className="flex-1 flex justify-center">
            <HeroIllustration />
          </div>
        </div>
      </section>

      {/* ═══ SUBJECTS BAR ═══ */}
      <section className="py-12 px-6" style={{ background: 'var(--theme-surface-bg)', borderBottom: '1px solid var(--theme-surface-border)' }}>
        <div className="max-w-[1200px] mx-auto">
          <h2 className="text-2xl font-extrabold text-center mb-8" style={{ color: 'var(--theme-text-primary)' }}>
            📚 المواد المتاحة
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {subjects.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="themed-card p-6 text-center cursor-pointer">
                  <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                    style={{ background: `${s.color}15` }}>
                    <Icon size={32} style={{ color: s.color }} />
                  </div>
                  <h3 className="text-xl font-extrabold" style={{ color: 'var(--theme-text-primary)' }}>{s.name}</h3>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES GRID ═══ */}
      <section className="py-16 px-6" style={{ background: 'var(--theme-page-bg)' }}>
        <div className="max-w-[1200px] mx-auto">
          <h2 className="text-3xl font-extrabold text-center mb-4" style={{ color: 'var(--theme-text-primary)' }}>
            ✨ ليه منهج AI؟
          </h2>
          <p className="text-center mb-12" style={{ color: 'var(--theme-text-secondary)', maxWidth: '600px', margin: '0 auto 3rem' }}>
            مميزات تخلي دراستك أسهل وأذكى
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="themed-card p-6">
                  <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center"
                    style={{ background: 'var(--theme-hover-overlay)' }}>
                    <Icon size={24} style={{ color: 'var(--theme-primary)' }} />
                  </div>
                  <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--theme-text-primary)' }}>{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--theme-text-secondary)' }}>{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="py-16 px-6" style={{ background: 'var(--theme-surface-bg)', borderTop: '1px solid var(--theme-surface-border)' }}>
        <div className="max-w-[1200px] mx-auto">
          <h2 className="text-3xl font-extrabold text-center mb-12" style={{ color: 'var(--theme-text-primary)' }}>
            🚀 ازاي تبدأ؟
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { step: '1', icon: '📝', title: 'سجل حسابك', desc: 'في أقل من دقيقة' },
              { step: '2', icon: '📚', title: 'اختار موادك', desc: 'ابدأ بتجربة مجانية يومين' },
              { step: '3', icon: '🤖', title: 'ادرس مع AI', desc: 'ملخصات وامتحانات وأسئلة ذكية' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl"
                  style={{ background: 'var(--theme-cta-gradient)', boxShadow: 'var(--theme-btn-shadow)' }}>
                  {s.icon}
                </div>
                <div className="text-sm font-bold mb-2" style={{ color: 'var(--theme-primary)' }}>الخطوة {s.step}</div>
                <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--theme-text-primary)' }}>{s.title}</h3>
                <p className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section className="py-16 px-6" style={{ background: 'var(--theme-page-bg)' }}>
        <div className="max-w-[1200px] mx-auto">
          <h2 className="text-3xl font-extrabold text-center mb-4" style={{ color: 'var(--theme-text-primary)' }}>
            💰 خطط الاشتراك
          </h2>
          <p className="text-center mb-12" style={{ color: 'var(--theme-text-secondary)' }}>
            ابدأ بتجربة مجانية يومين بدون بطاقة
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-[900px] mx-auto">
            {plans.map((plan, i) => (
              <div key={i} className="themed-card p-6 text-center relative"
                style={plan.popular ? { border: `2px solid var(--theme-primary)`, transform: 'scale(1.05)' } : {}}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white"
                    style={{ background: 'var(--theme-cta-gradient)' }}>
                    ⭐ الأكثر شعبية
                  </div>
                )}
                <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--theme-text-primary)' }}>{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold" style={{ color: 'var(--theme-primary)' }}>{plan.price}</span>
                  <span className="text-sm mr-1" style={{ color: 'var(--theme-text-muted)' }}>ج.م / {plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8 text-right">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
                      <Check size={16} style={{ color: 'var(--theme-primary)', flexShrink: 0 }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={plan.popular ? 'themed-btn-primary w-full' : 'themed-btn-outline w-full'}
                  style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}
                >
                  ابدأ الآن
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="themed-hero-bg py-16 px-6 text-center relative overflow-hidden">
        <div className="relative z-10 max-w-[600px] mx-auto">
          <h2 className="text-3xl font-extrabold text-white mb-4">
            جاهز تبدأ رحلة النجاح؟ 🚀
          </h2>
          <p className="text-white/70 mb-8">
            انضم لآلاف الطلاب اللي بيدرسوا بذكاء مع منهج AI
          </p>
          <Link
            href="/register"
            className="themed-btn-primary text-lg px-10 py-4 inline-flex items-center gap-2"
          >
            <Star size={20} />
            سجل الآن مجاناً
          </Link>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="py-8 px-6 text-center" style={{ background: 'var(--theme-footer-bg)', color: 'var(--theme-footer-text)' }}>
        <div className="flex justify-center mb-2">
          <img
            src="/logo-horizontal.png"
            alt="منهج AI"
            style={{ height: '2rem', width: 'auto', filter: 'brightness(0) invert(1)' }}
          />
        </div>
        <p className="text-sm mb-4">منصة تعليمية ذكية لطلاب الثانوية العامة في مصر</p>
        <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
          © 2025 منهج AI — جميع الحقوق محفوظة
        </p>
      </footer>
    </div>
  );
}
