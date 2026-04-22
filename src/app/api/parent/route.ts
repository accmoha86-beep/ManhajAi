// app/api/parent/route.ts — Parent dashboard
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    const code = searchParams.get('code');

    if (!phone || !code) {
      return NextResponse.json({ error: 'رقم الهاتف وكود الوصول مطلوبان' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc('get_parent_dashboard', {
      p_phone: phone,
      p_access_code: code,
    });

    if (error) {
      console.error('[Parent] GET error:', error);
      return NextResponse.json({ error: 'فشل في جلب بيانات الطالب' }, { status: 500 });
    }

    if (!data || data.error) {
      return NextResponse.json({ error: data?.error || 'كود الوصول غير صحيح' }, { status: 401 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Parent] Unexpected error:', error);
    return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc('generate_parent_access', {
      p_user_id: authResult.data.id,
    });

    if (error) {
      console.error('[Parent] POST error:', error);
      return NextResponse.json({ error: 'فشل في إنشاء كود الوصول' }, { status: 500 });
    }

    return NextResponse.json({ success: true, access_code: data });
  } catch (error) {
    console.error('[Parent] Unexpected error:', error);
    return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}
