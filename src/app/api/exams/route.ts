import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: 401 });
    
    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subject_id');
    const lessonId = searchParams.get('lesson_id');
    const count = parseInt(searchParams.get('count') || '20');
    const action = searchParams.get('action') || 'questions';
    
    const supabase = await createServerSupabaseClient();
    
    if (action === 'history') {
      const { data, error } = await supabase.rpc('get_exam_history', { 
        p_user_id: authResult.data.id, p_limit: 20 
      });
      if (error) return NextResponse.json({ error: 'فشل في جلب السجل' }, { status: 500 });
      return NextResponse.json({ success: true, history: data });
    }
    
    if (!subjectId) return NextResponse.json({ error: 'المادة مطلوبة' }, { status: 400 });
    
    const { data, error } = await supabase.rpc('get_exam_questions', {
      p_subject_id: subjectId,
      p_lesson_id: lessonId || null,
      p_count: count
    });
    if (error) return NextResponse.json({ error: 'فشل في جلب الأسئلة' }, { status: 500 });
    return NextResponse.json({ success: true, questions: data });
  } catch (error) {
    console.error('[Exams GET] Error:', error);
    return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: 401 });
    
    const body = await request.json();
    const { subject_id, lesson_id, answers, time_taken } = body;
    
    if (!subject_id || !answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'بيانات غير كاملة' }, { status: 400 });
    }
    
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc('submit_exam', {
      p_user_id: authResult.data.id,
      p_subject_id: subject_id,
      p_lesson_id: lesson_id || null,
      p_answers: answers,
      p_time_taken: time_taken || 0
    });
    
    if (error || data?.error) {
      return NextResponse.json({ error: data?.error || 'فشل في تقديم الامتحان' }, { status: 500 });
    }
    return NextResponse.json({ success: true, result: data });
  } catch (error) {
    console.error('[Exams POST] Error:', error);
    return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}
