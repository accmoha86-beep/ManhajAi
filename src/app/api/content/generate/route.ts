// app/api/content/generate/route.ts — Admin: Generate content from PDF
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';
import { validatePdfUpload } from '@/domain/content';
import { generateSummary, generateQuestions } from '@/infrastructure/claude/client';
import { getAuthUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Authenticate admin user
    const authResult = await getAuthUser(request);
    if (!authResult.ok) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }
    const user = authResult.data;

    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'غير مصرح لك بهذا الإجراء' },
        { status: 403 }
      );
    }

    // Parse FormData
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const lessonId = formData.get('lessonId') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'لم يتم رفع أي ملف' },
        { status: 400 }
      );
    }

    if (!lessonId) {
      return NextResponse.json(
        { error: 'معرف الدرس مطلوب' },
        { status: 400 }
      );
    }

    // Validate PDF
    const validateResult = validatePdfUpload({
      size: file.size,
      type: file.type,
    });
    if (!validateResult.ok) {
      return NextResponse.json(
        { error: validateResult.error },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Fetch lesson info
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('id, title, subject_id')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json(
        { error: 'الدرس غير موجود' },
        { status: 404 }
      );
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
      return NextResponse.json(
        { error: 'فشل في رفع الملف' },
        { status: 500 }
      );
    }

    // Extract text from PDF using pdf-parse (server-side)
    let pdfText: string;
    try {
      const pdfParse = (await import('pdf-parse')).default;
      const pdfData = await pdfParse(fileBuffer);
      pdfText = pdfData.text;
    } catch (parseError) {
      console.error('[ContentGenerate] PDF parse failed:', parseError);
      return NextResponse.json(
        { error: 'فشل في قراءة ملف الـ PDF' },
        { status: 400 }
      );
    }

    if (!pdfText || pdfText.trim().length < 100) {
      return NextResponse.json(
        { error: 'محتوى الـ PDF قصير جدًا أو غير قابل للقراءة' },
        { status: 400 }
      );
    }

    // Step 1: Generate summary from PDF text
    const summaryResult = await generateSummary(lesson.title, pdfText);
    if (!summaryResult.ok) {
      return NextResponse.json(
        { error: summaryResult.error },
        { status: 500 }
      );
    }
    const summary = summaryResult.data;

    // Step 2: Generate questions from summary
    const questionsResult = await generateQuestions(lesson.title, summary);
    if (!questionsResult.ok) {
      return NextResponse.json(
        { error: questionsResult.error },
        { status: 500 }
      );
    }
    const questions = questionsResult.data;

    // Save summary to DB
    const { error: summaryDbError } = await supabase
      .from('lesson_summaries')
      .upsert(
        {
          lesson_id: lessonId,
          subject_id: lesson.subject_id,
          content: summary,
          pdf_url: fileName,
          generated_at: new Date().toISOString(),
          generated_by: user.id,
        },
        { onConflict: 'lesson_id' }
      );

    if (summaryDbError) {
      console.error('[ContentGenerate] Save summary failed:', summaryDbError);
    }

    // Save questions to DB
    const questionsToInsert = questions.map((q) => ({
      lesson_id: lessonId,
      subject_id: lesson.subject_id,
      question_text: q.question_text,
      type: q.type,
      options: q.options ?? null,
      correct_answer: q.correct_answer,
      explanation: q.explanation ?? null,
      difficulty: q.difficulty ?? 'medium',
      created_at: new Date().toISOString(),
      created_by: user.id,
    }));

    const { error: questionsDbError } = await supabase
      .from('questions')
      .insert(questionsToInsert);

    if (questionsDbError) {
      console.error(
        '[ContentGenerate] Save questions failed:',
        questionsDbError
      );
    }

    // Update lesson status
    await supabase
      .from('lessons')
      .update({
        has_summary: true,
        has_questions: true,
        content_generated_at: new Date().toISOString(),
      })
      .eq('id', lessonId);

    return NextResponse.json({
      message: 'تم إنشاء المحتوى بنجاح',
      summary: {
        sectionsCount: (summary as any)?.sections?.length ?? 0,
      },
      questions: {
        total: questions.length,
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
