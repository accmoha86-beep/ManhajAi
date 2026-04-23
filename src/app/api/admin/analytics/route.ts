import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    
    let payload: any;
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret');
      const result = await jwtVerify(token, secret);
      payload = result.payload;
    } catch {
      return NextResponse.json({ error: 'جلسة منتهية' }, { status: 401 });
    }
    
    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    const supabase = await createServerSupabaseClient();
    
    // Use RPC function (SECURITY DEFINER — bypasses RLS)
    const { data, error } = await supabase.rpc('admin_analytics', {
      p_admin_id: payload.userId,
    });

    if (error) {
      console.error('[Analytics] RPC error:', error);
      return NextResponse.json({ error: 'خطأ في جلب البيانات' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error('[Analytics] Error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
