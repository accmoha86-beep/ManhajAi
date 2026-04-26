import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PDFDocument } from 'pdf-lib';

// ===== CONFIG =====
const INITIAL_PAGES_PER_CHUNK = 5;
const MAX_CHUNK_BYTES = 8 * 1024 * 1024;
// ⚡ OPTIMIZED: 2 rounds × 100 questions = 200 total (was 5 × 40)
const QUESTIONS_PER_ROUND = 100;
const QUESTION_ROUNDS = 2;
// ⚡ Limit text for question prompts (smaller = faster Claude response)
const MAX_TEXT_FOR_QUESTIONS = 30000;

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

// ===== MAIN HANDLER =====
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

    // Create job
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

    // Helper to update job
    const updateJob = async (params: any) => {
      try {
        await supabase.rpc('update_content_job', { p_job_id: jobId, ...params });
      } catch (e: any) { console.error('[Job Update]', e.message); }
    };

    // ═══════════════════════════════════════
    // PHASE 1: SETUP
    // ═══════════════════════════════════════
    await updateJob({ p_status: 'processing', p_progress: 5, p_message: '⚙️ جاري تحميل الإعدادات...' });

    const { data: rawApiKey } = await supabase.rpc('get_system_secret', { p_key: 'anthropic_api_key' });
    // Strip wrapping quotes from jsonb values
    const apiKey = (rawApiKey || '').replace(/^["']+|["']+$/g, '').trim();
    if (!apiKey) {
      await updateJob({ p_status: 'failed', p_error: '❌ مفتاح API غير موجود' });
      return NextResponse.json({ error: 'مفتاح API غير موجود' }, { status: 500 });
    }

    const { data: model } = await supabase.rpc('get_system_secret', { p_key: 'AI_CONTENT_MODEL' });
    // Strip wrapping quotes from jsonb values + validate
    const cleanModel = (model || '').replace(/^["']+|["']+$/g, '').trim();
    const aiModel = cleanModel || 'claude-sonnet-4-5-20250929';

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
      return NextResponse.json({ error: `فشل في قراءة الملف` }, { status: 500 });
    }

    if (!extractedText || extractedText.length < 50) {
      await updateJob({ p_status: 'failed', p_error: '❌ لم يتم استخراج نص كافٍ' });
      return NextResponse.json({ error: 'لم يتم استخراج نص كافٍ' }, { status: 500 });
    }

    const textLen = Math.round(extractedText.length / 1000);
    await updateJob({ p_progress: 40, p_message: `✅ تم استخراج النص (${textLen}k حرف) — جاري إنشاء الملخص...` });

    // ═══════════════════════════════════════
    // PHASE 3: GENERATE SUMMARY
    // ═══════════════════════════════════════
    const summaryPrompt = `أنت معلم خبير في مواد الثانوية العامة المصرية. اكتب ملخصاً شاملاً ومنظماً للمحتوى التالي باللغة العربية.

قسّم الملخص إلى:
- عناوين رئيسية وفرعية واضحة
- شرح مبسط للمفاهيم
- أمثلة عملية
- نقاط مهمة للحفظ

المحتوى:
${extractedText.slice(0, 80000)}`;

    const summaryResult = await callClaude(apiKey, aiModel, summaryPrompt, 4000);
    if (!summaryResult.success) {
      await updateJob({ p_status: 'failed', p_error: `فشل في إنشاء الملخص: ${summaryResult.error}` });
      return NextResponse.json({ error: 'فشل في إنشاء الملخص' }, { status: 500 });
    }

    // Save summary — uses save_generated_summary (SECURITY DEFINER, no admin_id needed)
    const { data: summSaveResult, error: summSaveError } = await supabase.rpc('save_generated_summary', {
      p_lesson_id: lessonId,
      p_content: summaryResult.text!,
    });

    if (summSaveError) {
      console.error(`[Job ${jobId}] Summary save error:`, summSaveError.message);
      await updateJob({ p_status: 'failed', p_error: `فشل في حفظ الملخص: ${summSaveError.message?.slice(0, 200)}` });
      return NextResponse.json({ error: 'فشل في حفظ الملخص' }, { status: 500 });
    }
    console.log(`[Job ${jobId}] Summary saved:`, summSaveResult);

    await updateJob({ p_progress: 50, p_summary_text: summaryResult.text!.slice(0, 500), p_message: '✅ تم الملخص — جاري توليد الأسئلة...' });

    // ═══════════════════════════════════════
    // PHASE 4: GENERATE QUESTIONS (2 rounds × 100)
    // ═══════════════════════════════════════
    const questionText = extractedText.slice(0, MAX_TEXT_FOR_QUESTIONS);
    let totalQuestions = 0;

    const roundDefs = [
      {
        focus: 'تذكر + فهم + تطبيق',
        instruction: `أنشئ ${QUESTIONS_PER_ROUND} سؤال متنوع يغطي مستويات: التذكر والاستدعاء، الفهم والاستيعاب، والتطبيق.
التوزيع: 60% اختيار من متعدد، 25% صح/غلط، 15% مقالي قصير.
الصعوبة: 40% سهل، 40% متوسط، 20% صعب.`,
      },
      {
        focus: 'تحليل + أنماط امتحانات',
        instruction: `أنشئ ${QUESTIONS_PER_ROUND} سؤال متنوع يغطي: التحليل والمقارنة، وأنماط أسئلة الامتحانات الفعلية للثانوية العامة المصرية.
التوزيع: 60% اختيار من متعدد، 25% صح/غلط، 15% مقالي قصير.
الصعوبة: 20% سهل، 40% متوسط، 40% صعب.
ركّز على الأسئلة التي تأتي فعلاً في الامتحانات.`,
      },
    ];

    for (let r = 0; r < QUESTION_ROUNDS; r++) {
      const round = roundDefs[r];
      const pct = 55 + Math.round(((r + 1) / QUESTION_ROUNDS) * 40);
      await updateJob({
        p_progress: 55 + Math.round((r / QUESTION_ROUNDS) * 35),
        p_message: `📋 الجولة ${r + 1}/${QUESTION_ROUNDS}: ${round.focus} (${totalQuestions} سؤال حتى الآن)...`,
      });

      const qPrompt = `أنت خبير في إنشاء أسئلة امتحانات الثانوية العامة المصرية.

${round.instruction}

بناءً على المحتوى التالي:
${questionText}

⚠️ مهم جداً: أرجع JSON array فقط — بدون أي نص أو شرح قبله أو بعده.
كل سؤال يكون بهذا الشكل:
{"question_ar": "نص السؤال", "type": "mcq", "options": ["الخيار أ","الخيار ب","الخيار ج","الخيار د"], "correct_answer": 0, "explanation_ar": "شرح الإجابة", "difficulty": "medium"}

أنواع type: "mcq" (اختيار من متعدد — 4 خيارات)، "true_false" (صح/غلط — خياران: ["صح","غلط"])، "essay" (مقالي — options فارغة [])
correct_answer: رقم الخيار الصحيح (0 = أول خيار)

أرجع JSON array فقط:`;

      const qResult = await callClaude(apiKey, aiModel, qPrompt, 16000);
      
      if (qResult.success && qResult.text) {
        const parsed = parseQuestionsJSON(qResult.text);
        
        if (parsed.length > 0) {
          // ⚡ BATCH SAVE — one RPC call for ALL questions in this round
          const questionsForDB = parsed.map(q => ({
            question_ar: q.question_ar || '',
            type: q.type || 'mcq',
            options: Array.isArray(q.options) ? q.options : ['أ','ب','ج','د'],
            correct_answer: typeof q.correct_answer === 'number' ? q.correct_answer : 0,
            explanation_ar: q.explanation_ar || '',
            difficulty: q.difficulty || 'medium',
          }));

          try {
            const { data: saveResult, error: saveError } = await supabase.rpc('save_generated_questions', {
              p_lesson_id: lessonId,
              p_subject_id: subjectId || null,
              p_questions: questionsForDB,
            });

            if (saveError) {
              console.error(`[Job ${jobId}] Save error round ${r + 1}:`, saveError.message);
            } else {
              const inserted = saveResult?.inserted || parsed.length;
              totalQuestions += inserted;
              console.log(`[Job ${jobId}] Round ${r + 1}: saved ${inserted} questions`);
            }
          } catch (saveErr: any) {
            console.error(`[Job ${jobId}] Save error:`, saveErr.message);
          }
        } else {
          console.warn(`[Job ${jobId}] Round ${r + 1}: parsed 0 questions from response`);
        }
      } else {
        console.warn(`[Job ${jobId}] Round ${r + 1}: Claude call failed — ${qResult.error}`);
      }

      await updateJob({
        p_progress: pct,
        p_message: `📋 الجولة ${r + 1}/${QUESTION_ROUNDS}: ${round.focus} — ${totalQuestions} سؤال ✅`,
      });
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
      try {
        await supabase.rpc('update_content_job', {
          p_job_id: jobId, p_status: 'failed',
          p_error: `خطأ: ${err.message?.slice(0, 300)}`,
        });
      } catch (_) {}
    }
    return NextResponse.json({ error: `خطأ: ${err.message?.slice(0, 200)}` }, { status: 500 });
  }
}

// ═══════════════════════════════════════
// PARSE QUESTIONS JSON — handles all edge cases
// ═══════════════════════════════════════
function parseQuestionsJSON(text: string): any[] {
  try {
    // Try direct parse first
    const direct = JSON.parse(text.trim());
    if (Array.isArray(direct)) return direct;
  } catch {}

  try {
    // Remove markdown code blocks: ```json ... ``` or ``` ... ```
    let cleaned = text.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '');
    
    // Extract JSON array
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}

  try {
    // Try to find individual objects and build array
    const objects: any[] = [];
    const regex = /\{[^{}]*"question_ar"[^{}]*\}/g;
    let m;
    while ((m = regex.exec(text)) !== null) {
      try {
        objects.push(JSON.parse(m[0]));
      } catch {}
    }
    if (objects.length > 0) return objects;
  } catch {}

  console.warn('[ParseQ] Could not parse any questions from response');
  return [];
}

