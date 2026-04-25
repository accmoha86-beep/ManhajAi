import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PDFDocument } from 'pdf-lib';

// Config
const MAX_CHUNK_BYTES = 8 * 1024 * 1024; // 8MB per chunk (safe for Claude base64)
const INITIAL_PAGES_PER_CHUNK = 5;
const QUESTIONS_PER_ROUND = 40;
const QUESTION_ROUNDS = 5; // 5 rounds × 40 = 200 questions

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// ===== MAIN HANDLER — Returns immediately with jobId =====
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const authHeader = request.headers.get('authorization') || '';
    const cookieToken = request.cookies.get('auth-token')?.value;
    const token = authHeader.replace('Bearer ', '') || cookieToken || '';
    
    if (!token) {
      return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    }

    // Verify admin
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Parse FormData
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const lessonId = formData.get('lessonId') as string;
    const subjectId = formData.get('subjectId') as string;

    if (!file || !lessonId) {
      return NextResponse.json({ error: 'الملف ومعرّف الدرس مطلوبين' }, { status: 400 });
    }

    // Check file size from DB settings
    const { data: maxSizeSetting } = await supabase.rpc('get_system_secret', { p_key: 'MAX_FILE_SIZE_MB' });
    const maxSizeMB = parseInt(maxSizeSetting || '200');
    const fileSizeMB = file.size / (1024 * 1024);
    
    if (fileSizeMB > maxSizeMB) {
      return NextResponse.json({ 
        error: `حجم الملف (${fileSizeMB.toFixed(1)} MB) أكبر من الحد المسموح (${maxSizeMB} MB)` 
      }, { status: 400 });
    }

    // Read file buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileBase64 = fileBuffer.toString('base64');
    const mimeType = file.type || 'application/pdf';
    const isPdf = mimeType === 'application/pdf' || file.name?.endsWith('.pdf');

    // Create job in DB — returns immediately
    const { data: jobId, error: jobError } = await supabase.rpc('create_content_job', {
      p_lesson_id: lessonId,
      p_subject_id: subjectId || null,
      p_file_name: file.name || 'unknown',
      p_file_size: file.size,
    });

    if (jobError || !jobId) {
      console.error('[ContentGenerate] Job creation error:', jobError);
      return NextResponse.json({ error: 'فشل في إنشاء مهمة المعالجة' }, { status: 500 });
    }

    console.log(`[ContentGenerate] Job ${jobId} created — starting background processing`);

    // 🔥 FIRE AND FORGET — Process in background
    processContentInBackground(jobId, lessonId, subjectId, fileBuffer, fileBase64, mimeType, isPdf, file.name || '', supabase)
      .catch(err => {
        console.error(`[ContentGenerate] Background job ${jobId} fatal error:`, err);
        supabase.rpc('update_content_job', {
          p_job_id: jobId,
          p_status: 'failed',
          p_error: `خطأ غير متوقع: ${err.message?.slice(0, 200)}`,
        }).catch(() => {});
      });

    // Return immediately with jobId
    return NextResponse.json({
      success: true,
      jobId,
      message: `بدأت المعالجة — الملف ${fileSizeMB.toFixed(1)} MB`,
    });

  } catch (err: any) {
    console.error('[ContentGenerate] Request error:', err);
    return NextResponse.json({ 
      error: `خطأ: ${err.message?.slice(0, 200)}` 
    }, { status: 500 });
  }
}

