"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  BookOpen, Brain, BarChart3, Trophy, Zap,
  AlertTriangle, CheckCircle, ArrowRight, Star,
  Users, Clock, Shield, Rocket, ChevronDown,
  Mail, Phone, Heart, Award, Target,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface Plan {
  id: string;
  name: string;
  price: number;
  period?: string;
  features: string[];
  popular?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Animated Counter Hook                                              */
/* ------------------------------------------------------------------ */
function useCountUp(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const step = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            setCount(Math.floor(progress * target));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return { count, ref };
}

/* ------------------------------------------------------------------ */
/*  Scroll‑reveal wrapper                                              */
/* ------------------------------------------------------------------ */
function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat Card                                                          */
/* ------------------------------------------------------------------ */
function StatCard({ target, suffix, label, icon: Icon }: { target: number; suffix: string; label: string; icon: React.ElementType }) {
  const { count, ref } = useCountUp(target);
  return (
    <div ref={ref} className="flex flex-col items-center gap-3 p-6">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: "var(--theme-cta-gradient)" }}
      >
        <Icon className="w-7 h-7 text-white" />
      </div>
      <span className="text-4xl md:text-5xl font-bold" style={{ color: "var(--theme-text-primary)" }}>
        {count}{suffix}
      </span>
      <span className="text-base" style={{ color: "var(--theme-text-secondary)" }}>{label}</span>
    </div>
  );
}

