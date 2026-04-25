import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PDFDocument } from 'pdf-lib';

// ===== CONFIG =====
const INITIAL_PAGES_PER_CHUNK = 5;
const MAX_CHUNK_BYTES = 8 * 1024 * 1024; // 8MB per chunk for Vision OCR
const QUESTIONS_PER_ROUND = 40;
const QUESTION_ROUNDS = 5;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// ===== SUPPORTED FILE TYPES =====
type FileCategory = 'pdf' | 'image' | 'word' | 'excel' | 'powerpoint' | 'text';

function getFileCategory(mimeType: string, fileName: string): FileCategory {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  if (mimeType === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (mimeType.startsWith('image/') || ['png','jpg','jpeg','webp','gif','bmp','tiff','tif'].includes(ext)) return 'image';
  if (mimeType.includes('wordprocessingml') || mimeType === 'application/msword' || ['docx','doc'].includes(ext)) return 'word';
  if (mimeType.includes('spreadsheetml') || mimeType === 'application/vnd.ms-excel' || ['xlsx','xls','csv'].includes(ext)) return 'excel';
  if (mimeType.includes('presentationml') || mimeType === 'application/vnd.ms-powerpoint' || ['pptx','ppt'].includes(ext)) return 'powerpoint';
  if (mimeType.startsWith('text/') || ['txt','md','rtf','csv'].includes(ext)) return 'text';
  return 'text';
}

const CATEGORY_LABELS: Record<FileCategory, string> = {
  pdf: '📄 PDF', image: '🖼️ صورة', word: '📝 Word',
  excel: '📊 Excel', powerpoint: '📋 PowerPoint', text: '📃 نص',
};

// ===== MAIN HANDLER — SYNCHRONOUS (no fire-and-forget) =====
export async function POST(request: NextRequest) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  let jobId: string | null = null;

  try {
    // Auth check
    const authHeader = request.headers.get('authorization') || '';
    const cookieToken = request.cookies.get('auth-token')?.value;
    const token = authHeader.replace('Bearer ', '') || cookieToken || '';
    if (!token) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const lessonId = formData.get('lessonId') as string;
    const subjectId = formData.get('subjectId') as string;
    const clientJobId = formData.get('jobId') as string | null;

    if (!file || !lessonId) {
      return NextResponse.json({ error: 'الملف ومعرّف الدرس مطلوبين' }, { status: 400 });
    }

    // File size check
    const { data: maxSizeSetting } = await supabase.rpc('get_system_secret', { p_key: 'MAX_FILE_SIZE_MB' });
    const maxSizeMB = parseInt(maxSizeSetting || '200');
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      return NextResponse.json({ error: `حجم الملف (${fileSizeMB.toFixed(1)} MB) أكبر من الحد (${maxSizeMB} MB)` }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || 'application/octet-stream';
    const fileName = file.name || 'unknown';
    const category = getFileCategory(mimeType, fileName);

    // Create job (use client-provided jobId if available for polling)
    const { data: createdJobId, error: jobError } = await supabase.rpc('create_content_job', {
      p_lesson_id: lessonId,
      p_subject_id: subjectId || null,
      p_file_name: fileName,
      p_file_size: file.size,
      p_job_id: clientJobId || null,
    });

    if (jobError || !createdJobId) {
      console.error('[ContentGenerate] Job error:', jobError);
      return NextResponse.json({ error: 'فشل في إنشاء المهمة' }, { status: 500 });
    }

    jobId = createdJobId;
    console.log(`[Job ${jobId}] Started — ${fileSizeMB.toFixed(1)}MB ${CATEGORY_LABELS[category]}`);

    // Helper to update job progress in DB
    const updateJob = async (params: any) => {
      await supabase.rpc('update_content_job', { p_job_id: jobId, ...params })
        .catch((e: any) => console.error('[Job Update]', e.message));
    };

    // ═══════════════════════════════════════
    // PHASE 1: SETUP
    // ═══════════════════════════════════════
    await updateJob({ p_status: 'processing', p_progress: 5, p_message: '⚙️ جاري تحميل الإعدادات...' });

    const { data: apiKey } = await supabase.rpc('get_system_secret', { p_key: 'anthropic_api_key' });
    if (!apiKey) {
      await updateJob({ p_status: 'failed', p_error: '❌ مفتاح API غير موجود — اذهب إلى 🔑 المفاتيح وأضف anthropic_api_key' });
      return NextResponse.json({ error: 'مفتاح API غير موجود' }, { status: 500 });
    }

    const { data: model } = await supabase.rpc('get_system_secret', { p_key: 'AI_CONTENT_MODEL' });
    const aiModel = model || 'claude-sonnet-4-6';

    // ═══════════════════════════════════════
    // PHASE 2: EXTRACT TEXT
    // ═══════════════════════════════════════
    await updateJob({ p_progress: 8, p_message: `${CATEGORY_LABELS[category]} جاري تحليل "${fileName}"...` });

    let extractedText = '';
    try {
      switch (category) {
        case 'word':
          extractedText = await extractFromWord(fileBuffer, updateJob);
          break;
        case 'excel':
          extractedText = await extractFromExcel(fileBuffer, updateJob);
          break;
        case 'powerpoint':
          extractedText = await extractFromPowerPoint(fileBuffer, updateJob);
          break;
        case 'text':
          extractedText = await extractFromText(fileBuffer, fileName, updateJob);
          break;
        case 'pdf':
          extractedText = await extractFromPdf(fileBuffer, apiKey, aiModel, updateJob);
          break;
        case 'image':
          extractedText = await extractFromImage(fileBuffer, mimeType, apiKey, aiModel, updateJob);
          break;
      }
    } catch (extractErr: any) {
      console.error(`[Job ${jobId}] Extract error:`, extractErr.message);
      await updateJob({ p_status: 'failed', p_error: `فشل في قراءة الملف: ${extractErr.message?.slice(0, 200)}` });
      return NextResponse.json({ error: `فشل في قراءة الملف: ${extractErr.message}` }, { status: 500 });
    }

    if (!extractedText || extractedText.length < 50) {
      await updateJob({ p_status: 'failed', p_error: '❌ لم يتم استخراج نص كافٍ — تأكد أن الملف يحتوي على محتوى مقروء' });
      return NextResponse.json({ error: 'لم يتم استخراج نص كافٍ' }, { status: 500 });
    }

    await updateJob({
      p_progress: 40,
      p_message: `✅ تم استخراج النص (${Math.round(extractedText.length / 1000)}k حرف) — جاري إنشاء الملخص...`,
    });

    // ═══════════════════════════════════════
    // PHASE 3: GENERATE SUMMARY
    // ═══════════════════════════════════════
    const summaryPrompt = `أنت معلم خبير. اكتب ملخصاً شاملاً ومنظماً للمحتوى التالي باللغة العربية. قسّم الملخص إلى عناوين رئيسية وفرعية. اشرح المفاهيم بوضوح. أضف أمثلة عملية.\n\nالمحتوى:\n${extractedText.slice(0, 100000)}`;

    const summaryResult = await callClaude(apiKey, aiModel, summaryPrompt, 4000);
    if (!summaryResult.success) {
      await updateJob({ p_status: 'failed', p_error: `فشل في إنشاء الملخص: ${summaryResult.error}` });
      return NextResponse.json({ error: `فشل في إنشاء الملخص` }, { status: 500 });
    }

    const mergedSummary = summaryResult.text!;

    // Save summary to DB
    await supabase.rpc('admin_save_summary', {
      p_lesson_id: lessonId,
      p_content: mergedSummary,
    });

    await updateJob({
      p_progress: 55, p_summary_text: mergedSummary.slice(0, 500),
      p_message: '✅ تم الملخص — جاري توليد الأسئلة...',
    });

    // ═══════════════════════════════════════
    // PHASE 4: GENERATE QUESTIONS (5 rounds × 40)
    // ═══════════════════════════════════════
    const roundDefs = [
      { focus: 'تذكر واستدعاء', type: 'recall' },
      { focus: 'فهم واستيعاب', type: 'comprehension' },
      { focus: 'تطبيق وتحليل', type: 'application' },
      { focus: 'تحليل ومقارنة', type: 'analysis' },
      { focus: 'أنماط الامتحانات', type: 'exam_patterns' },
    ];

    let totalQuestions = 0;

    for (let r = 0; r < QUESTION_ROUNDS; r++) {
      const round = roundDefs[r];
      const pct = 55 + Math.round(((r + 1) / QUESTION_ROUNDS) * 40);
      await updateJob({
        p_progress: pct,
        p_message: `📋 الجولة ${r + 1}/5: ${round.focus} (${totalQuestions} سؤال حتى الآن)...`,
      });

      const qPrompt = `أنت خبير في إنشاء الأسئلة التعليمية. بناءً على المحتوى التالي، أنشئ ${QUESTIONS_PER_ROUND} سؤال متنوع.
التركيز: ${round.focus}
أنواع الأسئلة: اختيار من متعدد (4 خيارات)، صح/غلط، مقالي قصير.

المحتوى:
${extractedText.slice(0, 80000)}

أرجع JSON فقط بدون أي نص آخر:
[{"question_ar": "...", "type": "mcq|true_false|essay", "options": ["أ","ب","ج","د"], "correct_answer": 0, "explanation_ar": "...", "difficulty": "easy|medium|hard"}]`;

      const qResult = await callClaude(apiKey, aiModel, qPrompt, 8000);
      if (qResult.success && qResult.text) {
        try {
          let jsonStr = qResult.text.trim();
          const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
          if (jsonMatch) jsonStr = jsonMatch[0];
          const questions = JSON.parse(jsonStr);

          if (Array.isArray(questions)) {
            for (const q of questions) {
              try {
                await supabase.rpc('admin_save_questions', {
                  p_lesson_id: lessonId,
                  p_questions: JSON.stringify([q]),
                });
                totalQuestions++;
              } catch {}
            }
          }
        } catch (parseErr) {
          console.warn(`[Job ${jobId}] Round ${r + 1} parse error — skipping`);
        }
      }
    }

    // ═══════════════════════════════════════
    // PHASE 5: COMPLETE
    // ═══════════════════════════════════════
    await updateJob({
      p_status: 'completed', p_progress: 100, p_questions_count: totalQuestions,
      p_message: `✅ تم بنجاح! ${CATEGORY_LABELS[category]} → ملخص + ${totalQuestions} سؤال`,
    });

    console.log(`[Job ${jobId}] DONE — ${totalQuestions} questions`);

    return NextResponse.json({
      success: true,
      jobId,
      summary: true,
      questions: { total: totalQuestions },
      message: `تم بنجاح! ملخص + ${totalQuestions} سؤال`,
    });

  } catch (err: any) {
    console.error('[ContentGenerate] FATAL:', err);
    if (jobId) {
      await supabase.rpc('update_content_job', {
        p_job_id: jobId, p_status: 'failed',
        p_error: `خطأ: ${err.message?.slice(0, 300)}`,
      }).catch(() => {});
    }
    return NextResponse.json({ error: `خطأ: ${err.message?.slice(0, 200)}` }, { status: 500 });
  }
}

// ═══════════════════════════════════════
// CLAUDE API CALL
// ═══════════════════════════════════════
async function callClaude(apiKey: string, model: string, prompt: string, maxTokens: number, imageData?: { base64: string, mimeType: string }): Promise<{ success: boolean; text?: string; error?: string }> {
  try {
    const content: any[] = [];
    if (imageData) {
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: imageData.mimeType, data: imageData.base64 },
      });
    }
    content.push({ type: 'text', text: prompt });

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'user', content }] }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[Claude] ${res.status}:`, errBody.slice(0, 300));
      if (res.status === 413) return { success: false, error: 'الملف كبير جداً — حاول ملف أصغر' };
      return { success: false, error: `خطأ Claude: ${res.status}` };
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || '';
    return { success: true, text };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ═══════════════════════════════════════
// TEXT EXTRACTION FUNCTIONS
// ═══════════════════════════════════════

async function extractFromWord(buffer: Buffer, updateJob: Function): Promise<string> {
  await updateJob({ p_progress: 15, p_message: '📝 جاري قراءة ملف Word — فوري بدون OCR...' });
  try {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  } catch (err: any) {
    console.error('[Word Extract]', err.message);
    throw new Error('فشل في قراءة ملف Word: ' + err.message);
  }
}

async function extractFromExcel(buffer: Buffer, updateJob: Function): Promise<string> {
  await updateJob({ p_progress: 15, p_message: '📊 جاري قراءة ملف Excel — فوري بدون OCR...' });
  try {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    let text = '';
    workbook.eachSheet((sheet: any) => {
      text += `\n\n=== ${sheet.name} ===\n`;
      sheet.eachRow((row: any) => {
        const values = row.values as any[];
        if (values) {
          const rowText = values.slice(1).filter(Boolean).map((v: any) =>
            typeof v === 'object' && v.text ? v.text : String(v)
          ).join(' | ');
          if (rowText.trim()) text += rowText + '\n';
        }
      });
    });
    return text;
  } catch (err: any) {
    console.error('[Excel Extract]', err.message);
    throw new Error('فشل في قراءة ملف Excel: ' + err.message);
  }
}

async function extractFromPowerPoint(buffer: Buffer, updateJob: Function): Promise<string> {
  await updateJob({ p_progress: 15, p_message: '📋 جاري قراءة ملف PowerPoint — فوري بدون OCR...' });
  try {
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(buffer);
    let text = '';
    let slideNum = 0;
    const entries = zip.getEntries();
    const slideEntries = entries
      .filter((e: any) => e.entryName.match(/ppt\/slides\/slide\d+\.xml/))
      .sort((a: any, b: any) => {
        const numA = parseInt(a.entryName.match(/slide(\d+)/)?.[1] || '0');
        const numB = parseInt(b.entryName.match(/slide(\d+)/)?.[1] || '0');
        return numA - numB;
      });

    for (const entry of slideEntries) {
      slideNum++;
      const xml = entry.getData().toString('utf8');
      const textMatches = xml.match(/<a:t>([^<]*)<\/a:t>/g);
      if (textMatches) {
        text += `\n\n=== سلايد ${slideNum} ===\n`;
        text += textMatches.map((m: string) => m.replace(/<\/?a:t>/g, '')).join(' ');
      }
    }
    return text;
  } catch (err: any) {
    console.error('[PPTX Extract]', err.message);
    throw new Error('فشل في قراءة ملف PowerPoint: ' + err.message);
  }
}

async function extractFromText(buffer: Buffer, fileName: string, updateJob: Function): Promise<string> {
  await updateJob({ p_progress: 15, p_message: '📃 جاري قراءة الملف النصي...' });
  const ext = fileName.toLowerCase().split('.').pop();
  if (ext === 'csv') {
    return buffer.toString('utf-8').split('\n').map(row => row.replace(/,/g, ' | ')).join('\n');
  }
  return buffer.toString('utf-8');
}

async function extractFromPdf(
  fileBuffer: Buffer, apiKey: string, aiModel: string, updateJob: Function
): Promise<string> {
  // Smart chunking: split PDF into small chunks for OCR
  const pdfDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
  const totalPages = pdfDoc.getPageCount();

  // Determine chunk size based on file size
  const fileSizeMB = fileBuffer.length / (1024 * 1024);
  let pagesPerChunk = INITIAL_PAGES_PER_CHUNK;
  if (fileSizeMB > 30) pagesPerChunk = 3;
  if (fileSizeMB > 50) pagesPerChunk = 2;
  if (fileSizeMB > 100) pagesPerChunk = 1;

  const chunks: Array<{ startPage: number; endPage: number; label: string }> = [];
  for (let start = 0; start < totalPages; start += pagesPerChunk) {
    const end = Math.min(start + pagesPerChunk, totalPages);
    chunks.push({ startPage: start, endPage: end, label: ` (صفحات ${start + 1}-${end})` });
  }

  await updateJob({
    p_total_pages: totalPages, p_total_chunks: chunks.length, p_progress: 10,
    p_message: `📄 ${totalPages} صفحة — جاري استخراج النص من ${chunks.length} جزء...`,
  });

  let allText = '';

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const pct = 10 + Math.round(((i + 1) / chunks.length) * 28);
    await updateJob({
      p_processed_chunks: i, p_progress: pct,
      p_message: `🔤 استخراج النص — الجزء ${i + 1}/${chunks.length}${chunk.label}...`,
    });

    try {
      // Extract chunk pages as new PDF
      const chunkPdf = await PDFDocument.create();
      const pages = await chunkPdf.copyPages(pdfDoc, Array.from({ length: chunk.endPage - chunk.startPage }, (_, j) => chunk.startPage + j));
      pages.forEach(p => chunkPdf.addPage(p));
      const chunkBytes = await chunkPdf.save();
      const chunkBase64 = Buffer.from(chunkBytes).toString('base64');

      // Check if chunk is too large
      if (chunkBase64.length > MAX_CHUNK_BYTES * 1.33) {
        // Too large for Vision — skip this chunk
        console.warn(`[PDF] Chunk ${i + 1} too large (${(chunkBase64.length / 1024 / 1024).toFixed(1)}MB) — skipping`);
        continue;
      }

      const ocrResult = await callClaude(apiKey, aiModel,
        'استخرج كل النص الموجود في هذه الصفحات باللغة العربية. أرجع النص فقط بدون تعليقات.',
        4000,
        { base64: chunkBase64, mimeType: 'application/pdf' }
      );

      if (ocrResult.success && ocrResult.text) {
        allText += ocrResult.text + '\n\n';
      }
    } catch (chunkErr: any) {
      console.warn(`[PDF] Chunk ${i + 1} error:`, chunkErr.message);
    }
  }

  return allText;
}

async function extractFromImage(
  fileBuffer: Buffer, mimeType: string, apiKey: string, aiModel: string, updateJob: Function
): Promise<string> {
  await updateJob({ p_total_chunks: 1, p_progress: 15, p_message: '🔤 جاري استخراج النص من الصورة...' });

  const base64 = fileBuffer.toString('base64');
  const mediaType = mimeType.startsWith('image/') ? mimeType : 'image/png';

  const result = await callClaude(apiKey, aiModel,
    'استخرج كل النص الموجود في هذه الصورة باللغة العربية. أرجع النص فقط.',
    4000,
    { base64, mimeType: mediaType }
  );

  if (!result.success) throw new Error(result.error || 'فشل OCR');
  return result.text || '';
}

// Config for route
export const maxDuration = 600; // 10 min (Vercel only, Railway uses custom server)
export const dynamic = 'force-dynamic';