// ===== BACKGROUND PROCESSING =====
async function processContentInBackground(
  jobId: string,
  lessonId: string,
  subjectId: string,
  fileBuffer: Buffer,
  fileBase64: string,
  mimeType: string,
  isPdf: boolean,
  fileName: string,
  supabase: any
) {
  const updateJob = async (params: any) => {
    await supabase.rpc('update_content_job', { p_job_id: jobId, ...params }).catch((e: any) => 
      console.error('[Job Update Error]', e.message)
    );
  };

  try {
    // Get API key + model
    await updateJob({ p_status: 'processing', p_progress: 5, p_message: 'جاري تحميل الإعدادات...' });
    
    const { data: apiKey } = await supabase.rpc('get_system_secret', { p_key: 'anthropic_api_key' });
    if (!apiKey) {
      await updateJob({ p_status: 'failed', p_error: 'مفتاح Anthropic API غير موجود — اذهب إلى 🔑 المفاتيح وأضف anthropic_api_key' });
      return;
    }

    const { data: model } = await supabase.rpc('get_system_secret', { p_key: 'AI_CONTENT_MODEL' });
    const aiModel = model || 'claude-sonnet-4-20250514';

    // Get lesson info
    const { data: lessonData } = await supabase.from('lessons').select('title_ar, subject_id').eq('id', lessonId).single();
    const lessonTitle = lessonData?.title_ar || 'درس';
    const effectiveSubjectId = subjectId || lessonData?.subject_id;

    await updateJob({ p_progress: 10, p_message: `جاري تحليل ${fileName}...` });

    // ===== STEP 1: Split PDF into chunks =====
    let chunks: { buffer: Buffer; base64: string; label: string }[] = [];

    if (isPdf) {
      try {
        const srcDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
        const totalPages = srcDoc.getPageCount();
        await updateJob({ p_total_pages: totalPages, p_message: `📄 ${totalPages} صفحة — جاري التقسيم...` });

        let pagesPerChunk = Math.min(INITIAL_PAGES_PER_CHUNK, totalPages);

        for (let startPage = 0; startPage < totalPages; ) {
          const endPage = Math.min(startPage + pagesPerChunk, totalPages);
          const chunkDoc = await PDFDocument.create();
          const pageIndices = Array.from({ length: endPage - startPage }, (_, i) => startPage + i);
          const copiedPages = await chunkDoc.copyPages(srcDoc, pageIndices);
          copiedPages.forEach(page => chunkDoc.addPage(page));
          const chunkBytes = await chunkDoc.save();

          // If chunk is too big, reduce pages
          if (chunkBytes.length > MAX_CHUNK_BYTES && pagesPerChunk > 1) {
            pagesPerChunk = Math.max(1, Math.floor(pagesPerChunk / 2));
            console.log(`[Job ${jobId}] Chunk too big (${(chunkBytes.length / 1024 / 1024).toFixed(1)}MB) — reducing to ${pagesPerChunk} pages/chunk`);
            continue;
          }

          const chunkBuf = Buffer.from(chunkBytes);
          chunks.push({
            buffer: chunkBuf,
            base64: chunkBuf.toString('base64'),
            label: totalPages > pagesPerChunk ? ` (صفحات ${startPage + 1}-${endPage})` : '',
          });
          startPage = endPage;
        }

        await updateJob({ 
          p_total_chunks: chunks.length, 
          p_progress: 15, 
          p_message: `✂️ تم التقسيم إلى ${chunks.length} جزء — جاري إنشاء الملخصات...` 
        });
        console.log(`[Job ${jobId}] PDF split into ${chunks.length} chunks`);

      } catch (pdfErr: any) {
        console.error(`[Job ${jobId}] PDF split error:`, pdfErr);
        // Fallback: try as single chunk if small enough
        if (fileBuffer.length < MAX_CHUNK_BYTES) {
          chunks = [{ buffer: fileBuffer, base64: fileBase64, label: '' }];
        } else {
          await updateJob({ p_status: 'failed', p_error: 'فشل في تقسيم الـ PDF — جرّب حفظه مرة تانية أو ارفع فصل واحد' });
          return;
        }
      }
    } else {
      // Image file — single chunk
      chunks = [{ buffer: fileBuffer, base64: fileBase64, label: '' }];
      await updateJob({ p_total_chunks: 1, p_progress: 15, p_message: 'جاري قراءة الصورة...' });
    }

    // ===== STEP 2: Generate summaries for each chunk =====
    const chunkSummaries: string[] = [];
    const summaryProgressStart = 15;
    const summaryProgressEnd = 50;
    const progressPerChunk = (summaryProgressEnd - summaryProgressStart) / chunks.length;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkNum = i + 1;
      
      await updateJob({ 
        p_processed_chunks: i,
        p_progress: Math.round(summaryProgressStart + i * progressPerChunk),
        p_message: `📝 ملخص الجزء ${chunkNum}/${chunks.length}${chunk.label}...`
      });

      const summaryResult = await callClaudeVision(apiKey, {
        model: aiModel,
        system: 'أنت مُعلِّم خبير في إعداد الملخصات التعليمية للمنهج المصري. اقرأ المحتوى وأنشئ ملخصاً تعليمياً شاملاً ومنظماً.',
        fileBase64: chunk.base64,
        mimeType: isPdf ? 'application/pdf' : mimeType,
        prompt: `اقرأ هذا الملف وأنشئ ملخصاً تعليمياً لدرس "${lessonTitle}${chunk.label}". 
اكتب الملخص بأسلوب واضح ومنظم يناسب طلاب الثانوية العامة في مصر.
رتّب المحتوى في أقسام مع عناوين واضحة. اشرح المفاهيم الصعبة ببساطة.
أجب بنص عادي (ليس JSON) — عناوين الأقسام بخط عريض.`,
        maxTokens: 4096,
      });

      if (summaryResult.ok) {
        chunkSummaries.push(summaryResult.content);
        console.log(`[Job ${jobId}] Summary chunk ${chunkNum}/${chunks.length} done ✅`);
      } else if (summaryResult.error === '413_TOO_LARGE') {
        console.warn(`[Job ${jobId}] Chunk ${chunkNum} too large — skipping`);
        chunkSummaries.push(`[الجزء ${chunkNum} كبير جداً — تم تخطيه]`);
      } else {
        console.error(`[Job ${jobId}] Summary chunk ${chunkNum} failed:`, summaryResult.error);
        chunkSummaries.push(`[فشل في قراءة الجزء ${chunkNum}]`);
      }
    }

    // ===== STEP 3: Merge summaries =====
    await updateJob({ 
      p_processed_chunks: chunks.length,
      p_progress: 55, 
      p_message: '🔗 جاري دمج الملخصات...' 
    });

    let mergedSummary = '';
    if (chunks.length === 1) {
      mergedSummary = chunkSummaries[0] || '';
    } else {
      // Ask Claude to merge multiple summaries into one coherent summary
      const mergeResult = await callClaudeText(apiKey, {
        model: aiModel,
        system: 'أنت مُعلِّم خبير. ادمج الملخصات التالية في ملخص واحد شامل ومنظم بدون تكرار.',
        prompt: `ادمج الملخصات التالية لدرس "${lessonTitle}" في ملخص واحد شامل ومنظم:\n\n${chunkSummaries.map((s, i) => `--- الجزء ${i + 1} ---\n${s}`).join('\n\n')}\n\nاكتب ملخصاً واحداً شاملاً ومنظماً يغطي كل النقاط بدون تكرار.`,
        maxTokens: 8192,
      });
      mergedSummary = mergeResult.ok ? mergeResult.content : chunkSummaries.join('\n\n---\n\n');
    }

    // Save summary to DB
    const summaryJson = JSON.stringify({
      title: `ملخص ${lessonTitle}`,
      content: mergedSummary,
      pages: chunks.length > 1 ? `${chunks.length} أجزاء` : 'كامل',
    });

    await supabase.rpc('admin_save_summary', {
      p_lesson_id: lessonId,
      p_content: summaryJson,
    });

    await updateJob({ 
      p_progress: 60, 
      p_summary_text: mergedSummary.slice(0, 500),
      p_message: '✅ تم الملخص — جاري توليد الأسئلة...' 
    });

    // ===== STEP 4: Generate questions (5 rounds × 40) =====
    let totalQuestions = 0;
    const questionTypes = [
      { round: 1, focus: 'تذكّر واستدعاء', types: 'اختيار من متعدد + صح/غلط' },
      { round: 2, focus: 'فهم واستيعاب', types: 'اختيار من متعدد' },
      { round: 3, focus: 'تطبيق', types: 'اختيار من متعدد + مقالي قصير' },
      { round: 4, focus: 'تحليل ومقارنة', types: 'مقالي + اختيار من متعدد' },
      { round: 5, focus: 'أنماط الامتحانات', types: 'مثل أسئلة الثانوية العامة' },
    ];

    for (let round = 0; round < QUESTION_ROUNDS; round++) {
      const qType = questionTypes[round];
      const progressBase = 60 + (round * 8); // 60-100%
      
      await updateJob({ 
        p_progress: progressBase,
        p_message: `📋 الجولة ${round + 1}/5: ${qType.focus} (${totalQuestions} سؤال حتى الآن)...`
      });

      // Use first chunk for vision in round 1, text for rest (faster)
      let qResult;
      if (round === 0 && chunks.length > 0) {
        qResult = await callClaudeVision(apiKey, {
          model: aiModel,
          system: 'أنت خبير في إعداد أسئلة امتحانات الثانوية العامة المصرية.',
          fileBase64: chunks[0].base64,
          mimeType: isPdf ? 'application/pdf' : mimeType,
          prompt: buildQuestionsPrompt(lessonTitle, qType.focus, qType.types, QUESTIONS_PER_ROUND, round + 1),
          maxTokens: 8192,
        });
      } else {
        qResult = await callClaudeText(apiKey, {
          model: aiModel,
          system: 'أنت خبير في إعداد أسئلة امتحانات الثانوية العامة المصرية.',
          prompt: `بناءً على الملخص التالي لدرس "${lessonTitle}":\n\n${mergedSummary.slice(0, 6000)}\n\n${buildQuestionsPrompt(lessonTitle, qType.focus, qType.types, QUESTIONS_PER_ROUND, round + 1)}`,
          maxTokens: 8192,
        });
      }

      if (qResult.ok) {
        const questions = parseQuestions(qResult.content);
        if (questions.length > 0) {
          // Save questions to DB
          for (const q of questions) {
            await supabase.rpc('admin_save_questions', {
              p_lesson_id: lessonId,
              p_subject_id: effectiveSubjectId,
              p_questions: JSON.stringify([q]),
            }).catch(() => {});
          }
          totalQuestions += questions.length;
          console.log(`[Job ${jobId}] Round ${round + 1}: ${questions.length} questions saved ✅`);
        }
      } else {
        console.error(`[Job ${jobId}] Questions round ${round + 1} failed:`, qResult.error);
      }
    }

    // ===== DONE! =====
    await updateJob({
      p_status: 'completed',
      p_progress: 100,
      p_questions_count: totalQuestions,
      p_message: `✅ تم بنجاح! ملخص + ${totalQuestions} سؤال`,
    });

    console.log(`[Job ${jobId}] ✅ COMPLETED — ${totalQuestions} questions generated`);

  } catch (err: any) {
    console.error(`[Job ${jobId}] Fatal error:`, err);
    await updateJob({
      p_status: 'failed',
      p_error: `خطأ: ${err.message?.slice(0, 300)}`,
    }).catch(() => {});
  }
}

