import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc('get_subject_with_lessons', { p_subject_id: id });
    if (error || data?.error) {
      return NextResponse.json({ error: data?.error || 'المادة غير موجودة' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[Subject] Error:', error);
    return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}
