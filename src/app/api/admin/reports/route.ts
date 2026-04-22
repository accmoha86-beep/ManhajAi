import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { getAuthUser } from '@/lib/auth';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';

export async function GET(request: NextRequest) {
  const authResult = await getAuthUser(request);
  if (!authResult.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createServerSupabaseClient();

  // Check admin
  const { data: adminCheck } = await supabase.rpc('is_admin', { p_user_id: authResult.data.id });
  if (!adminCheck) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Manhaj AI';

  // Sheet 1: Students
  const sheet1 = workbook.addWorksheet('الطلاب');
  sheet1.views = [{ rightToLeft: true }];
  sheet1.columns = [
    { header: 'الاسم', key: 'name', width: 25 },
    { header: 'الهاتف', key: 'phone', width: 15 },
    { header: 'المحافظة', key: 'gov', width: 15 },
    { header: 'تاريخ التسجيل', key: 'created', width: 18 },
    { header: 'الحالة', key: 'status', width: 12 },
    { header: 'آخر دخول', key: 'last_login', width: 18 },
  ];

  const { data: students } = await supabase.from('users').select('*').eq('role', 'student').order('created_at', { ascending: false });
  (students || []).forEach((s: any) => {
    sheet1.addRow({
      name: s.full_name,
      phone: s.phone,
      gov: s.governorate,
      created: s.created_at ? new Date(s.created_at).toLocaleDateString('ar-EG') : '-',
      status: s.is_banned ? 'محظور' : s.is_verified ? 'مفعّل' : 'غير مفعّل',
      last_login: s.last_login_at ? new Date(s.last_login_at).toLocaleDateString('ar-EG') : '-',
    });
  });
  sheet1.getRow(1).font = { bold: true, size: 12, color: { argb: 'FFFFFF' } };
  sheet1.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } };

  // Sheet 2: Financial Summary
  const sheet2 = workbook.addWorksheet('الملخص المالي');
  sheet2.views = [{ rightToLeft: true }];
  sheet2.columns = [
    { header: 'الفترة', key: 'period', width: 15 },
    { header: 'عدد الاشتراكات', key: 'subs', width: 18 },
    { header: 'الإيرادات (ج.م)', key: 'revenue', width: 18 },
    { header: 'صافي الربح', key: 'net', width: 18 },
  ];
  const { data: payments } = await supabase.from('payments').select('*').eq('status', 'completed');
  const totalRevenue = (payments || []).reduce((sum: number, p: any) => sum + (p.amount_egp || 0), 0);
  sheet2.addRow({ period: 'إجمالي', subs: (payments || []).length, revenue: totalRevenue, net: Math.round(totalRevenue * 0.85) });
  sheet2.getRow(1).font = { bold: true, size: 12, color: { argb: 'FFFFFF' } };
  sheet2.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '10B981' } };

  // Sheet 3: Subject Analysis
  const sheet3 = workbook.addWorksheet('تحليل المواد');
  sheet3.views = [{ rightToLeft: true }];
  sheet3.columns = [
    { header: 'المادة', key: 'subject', width: 20 },
    { header: 'عدد الامتحانات', key: 'exams', width: 15 },
    { header: 'متوسط الدرجات', key: 'avg', width: 15 },
  ];
  const { data: subjects } = await supabase.from('subjects').select('id, name_ar').eq('is_published', true);
  for (const sub of (subjects || [])) {
    const { data: exams } = await supabase.from('exam_results').select('score_percent').eq('subject_id', sub.id);
    const avg = (exams || []).length > 0 ? Math.round((exams || []).reduce((s: number, e: any) => s + (e.score_percent || 0), 0) / (exams || []).length) : 0;
    sheet3.addRow({ subject: sub.name_ar, exams: (exams || []).length, avg: `${avg}%` });
  }
  sheet3.getRow(1).font = { bold: true, size: 12, color: { argb: 'FFFFFF' } };
  sheet3.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F59E0B' } };

  // Sheet 4: At-risk students (no activity in 7+ days)
  const sheet4 = workbook.addWorksheet('طلاب معرضين للخطر');
  sheet4.views = [{ rightToLeft: true }];
  sheet4.columns = [
    { header: 'الاسم', key: 'name', width: 25 },
    { header: 'الهاتف', key: 'phone', width: 15 },
    { header: 'آخر نشاط', key: 'last', width: 18 },
    { header: 'أيام الغياب', key: 'days', width: 12 },
  ];
  const now = new Date();
  (students || []).forEach((s: any) => {
    const lastDate = s.last_login_at ? new Date(s.last_login_at) : new Date(s.created_at);
    const daysSince = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince >= 7) {
      sheet4.addRow({
        name: s.full_name,
        phone: s.phone,
        last: lastDate.toLocaleDateString('ar-EG'),
        days: daysSince,
      });
    }
  });
  sheet4.getRow(1).font = { bold: true, size: 12, color: { argb: 'FFFFFF' } };
  sheet4.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EF4444' } };

  // Sheet 5: Most profitable students
  const sheet5 = workbook.addWorksheet('أكثر الطلاب ربحية');
  sheet5.views = [{ rightToLeft: true }];
  sheet5.columns = [
    { header: 'الاسم', key: 'name', width: 25 },
    { header: 'إجمالي المدفوعات', key: 'total', width: 18 },
    { header: 'عدد المعاملات', key: 'count', width: 15 },
  ];
  // Group payments by user
  const paymentsByUser: Record<string, { total: number; count: number; name: string }> = {};
  (payments || []).forEach((p: any) => {
    if (!paymentsByUser[p.user_id]) paymentsByUser[p.user_id] = { total: 0, count: 0, name: '' };
    paymentsByUser[p.user_id].total += p.amount_egp || 0;
    paymentsByUser[p.user_id].count += 1;
  });
  // Get names
  for (const uid of Object.keys(paymentsByUser)) {
    const student = (students || []).find((s: any) => s.id === uid);
    if (student) paymentsByUser[uid].name = student.full_name;
  }
  Object.values(paymentsByUser)
    .sort((a, b) => b.total - a.total)
    .slice(0, 20)
    .forEach((entry) => {
      sheet5.addRow({ name: entry.name || '-', total: `${entry.total} ج.م`, count: entry.count });
    });
  sheet5.getRow(1).font = { bold: true, size: 12, color: { argb: 'FFFFFF' } };
  sheet5.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '8B5CF6' } };

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="manhaj-ai-report-${new Date().toISOString().split('T')[0]}.xlsx"`,
    },
  });
}
