import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    
    // Try new units-based RPC first, fallback to old
    const { data, error } = await supabase.rpc('get_subject_with_units', { p_subject_id: id });
    
    if (error) {
      // Fallback to old RPC if units one doesn't exist
      const { data: oldData, error: oldError } = await supabase.rpc('get_subject_with_lessons', { p_subject_id: id });
      if (oldError || oldData?.error) {
        return NextResponse.json({ error: oldData?.error || 'المادة غير موجودة' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: oldData });
    }
    
    if (data?.error) {
      return NextResponse.json({ error: data.error }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[Subject] Error:', error);
    return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}
