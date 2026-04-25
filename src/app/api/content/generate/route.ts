import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PDFDocument } from 'pdf-lib';

// ===== CONFIG =====
const MAX_CHUNK_BYTES = 8 * 1024 * 1024; // 8MB per chunk for Vision OCR
const INITIAL_PAGES_PER_CHUNK = 5;
const QUESTIONS_PER_ROUND = 40;
const QUESTION_ROUNDS = 5;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// ===== SUPPORTED FILE TYPES =====
type FileCategory = 'pdf' | 'image' | 'word' | 'excel' | 'powerpoint' | 'text';

function getFileCategory(mimeType: string, fileName: string): FileCategory {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  
  // PDF
  if (mimeType === 'application/pdf' || ext === 'pdf') return 'pdf';
  
  // Images
  if (mimeType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff', 'tif'].includes(ext)) return 'image';
  
  // Word
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
      mimeType === 'application/msword' || ['docx', 'doc'].includes(ext)) return 'word';
  
  // Excel
  if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
      mimeType === 'application/vnd.ms-excel' || ['xlsx', 'xls', 'csv'].includes(ext)) return 'excel';
  
  // PowerPoint
  if (mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || 
      mimeType === 'application/vnd.ms-powerpoint' || ['pptx', 'ppt'].includes(ext)) return 'powerpoint';
  
  // Text files
  if (mimeType.startsWith('text/') || ['txt', 'md', 'rtf', 'csv'].includes(ext)) return 'text';
  
  // Default — try as text
  return 'text';
}

const CATEGORY_LABELS: Record<FileCategory, string> = {
  pdf: '📄 PDF',
  image: '🖼️ صورة',
  word: '📝 Word',
  excel: '📊 Excel',
  powerpoint: '📋 PowerPoint',
  text: '📃 نص',
};

// ===== MAIN HANDLER =====
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const cookieToken = request.cookies.get('auth-token')?.value;
    const token = authHeader.replace('Bearer ', '') || cookieToken || '';
    if (!token) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });

    const supabase = createClient(supabaseUrl, supabaseKey);
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const lessonId = formData.get('lessonId') as string;
    const subjectId = formData.get('subjectId') as string;

    if (!file || !lessonId) {
      return NextResponse.json({ error: 'الملف ومعرّف الدرس مطلوبين' }, { status: 400 });
    }

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

    const { data: jobId, error: jobError } = await supabase.rpc('create_content_job', {
      p_lesson_id: lessonId,
      p_subject_id: subjectId || null,
      p_file_name: fileName,
      p_file_size: file.size,
    });

    if (jobError || !jobId) {
      console.error('[ContentGenerate] Job error:', jobError);
      return NextResponse.json({ error: 'فشل في إنشاء المهمة' }, { status: 500 });
    }

    console.log(`[Job ${jobId}] Created — ${fileSizeMB.toFixed(1)}MB ${CATEGORY_LABELS[category]}`);

    // 🔥 Fire and forget — return immediately
    processInBackground(jobId, lessonId, subjectId, fileBuffer, mimeType, fileName, category, supabase)
      .catch(err => {
        console.error(`[Job ${jobId}] FATAL:`, err);
        supabase.rpc('update_content_job', {
          p_job_id: jobId, p_status: 'failed',
          p_error: `خطأ غير متوقع: ${err.message?.slice(0, 200)}`,
        }).catch(() => {});
      });

    return NextResponse.json({ 
      success: true, jobId, 
      message: `بدأت المعالجة — ${CATEGORY_LABELS[category]} (${fileSizeMB.toFixed(1)} MB)` 
    });
  } catch (err: any) {
    console.error('[ContentGenerate] Error:', err);
    return NextResponse.json({ error: `خطأ: ${err.message?.slice(0, 200)}` }, { status: 500 });
  }
}