/* ================================================================== */
/*  MAIN COMPONENT                                                     */
/* ================================================================== */
export default function Landing() {
  /* ---- pricing plans ---- */
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);

  useEffect(() => {
    fetch("/api/subscription/plans")
      .then((r) => r.json())
      .then((d) => setPlans(d.plans || []))
      .catch(() => {})
      .finally(() => setPlansLoading(false));
  }, []);

  /* ---- features ---- */
  const features = [
    { icon: BookOpen, emoji: "📚", title: "شرح المنهج كامل", desc: "كل الدروس والملخصات في مكان واحد" },
    { icon: Brain,    emoji: "🤖", title: "أستاذك الذكي",    desc: "AI بيفهمك ويشرحلك بأسلوب مصري" },
    { icon: Target,   emoji: "📝", title: "بنك أسئلة ضخم",   desc: "200+ سؤال لكل مادة من كل المستويات" },
    { icon: BarChart3, emoji: "📊", title: "تقارير أداء",     desc: "تعرف نقاط قوتك وضعفك كل أسبوع" },
    { icon: Trophy,   emoji: "🏆", title: "المتصدرين",       desc: "نافس زملاءك على مستوى المحافظة ومصر كلها" },
    { icon: Zap,      emoji: "🚨", title: "وضع الطوارئ",     desc: "مراجعة سريعة قبل الامتحان مباشرة" },
  ];

  /* ---- steps ---- */
  const steps = [
    { num: 1, title: "سجّل حسابك",   desc: "اسم + رقم + باسورد" },
    { num: 2, title: "اختر موادك",   desc: "اختر المواد اللي محتاجها" },
    { num: 3, title: "ابدأ ذاكر",    desc: "شرح + ملخصات + أسئلة" },
    { num: 4, title: "حقق نتيجتك",  desc: "امتحانات + تقارير أداء" },
  ];

  /* ---- quick links ---- */
  const quickLinks = [
    { label: "الرئيسية", href: "/" },
    { label: "المواد", href: "/subjects" },
    { label: "الامتحانات", href: "/exams" },
    { label: "الأسعار", href: "#pricing" },
  ];

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */
  return (
    <div dir="rtl" className="min-h-screen overflow-x-hidden" style={{ fontFamily: "Cairo, sans-serif", color: "var(--theme-text-primary)", background: "var(--theme-page-bg, #f9fafb)" }}>

      {/* ============================================================ */}
      {/*  1. HERO                                                      */}
      {/* ============================================================ */}
      <section
        className="relative w-full min-h-[92vh] flex items-center justify-center px-4 py-20 overflow-hidden"
        style={{ background: "var(--theme-hero-gradient, linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%))" }}
      >
        {/* pattern overlay */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: "var(--theme-bg-pattern, url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\"))",
            backgroundSize: "60px 60px",
          }}
        />

        {/* glow circles */}
        <div className="absolute top-10 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-300/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto text-center flex flex-col items-center gap-8">
          {/* floating badges – top */}
          <div className="flex flex-wrap justify-center gap-3 mb-2">
            {["200+ سؤال لكل مادة", "15 مادة", "أستاذ AI 24/7"].map((t) => (
              <span
                key={t}
                className="px-4 py-1.5 rounded-full text-sm font-semibold backdrop-blur-md bg-white/15 text-white border border-white/20 shadow-lg animate-pulse-slow"
              >
                {t}
              </span>
            ))}
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-tight drop-shadow-lg">
            مستقبلك يبدأ هنا 🚀
          </h1>
          <p className="text-xl sm:text-2xl text-white/90 font-medium max-w-2xl">
            منصة تعليمية ذكية لطلاب الثانوية العامة في مصر
          </p>
          <p className="text-base sm:text-lg text-white/75 max-w-xl">
            ذاكر بذكاء مع أستاذك الذكي — شرح، ملخصات، أسئلة، وامتحانات
          </p>

          {/* CTA buttons */}
          <div className="flex flex-wrap gap-4 justify-center mt-2">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-lg font-bold text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
              style={{ background: "var(--theme-cta-gradient, linear-gradient(135deg, #f97316, #ef4444))" }}
            >
              ابدأ مجاناً
              <Rocket className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-lg font-bold text-white border-2 border-white/40 hover:bg-white/10 transition-all duration-300"
            >
              تسجيل الدخول
              <ArrowRight className="w-5 h-5 rotate-180" />
            </Link>
          </div>

          {/* scroll hint */}
          <div className="mt-8 animate-bounce">
            <ChevronDown className="w-8 h-8 text-white/60" />
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  2. FEATURES                                                  */}
      {/* ============================================================ */}
      <section className="py-20 px-4" style={{ background: "var(--theme-page-bg, #f9fafb)" }}>
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-4" style={{ color: "var(--theme-text-primary)" }}>
              ليه منهج AI؟ 🤔
            </h2>
            <p className="text-center text-lg mb-14" style={{ color: "var(--theme-text-secondary)" }}>
              كل اللي محتاجه عشان تجيب أعلى الدرجات
            </p>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <Reveal key={i}>
                <div
                  className="rounded-2xl p-6 border hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full"
                  style={{
                    background: "var(--theme-surface-bg, #fff)",
                    borderColor: "var(--theme-surface-border, #e5e7eb)",
                  }}
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-4"
                    style={{ background: "var(--theme-primary-light, #ede9fe)" }}
                  >
                    {f.emoji}
                  </div>
                  <h3 className="text-xl font-bold mb-2" style={{ color: "var(--theme-text-primary)" }}>
                    {f.title}
                  </h3>
                  <p className="text-base leading-relaxed" style={{ color: "var(--theme-text-secondary)" }}>
                    {f.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  3. PRICING                                                   */}
      {/* ============================================================ */}
      <section id="pricing" className="py-20 px-4" style={{ background: "var(--theme-surface-bg, #fff)" }}>
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-4" style={{ color: "var(--theme-text-primary)" }}>
              الاشتراكات والأسعار 💰
            </h2>
            <p className="text-center text-lg mb-14" style={{ color: "var(--theme-text-secondary)" }}>
              اختار الخطة المناسبة ليك
            </p>
          </Reveal>

          {plansLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: "var(--theme-surface-border, #e5e7eb)", borderTopColor: "var(--theme-primary, #6366f1)" }} />
            </div>
          ) : plans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              {plans.map((plan) => (
                <Reveal key={plan.id}>
                  <div
                    className={`relative rounded-2xl p-7 border-2 flex flex-col h-full transition-all duration-300 hover:shadow-xl ${plan.popular ? "scale-[1.03] shadow-lg" : ""}`}
                    style={{
                      background: "var(--theme-surface-bg, #fff)",
                      borderColor: plan.popular ? "transparent" : "var(--theme-surface-border, #e5e7eb)",
                      borderImage: plan.popular ? "var(--theme-cta-gradient, linear-gradient(135deg, #f97316, #ef4444)) 1" : undefined,
                    }}
                  >
                    {plan.popular && (
                      <span
                        className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white shadow-md"
                        style={{ background: "var(--theme-cta-gradient, linear-gradient(135deg, #f97316, #ef4444))" }}
                      >
                        ⭐ الأكثر شعبية
                      </span>
                    )}
                    <h3 className="text-xl font-bold mb-2 mt-2" style={{ color: "var(--theme-text-primary)" }}>
                      {plan.name}
                    </h3>
                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-4xl font-extrabold" style={{ color: "var(--theme-primary, #6366f1)" }}>
                        {plan.price}
                      </span>
                      <span className="text-base" style={{ color: "var(--theme-text-secondary)" }}>
                        ج.م / {plan.period || "شهر"}
                      </span>
                    </div>
                    <ul className="flex flex-col gap-3 mb-8 flex-1">
                      {(plan.features || []).map((feat, fi) => (
                        <li key={fi} className="flex items-start gap-2 text-sm" style={{ color: "var(--theme-text-secondary)" }}>
                          <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--theme-success, #22c55e)" }} />
                          {feat}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="/subscribe"
                      className={`w-full text-center py-3 rounded-xl font-bold text-base transition-all duration-300 hover:scale-[1.03] ${plan.popular ? "text-white shadow-md" : ""}`}
                      style={{
                        background: plan.popular ? "var(--theme-cta-gradient, linear-gradient(135deg, #f97316, #ef4444))" : "var(--theme-surface-hover, #f3f4f6)",
                        color: plan.popular ? "#fff" : "var(--theme-text-primary)",
                      }}
                    >
                      اشترك الآن
                    </Link>
                  </div>
                </Reveal>
              ))}
            </div>
          ) : (
            /* fallback static cards when API returns nothing */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              {[
                { name: "المجانية", price: 0, features: ["مادة واحدة", "5 أسئلة يومياً", "ملخصات محدودة"], popular: false },
                { name: "الأساسية", price: 49, features: ["3 مواد", "أسئلة غير محدودة", "ملخصات كاملة", "تقارير أداء"], popular: true },
                { name: "المميزة", price: 99, features: ["كل المواد", "أسئلة غير محدودة", "أستاذ AI مخصص", "تقارير متقدمة", "وضع الطوارئ"], popular: false },
              ].map((plan, idx) => (
                <Reveal key={idx}>
                  <div
                    className={`relative rounded-2xl p-7 border-2 flex flex-col h-full transition-all duration-300 hover:shadow-xl ${plan.popular ? "scale-[1.03] shadow-lg" : ""}`}
                    style={{
                      background: "var(--theme-surface-bg, #fff)",
                      borderColor: plan.popular ? "transparent" : "var(--theme-surface-border, #e5e7eb)",
                      borderImage: plan.popular ? "var(--theme-cta-gradient, linear-gradient(135deg, #f97316, #ef4444)) 1" : undefined,
                    }}
                  >
                    {plan.popular && (
                      <span
                        className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white shadow-md"
                        style={{ background: "var(--theme-cta-gradient, linear-gradient(135deg, #f97316, #ef4444))" }}
                      >
                        ⭐ الأكثر شعبية
                      </span>
                    )}
                    <h3 className="text-xl font-bold mb-2 mt-2" style={{ color: "var(--theme-text-primary)" }}>
                      {plan.name}
                    </h3>
                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-4xl font-extrabold" style={{ color: "var(--theme-primary, #6366f1)" }}>
                        {plan.price === 0 ? "مجاناً" : plan.price}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-base" style={{ color: "var(--theme-text-secondary)" }}>ج.م / شهر</span>
                      )}
                    </div>
                    <ul className="flex flex-col gap-3 mb-8 flex-1">
                      {plan.features.map((feat, fi) => (
                        <li key={fi} className="flex items-start gap-2 text-sm" style={{ color: "var(--theme-text-secondary)" }}>
                          <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--theme-success, #22c55e)" }} />
                          {feat}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="/subscribe"
                      className={`w-full text-center py-3 rounded-xl font-bold text-base transition-all duration-300 hover:scale-[1.03] ${plan.popular ? "text-white shadow-md" : ""}`}
                      style={{
                        background: plan.popular ? "var(--theme-cta-gradient, linear-gradient(135deg, #f97316, #ef4444))" : "var(--theme-surface-hover, #f3f4f6)",
                        color: plan.popular ? "#fff" : "var(--theme-text-primary)",
                      }}
                    >
                      اشترك الآن
                    </Link>
                  </div>
                </Reveal>
              ))}
            </div>
          )}

          <Reveal>
            <p className="text-center mt-8 text-sm" style={{ color: "var(--theme-text-tertiary, #9ca3af)" }}>
              🎁 تجربة مجانية يومين — بدون بطاقة ائتمان
            </p>
          </Reveal>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  4. HOW IT WORKS                                              */}
      {/* ============================================================ */}
      <section className="py-20 px-4" style={{ background: "var(--theme-page-bg, #f9fafb)" }}>
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-4" style={{ color: "var(--theme-text-primary)" }}>
              إزاي تبدأ؟ 🤷‍♂️
            </h2>
            <p className="text-center text-lg mb-14" style={{ color: "var(--theme-text-secondary)" }}>
              4 خطوات بس وهتبدأ رحلتك
            </p>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((s, i) => (
              <Reveal key={i}>
                <div className="flex flex-col items-center text-center gap-4">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-extrabold text-white shadow-lg"
                    style={{ background: "var(--theme-cta-gradient, linear-gradient(135deg, #f97316, #ef4444))" }}
                  >
                    {s.num}
                  </div>
                  {/* connector line on desktop */}
                  {i < steps.length - 1 && (
                    <div className="hidden lg:block absolute" />
                  )}
                  <h3 className="text-lg font-bold" style={{ color: "var(--theme-text-primary)" }}>
                    {s.title}
                  </h3>
                  <p className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>
                    {s.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  5. STATS                                                     */}
      {/* ============================================================ */}
      <section className="py-20 px-4" style={{ background: "var(--theme-surface-bg, #fff)" }}>
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-14" style={{ color: "var(--theme-text-primary)" }}>
              أرقام بتتكلم 📊
            </h2>
          </Reveal>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <Reveal><StatCard target={15}   suffix="+"   label="مادة دراسية"  icon={BookOpen} /></Reveal>
            <Reveal><StatCard target={200}  suffix="+"   label="سؤال لكل مادة" icon={Target} /></Reveal>
            <Reveal><StatCard target={1000} suffix="+"   label="طالب مشترك"   icon={Users} /></Reveal>
            <Reveal><StatCard target={24}   suffix="/7"  label="دعم AI"       icon={Clock} /></Reveal>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  6. CTA                                                       */}
      {/* ============================================================ */}
      <section className="py-16 px-4">
        <Reveal>
          <div
            className="max-w-4xl mx-auto rounded-3xl py-16 px-8 text-center shadow-2xl relative overflow-hidden"
            style={{ background: "var(--theme-hero-gradient, linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%))" }}
          >
            {/* glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center gap-6">
              <h2 className="text-3xl md:text-4xl font-extrabold text-white">
                جاهز تبدأ؟ 🎓
              </h2>
              <p className="text-lg text-white/80 max-w-md">
                انضم لآلاف الطلاب اللي بيذاكروا بذكاء مع منهج AI
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-10 py-4 rounded-xl text-lg font-bold text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
                style={{ background: "var(--theme-cta-gradient, linear-gradient(135deg, #f97316, #ef4444))" }}
              >
                ابدأ تجربتك المجانية الآن
                <Rocket className="w-5 h-5" />
              </Link>
              <p className="text-sm text-white/60">
                بدون بطاقة ائتمان • يومين مجاناً
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ============================================================ */}
      {/*  7. FOOTER                                                    */}
      {/* ============================================================ */}
      <footer
        className="pt-16 pb-8 px-4"
        style={{ background: "var(--theme-footer-bg, #111827)", color: "#d1d5db" }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            {/* brand */}
            <div className="flex flex-col gap-4">
              <span className="text-2xl font-extrabold text-white">
                منهج AI 🎓
              </span>
              <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
                منصة تعليمية ذكية مصممة لطلاب الثانوية العامة في مصر. بنستخدم الذكاء الاصطناعي عشان نساعدك تذاكر بذكاء وتحقق أعلى الدرجات.
              </p>
            </div>

            {/* quick links */}
            <div className="flex flex-col gap-4">
              <span className="text-lg font-bold text-white">روابط سريعة</span>
              <ul className="flex flex-col gap-2">
                {quickLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm hover:text-white transition-colors"
                      style={{ color: "#9ca3af" }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* contact */}
            <div className="flex flex-col gap-4">
              <span className="text-lg font-bold text-white">تواصل معنا</span>
              <div className="flex items-center gap-2 text-sm" style={{ color: "#9ca3af" }}>
                <Mail className="w-4 h-4" />
                <a href="mailto:support@manhaj-ai.com" className="hover:text-white transition-colors">
                  support@manhaj-ai.com
                </a>
              </div>
              {/* social icons */}
              <div className="flex gap-3 mt-2">
                {["فيسبوك", "تويتر", "يوتيوب", "إنستغرام"].map((social) => (
                  <button
                    key={social}
                    aria-label={social}
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold transition-colors"
                    style={{ background: "#1f2937", color: "#9ca3af" }}
                  >
                    {social.charAt(0)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* bottom bar */}
          <div
            className="border-t pt-6 text-center text-sm"
            style={{ borderColor: "#1f2937", color: "#6b7280" }}
          >
            © 2025 منهج AI — جميع الحقوق محفوظة ❤️
          </div>
        </div>
      </footer>

      {/* ---- global utility styles ---- */}
      <style jsx global>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.75; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
