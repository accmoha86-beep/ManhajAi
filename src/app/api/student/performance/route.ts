import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';

async function getUserFromRequest(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback');
    const { payload } = await jwtVerify(token, secret);
    return payload.userId as string;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'غير مسجل دخول' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase.rpc('get_student_performance', {
      p_user_id: userId
    });

    if (error) {
      console.error('Performance error:', error);
      return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
    }

    return NextResponse.json({ success: true, performance: data });
  } catch (error) {
    console.error('Performance error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