// ============================================================
// BACKGROUND PROCESSING
// ============================================================
async function processInBackground(
  jobId: string, lessonId: string, subjectId: string,
  fileBuffer: Buffer, mimeType: string, fileName: string,
  category: FileCategory, supabase: any
) {
  const updateJob = async (params: any) => {
    await supabase.rpc('update_content_job', { p_job_id: jobId, ...params })
      .catch((e: any) => console.error('[Job Update]', e.message));
  };

  try {
    // === SETUP ===
    await updateJob({ p_status: 'processing', p_progress: 5, p_message: '⚙️ جاري تحميل الإعدادات...' });

    const { data: apiKey } = await supabase.rpc('get_system_secret', { p_key: 'anthropic_api_key' });
    if (!apiKey) {
      await updateJob({ p_status: 'failed', p_error: '❌ مفتاح API غير موجود — اذهب إلى 🔑 المفاتيح وأضف anthropic_api_key' });
      return;
    }

    const { data: model } = await supabase.rpc('get_system_secret', { p_key: 'AI_CONTENT_MODEL' });
    const aiModel = model || 'claude-sonnet-4-20250514';

    const { data: lessonData } = await supabase.from('lessons').select('title_ar, subject_id').eq('id', lessonId).single();
    const lessonTitle = lessonData?.title_ar || 'درس';
    const effectiveSubjectId = subjectId || lessonData?.subject_id;

    await updateJob({ p_progress: 8, p_message: `${CATEGORY_LABELS[category]} جاري تحليل "${fileName}"...` });

    // ================================================================
    // 🔤 PHASE 1: TEXT EXTRACTION — method depends on file type
    // ================================================================
    let extractedText = '';

    switch (category) {
      case 'word':
        extractedText = await extractFromWord(fileBuffer, jobId, updateJob);
        break;
      case 'excel':
        extractedText = await extractFromExcel(fileBuffer, jobId, updateJob);
        break;
      case 'powerpoint':
        extractedText = await extractFromPowerPoint(fileBuffer, jobId, updateJob);
        break;
      case 'text':
        extractedText = await extractFromText(fileBuffer, fileName, jobId, updateJob);
        break;
      case 'pdf':
        extractedText = await extractFromPdf(fileBuffer, apiKey, aiModel, jobId, updateJob);
        break;
      case 'image':
        extractedText = await extractFromImage(fileBuffer, mimeType, apiKey, aiModel, jobId, updateJob);
        break;
    }

    if (!extractedText || extractedText.trim().length < 30) {
      await updateJob({ p_status: 'failed', p_error: '❌ لم يتم استخراج نص كافٍ — تأكد أن الملف يحتوي على محتوى مقروء' });
      return;
    }

    console.log(`[Job ${jobId}] ✅ Text Extracted — ${extractedText.length} chars from ${CATEGORY_LABELS[category]}`);
    await updateJob({ p_progress: 40,
      p_message: `✅ تم استخراج النص (${Math.round(extractedText.length / 1000)}k حرف) — جاري إنشاء الملخص...` });

    // ================================================================
    // 📝 PHASE 2: SUMMARY FROM TEXT (no images — fast!)
    // ================================================================
    const summaryResult = await callClaudeText(apiKey, {
      model: aiModel,
      system: 'أنت مُعلِّم خبير في إعداد الملخصات التعليمية للمنهج المصري. أنشئ ملخصاً تعليمياً شاملاً ومنظماً من النص المعطى.',
      prompt: `اقرأ النص التالي المستخرج من درس "${lessonTitle}" وأنشئ ملخصاً تعليمياً شاملاً:

--- بداية النص ---
${extractedText.slice(0, 80000)}
--- نهاية النص ---

اكتب ملخصاً منظماً يناسب طلاب الثانوية العامة في مصر.
رتّب المحتوى في أقسام مع عناوين واضحة.
اشرح المفاهيم الصعبة ببساطة.
أجب بنص عادي — عناوين الأقسام بخط عريض.`,
      maxTokens: 8192,
    });

    if (!summaryResult.ok) {
      await updateJob({ p_status: 'failed', p_error: `فشل في إنشاء الملخص: ${summaryResult.error}` });
      return;
    }

    const mergedSummary = summaryResult.content;
    console.log(`[Job ${jobId}] ✅ Summary generated (${mergedSummary.length} chars)`);

    // Save summary to DB
    await supabase.rpc('admin_save_summary', {
      p_lesson_id: lessonId,
      p_content: JSON.stringify({
        title: `ملخص ${lessonTitle}`,
        content: mergedSummary,
        source_text_length: extractedText.length,
        source_type: category,
      }),
    });

    await updateJob({ p_progress: 55, p_summary_text: mergedSummary.slice(0, 500),
      p_message: '✅ تم الملخص — جاري توليد الأسئلة...' });

    // ================================================================
    // 📋 PHASE 3: QUESTIONS FROM TEXT
    // ================================================================
    let totalQuestions = 0;
    const questionRounds = [
      { focus: 'تذكّر واستدعاء', types: 'اختيار من متعدد + صح/غلط' },
      { focus: 'فهم واستيعاب', types: 'اختيار من متعدد' },
      { focus: 'تطبيق', types: 'اختيار من متعدد + مقالي قصير' },
      { focus: 'تحليل ومقارنة', types: 'مقالي + اختيار من متعدد' },
      { focus: 'أنماط امتحانات الثانوية العامة', types: 'مثل أسئلة الثانوية العامة' },
    ];

    for (let r = 0; r < QUESTION_ROUNDS; r++) {
      const round = questionRounds[r];
      const pct = 55 + Math.round((r / QUESTION_ROUNDS) * 40);
      await updateJob({ p_progress: pct,
        p_message: `📋 الجولة ${r + 1}/5: ${round.focus} (${totalQuestions} سؤال حتى الآن)...` });

      const qResult = await callClaudeText(apiKey, {
        model: aiModel,
        system: 'أنت خبير في إعداد أسئلة امتحانات الثانوية العامة المصرية. أنشئ أسئلة متنوعة وذكية.',
        prompt: `بناءً على محتوى درس "${lessonTitle}":

--- الملخص ---
${mergedSummary.slice(0, 6000)}

--- النص الأصلي (مرجع إضافي) ---
${extractedText.slice(0, 4000)}

${buildQuestionsPrompt(lessonTitle, round.focus, round.types, QUESTIONS_PER_ROUND, r + 1)}`,
        maxTokens: 8192,
      });

      if (qResult.ok) {
        const questions = parseQuestions(qResult.content);
        if (questions.length > 0) {
          for (const q of questions) {
            await supabase.rpc('admin_save_questions', {
              p_lesson_id: lessonId,
              p_subject_id: effectiveSubjectId,
              p_questions: JSON.stringify([q]),
            }).catch(() => {});
          }
          totalQuestions += questions.length;
          console.log(`[Job ${jobId}] Round ${r + 1}: ${questions.length} questions ✅`);
        }
      } else {
        console.error(`[Job ${jobId}] Round ${r + 1} failed:`, qResult.error);
      }
    }

    // ===== DONE! =====
    await updateJob({
      p_status: 'completed', p_progress: 100, p_questions_count: totalQuestions,
      p_message: `✅ تم بنجاح! ${CATEGORY_LABELS[category]} → ملخص + ${totalQuestions} سؤال`,
    });
    console.log(`[Job ${jobId}] ✅ COMPLETED — ${totalQuestions} questions from ${category}`);

  } catch (err: any) {
    console.error(`[Job ${jobId}] Fatal:`, err);
    await updateJob({ p_status: 'failed', p_error: `خطأ: ${err.message?.slice(0, 300)}` }).catch(() => {});
  }
}

