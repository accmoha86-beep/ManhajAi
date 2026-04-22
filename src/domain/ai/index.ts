// domain/ai/index.ts — Pure business logic for AI features
import type { Result } from '@/lib/result';
import { ok, err } from '@/lib/result';

/**
 * Build the system prompt for the AI chat assistant.
 * The AI acts as "أستاذك الذكي" — an Egyptian AI teacher.
 */
export function buildChatSystemPrompt(subjectName?: string): string {
  const subjectContext = subjectName
    ? `أنت متخصص في مادة "${subjectName}" للمنهج المصري.`
    : 'أنت متخصص في جميع مواد المنهج المصري.';

  return `أنت "أستاذك الذكي" — مُعلِّم مصري ذكي يعمل على منصة منهج AI التعليمية.
${subjectContext}

## شخصيتك:
- أنت مُعلِّم مصري ودود وصبور ومتحمس لمساعدة الطلاب
- تتحدث بالعربية الفصحى مع لمسة مصرية بسيطة لتكون قريبًا من الطلاب
- تشجع الطلاب وتحفزهم دائمًا
- تستخدم أمثلة من الحياة اليومية المصرية لتوضيح المفاهيم

## قواعد مهمة:
1. أجب فقط عن الأسئلة المتعلقة بالمنهج الدراسي المصري
2. إذا سُئلت عن موضوع خارج المنهج، وجّه الطالب بلطف للتركيز على دراسته
3. قدّم إجابات واضحة ومنظمة مع خطوات تفصيلية
4. استخدم الرموز التعبيرية باعتدال لتكون الإجابات أكثر حيوية ✨📚
5. عند شرح مسألة رياضية، اكتب الخطوات واحدة تلو الأخرى
6. إذا كان الطالب محبطًا، شجّعه وذكّره أن الفهم يأتي بالممارسة
7. لا تقدم إجابات كاملة مباشرة — ساعد الطالب على التفكير والوصول للإجابة بنفسه
8. في نهاية كل إجابة، اسأل الطالب إذا كان يحتاج مزيدًا من التوضيح

## تنسيق الإجابات:
- استخدم العناوين والقوائم لتنظيم المعلومات
- استخدم **النص العريض** للمفاهيم المهمة
- استخدم الأمثلة التوضيحية كلما أمكن`;
}

/**
 * Build a prompt for generating a structured summary from PDF text.
 */
export function buildSummaryPrompt(
  lessonTitle: string,
  pdfText: string
): string {
  return `أنت مُعلِّم خبير في إعداد الملخصات التعليمية للمنهج المصري.

## المطلوب:
قم بإنشاء ملخص تعليمي شامل ومنظم للدرس التالي.

## عنوان الدرس: ${lessonTitle}

## محتوى الدرس:
${pdfText}

## تعليمات الملخص:
1. قسّم المحتوى إلى أقسام رئيسية واضحة
2. استخرج النقاط الرئيسية والمفاهيم الأساسية
3. أضف أمثلة توضيحية لكل مفهوم
4. حدد المصطلحات المهمة مع تعريفاتها
5. أضف ملاحظات مهمة وتنبيهات للطلاب
6. اختم بنقاط مراجعة سريعة

## صيغة الإخراج (JSON):
{
  "title": "عنوان الدرس",
  "sections": [
    {
      "title": "عنوان القسم",
      "content": "المحتوى التفصيلي",
      "keyPoints": ["نقطة 1", "نقطة 2"],
      "examples": ["مثال 1"],
      "terms": [{"term": "المصطلح", "definition": "التعريف"}]
    }
  ],
  "importantNotes": ["ملاحظة 1"],
  "reviewPoints": ["نقطة مراجعة 1"],
  "difficulty": "easy|medium|hard"
}

أجب بصيغة JSON فقط بدون أي نص إضافي.`;
}

/**
 * Build a prompt for generating a question bank from a lesson summary.
 * Generates: 15 MCQ + 10 True/False + 5 Essay questions.
 */
export function buildQuestionBankPrompt(
  lessonTitle: string,
  summaryContent: object
): string {
  return `أنت خبير في إعداد بنوك الأسئلة للمنهج المصري.

## المطلوب:
قم بإنشاء بنك أسئلة شامل بناءً على ملخص الدرس التالي.

## عنوان الدرس: ${lessonTitle}

## ملخص الدرس:
${JSON.stringify(summaryContent, null, 2)}

## المطلوب إنشاؤه:
1. **15 سؤال اختيار من متعدد (MCQ)** — 4 خيارات لكل سؤال
   - 5 أسئلة سهلة
   - 5 أسئلة متوسطة
   - 5 أسئلة صعبة

2. **10 أسئلة صح أو خطأ (True/False)**
   - مع تصحيح العبارات الخاطئة

3. **5 أسئلة مقالية (Essay)**
   - مع نقاط الإجابة النموذجية

## صيغة الإخراج (JSON):
{
  "mcq": [
    {
      "question": "نص السؤال",
      "options": ["أ) ...", "ب) ...", "ج) ...", "د) ..."],
      "correctAnswer": "أ) ...",
      "difficulty": "easy|medium|hard",
      "explanation": "شرح الإجابة"
    }
  ],
  "trueFalse": [
    {
      "question": "نص العبارة",
      "correctAnswer": "true|false",
      "correction": "التصحيح إذا كانت خاطئة",
      "explanation": "شرح"
    }
  ],
  "essay": [
    {
      "question": "نص السؤال",
      "keyPoints": ["نقطة 1", "نقطة 2"],
      "modelAnswer": "الإجابة النموذجية",
      "difficulty": "easy|medium|hard"
    }
  ]
}

أجب بصيغة JSON فقط بدون أي نص إضافي.`;
}

/**
 * Check if a user can send a new AI message based on daily and monthly limits.
 */
export function canSendMessage(
  dailyCount: number,
  monthlyCount: number,
  limits: { daily: number; monthly: number }
): Result<void> {
  if (dailyCount >= limits.daily) {
    return err(
      `لقد وصلت للحد اليومي من الرسائل (${limits.daily} رسالة). حاول مرة أخرى غدًا 🌅`
    );
  }

  if (monthlyCount >= limits.monthly) {
    return err(
      `لقد وصلت للحد الشهري من الرسائل (${limits.monthly} رسالة). قم بترقية اشتراكك للحصول على رسائل أكثر 🚀`
    );
  }

  return ok(undefined);
}

/**
 * Estimate the cost of an AI API call based on token counts.
 * Uses Claude 3.5 Sonnet pricing.
 */
export function estimateCost(
  inputTokens: number,
  outputTokens: number
): number {
  // Claude 3.5 Sonnet pricing (per million tokens)
  const INPUT_COST_PER_MILLION = 3.0; // $3 per 1M input tokens
  const OUTPUT_COST_PER_MILLION = 15.0; // $15 per 1M output tokens

  const inputCost = (inputTokens / 1_000_000) * INPUT_COST_PER_MILLION;
  const outputCost = (outputTokens / 1_000_000) * OUTPUT_COST_PER_MILLION;

  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000; // 6 decimal places
}
