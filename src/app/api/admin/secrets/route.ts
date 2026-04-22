import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { clearSecretsCache } from '@/lib/secrets';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('list_system_secrets');
    if (error) throw error;
    return NextResponse.json({ secrets: data });
  } catch (error) {
    console.error('List secrets error:', error);
    return NextResponse.json({ error: 'فشل في جلب الإعدادات' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { key, value, description } = await request.json();
    if (!key || value === undefined) {
      return NextResponse.json({ error: 'المفتاح والقيمة مطلوبين' }, { status: 400 });
    }
    const { error } = await supabase.rpc('set_system_secret', {
      p_key: key, p_value: value, p_description: description || null,
    });
    if (error) throw error;
    clearSecretsCache();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Set secret error:', error);
    return NextResponse.json({ error: 'فشل في حفظ الإعداد' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { key } = await request.json();
    if (!key) {
      return NextResponse.json({ error: 'المفتاح مطلوب' }, { status: 400 });
    }
    const { error } = await supabase.rpc('delete_system_secret', { p_key: key });
    if (error) throw error;
    clearSecretsCache();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete secret error:', error);
    return NextResponse.json({ error: 'فشل في حذف الإعداد' }, { status: 500 });
  }
}