// ================================================================
// 📝 WORD EXTRACTION — mammoth (instant, no API call!)
// ================================================================
async function extractFromWord(buffer: Buffer, jobId: string, updateJob: Function): Promise<string> {
  await updateJob({ p_progress: 15, p_message: '📝 جاري قراءة ملف Word — فوري بدون OCR...' });
  
  try {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    console.log(`[Job ${jobId}] Word extracted: ${result.value.length} chars`);
    return result.value;
  } catch (err: any) {
    console.error(`[Job ${jobId}] Word extraction error:`, err.message);
    // Fallback: try reading as raw text
    return buffer.toString('utf-8').replace(/[^\u0600-\u06FF\u0750-\u077Fa-zA-Z0-9\s.,!?؟،؛:()]/g, ' ');
  }
}

// ================================================================
// 📊 EXCEL EXTRACTION — exceljs (instant, no API call!)
// ================================================================
async function extractFromExcel(buffer: Buffer, jobId: string, updateJob: Function): Promise<string> {
  await updateJob({ p_progress: 15, p_message: '📊 جاري قراءة ملف Excel — فوري بدون OCR...' });
  
  try {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    
    const textParts: string[] = [];
    workbook.eachSheet((worksheet: any) => {
      textParts.push(`\n📋 شيت: ${worksheet.name}\n${'='.repeat(40)}`);
      worksheet.eachRow((row: any, rowNumber: number) => {
        const cells = row.values?.slice(1) || []; // values[0] is undefined
        const rowText = cells
          .map((cell: any) => {
            if (cell === null || cell === undefined) return '';
            if (typeof cell === 'object' && cell.text) return cell.text;
            if (typeof cell === 'object' && cell.result !== undefined) return String(cell.result);
            return String(cell);
          })
          .filter(Boolean)
          .join(' | ');
        if (rowText.trim()) textParts.push(rowText);
      });
    });
    
    const text = textParts.join('\n');
    console.log(`[Job ${jobId}] Excel extracted: ${text.length} chars, ${workbook.worksheets.length} sheets`);
    return text;
  } catch (err: any) {
    console.error(`[Job ${jobId}] Excel extraction error:`, err.message);
    // Fallback for CSV
    const text = buffer.toString('utf-8');
    if (text.includes(',') || text.includes('\t')) return text;
    throw new Error('لم يتم قراءة ملف Excel: ' + err.message);
  }
}

