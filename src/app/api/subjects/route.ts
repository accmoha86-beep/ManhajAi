import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc('get_published_subjects');
    if (error) {
      console.error('[Subjects] RPC error:', error);
      return NextResponse.json({ error: 'فشل في جلب المواد' }, { status: 500 });
    }
    return NextResponse.json({ success: true, subjects: data });
  } catch (error) {
    console.error('[Subjects] Error:', error);
    return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}
