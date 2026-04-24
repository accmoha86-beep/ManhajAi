// app/api/content/generate/route.ts — Admin: Generate AI content from PDF or Image
// Supports LARGE PDFs by auto-splitting into page chunks
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';
import { getSecret } from '@/lib/secrets';
import { PDFDocument } from 'pdf-lib';

export const maxDuration = 300; // 5 min timeout for AI generation

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Max size per Claude API request (~18MB base64 = ~13.5MB raw)
const MAX_CHUNK_SIZE_MB = 13;
const PAGES_PER_CHUNK = 15;

// Supported file types
const ALLOWED_TYPES: Record<string, string> = {
  'application/pdf': 'application/pdf',
  'image/png': 'image/png',
  'image/jpeg': 'image/jpeg',
  'image/jpg': 'image/jpeg',
  'image/webp': 'image/webp',
};

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

    // Validate file type
    const mediaType = ALLOWED_TYPES[file.type];
    if (!mediaType) {
      return NextResponse.json(
        { error: 'صيغة الملف غير مدعومة. الصيغ المدعومة: PDF, PNG, JPG, WEBP' },
        { status: 400 }
      );
    }

    // Read max file size from admin settings (default 200MB)
    const maxSizeMB = parseInt(await getSecret('MAX_FILE_SIZE_MB') || '200', 10) || 200;
    if (file.size > maxSizeMB * 1024 * 1024) {
      return NextResponse.json({ error: `حجم الملف يتجاوز ${maxSizeMB} ميجابايت` }, { status: 400 });
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

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const isPdf = file.type === 'application/pdf';
    const lessonTitle = lesson.title_ar as string;

    // Get Anthropic API key + content model from DB
    const [apiKey, contentModel] = await Promise.all([
      getSecret('anthropic_api_key'),
      getSecret('AI_CONTENT_MODEL'),
    ]);
    if (!apiKey) {
      return NextResponse.json({ error: 'مفتاح AI غير مهيأ' }, { status: 500 });
    }
    const model = contentModel || 'claude-sonnet-4-6';

    // ═══════════════════════════════════════════════════════
    // SMART CHUNKING: Split large PDFs into page chunks
    // ═══════════════════════════════════════════════════════
    
    let pdfChunks: Buffer[] = [];
    let totalPages = 0;
    const isLargePdf = isPdf && fileBuffer.length > MAX_CHUNK_SIZE_MB * 1024 * 1024;

    if (isLargePdf) {
      // Split PDF into smaller chunks
      console.log(`[ContentGenerate] Large PDF detected (${(fileBuffer.length / 1024 / 1024).toFixed(1)} MB) — splitting into chunks...`);
      
      try {
        const srcDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
        totalPages = srcDoc.getPageCount();
        console.log(`[ContentGenerate] PDF has ${totalPages} pages — splitting into chunks of ${PAGES_PER_CHUNK} pages`);

        for (let startPage = 0; startPage < totalPages; startPage += PAGES_PER_CHUNK) {
          const endPage = Math.min(startPage + PAGES_PER_CHUNK, totalPages);
          const chunkDoc = await PDFDocument.create();
          const pages = await chunkDoc.copyPages(srcDoc, Array.from({ length: endPage - startPage }, (_, i) => startPage + i));
          pages.forEach(page => chunkDoc.addPage(page));
          const chunkBytes = await chunkDoc.save();
          pdfChunks.push(Buffer.from(chunkBytes));
          console.log(`[ContentGenerate] Chunk ${pdfChunks.length}: pages ${startPage + 1}-${endPage} (${(chunkBytes.length / 1024 / 1024).toFixed(1)} MB)`);
        }
      } catch (pdfError) {
        console.error('[ContentGenerate] PDF split error:', pdfError);
        // Fallback: try to process first pages only
        return NextResponse.json({ 
          error: `فشل تقسيم الـ PDF. جرّب رفع فصل واحد بدل الكتاب كله — هيكون أسرع والنتيجة أدق 💡`
        }, { status: 400 });
      }
    } else if (isPdf) {
      // Small PDF — process as single chunk
      pdfChunks = [fileBuffer];
      try {
        const doc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
        totalPages = doc.getPageCount();
      } catch { totalPages = 0; }
    }

    // ═══════════════════════════════════════════════════════
    // STEP 1: Generate Summary
    // ═══════════════════════════════════════════════════════

    console.log(`[ContentGenerate] Generating summary for: ${lessonTitle} (${isPdf ? `PDF — ${totalPages} pages, ${pdfChunks.length} chunk(s)` : 'Image'})`);

    let combinedSummary: SummaryData;

    if (!isPdf) {
      // Image — send directly
      const base64Data = fileBuffer.toString('base64');
      const fileBlock = { type: 'image' as const, source: { type: 'base64' as const, media_type: mediaType, data: base64Data } };
      
      const summaryResponse = await callClaudeVision(apiKey, {
        system: 'أنت مُعلِّم خبير في إعداد الملخصات التعليمية للمنهج المصري. اقرأ المحتوى من الملف المرفق وأنشئ ملخصاً تعليمياً. أجب بصيغة JSON فقط.',
        fileBlock,
        prompt: buildSummaryPrompt(lessonTitle),
        maxTokens: 8192,
        model,
      });

      if (!summaryResponse.ok) {
        return NextResponse.json({ error: `فشل الملخص: ${summaryResponse.error}` }, { status: 500 });
      }

      try {
        combinedSummary = JSON.parse(extractJSON(summaryResponse.content));
      } catch {
        combinedSummary = { title: lessonTitle, sections: [{ title: 'ملخص', content: summaryResponse.content }] };
      }

    } else {
      // PDF — process chunk by chunk and merge summaries
      const chunkSummaries: SummaryData[] = [];

      for (let i = 0; i < pdfChunks.length; i++) {
        const chunk = pdfChunks[i];
        const chunkBase64 = chunk.toString('base64');
        const fileBlock = { type: 'document' as const, source: { type: 'base64' as const, media_type: 'application/pdf', data: chunkBase64 } };

        const chunkLabel = pdfChunks.length > 1 
          ? ` (الجزء ${i + 1} من ${pdfChunks.length})`
          : '';

        console.log(`[ContentGenerate] Processing summary chunk ${i + 1}/${pdfChunks.length} (${(chunk.length / 1024 / 1024).toFixed(1)} MB)`);

        const summaryResponse = await callClaudeVision(apiKey, {
          system: 'أنت مُعلِّم خبير في إعداد الملخصات التعليمية للمنهج المصري. اقرأ المحتوى من الملف المرفق وأنشئ ملخصاً تعليمياً. أجب بصيغة JSON فقط.',
          fileBlock,
          prompt: buildSummaryPrompt(lessonTitle + chunkLabel),
          maxTokens: 8192,
          model,
        });

        if (summaryResponse.ok) {
          try {
            const parsed = JSON.parse(extractJSON(summaryResponse.content));
            chunkSummaries.push(parsed);
          } catch {
            chunkSummaries.push({ title: lessonTitle, sections: [{ title: `ملخص${chunkLabel}`, content: summaryResponse.content }] });
          }
        } else {
          console.error(`[ContentGenerate] Summary chunk ${i + 1} failed:`, summaryResponse.error);
        }

        // Delay between API calls
        if (i < pdfChunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // Merge chunk summaries into one
      if (chunkSummaries.length === 0) {
        return NextResponse.json({ error: 'فشل في إنشاء الملخص — جرّب ملف أصغر' }, { status: 500 });
      }

      combinedSummary = mergeSummaries(lessonTitle, chunkSummaries);
    }

    // Save summary via RPC
    const { error: summaryError } = await supabase.rpc('admin_save_summary', {
      p_admin_id: user.id,
      p_lesson_id: lessonId,
      p_content_ar: combinedSummary,
      p_source_pdf_url: `lessons/${lessonId}/${file.name}`,
    });
    if (summaryError) {
      console.error('[ContentGenerate] Save summary error:', summaryError);
    }

    // ═══════════════════════════════════════════════════════
    // STEP 2: Generate Questions (5 rounds — text-based for speed)
    // ═══════════════════════════════════════════════════════

    console.log(`[ContentGenerate] Generating questions for: ${lessonTitle}`);
    const allQuestions: GeneratedQuestion[] = [];
    const previousTexts: string[] = [];

    // Extract text from summary for question generation (faster than re-reading PDF)
    const summaryText = typeof combinedSummary === 'object' 
      ? JSON.stringify(combinedSummary, null, 2).slice(0, 20000) 
      : String(combinedSummary).slice(0, 20000);

    for (const round of QUESTION_ROUNDS) {
      try {
        console.log(`[ContentGenerate] Round ${round.id}: ${round.name}`);
        
        // Round 1 uses first chunk visually (if available), rest use text
        let qResponse;
        
        if (round.id === 1 && pdfChunks.length > 0 && isPdf) {
          // First round: use first chunk of PDF for visual accuracy
          const firstChunkBase64 = pdfChunks[0].toString('base64');
          const fileBlock = { type: 'document' as const, source: { type: 'base64' as const, media_type: 'application/pdf', data: firstChunkBase64 } };
          
          qResponse = await callClaudeVision(apiKey, {
            system: `أنت خبير في إعداد بنوك الأسئلة — الجولة ${round.id}: ${round.name}. أجب بصيغة JSON فقط.`,
            fileBlock,
            prompt: buildQuestionPrompt(lessonTitle, '', round, previousTexts.slice(-100)),
            maxTokens: 8192,
            model,
          });
        } else if (round.id === 1 && !isPdf) {
          // Image: use original image for first round
          const base64Data = fileBuffer.toString('base64');
          const fileBlock = { type: 'image' as const, source: { type: 'base64' as const, media_type: mediaType, data: base64Data } };
          
          qResponse = await callClaudeVision(apiKey, {
            system: `أنت خبير في إعداد بنوك الأسئلة — الجولة ${round.id}: ${round.name}. أجب بصيغة JSON فقط.`,
            fileBlock,
            prompt: buildQuestionPrompt(lessonTitle, '', round, previousTexts.slice(-100)),
            maxTokens: 8192,
            model,
          });
        } else {
          // Rounds 2-5: use extracted summary text (faster, no file upload needed)
          qResponse = await callClaudeText(apiKey, {
            system: `أنت خبير في إعداد بنوك الأسئلة — الجولة ${round.id}: ${round.name}. أجب بصيغة JSON فقط.`,
            prompt: buildQuestionPrompt(lessonTitle, summaryText, round, previousTexts.slice(-100)),
            maxTokens: 8192,
            model,
          });
        }

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
      if (round.id < QUESTION_ROUNDS.length) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    // Save questions via RPC
    if (allQuestions.length > 0) {
      const BATCH_SIZE = 50;
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

        const { error: batchError } = await supabase.rpc('admin_save_questions', {
          p_admin_id: user.id,
          p_questions: batch,
        });
        if (batchError) {
          console.error(`[ContentGenerate] Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, batchError);
        }
      }
    }

    // Update lesson status
    try {
      await supabase.rpc('admin_update_lesson_content', {
        p_admin_id: user.id,
        p_lesson_id: lessonId,
        p_source_pdf_url: `lessons/${lessonId}/${file.name}`,
      });
    } catch (e) {
      console.error('[ContentGenerate] Update lesson content error:', e);
    }

    return NextResponse.json({
      success: true,
      message: isLargePdf 
        ? `تم إنشاء المحتوى بنجاح! 🎉 تم تقسيم الكتاب (${totalPages} صفحة) إلى ${pdfChunks.length} أجزاء ومعالجتها`
        : 'تم إنشاء المحتوى بنجاح! 🎉',
      fileType: isPdf ? 'PDF' : 'صورة',
      pages: totalPages,
      chunks: pdfChunks.length,
      summary: {
        generated: true,
        sectionsCount: combinedSummary?.sections?.length || 0,
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

// ─── Summary Merge ────────────────────────────────────────────────

interface SummarySection {
  title: string;
  content: string;
  keyPoints?: string[];
  examples?: string[];
  terms?: { term: string; definition: string }[];
}

interface SummaryData {
  title: string;
  sections: SummarySection[];
  importantNotes?: string[];
  reviewPoints?: string[];
  difficulty?: string;
}

function mergeSummaries(title: string, summaries: SummaryData[]): SummaryData {
  const allSections: SummarySection[] = [];
  const allNotes: string[] = [];
  const allReviewPoints: string[] = [];

  for (const s of summaries) {
    if (s.sections) allSections.push(...s.sections);
    if (s.importantNotes) allNotes.push(...s.importantNotes);
    if (s.reviewPoints) allReviewPoints.push(...s.reviewPoints);
  }

  return {
    title,
    sections: allSections,
    importantNotes: [...new Set(allNotes)],
    reviewPoints: [...new Set(allReviewPoints)],
    difficulty: summaries[0]?.difficulty || 'medium',
  };
}

// ─── Claude API Helpers ───────────────────────────────────────────

interface ClaudeResult {
  ok: boolean;
  content: string;
  error?: string;
}
type ClaudeOk = ClaudeResult & { ok: true; content: string };
type ClaudeFail = ClaudeResult & { ok: false; error: string };

async function callClaudeVision(
  apiKey: string,
  params: {
    system: string;
    fileBlock: { type: string; source: { type: string; media_type: string; data: string } };
    prompt: string;
    maxTokens?: number;
    model?: string;
  }
): Promise<ClaudeOk | ClaudeFail> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: params.model || 'claude-sonnet-4-6',
      max_tokens: params.maxTokens || 4096,
      system: params.system,
      messages: [{
        role: 'user',
        content: [
          params.fileBlock,
          { type: 'text', text: params.prompt },
        ],
      }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    return { ok: false, content: '', error: `API error ${response.status}: ${errText.slice(0, 300)}` };
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '';
  if (!text) {
    return { ok: false, content: '', error: 'لم يتم الحصول على رد' };
  }
  return { ok: true, content: text };
}

async function callClaudeText(
  apiKey: string,
  params: { system: string; prompt: string; maxTokens?: number; model?: string }
): Promise<ClaudeOk | ClaudeFail> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: params.model || 'claude-sonnet-4-6',
      max_tokens: params.maxTokens || 4096,
      system: params.system,
      messages: [{ role: 'user', content: params.prompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    return { ok: false, content: '', error: `API error ${response.status}: ${errText.slice(0, 300)}` };
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
  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0];
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

function buildSummaryPrompt(title: string): string {
  return `## المطلوب:
اقرأ المحتوى من الملف المرفق (PDF أو صورة) وقم بإنشاء ملخص تعليمي شامل ومنظم.

## عنوان الدرس: ${title}

## تعليمات:
1. اقرأ كل المحتوى المرئي في الملف المرفق بعناية
2. قسّم المحتوى إلى أقسام رئيسية واضحة
3. استخرج النقاط الرئيسية والمفاهيم الأساسية
4. أضف أمثلة توضيحية لكل مفهوم
5. حدد المصطلحات المهمة مع تعريفاتها
6. أضف ملاحظات مهمة وتنبيهات للطلاب
7. اختم بنقاط مراجعة سريعة

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

  const contentSection = text
    ? `\n## محتوى الدرس:\n${text.slice(0, 15000)}\n`
    : '\n## اقرأ المحتوى من الملف المرفق\n';

  return `## عنوان الدرس: ${title}
${contentSection}
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