// ================================================================
// 📋 POWERPOINT EXTRACTION — XML parsing (instant, no API call!)
// ================================================================
async function extractFromPowerPoint(buffer: Buffer, jobId: string, updateJob: Function): Promise<string> {
  await updateJob({ p_progress: 15, p_message: '📋 جاري قراءة ملف PowerPoint — فوري بدون OCR...' });
  
  try {
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();
    
    const textParts: string[] = [];
    let slideNum = 0;
    
    // PPTX is a zip file with XML slides
    const slideEntries = entries
      .filter((e: any) => e.entryName.match(/ppt\/slides\/slide\d+\.xml$/))
      .sort((a: any, b: any) => {
        const numA = parseInt(a.entryName.match(/slide(\d+)/)?.[1] || '0');
        const numB = parseInt(b.entryName.match(/slide(\d+)/)?.[1] || '0');
        return numA - numB;
      });
    
    for (const entry of slideEntries) {
      slideNum++;
      const xml = entry.getData().toString('utf-8');
      // Extract text from XML tags: <a:t>text</a:t>
      const texts: string[] = [];
      const matches = xml.matchAll(/<a:t[^>]*>([^<]+)<\/a:t>/g);
      for (const m of matches) {
        if (m[1].trim()) texts.push(m[1].trim());
      }
      if (texts.length > 0) {
        textParts.push(`\n📌 شريحة ${slideNum}:\n${texts.join(' ')}`);
      }
    }
    
    // Also try notes
    const noteEntries = entries.filter((e: any) => e.entryName.match(/ppt\/notesSlides/));
    for (const entry of noteEntries) {
      const xml = entry.getData().toString('utf-8');
      const matches = xml.matchAll(/<a:t[^>]*>([^<]+)<\/a:t>/g);
      const notes: string[] = [];
      for (const m of matches) {
        if (m[1].trim() && m[1].trim() !== 'Click to edit Master text styles') notes.push(m[1].trim());
      }
      if (notes.length > 0) {
        textParts.push(`📝 ملاحظات: ${notes.join(' ')}`);
      }
    }
    
    const text = textParts.join('\n');
    console.log(`[Job ${jobId}] PPTX extracted: ${text.length} chars, ${slideNum} slides`);
    return text;
  } catch (err: any) {
    console.error(`[Job ${jobId}] PPTX extraction error:`, err.message);
    throw new Error('لم يتم قراءة ملف PowerPoint: ' + err.message);
  }
}

