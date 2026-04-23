// =============================================================================
// Manhaj AI — Email Service (Resend)
// =============================================================================

import { getSecret } from '@/lib/secrets';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

/**
 * Send an email via Resend API.
 * API key is read from system_secrets table (key: RESEND_API_KEY).
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const apiKey = await getSecret('RESEND_API_KEY');
    
    if (!apiKey) {
      console.warn('[Email] No RESEND_API_KEY configured');
      return { success: false, error: 'مفتاح البريد غير مهيأ' };
    }

    const fromAddress = options.from || 'Manhaj AI <noreply@manhaj-ai.com>';

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromAddress,
        to: options.to,
        subject: options.subject,
        html: options.html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Email] Resend error:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error('[Email] Error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Email templates
 */
export const emailTemplates = {
  welcome: (name: string) => ({
    subject: '🎓 أهلاً بيك في منهج AI!',
    html: `
      <div dir="rtl" style="font-family: 'Cairo', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #3B82F6;">مرحباً ${name} 👋</h1>
        <p>أهلاً بيك في منصة <strong>منهج AI</strong> — المنصة التعليمية الذكية لطلاب الثانوية العامة!</p>
        <p>عندك تجربة مجانية يومين تقدر تستكشف فيها كل حاجة:</p>
        <ul>
          <li>📚 شروحات لكل المواد</li>
          <li>🤖 أستاذك الذكي — شات AI بيساعدك</li>
          <li>📝 بنك أسئلة ضخم</li>
          <li>📊 تقارير أداء أسبوعية</li>
        </ul>
        <a href="https://manhaj-ai.com/dashboard" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #3B82F6, #7C3AED); color: white; border-radius: 8px; text-decoration: none; font-weight: bold;">
          ابدأ المذاكرة 🚀
        </a>
        <p style="color: #6B7280; font-size: 14px; margin-top: 20px;">بالتوفيق! — فريق منهج AI</p>
      </div>
    `,
  }),

  trialExpiring: (name: string) => ({
    subject: '⏰ التجربة المجانية هتنتهي بكرا!',
    html: `
      <div dir="rtl" style="font-family: 'Cairo', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #F59E0B;">يا ${name}! ⏰</h1>
        <p>التجربة المجانية بتاعتك على منهج AI هتنتهي بكرا.</p>
        <p>اشترك دلوقتي عشان تفضل تتعلم وتتفوق! 🌟</p>
        <a href="https://manhaj-ai.com/subscribe" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #3B82F6, #7C3AED); color: white; border-radius: 8px; text-decoration: none; font-weight: bold;">
          اشترك دلوقتي 💳
        </a>
      </div>
    `,
  }),

  weeklyReport: (name: string, stats: { exams: number; avgScore: number; streak: number }) => ({
    subject: '📊 تقرير أدائك الأسبوعي',
    html: `
      <div dir="rtl" style="font-family: 'Cairo', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #3B82F6;">أهلاً ${name}! 📊</h1>
        <p>ده تقرير أدائك الأسبوعي:</p>
        <div style="background: #F3F4F6; padding: 20px; border-radius: 12px; margin: 16px 0;">
          <p>📝 <strong>الامتحانات:</strong> ${stats.exams} امتحان</p>
          <p>🎯 <strong>متوسط الدرجات:</strong> ${stats.avgScore}%</p>
          <p>🔥 <strong>أيام متتالية:</strong> ${stats.streak} يوم</p>
        </div>
        <a href="https://manhaj-ai.com/dashboard" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #3B82F6, #7C3AED); color: white; border-radius: 8px; text-decoration: none; font-weight: bold;">
          كمّل مذاكرة 🚀
        </a>
      </div>
    `,
  }),
};