// ═══════════════════════════════════════
// CLAUDE API CALL
// ═══════════════════════════════════════
async function callClaude(
  apiKey: string, model: string, prompt: string, maxTokens: number,
  imageData?: { base64: string; mimeType: string }
): Promise<{ success: boolean; text?: string; error?: string }> {
  try {
    const content: any[] = [];
    if (imageData) {
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: imageData.mimeType, data: imageData.base64 },
      });
    }
    content.push({ type: 'text', text: prompt });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180000); // 3 min timeout per call

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[Claude] ${res.status}:`, errBody.slice(0, 300));
      if (res.status === 413) return { success: false, error: 'الملف كبير جداً' };
      if (res.status === 429) return { success: false, error: 'تم تجاوز حد الاستخدام — حاول بعد دقيقة' };
      return { success: false, error: `خطأ Claude: ${res.status}` };
    }

    const data = await res.json();
    const resultText = data.content?.[0]?.text || '';
    return { success: true, text: resultText };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { success: false, error: 'انتهت المهلة — حاول ملف أصغر' };
    }
    return { success: false, error: err.message };
  }
}

// ═══════════════════════════════════════
// TEXT EXTRACTION FUNCTIONS
// ═══════════════════════════════════════

async function extractFromWord(buffer: Buffer, updateJob: Function): Promise<string> {
  await updateJob({ p_progress: 15, p_message: '📝 جاري قراءة ملف Word — فوري ⚡...' });
  try {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  } catch (err: any) {
    throw new Error('فشل في قراءة ملف Word: ' + err.message);
  }
}

async function extractFromExcel(buffer: Buffer, updateJob: Function): Promise<string> {
  await updateJob({ p_progress: 15, p_message: '📊 جاري قراءة ملف Excel — فوري ⚡...' });
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
    throw new Error('فشل في قراءة ملف Excel: ' + err.message);
  }
}

async function extractFromPowerPoint(buffer: Buffer, updateJob: Function): Promise<string> {
  await updateJob({ p_progress: 15, p_message: '📋 جاري قراءة ملف PowerPoint — فوري ⚡...' });
  try {
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(buffer);
    let text = '';
    const entries = zip.getEntries();
    const slideEntries = entries
      .filter((e: any) => e.entryName.match(/ppt\/slides\/slide\d+\.xml/))
      .sort((a: any, b: any) => {
        const numA = parseInt(a.entryName.match(/slide(\d+)/)?.[1] || '0');
        const numB = parseInt(b.entryName.match(/slide(\d+)/)?.[1] || '0');
        return numA - numB;
      });

    let slideNum = 0;
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
  const pdfDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
  const totalPages = pdfDoc.getPageCount();

  const fileSizeMB = fileBuffer.length / (1024 * 1024);
  let pagesPerChunk = INITIAL_PAGES_PER_CHUNK;
  if (fileSizeMB > 30) pagesPerChunk = 3;
  if (fileSizeMB > 50) pagesPerChunk = 2;
  if (fileSizeMB > 100) pagesPerChunk = 1;

  const chunks: Array<{ startPage: number; endPage: number }> = [];
  for (let start = 0; start < totalPages; start += pagesPerChunk) {
    chunks.push({ startPage: start, endPage: Math.min(start + pagesPerChunk, totalPages) });
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
      p_message: `🔤 استخراج النص — الجزء ${i + 1}/${chunks.length} (صفحات ${chunk.startPage + 1}-${chunk.endPage})...`,
    });

    try {
      const chunkPdf = await PDFDocument.create();
      const pageIndices = Array.from({ length: chunk.endPage - chunk.startPage }, (_, j) => chunk.startPage + j);
      const pages = await chunkPdf.copyPages(pdfDoc, pageIndices);
      pages.forEach(p => chunkPdf.addPage(p));
      const chunkBytes = await chunkPdf.save();
      const chunkBase64 = Buffer.from(chunkBytes).toString('base64');

      if (chunkBase64.length > MAX_CHUNK_BYTES * 1.33) {
        console.warn(`[PDF] Chunk ${i + 1} too large — skipping`);
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

export const maxDuration = 600;