// ================================================================
// 📃 TEXT EXTRACTION — direct read
// ================================================================
async function extractFromText(buffer: Buffer, fileName: string, jobId: string, updateJob: Function): Promise<string> {
  await updateJob({ p_progress: 15, p_message: '📃 جاري قراءة الملف النصي...' });
  
  const text = buffer.toString('utf-8');
  console.log(`[Job ${jobId}] Text file: ${text.length} chars`);
  return text;
}

// ================================================================
// 📄 PDF EXTRACTION — OCR via Vision API
// ================================================================
async function extractFromPdf(
  fileBuffer: Buffer, apiKey: string, aiModel: string, jobId: string, updateJob: Function
): Promise<string> {
  const chunks = await splitPdfIntoChunks(fileBuffer, jobId);
  await updateJob({ p_total_pages: chunks.totalPages, p_total_chunks: chunks.items.length, p_progress: 10,
    p_message: `📄 ${chunks.totalPages} صفحة — جاري استخراج النص من ${chunks.items.length} جزء...` });

  const textParts: string[] = [];
  for (let i = 0; i < chunks.items.length; i++) {
    const chunk = chunks.items[i];
    const pct = 10 + Math.round((i / chunks.items.length) * 30);
    await updateJob({ p_processed_chunks: i, p_progress: pct,
      p_message: `🔤 استخراج النص — الجزء ${i + 1}/${chunks.items.length}${chunk.label}...` });

    const ocrResult = await callClaudeVision(apiKey, {
      model: aiModel,
      system: 'أنت أداة OCR متقدمة. استخرج كل النص العربي والإنجليزي من الملف بدقة عالية. أخرج النص فقط.',
      fileBase64: chunk.base64,
      mimeType: 'application/pdf',
      prompt: 'استخرج كل النص الموجود في هذا الملف بالكامل. اكتب النص فقط كما هو.',
      maxTokens: 4096,
    });

    if (ocrResult.ok && ocrResult.content.trim()) {
      textParts.push(ocrResult.content);
      console.log(`[Job ${jobId}] OCR chunk ${i + 1}/${chunks.items.length} ✅ (${ocrResult.content.length} chars)`);
    } else if (ocrResult.error === '413_TOO_LARGE' && chunk.pageCount > 1) {
      console.warn(`[Job ${jobId}] Chunk ${i + 1} too large — splitting to single pages`);
      const subChunks = await splitPdfIntoChunks(chunk.buffer, jobId, 1);
      for (const sub of subChunks.items) {
        const subResult = await callClaudeVision(apiKey, {
          model: aiModel,
          system: 'استخرج كل النص من هذه الصفحة.',
          fileBase64: sub.base64, mimeType: 'application/pdf',
          prompt: 'استخرج كل النص الموجود.', maxTokens: 2048,
        });
        if (subResult.ok) textParts.push(subResult.content);
      }
    } else {
      console.error(`[Job ${jobId}] OCR chunk ${i + 1} failed:`, ocrResult.error);
      textParts.push(`[فشل في قراءة الجزء ${i + 1}]`);
    }
  }

  return textParts.join('\n\n---\n\n');
}

// ================================================================
// 🖼️ IMAGE EXTRACTION — OCR via Vision API
// ================================================================
async function extractFromImage(
  fileBuffer: Buffer, mimeType: string, apiKey: string, aiModel: string, jobId: string, updateJob: Function
): Promise<string> {
  await updateJob({ p_total_chunks: 1, p_progress: 15, p_message: '🔤 جاري استخراج النص من الصورة...' });

  const fileBase64 = fileBuffer.toString('base64');
  const ocrResult = await callClaudeVision(apiKey, {
    model: aiModel,
    system: 'أنت أداة OCR متقدمة. استخرج كل النص من الصورة بدقة عالية.',
    fileBase64, mimeType,
    prompt: 'استخرج كل النص الموجود في هذه الصورة بالكامل.',
    maxTokens: 4096,
  });

  if (ocrResult.ok) return ocrResult.content;
  throw new Error(`فشل في قراءة الصورة: ${ocrResult.error}`);
}

