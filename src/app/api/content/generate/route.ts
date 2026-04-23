// app/api/content/generate/route.ts — Admin: Generate AI content from PDF
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';
import { getSecret } from '@/lib/secrets';

export const maxDuration = 300; // 5 min timeout for AI generation

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    // Authenticate admin
    const authResult = await getAuthUser(request);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }
    const user = authResult.data;
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'غير مصرح لك بهذا الإجراء' }, { status: 403 });
    }

    // Parse FormData
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const lessonId = formData.get('lessonId') as string | null;
    const subjectId = formData.get('subjectId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'لم يتم رفع أي ملف' }, { status: 400 });
    }
    if (!lessonId) {
      return NextResponse.json({ error: 'معرف الدرس مطلوب' }, { status: 400 });
    }

    // Validate PDF
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'يجب أن يكون الملف بصيغة PDF فقط' }, { status: 400 });
    }
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'حجم الملف يتجاوز 50 ميجابايت' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Get lesson info via RPC
    const { data: lessonsResult } = await supabase.rpc('admin_list_lessons', {
      p_admin_id: user.id,
      p_subject_id: subjectId || '00000000-0000-0000-0000-000000000000',
    });
    
    const lessons = lessonsResult?.lessons || [];
    const lesson = lessons.find((l: Record<string, unknown>) => l.id === lessonId);
    
    if (!lesson) {
      return NextResponse.json({ error: 'الدرس غير موجود' }, { status: 404 });
    }

    // Extract text from PDF
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    let pdfText: string;
    try {
      const pdfParse = (await import('pdf-parse')).default;
      const pdfData = await pdfParse(fileBuffer);
      pdfText = pdfData.text;
    } catch (parseError) {
      console.error('[ContentGenerate] PDF parse failed:', parseError);
      return NextResponse.json({ error: 'فشل في قراءة ملف الـ PDF' }, { status: 400 });
    }

    if (!pdfText || pdfText.trim().length < 50) {
      return NextResponse.json(
        { error: 'محتوى الـ PDF قصير جدًا أو غير قابل للقراءة' },
        { status: 400 }
      );
    }

    const lessonTitle = lesson.title_ar as string;

    // Get Anthropic API key
    const apiKey = await getSecret('anthropic_api_key');
    if (!apiKey) {
      return NextResponse.json({ error: 'مفتاح AI غير مهيأ' }, { status: 500 });
    }

    // Step 1: Generate summary
    console.log(`[ContentGenerate] Generating summary for: ${lessonTitle}`);
    const summaryResponse = await callClaude(apiKey, {
      system: 'أنت مُعلِّم خبير في إعداد الملخصات التعليمية للمنهج المصري. أجب بصيغة JSON فقط.',
      prompt: buildSummaryPrompt(lessonTitle, pdfText),
      maxTokens: 8192,
    });

    if (!summaryResponse.ok) {
      return NextResponse.json({ error: `فشل الملخص: ${summaryResponse.error}` }, { status: 500 });
    }

    const summary = JSON.parse(extractJSON(summaryResponse.content));

    // Save summary via RPC
    const { error: summaryError } = await supabase.rpc('admin_save_summary', {
      p_admin_id: user.id,
      p_lesson_id: lessonId,
      p_content_ar: summary,
      p_source_pdf_url: `lessons/${lessonId}/${file.name}`,
    });
    if (summaryError) {
      console.error('[ContentGenerate] Save summary error:', summaryError);
    }

    // Step 2: Generate questions in 5 rounds
    console.log(`[ContentGenerate] Generating questions for: ${lessonTitle}`);
    const allQuestions: GeneratedQuestion[] = [];
    const previousTexts: string[] = [];
    const rounds = QUESTION_ROUNDS;

    for (const round of rounds) {
      try {
        console.log(`[ContentGenerate] Round ${round.id}: ${round.name}`);
        const qResponse = await callClaude(apiKey, {
          system: `أنت خبير في إعداد بنوك الأسئلة — الجولة ${round.id}: ${round.name}. أجب بصيغة JSON فقط.`,
          prompt: buildQuestionPrompt(lessonTitle, pdfText, round, previousTexts.slice(-100)),
          maxTokens: 8192,
        });

        if (qResponse.ok) {
          const parsed = JSON.parse(extractJSON(qResponse.content));
          const questions = (parsed.questions || []).filter(
            (q: GeneratedQuestion) =>
              q.question_ar && q.type && Array.isArray(q.options) &&
              typeof q.correct_answer === 'number' && q.explanation_ar
          );
          allQuestions.push(...questions);
          questions.forEach((q: GeneratedQuestion) => previousTexts.push(q.question_ar));
        } else {
          console.error(`[ContentGenerate] Round ${round.id} failed:`, qResponse.error);
        }
      } catch (roundError) {
        console.error(`[ContentGenerate] Round ${round.id} error:`, roundError);
      }

      // Delay between rounds
      if (round.id < rounds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Save questions via RPC
    if (allQuestions.length > 0) {
      const BATCH_SIZE = 50;
      let insertedTotal = 0;

      for (let i = 0; i < allQuestions.length; i += BATCH_SIZE) {
        const batch = allQuestions.slice(i, i + BATCH_SIZE).map(q => ({
          lesson_id: lessonId,
          subject_id: subjectId || lesson.subject_id,
          question_ar: q.question_ar,
          type: q.type,
          options: q.options,
          correct_answer: q.correct_answer,
          explanation_ar: q.explanation_ar,
          difficulty: q.difficulty || 'medium',
        }));

        const { data: batchResult, error: batchError } = await supabase.rpc('admin_save_questions', {
          p_admin_id: user.id,
          p_questions: batch,
        });

        if (batchError) {
          console.error(`[ContentGenerate] Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, batchError);
        } else {
          insertedTotal += (batchResult as { inserted?: number })?.inserted || batch.length;
        }
      }
    }

    // Update lesson status via RPC
    await supabase.rpc('admin_update_lesson_content', {
      p_admin_id: user.id,
      p_lesson_id: lessonId,
      p_source_pdf_url: `lessons/${lessonId}/${file.name}`,
    });

    return NextResponse.json({
      success: true,
      message: 'تم إنشاء المحتوى بنجاح! 🎉',
      summary: {
        generated: true,
        sectionsCount: summary?.sections?.length || 0,
      },
      questions: {
        total: allQuestions.length,
        mcq: allQuestions.filter(q => q.type === 'mcq').length,
        trueFalse: allQuestions.filter(q => q.type === 'true_false').length,
        essay: allQuestions.filter(q => q.type === 'essay').length,
      },
    });
  } catch (error) {
    console.error('[ContentGenerate] Unexpected error:', error);
    const msg = error instanceof Error ? error.message : 'خطأ غير متوقع';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── Claude API Helper ────────────────────────────────────────────

interface ClaudeResult {
  ok: boolean;
  content: string;
  error?: string;
}

async function callClaude(
  apiKey: string,
  params: { system: string; prompt: string; maxTokens?: number }
): Promise<ClaudeResult & { ok: true; content: string } | ClaudeResult & { ok: false; error: string }> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-7',
      max_tokens: params.maxTokens || 4096,
      system: params.system,
      messages: [{ role: 'user', content: params.prompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    return { ok: false, content: '', error: `API error ${response.status}: ${errText.slice(0, 200)}` };
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '';
  if (!text) {
    return { ok: false, content: '', error: 'لم يتم الحصول على رد' };
  }

  return { ok: true, content: text };
}

function extractJSON(text: string): string {
  let jsonText = text.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  return jsonText;
}

// ─── Question Types & Rounds ──────────────────────────────────────

interface GeneratedQuestion {
  question_ar: string;
  type: 'mcq' | 'true_false' | 'essay';
  options: string[];
  correct_answer: number;
  explanation_ar: string;
  difficulty: string;
}

interface QuestionRound {
  id: number;
  name: string;
  focus: string;
  types: { mcq: number; trueFalse: number; essay: number };
}

const QUESTION_ROUNDS: QuestionRound[] = [
  { id: 1, name: 'التذكر والاسترجاع', focus: 'recall', types: { mcq: 30, trueFalse: 10, essay: 5 } },
  { id: 2, name: 'الفهم والاستيعاب', focus: 'understanding', types: { mcq: 30, trueFalse: 10, essay: 5 } },
  { id: 3, name: 'التطبيق والحل', focus: 'application', types: { mcq: 30, trueFalse: 10, essay: 5 } },
  { id: 4, name: 'التحليل والتقييم', focus: 'analysis', types: { mcq: 30, trueFalse: 10, essay: 5 } },
  { id: 5, name: 'أسئلة نمط الامتحان', focus: 'exam_style', types: { mcq: 30, trueFalse: 10, essay: 5 } },
];

// ─── Prompts ──────────────────────────────────────────────────────

function buildSummaryPrompt(title: string, text: string): string {
  return `أنت مُعلِّم خبير في إعداد الملخصات التعليمية للمنهج المصري.

## المطلوب:
قم بإنشاء ملخص تعليمي شامل ومنظم للدرس التالي.

## عنوان الدرس: ${title}

## محتوى الدرس:
${text.slice(0, 20000)}

## تعليمات:
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

const FOCUS_MAP: Record<string, string> = {
  recall: 'ركز على التذكر: تعريفات، حقائق، قوانين أساسية',
  understanding: 'ركز على الفهم: شرح المفاهيم، المقارنة، تفسير الظواهر',
  application: 'ركز على التطبيق: مسائل عملية، حل مشكلات',
  analysis: 'ركز على التحليل: استنتاج العلاقات، تقييم الحلول، نقد',
  exam_style: 'ركز على نمط امتحانات الثانوية العامة المصرية الفعلية',
};

function buildQuestionPrompt(title: string, text: string, round: QuestionRound, prevQuestions: string[]): string {
  const prevSection = prevQuestions.length > 0
    ? `\n## أسئلة سابقة (لا تكررها):\n${prevQuestions.slice(-50).map((q, i) => `${i + 1}. ${q}`).join('\n')}\n`
    : '';

  return `## عنوان الدرس: ${title}

## محتوى الدرس:
${text.slice(0, 15000)}

## التركيز: الجولة ${round.id} — ${round.name}
${FOCUS_MAP[round.focus] || ''}
${prevSection}
## المطلوب:
- ${round.types.mcq} سؤال MCQ (4 خيارات)
- ${round.types.trueFalse} سؤال صح/خطأ
- ${round.types.essay} سؤال مقالي

## صيغة JSON:
{
  "questions": [
    {
      "question_ar": "نص السؤال",
      "type": "mcq",
      "options": ["أ", "ب", "ج", "د"],
      "correct_answer": 0,
      "explanation_ar": "الشرح",
      "difficulty": "easy|medium|hard"
    }
  ]
}

أجب بصيغة JSON فقط.`;
}
