import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PDFDocument } from 'pdf-lib';

const INITIAL_PAGES_PER_CHUNK = 5;
const MAX_CHUNK_BYTES = 8 * 1024 * 1024;
const QUESTIONS_PER_ROUND = 100;
const QUESTION_ROUNDS = 2;
const MAX_TEXT_FOR_QUESTIONS = 30000;
const MAX_TEXT_FOR_STRUCTURE = 120000;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

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

// ═══════════════════════════════════════
// PARSE PRE-ANALYZED MARKDOWN STRUCTURE
// ═══════════════════════════════════════
// Format:
// # الباب الأول: الوراثة       → unit
// ## الدرس الأول: قوانين مندل  → lesson
// محتوى الدرس...               → content (saved as summary)
// ═══════════════════════════════════════
function parsePreAnalyzedMarkdown(text: string): { units: Array<{ name: string; lessons: Array<{ title: string; content: string }> }> } {
  const lines = text.split('\n');
  const units: Array<{ name: string; lessons: Array<{ title: string; content: string }> }> = [];
  let currentUnit: { name: string; lessons: Array<{ title: string; content: string }> } | null = null;
  let currentLesson: { title: string; content: string } | null = null;
  let contentLines: string[] = [];

  const flushLesson = () => {
    if (currentLesson && currentUnit) {
      currentLesson.content = contentLines.join('\n').trim();
      if (currentLesson.content.length > 0) {
        currentUnit.lessons.push(currentLesson);
      }
    }
    contentLines = [];
    currentLesson = null;
  };

  const flushUnit = () => {
    flushLesson();
    if (currentUnit && currentUnit.lessons.length > 0) {
      units.push(currentUnit);
    }
    currentUnit = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    
    // # = Unit header
    if (/^# (?!#)/.test(trimmed)) {
      flushUnit();
      const name = trimmed.replace(/^# +/, '').trim();
      if (name) currentUnit = { name, lessons: [] };
      continue;
    }
    
    // ## = Lesson header
    if (/^## (?!#)/.test(trimmed)) {
      flushLesson();
      const title = trimmed.replace(/^## +/, '').trim();
      if (title) {
        // If no unit yet, create a default one
        if (!currentUnit) {
          currentUnit = { name: 'الباب الأول', lessons: [] };
        }
        currentLesson = { title, content: '' };
      }
      continue;
    }
    
    // Content lines
    if (currentLesson) {
      contentLines.push(line);
    }
  }
  
  // Flush remaining
  flushUnit();

  // If no structure found with # and ##, try ## only (all lessons in one unit)
  if (units.length === 0) {
    const singleUnit: { name: string; lessons: Array<{ title: string; content: string }> } = { 
      name: 'المحتوى', 
      lessons: [] 
    };
    currentLesson = null;
    contentLines = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (/^## (?!#)/.test(trimmed)) {
        if (currentLesson) {
          currentLesson.content = contentLines.join('\n').trim();
          if (currentLesson.content.length > 0) singleUnit.lessons.push(currentLesson);
        }
        contentLines = [];
        const title = trimmed.replace(/^## +/, '').trim();
        currentLesson = title ? { title, content: '' } : null;
        continue;
      }
      if (currentLesson) contentLines.push(line);
    }
    if (currentLesson) {
      currentLesson.content = contentLines.join('\n').trim();
      if (currentLesson.content.length > 0) singleUnit.lessons.push(currentLesson);
    }
    if (singleUnit.lessons.length > 0) units.push(singleUnit);
  }

  // Last resort: if still nothing, treat whole text as one lesson
  if (units.length === 0 && text.trim().length > 50) {
    units.push({
      name: 'المحتوى',
      lessons: [{ title: 'الدرس الأول', content: text.trim() }],
    });
  }

  return { units };
}

// ═══════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════
export async function POST(request: NextRequest) {
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Auth check
    const authHeader = request.headers.get('authorization') || '';
    const cookieToken = request.cookies.get('auth-token')?.value;
    const token = authHeader.replace('Bearer ', '') || cookieToken || '';
    if (!token) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });

    let adminId = '';
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      adminId = payload.userId || '';
    } catch { return NextResponse.json({ error: 'توكن غير صالح' }, { status: 401 }); }

    const formData = await request.formData();
    const subjectId = formData.get('subjectId') as string;
    const preAnalyzed = formData.get('preAnalyzed') === 'true';
    const generateQuestions = formData.get('generateQuestions') !== 'false'; // default true
    
    // Support both single file ('file') and multiple files ('files')
    const multiFiles = formData.getAll('files') as File[];
    const singleFile = formData.get('file') as File | null;
    const allFiles: File[] = multiFiles.length > 0 ? multiFiles : (singleFile ? [singleFile] : []);

    if (allFiles.length === 0 || !subjectId) {
      return NextResponse.json({ error: 'الملف ومعرّف المادة مطلوبين' }, { status: 400 });
    }

    const { data: maxSizeSetting } = await supabase.rpc('get_system_secret', { p_key: 'MAX_FILE_SIZE_MB' });
    const maxSizeMB = parseInt(maxSizeSetting || '200');
    
    let totalSizeMB = 0;
    for (const f of allFiles) {
      const fSizeMB = f.size / (1024 * 1024);
      totalSizeMB += fSizeMB;
      if (fSizeMB > maxSizeMB) {
        return NextResponse.json({ error: `حجم الملف "${f.name}" (${fSizeMB.toFixed(1)} MB) أكبر من الحد (${maxSizeMB} MB)` }, { status: 400 });
      }
    }

    console.log(`[CurriculumUpload] Started — ${allFiles.length} files, ${totalSizeMB.toFixed(1)}MB, preAnalyzed=${preAnalyzed}, generateQuestions=${generateQuestions}`);

    // ═══════════════════════════════════════
    // PHASE 1: GET API KEY + MODEL (if needed)
    // ═══════════════════════════════════════
    let apiKey = '';
    let aiModel = 'claude-sonnet-4-5-20250929';

    // Only need API key if not pre-analyzed OR if generating questions
    if (!preAnalyzed || generateQuestions) {
      const { data: rawApiKey } = await supabase.rpc('get_system_secret', { p_key: 'anthropic_api_key' });
      apiKey = (rawApiKey || '').replace(/^["']+|["']+$/g, '').trim();
      if (!apiKey) {
        if (!preAnalyzed) {
          return NextResponse.json({ error: 'مفتاح API غير موجود — استخدم وضع "محلل مسبقاً" لرفع بدون AI' }, { status: 500 });
        }
        // Pre-analyzed without questions is fine without API key
      }

      const { data: model } = await supabase.rpc('get_system_secret', { p_key: 'AI_CONTENT_MODEL' });
      aiModel = (model || '').replace(/^["']+|["']+$/g, '').trim() || 'claude-sonnet-4-5-20250929';
    }

    // ═══════════════════════════════════════
    // PHASE 2: EXTRACT TEXT FROM ALL FILES
    // ═══════════════════════════════════════
    let extractedText = '';
    const processedFiles: string[] = [];
    const failedFiles: string[] = [];

    for (let fi = 0; fi < allFiles.length; fi++) {
      const file = allFiles[fi];
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const mimeType = file.type || 'application/octet-stream';
      const fileName = file.name || `file_${fi + 1}`;
      const category = getFileCategory(mimeType, fileName);
      const fileSizeMB = file.size / (1024 * 1024);

      console.log(`[CurriculumUpload] Processing file ${fi + 1}/${allFiles.length}: ${fileName} (${fileSizeMB.toFixed(1)}MB, ${category})`);

      try {
        let fileText = '';
        switch (category) {
          case 'word': fileText = await extractFromWord(fileBuffer); break;
          case 'excel': fileText = await extractFromExcel(fileBuffer); break;
          case 'powerpoint': fileText = await extractFromPowerPoint(fileBuffer); break;
          case 'text': fileText = await extractFromText(fileBuffer, fileName); break;
          case 'pdf': {
            if (preAnalyzed) {
              // For pre-analyzed PDFs, try text extraction first (no OCR needed)
              try {
                const pdfDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
                // pdf-lib can't extract text — for pre-analyzed, user should use text/markdown files
                // Try OCR if API key available
                if (apiKey) {
                  fileText = await extractFromPdf(fileBuffer, apiKey, aiModel);
                } else {
                  failedFiles.push(`${fileName} (PDF يحتاج AI للقراءة — استخدم ملف نصي)`);
                  continue;
                }
              } catch {
                failedFiles.push(`${fileName} (PDF غير قابل للقراءة)`);
                continue;
              }
            } else {
              fileText = await extractFromPdf(fileBuffer, apiKey, aiModel);
            }
            break;
          }
          case 'image': {
            if (preAnalyzed && !apiKey) {
              failedFiles.push(`${fileName} (الصور تحتاج AI للقراءة)`);
              continue;
            }
            fileText = await extractFromImage(fileBuffer, mimeType, apiKey, aiModel);
            break;
          }
        }

        if (fileText && fileText.length > 10) {
          extractedText += `\n\n=== ملف: ${fileName} ===\n\n${fileText}`;
          processedFiles.push(fileName);
        } else {
          failedFiles.push(`${fileName} (نص قصير جداً)`);
        }
      } catch (extractErr: any) {
        console.error(`[CurriculumUpload] Failed to extract ${fileName}:`, extractErr.message);
        failedFiles.push(`${fileName} (${extractErr.message?.slice(0, 100)})`);
      }
    }

    if (!extractedText || extractedText.length < 50) {
      return NextResponse.json({ 
        error: 'لم يتم استخراج نص كافٍ من الملفات' + (failedFiles.length > 0 ? `. ملفات فاشلة: ${failedFiles.join(', ')}` : ''),
      }, { status: 500 });
    }

    console.log(`[CurriculumUpload] Extracted ${Math.round(extractedText.length / 1000)}k chars from ${processedFiles.length}/${allFiles.length} files`);

    // ═══════════════════════════════════════
    // PHASE 3: DETECT STRUCTURE
    // ═══════════════════════════════════════
    let structure: { units: Array<{ name: string; lessons: Array<{ title: string; content: string }> }> };

    if (preAnalyzed) {
      // ✅ PRE-ANALYZED: Parse markdown headers directly — NO AI needed
      console.log('[CurriculumUpload] Pre-analyzed mode — parsing markdown structure...');
      structure = parsePreAnalyzedMarkdown(extractedText);
      
      if (structure.units.length === 0) {
        return NextResponse.json({ error: 'لم يتم العثور على هيكل واضح. استخدم تنسيق:\n# اسم الباب\n## اسم الدرس\nمحتوى الدرس...' }, { status: 400 });
      }
      
      console.log(`[CurriculumUpload] Parsed: ${structure.units.length} units, ${structure.units.reduce((s, u) => s + u.lessons.length, 0)} lessons`);
    } else {
      // 🤖 AI MODE: Claude analyzes structure
      const structureText = extractedText.slice(0, MAX_TEXT_FOR_STRUCTURE);

      const structurePrompt = `أنت محلل محتوى تعليمي متخصص في مناهج الثانوية العامة المصرية.

لديك نص مستخرج من كتاب منهج دراسي. مطلوب منك:
1. تحليل هيكل الكتاب وتقسيمه إلى أبواب (units) ودروس (lessons)
2. لكل درس، استخرج المحتوى الكامل كما هو من النص

قواعد مهمة:
- إذا كان الكتاب مقسم لأبواب/وحدات واضحة، استخدم نفس التقسيم
- إذا لم يكن هناك أبواب واضحة، قسّم حسب المواضيع الرئيسية
- كل درس يجب أن يحتوي على محتوى كافٍ (ليس فهرس أو عنوان فقط)
- المحتوى يكون كاملاً ودقيقاً كما في النص الأصلي
- لا تضف معلومات من عندك — فقط المحتوى الموجود في النص

⚠️ أرجع JSON فقط بدون أي نص أو شرح قبله أو بعده:
{
  "units": [
    {
      "name": "اسم الباب/الوحدة",
      "lessons": [
        {
          "title": "عنوان الدرس",
          "content": "المحتوى الكامل للدرس من النص الأصلي..."
        }
      ]
    }
  ]
}

النص:
${structureText}`;

      const structureResult = await callClaude(apiKey, aiModel, structurePrompt, 16000);
      if (!structureResult.success || !structureResult.text) {
        return NextResponse.json({ error: `فشل في تحليل هيكل المنهج: ${structureResult.error}` }, { status: 500 });
      }

      try {
        let jsonText = structureResult.text.trim();
        jsonText = jsonText.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '');
        const match = jsonText.match(/\{[\s\S]*\}/);
        if (match) {
          structure = JSON.parse(match[0]);
        } else {
          throw new Error('No JSON found');
        }
        if (!structure.units || !Array.isArray(structure.units) || structure.units.length === 0) {
          throw new Error('No units detected');
        }
      } catch (parseErr: any) {
        return NextResponse.json({ error: 'فشل في تحليل هيكل المنهج — جرب ملف أصغر أو بصيغة مختلفة' }, { status: 500 });
      }
    }

    const totalUnits = structure.units.length;
    const totalLessons = structure.units.reduce((sum, u) => sum + u.lessons.length, 0);
    console.log(`[CurriculumUpload] Structure: ${totalUnits} units, ${totalLessons} lessons`);

    // ═══════════════════════════════════════
    // PHASE 4: CREATE UNITS + LESSONS IN DB
    // ═══════════════════════════════════════
    const createdData: Array<{ unitName: string; lessons: Array<{ id: string; title: string; content: string }> }> = [];
    let lessonCounter = 0;

    for (let ui = 0; ui < structure.units.length; ui++) {
      const unit = structure.units[ui];

      const { data: unitResult, error: unitError } = await supabase.rpc('admin_create_unit', {
        p_subject_id: subjectId,
        p_name_ar: unit.name,
        p_sort_order: ui + 1,
      });

      if (unitError) {
        console.error(`[CurriculumUpload] Unit create error:`, unitError.message);
        continue;
      }

      const unitId = typeof unitResult === 'string' ? unitResult : (unitResult?.id || unitResult);
      if (!unitId) continue;

      const unitData: { unitName: string; lessons: Array<{ id: string; title: string; content: string }> } = {
        unitName: unit.name,
        lessons: [],
      };

      for (let li = 0; li < unit.lessons.length; li++) {
        const lesson = unit.lessons[li];
        lessonCounter++;

        const { data: lessonResult, error: lessonError } = await supabase.rpc('admin_create_lesson', {
          p_admin_id: adminId,
          p_subject_id: subjectId,
          p_title_ar: lesson.title,
          p_sort_order: lessonCounter,
        });

        if (lessonError || !lessonResult?.id) {
          console.error(`[CurriculumUpload] Lesson create error:`, lessonError?.message);
          continue;
        }

        const lessonId = lessonResult.id;

        await supabase.rpc('admin_assign_lesson_to_unit', {
          p_lesson_id: lessonId,
          p_unit_id: unitId,
        });

        unitData.lessons.push({ id: lessonId, title: lesson.title, content: lesson.content || '' });
      }

      createdData.push(unitData);
    }

    const totalCreatedLessons = createdData.reduce((sum, u) => sum + u.lessons.length, 0);
    console.log(`[CurriculumUpload] Created: ${createdData.length} units, ${totalCreatedLessons} lessons`);

    // ═══════════════════════════════════════
    // PHASE 5: SAVE SUMMARIES + GENERATE QUESTIONS
    // ═══════════════════════════════════════
    let totalQuestions = 0;
    let summariesGenerated = 0;

    for (const unitData of createdData) {
      for (const lesson of unitData.lessons) {
        if (!lesson.content || lesson.content.length < 30) continue;

        if (preAnalyzed) {
          // ✅ PRE-ANALYZED: Save content directly as summary — NO AI
          const { error: summErr } = await supabase.rpc('save_generated_summary', {
            p_lesson_id: lesson.id,
            p_content: lesson.content,
          });
          if (!summErr) summariesGenerated++;
        } else {
          // 🤖 AI MODE: Generate summary from raw content
          const summaryPrompt = `أنت معلم خبير في مواد الثانوية العامة المصرية. اكتب ملخصاً شاملاً ومنظماً باللغة العربية.\n\nاستخدم Markdown:\n- # للعنوان الرئيسي\n- ## للأقسام (سيتم عرضها كـ tabs)\n- ### للعناوين الفرعية\n- نقاط وأرقام\n- **تمييز** للمفاهيم\n- > اقتباسات للتعريفات\n- جداول عند الحاجة\n\nقسّم الملخص إلى:\n- مقدمة ونظرة عامة\n- شرح المفاهيم\n- أمثلة عملية\n- نقاط مهمة للحفظ\n\nالمحتوى:\n${lesson.content.slice(0, 80000)}`;

          const summaryResult = await callClaude(apiKey, aiModel, summaryPrompt, 4000);
          if (summaryResult.success && summaryResult.text) {
            const { error: summErr } = await supabase.rpc('save_generated_summary', {
              p_lesson_id: lesson.id,
              p_content: summaryResult.text,
            });
            if (!summErr) summariesGenerated++;
          }
        }

        // Generate Questions (optional — controlled by generateQuestions flag)
        if (generateQuestions && apiKey) {
          const questionText = lesson.content.slice(0, MAX_TEXT_FOR_QUESTIONS);
          const roundDefs = [
            { instruction: `أنشئ ${QUESTIONS_PER_ROUND} سؤال: تذكر + فهم + تطبيق.\n60% اختيار من متعدد، 25% صح/غلط، 15% مقالي.\n40% سهل، 40% متوسط، 20% صعب.` },
            { instruction: `أنشئ ${QUESTIONS_PER_ROUND} سؤال: تحليل + أنماط امتحانات ثانوية عامة.\n60% اختيار من متعدد، 25% صح/غلط، 15% مقالي.\n20% سهل، 40% متوسط، 40% صعب.` },
          ];

          for (const round of roundDefs) {
            const qPrompt = `أنت خبير أسئلة امتحانات الثانوية العامة المصرية.\n\n${round.instruction}\n\nالمحتوى:\n${questionText}\n\n⚠️ JSON array فقط:\n{"question_ar": "...", "type": "mcq", "options": ["أ","ب","ج","د"], "correct_answer": 0, "explanation_ar": "...", "difficulty": "medium"}\ntype: "mcq" / "true_false" (["صح","غلط"]) / "essay" ([])\n\nJSON:`;

            const qResult = await callClaude(apiKey, aiModel, qPrompt, 16000);
            if (qResult.success && qResult.text) {
              const parsed = parseQuestionsJSON(qResult.text);
              if (parsed.length > 0) {
                const questionsForDB = parsed.map(q => ({
                  question_ar: q.question_ar || '',
                  type: q.type || 'mcq',
                  options: Array.isArray(q.options) ? q.options : ['أ','ب','ج','د'],
                  correct_answer: typeof q.correct_answer === 'number' ? q.correct_answer : 0,
                  explanation_ar: q.explanation_ar || '',
                  difficulty: q.difficulty || 'medium',
                }));

                const { data: saveResult, error: saveError } = await supabase.rpc('save_generated_questions', {
                  p_lesson_id: lesson.id,
                  p_subject_id: subjectId,
                  p_questions: questionsForDB,
                });
                if (!saveError) totalQuestions += (saveResult?.inserted || parsed.length);
              }
            }
          }
        }
      }
    }

    // ═══════════════════════════════════════
    // PHASE 6: DONE
    // ═══════════════════════════════════════
    const mode = preAnalyzed ? 'محلل مسبقاً ✅' : 'تحليل AI 🤖';
    console.log(`[CurriculumUpload] DONE (${mode}) — ${createdData.length} units, ${totalCreatedLessons} lessons, ${summariesGenerated} summaries, ${totalQuestions} questions`);

    return NextResponse.json({
      success: true,
      message: preAnalyzed 
        ? `تم رفع المنهج المحلل مسبقاً بنجاح من ${processedFiles.length} ملف!`
        : `تم تقسيم المنهج بنجاح من ${processedFiles.length} ملف!`,
      mode: preAnalyzed ? 'pre-analyzed' : 'ai',
      filesProcessed: processedFiles.length,
      filesFailed: failedFiles.length,
      processedFileNames: processedFiles,
      failedFileNames: failedFiles,
      units: createdData.length,
      lessons: totalCreatedLessons,
      summaries: summariesGenerated,
      questions: totalQuestions,
      structure: createdData.map(u => ({
        unit: u.unitName,
        lessons: u.lessons.map(l => l.title),
      })),
    });

  } catch (err: any) {
    console.error('[CurriculumUpload] FATAL:', err);
    return NextResponse.json({ error: `خطأ: ${err.message?.slice(0, 200)}` }, { status: 500 });
  }
}

// ═══════════════════════════════════════
// QUESTIONS JSON PARSER
// ═══════════════════════════════════════
function parseQuestionsJSON(text: string): any[] {
  try { const d = JSON.parse(text.trim()); if (Array.isArray(d)) return d; } catch {}
  try {
    const cleaned = text.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '');
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) { const p = JSON.parse(match[0]); if (Array.isArray(p)) return p; }
  } catch {}
  try {
    const objects: any[] = [];
    const regex = /\{[^{}]*"question_ar"[^{}]*\}/g;
    let m;
    while ((m = regex.exec(text)) !== null) { try { objects.push(JSON.parse(m[0])); } catch {} }
    if (objects.length > 0) return objects;
  } catch {}
  return [];
}

