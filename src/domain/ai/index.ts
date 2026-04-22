// domain/ai/index.ts — Pure business logic for AI features (Enhanced with 200+ question batch system)
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

// =============================================================================
// 200+ QUESTION BATCH GENERATION SYSTEM
// =============================================================================

export interface QuestionRound {
  id: number;
  name: string;
  focus: string;
  types: { mcq: number; trueFalse: number; essay: number };
}

/**
 * 5 rounds of question generation with different cognitive focuses.
 * Each round: ~30 MCQ + 10 T/F + 5 Essay = ~45 questions
 * Total: 5 rounds × 45 = 225+ unique questions
 */
export const QUESTION_ROUNDS: QuestionRound[] = [
  {
    id: 1,
    name: 'التذكر والاسترجاع',
    focus: 'recall',
    types: { mcq: 30, trueFalse: 10, essay: 5 },
  },
  {
    id: 2,
    name: 'الفهم والاستيعاب',
    focus: 'understanding',
    types: { mcq: 30, trueFalse: 10, essay: 5 },
  },
  {
    id: 3,
    name: 'التطبيق والحل',
    focus: 'application',
    types: { mcq: 30, trueFalse: 10, essay: 5 },
  },
  {
    id: 4,
    name: 'التحليل والتقييم',
    focus: 'analysis',
    types: { mcq: 30, trueFalse: 10, essay: 5 },
  },
  {
    id: 5,
    name: 'أسئلة على نمط الامتحان',
    focus: 'exam_style',
    types: { mcq: 30, trueFalse: 10, essay: 5 },
  },
];

const FOCUS_INSTRUCTIONS: Record<string, string> = {
  recall: `ركز على أسئلة التذكر والاسترجاع:
- تعريفات ومصطلحات أساسية
- حقائق ومعلومات مباشرة
- تواريخ وأرقام وأسماء مهمة
- قوانين وقواعد أساسية`,
  understanding: `ركز على أسئلة الفهم والاستيعاب:
- شرح المفاهيم بالكلمات الخاصة
- المقارنة بين المفاهيم المتشابهة
- تفسير الظواهر والعلاقات
- إعادة صياغة المعلومات`,
  application: `ركز على أسئلة التطبيق والحل:
- مسائل عملية تحتاج تطبيق القوانين
- أمثلة من الحياة الواقعية
- حل مشكلات باستخدام المعرفة المكتسبة
- تطبيق النظريات على حالات جديدة`,
  analysis: `ركز على أسئلة التحليل والتقييم:
- تحليل النصوص والبيانات
- استنتاج العلاقات غير المباشرة
- تقييم الحلول المختلفة
- نقد ومقارنة الآراء والنظريات`,
  exam_style: `ركز على أسئلة بنمط امتحانات الثانوية العامة المصرية:
- أسئلة مشابهة لأسئلة الامتحانات الفعلية
- مستوى صعوبة متنوع (سهل، متوسط، صعب)
- أسئلة تقيس الفهم العميق
- أسئلة مركبة تجمع بين عدة مفاهيم`,
};

/**
 * Build a prompt for generating a batch of questions with anti-duplication.
 * Output format matches DB columns: question_ar, options (string[]), correct_answer (0-based index), explanation_ar, difficulty
 */
export function buildQuestionBatchPrompt(
  lessonTitle: string,
  content: string,
  round: QuestionRound,
  previousQuestions: string[] = []
): string {
  const focusInstructions = FOCUS_INSTRUCTIONS[round.focus] || FOCUS_INSTRUCTIONS.recall;
  const prevSection = previousQuestions.length > 0
    ? `\n## ⚠️ أسئلة سابقة يجب عدم تكرارها:\n${previousQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n\nيجب أن تكون جميع الأسئلة الجديدة مختلفة تمامًا عن الأسئلة السابقة.\n`
    : '';

  return `أنت خبير في إعداد بنوك الأسئلة للمنهج المصري — الجولة ${round.id}: ${round.name}.

## عنوان الدرس: ${lessonTitle}

## محتوى الدرس:
${content}

## التركيز المطلوب:
${focusInstructions}
${prevSection}
## المطلوب إنشاؤه:
1. **${round.types.mcq} سؤال اختيار من متعدد (MCQ)** — 4 خيارات لكل سؤال
   - ${Math.floor(round.types.mcq * 0.3)} أسئلة سهلة
   - ${Math.floor(round.types.mcq * 0.4)} أسئلة متوسطة
   - ${round.types.mcq - Math.floor(round.types.mcq * 0.3) - Math.floor(round.types.mcq * 0.4)} أسئلة صعبة

2. **${round.types.trueFalse} أسئلة صح أو خطأ (true_false)** — مع تصحيح العبارات الخاطئة

3. **${round.types.essay} أسئلة مقالية (essay)** — مع نقاط الإجابة النموذجية

## صيغة الإخراج (JSON) — يجب الالتزام بهذه الصيغة بالضبط:
{
  "questions": [
    {
      "question_ar": "نص السؤال",
      "type": "mcq",
      "options": ["الخيار أ", "الخيار ب", "الخيار ج", "الخيار د"],
      "correct_answer": 0,
      "explanation_ar": "شرح الإجابة الصحيحة",
      "difficulty": "easy"
    },
    {
      "question_ar": "نص عبارة الصح والخطأ",
      "type": "true_false",
      "options": ["صح", "خطأ"],
      "correct_answer": 0,
      "explanation_ar": "التصحيح والشرح",
      "difficulty": "medium"
    },
    {
      "question_ar": "نص السؤال المقالي",
      "type": "essay",
      "options": [],
      "correct_answer": 0,
      "explanation_ar": "الإجابة النموذجية ونقاط الإجابة",
      "difficulty": "hard"
    }
  ]
}

## ملاحظات مهمة:
- correct_answer هو رقم الفهرس (يبدأ من 0) للخيار الصحيح
- options هي مصفوفة من النصوص (string[])
- difficulty: "easy" أو "medium" أو "hard"
- type: "mcq" أو "true_false" أو "essay"
- كل سؤال يجب أن يكون فريدًا ومختلفًا

أجب بصيغة JSON فقط بدون أي نص إضافي.`;
}

/**
 * Legacy compatibility — calls buildQuestionBatchPrompt with round 1
 */
export function buildQuestionBankPrompt(
  lessonTitle: string,
  summaryContent: object
): string {
  return buildQuestionBatchPrompt(
    lessonTitle,
    JSON.stringify(summaryContent, null, 2),
    QUESTION_ROUNDS[0],
    []
  );
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
  const INPUT_COST_PER_MILLION = 3.0;
  const OUTPUT_COST_PER_MILLION = 15.0;

  const inputCost = (inputTokens / 1_000_000) * INPUT_COST_PER_MILLION;
  const outputCost = (outputTokens / 1_000_000) * OUTPUT_COST_PER_MILLION;

  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
}