// ===== CLAUDE API HELPERS =====
async function callClaudeVision(apiKey: string, opts: {
  model: string; system: string; fileBase64: string; mimeType: string; prompt: string; maxTokens: number;
}): Promise<{ ok: boolean; content: string; error?: string }> {
  try {
    const mediaType = opts.mimeType.startsWith('image/') ? opts.mimeType : 'application/pdf';
    const sourceType = mediaType === 'application/pdf' ? 'base64' : 'base64';
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: opts.model,
        max_tokens: opts.maxTokens,
        system: opts.system,
        messages: [{
          role: 'user',
          content: [
            {
              type: mediaType === 'application/pdf' ? 'document' : 'image',
              source: { type: 'base64', media_type: mediaType, data: opts.fileBase64 },
            },
            { type: 'text', text: opts.prompt },
          ],
        }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 413) return { ok: false, content: '', error: '413_TOO_LARGE' };
      if (response.status === 429) return { ok: false, content: '', error: 'Claude مشغول (429) — سيتم المحاولة لاحقاً' };
      if (response.status === 401) return { ok: false, content: '', error: 'مفتاح API غير صالح' };
      return { ok: false, content: '', error: `API ${response.status}: ${errText.slice(0, 200)}` };
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    return text ? { ok: true, content: text } : { ok: false, content: '', error: 'لم يتم الحصول على رد' };
  } catch (err: any) {
    return { ok: false, content: '', error: `Network: ${err.message?.slice(0, 200)}` };
  }
}

