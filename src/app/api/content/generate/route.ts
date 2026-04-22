// app/api/content/generate/route.ts — Admin: Generate content from PDF (Fixed column names + batch generation)
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';
import { validatePdfUpload } from '@/domain/content';
import { generateSummary, generateFullQuestionBank } from '@/infrastructure/claude/client';
import { getAuthUser } from '@/lib/auth';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    // Authenticate admin user
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

    if (!file) {
      return NextResponse.json({ error: 'لم يتم رفع أي ملف' }, { status: 400 });
    }

    if (!lessonId) {
      return NextResponse.json({ error: 'معرف الدرس مطلوب' }, { status: 400 });
    }

    // Validate PDF
    const validateResult = validatePdfUpload({ size: file.size, type: file.type });
    if (!validateResult.ok) {
      return NextResponse.json({ error: validateResult.error }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Fetch lesson info — uses title_ar column
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('id, title_ar, subject_id')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json({ error: 'الدرس غير موجود' }, { status: 404 });
    }

    // Upload PDF to Supabase Storage
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileName = `lessons/${lessonId}/${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from('content')
      .upload(fileName, fileBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('[ContentGenerate] Upload failed:', uploadError);
      return NextResponse.json({ error: 'فشل في رفع الملف' }, { status: 500 });
    }

    // Extract text from PDF
    let pdfText: string;
    try {
      const pdfParse = (await import('pdf-parse')).default;
      const pdfData = await pdfParse(fileBuffer);
      pdfText = pdfData.text;
    } catch (parseError) {
      console.error('[ContentGenerate] PDF parse failed:', parseError);
      return NextResponse.json({ error: 'فشل في قراءة ملف الـ PDF' }, { status: 400 });
    }

    if (!pdfText || pdfText.trim().length < 100) {
      return NextResponse.json(
        { error: 'محتوى الـ PDF قصير جدًا أو غير قابل للقراءة' },
        { status: 400 }
      );
    }

    const lessonTitle = lesson.title_ar;

    // Step 1: Generate summary from PDF text
    const summaryResult = await generateSummary(lessonTitle, pdfText);
    if (!summaryResult.ok) {
      return NextResponse.json({ error: summaryResult.error }, { status: 500 });
    }
    const summary = summaryResult.data;

    // Step 2: Generate 200+ questions using batch system
    const questionsResult = await generateFullQuestionBank(lessonTitle, pdfText, 5);
    if (!questionsResult.ok) {
      return NextResponse.json({ error: questionsResult.error }, { status: 500 });
    }
    const questions = questionsResult.data;

    // Save summary to DB — uses `summaries` table with `content_ar` column
    const { error: summaryDbError } = await supabase
      .from('summaries')
      .upsert(
        {
          lesson_id: lessonId,
          content_ar: summary,
          source_pdf_url: fileName,
          is_published: true,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'lesson_id' }
      );

    if (summaryDbError) {
      console.error('[ContentGenerate] Save summary failed:', summaryDbError);
    }

    // Save questions to DB in batches of 50 — uses correct column names
    const BATCH_SIZE = 50;
    let insertedCount = 0;

    for (let i = 0; i < questions.length; i += BATCH_SIZE) {
      const batch = questions.slice(i, i + BATCH_SIZE).map((q) => ({
        lesson_id: lessonId,
        subject_id: lesson.subject_id,
        question_ar: q.question_ar,
        type: q.type,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation_ar: q.explanation_ar,
        difficulty: q.difficulty || 'medium',
        is_published: true,
        created_at: new Date().toISOString(),
      }));

      const { error: batchError } = await supabase.from('questions').insert(batch);

      if (batchError) {
        console.error(`[ContentGenerate] Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, batchError);
      } else {
        insertedCount += batch.length;
      }
    }

    // Update lesson source_pdf_url and status
    await supabase
      .from('lessons')
      .update({
        source_pdf_url: fileName,
        has_summary: true,
        has_questions: true,
        content_generated_at: new Date().toISOString(),
      })
      .eq('id', lessonId);

    return NextResponse.json({
      message: 'تم إنشاء المحتوى بنجاح',
      summary: {
        sectionsCount: (summary as Record<string, unknown>)?.sections
          ? (
              (summary as Record<string, unknown>).sections as unknown[]
            ).length
          : 0,
      },
      questions: {
        total: insertedCount,
        generated: questions.length,
        mcq: questions.filter((q) => q.type === 'mcq').length,
        trueFalse: questions.filter((q) => q.type === 'true_false').length,
        essay: questions.filter((q) => q.type === 'essay').length,
      },
    });
  } catch (error) {
    console.error('[ContentGenerate] Unexpected error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى' },
      { status: 500 }
    );
  }
}