// ===== PDF CHUNKING =====
async function splitPdfIntoChunks(
  pdfBuffer: Buffer, jobId: string, forcePagesPerChunk?: number
): Promise<{ totalPages: number; items: { buffer: Buffer; base64: string; label: string; pageCount: number }[] }> {
  const srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();
  const items: { buffer: Buffer; base64: string; label: string; pageCount: number }[] = [];
  let pagesPerChunk = forcePagesPerChunk || Math.min(INITIAL_PAGES_PER_CHUNK, totalPages);

  for (let start = 0; start < totalPages; ) {
    const end = Math.min(start + pagesPerChunk, totalPages);
    const chunkDoc = await PDFDocument.create();
    const indices = Array.from({ length: end - start }, (_, i) => start + i);
    const pages = await chunkDoc.copyPages(srcDoc, indices);
    pages.forEach(p => chunkDoc.addPage(p));
    const bytes = await chunkDoc.save();

    if (bytes.length > MAX_CHUNK_BYTES && pagesPerChunk > 1) {
      pagesPerChunk = Math.max(1, Math.floor(pagesPerChunk / 2));
      console.log(`[Job ${jobId}] Chunk too big (${(bytes.length / 1024 / 1024).toFixed(1)}MB) → ${pagesPerChunk} pages/chunk`);
      continue;
    }

    const buf = Buffer.from(bytes);
    items.push({
      buffer: buf, base64: buf.toString('base64'),
      label: totalPages > pagesPerChunk ? ` (ص ${start + 1}-${end})` : '',
      pageCount: end - start,
    });
    start = end;
  }

  return { totalPages, items };
}

// ===== CLAUDE API — Vision (for OCR only) =====
async function callClaudeVision(apiKey: string, opts: {
  model: string; system: string; fileBase64: string; mimeType: string; prompt: string; maxTokens: number;
}): Promise<{ ok: boolean; content: string; error?: string }> {
  try {
    const mediaType = opts.mimeType.startsWith('image/') ? opts.mimeType : 'application/pdf';
    const contentType = mediaType === 'application/pdf' ? 'document' : 'image';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: opts.model, max_tokens: opts.maxTokens, system: opts.system,
        messages: [{
          role: 'user',
          content: [
            { type: contentType, source: { type: 'base64', media_type: mediaType, data: opts.fileBase64 } },
            { type: 'text', text: opts.prompt },
          ],
        }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 413) return { ok: false, content: '', error: '413_TOO_LARGE' };
      if (response.status === 429) {
        console.warn('[Claude] 429 — waiting 30s and retrying...');
        await new Promise(r => setTimeout(r, 30000));
        return callClaudeVision(apiKey, opts);
      }
      return { ok: false, content: '', error: `API ${response.status}: ${errText.slice(0, 200)}` };
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    return text ? { ok: true, content: text } : { ok: false, content: '', error: 'لم يتم الحصول على رد' };
  } catch (err: any) {
    return { ok: false, content: '', error: `Network: ${err.message?.slice(0, 200)}` };
  }
}

// ===== CLAUDE API — Text Only (fast!) =====
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
        model: opts.model, max_tokens: opts.maxTokens, system: opts.system,
        messages: [{ role: 'user', content: opts.prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 429) {
        console.warn('[Claude] 429 — waiting 20s...');
        await new Promise(r => setTimeout(r, 20000));
        return callClaudeText(apiKey, opts);
      }
      return { ok: false, content: '', error: `API ${response.status}: ${errText.slice(0, 200)}` };
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    return text ? { ok: true, content: text } : { ok: false, content: '', error: 'لم يتم الحصول على رد' };
  } catch (err: any) {
    return { ok: false, content: '', error: `Network: ${err.message?.slice(0, 200)}` };
  }
}

// ===== QUESTION HELPERS =====
function buildQuestionsPrompt(lesson: string, focus: string, types: string, count: number, round: number): string {
  return `أنشئ ${count} سؤال لدرس "${lesson}".
التركيز: ${focus}
أنواع الأسئلة: ${types}
الجولة: ${round}/5
${round > 1 ? 'لا تكرر أسئلة الجولات السابقة — أنشئ أسئلة جديدة تماماً.' : ''}

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
لأسئلة مقالية: options = [], correct_answer = -1, والإجابة النموذجية في explanation_ar
لأسئلة MCQ: 4 خيارات دائماً`;
}

function parseQuestions(text: string): any[] {
  try {
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