async function callClaudeText(apiKey: string, opts: {
  model: string; system: string; prompt: string; maxTokens: number;
}): Promise<{ ok: boolean; content: string; error?: string }> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: opts.model,
        max_tokens: opts.maxTokens,
        system: opts.system,
        messages: [{ role: 'user', content: opts.prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return { ok: false, content: '', error: `API ${response.status}: ${errText.slice(0, 200)}` };
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    return text ? { ok: true, content: text } : { ok: false, content: '', error: 'لم يتم الحصول على رد' };
  } catch (err: any) {
    return { ok: false, content: '', error: `Network: ${err.message?.slice(0, 200)}` };
  }
}

// ===== QUESTION PARSING =====
function buildQuestionsPrompt(lesson: string, focus: string, types: string, count: number, round: number): string {
  return `أنشئ ${count} سؤال لدرس "${lesson}".
التركيز: ${focus}
أنواع الأسئلة: ${types}
الجولة: ${round}/5

أجب بصيغة JSON array فقط:
[
  {
    "question_ar": "نص السؤال",
    "type": "mcq" أو "true_false" أو "essay",
    "options": ["الخيار أ", "الخيار ب", "الخيار ج", "الخيار د"],
    "correct_answer": 0,
    "explanation_ar": "شرح الإجابة",
    "difficulty": "easy" أو "medium" أو "hard"
  }
]

لأسئلة صح/غلط: options = ["صح", "غلط"], correct_answer = 0 أو 1
لأسئلة مقالية: options = [], correct_answer = -1, وأكتب الإجابة النموذجية في explanation_ar
لأسئلة MCQ: 4 خيارات دائماً`;
}

function parseQuestions(text: string): any[] {
  try {
    // Extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    
    const questions = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(questions)) return [];

    return questions.filter(q => q.question_ar).map(q => ({
      question_ar: q.question_ar,
      type: q.type || 'mcq',
      options: Array.isArray(q.options) ? q.options : [],
      correct_answer: typeof q.correct_answer === 'number' ? q.correct_answer : 0,
      explanation_ar: q.explanation_ar || '',
      difficulty: q.difficulty || 'medium',
    }));
  } catch {
    return [];
  }
}