// ═══════════════════════════════════════
// CLAUDE API CALL — FIXED: PDF uses 'document' type
// ═══════════════════════════════════════
async function callClaude(
  apiKey: string, model: string, prompt: string, maxTokens: number,
  imageData?: { base64: string; mimeType: string }
): Promise<{ success: boolean; text?: string; error?: string }> {
  try {
    const content: any[] = [];
    const isPdf = imageData?.mimeType === 'application/pdf';
    
    if (imageData) {
      if (isPdf) {
        // ✅ PDF — use 'document' type (Anthropic PDF support)
        content.push({ 
          type: 'document', 
          source: { 
            type: 'base64', 
            media_type: 'application/pdf', 
            data: imageData.base64 
          } 
        });
      } else {
        // 🖼️ Image — use 'image' type
        content.push({ 
          type: 'image', 
          source: { 
            type: 'base64', 
            media_type: imageData.mimeType, 
            data: imageData.base64 
          } 
        });
      }
    }
    content.push({ type: 'text', text: prompt });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 300000);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    };
    
    // Add PDF beta header if needed
    if (isPdf) {
      headers['anthropic-beta'] = 'pdfs-2024-09-25';
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'user', content }] }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[Claude] ${res.status}:`, errBody.slice(0, 500));
      return { success: false, error: `خطأ Claude: ${res.status} — ${errBody.slice(0, 200)}` };
    }

    const data = await res.json();
    return { success: true, text: data.content?.[0]?.text || '' };
  } catch (err: any) {
    if (err.name === 'AbortError') return { success: false, error: 'انتهت المهلة (5 دقائق)' };
    return { success: false, error: err.message };
  }
}

// ═══════════════════════════════════════
// TEXT EXTRACTION FUNCTIONS
// ═══════════════════════════════════════
async function extractFromWord(buffer: Buffer): Promise<string> {
  const mammoth = require('mammoth');
  const result = await mammoth.extractRawText({ buffer });
  return result.value || '';
}

async function extractFromExcel(buffer: Buffer): Promise<string> {
  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  let text = '';
  workbook.eachSheet((sheet: any) => {
    text += `\n\n=== ${sheet.name} ===\n`;
    sheet.eachRow((row: any) => {
      const values = row.values as any[];
      if (values) {
        const rowText = values.slice(1).filter(Boolean).map((v: any) => typeof v === 'object' && v.text ? v.text : String(v)).join(' | ');
        if (rowText.trim()) text += rowText + '\n';
      }
    });
  });
  return text;
}

async function extractFromPowerPoint(buffer: Buffer): Promise<string> {
  const AdmZip = require('adm-zip');
  const zip = new AdmZip(buffer);
  let text = '';
  const entries = zip.getEntries();
  const slideEntries = entries
    .filter((e: any) => e.entryName.match(/ppt\/slides\/slide\d+\.xml/))
    .sort((a: any, b: any) => parseInt(a.entryName.match(/slide(\d+)/)?.[1] || '0') - parseInt(b.entryName.match(/slide(\d+)/)?.[1] || '0'));
  for (const entry of slideEntries) {
    const xml = entry.getData().toString('utf8');
    const textMatches = xml.match(/<a:t>([^<]*)<\/a:t>/g);
    if (textMatches) text += '\n\n' + textMatches.map((m: string) => m.replace(/<\/?a:t>/g, '')).join(' ');
  }
  return text;
}

async function extractFromText(buffer: Buffer, fileName: string): Promise<string> {
  const ext = fileName.toLowerCase().split('.').pop();
  if (ext === 'csv') return buffer.toString('utf-8').split('\n').map(r => r.replace(/,/g, ' | ')).join('\n');
  return buffer.toString('utf-8');
}

async function extractFromPdf(fileBuffer: Buffer, apiKey: string, aiModel: string): Promise<string> {
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

  let allText = '';
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    try {
      const chunkPdf = await PDFDocument.create();
      const pageIndices = Array.from({ length: chunk.endPage - chunk.startPage }, (_, j) => chunk.startPage + j);
      const pages = await chunkPdf.copyPages(pdfDoc, pageIndices);
      pages.forEach(p => chunkPdf.addPage(p));
      const chunkBytes = await chunkPdf.save();
      const chunkBase64 = Buffer.from(chunkBytes).toString('base64');
      if (chunkBase64.length > MAX_CHUNK_BYTES * 1.33) continue;

      const ocrResult = await callClaude(apiKey, aiModel,
        'استخرج كل النص الموجود في هذه الصفحات. أرجع النص فقط بدون تعليقات.',
        4000,
        { base64: chunkBase64, mimeType: 'application/pdf' }
      );
      if (ocrResult.success && ocrResult.text) allText += ocrResult.text + '\n\n';
    } catch (chunkErr: any) {
      console.warn(`[PDF] Chunk ${i + 1} error:`, chunkErr.message);
    }
  }
  return allText;
}

async function extractFromImage(fileBuffer: Buffer, mimeType: string, apiKey: string, aiModel: string): Promise<string> {
  const base64 = fileBuffer.toString('base64');
  const mediaType = mimeType.startsWith('image/') ? mimeType : 'image/png';
  const result = await callClaude(apiKey, aiModel,
    'استخرج كل النص الموجود في هذه الصورة. أرجع النص فقط.',
    4000,
    { base64, mimeType: mediaType }
  );
  if (!result.success) throw new Error(result.error || 'فشل OCR');
  return result.text || '';
}

export const maxDuration = 600;
