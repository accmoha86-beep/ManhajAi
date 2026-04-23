import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';

export async function GET(request: NextRequest) {
  try {
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
    if (payload.role !== 'admin') return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

    const supabase = await createServerSupabaseClient();
    
    const [studentsRes, subsRes, paymentsRes, examsRes] = await Promise.all([
      supabase.from('users').select('*').eq('role', 'student'),
      supabase.from('subscriptions').select('*'),
      supabase.from('payments').select('*'),
      supabase.from('exam_results').select('*, subjects(name_ar)'),
    ]);

    // Build CSV (simpler than ExcelJS for now, compatible everywhere)
    const students = studentsRes.data || [];
    const payments = (paymentsRes.data || []);
    
    let csv = '\uFEFF'; // BOM for Arabic
    csv += 'الاسم,الهاتف,المحافظة,تاريخ التسجيل,آخر دخول,الحالة\n';
    students.forEach((s: any) => {
      csv += `"${s.full_name || ''}","${s.phone || ''}","${s.governorate || ''}","${s.created_at?.slice(0,10) || ''}","${s.last_login_at?.slice(0,10) || ''}","${s.is_banned ? 'محظور' : 'نشط'}"\n`;
    });
    
    csv += '\n\nالمدفوعات\n';
    csv += 'المبلغ,طريقة الدفع,الحالة,التاريخ\n';
    payments.forEach((p: any) => {
      csv += `${p.amount_egp || 0},"${p.payment_method || ''}","${p.status || ''}","${p.created_at?.slice(0,10) || ''}"\n`;
    });

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="manhaj-report-${new Date().toISOString().slice(0,10)}.csv"`,
      },
    });
  } catch (error) {
    console.error('[Export] Error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
