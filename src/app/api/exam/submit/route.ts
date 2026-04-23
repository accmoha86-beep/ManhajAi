// Redirect to /api/exams POST — this is the legacy route
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const body = await request.json();
    const { subjectId, subject_id, lessonId, lesson_id, answers, time_taken } = body;
    
    const finalSubjectId = subjectId || subject_id;
    const finalLessonId = lessonId || lesson_id || null;
    
    if (!finalSubjectId || !answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'بيانات غير كاملة' }, { status: 400 });
    }

    // Normalize answers format
    const formattedAnswers = answers.map((a: any) => ({
      question_id: a.questionId || a.question_id,
      selected: a.selected || '',
    }));

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc('submit_exam', {
      p_user_id: authResult.data.id,
      p_subject_id: finalSubjectId,
      p_lesson_id: finalLessonId,
      p_answers: formattedAnswers,
      p_time_taken: time_taken || 0,
    });

    if (error || data?.error) {
      console.error('[ExamSubmit] RPC error:', error || data?.error);
      return NextResponse.json({ error: data?.error || 'فشل في تقديم الامتحان' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      result: data,
      examId: data?.result_id,
      pointsEarned: data?.points_earned,
    });
  } catch (error) {
    console.error('[ExamSubmit] Error:', error);
    return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}
