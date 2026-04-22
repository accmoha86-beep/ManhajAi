import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; lessonId: string }> }) {
  try {
    const { lessonId } = await params;
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc('get_lesson_content', { p_lesson_id: lessonId });
    if (error || data?.error) {
      return NextResponse.json({ error: data?.error || 'الدرس غير موجود' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[Lesson] Error:', error);
    return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}
