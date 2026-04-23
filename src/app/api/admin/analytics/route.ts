import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Auth check - same as admin/data
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
    
    // Gather analytics data with parallel queries
    const [
      studentsRes,
      subsRes, 
      paymentsRes,
      examsRes,
      subjectsRes,
      chatRes,
      recentStudentsRes,
    ] = await Promise.all([
      supabase.from('users').select('id, created_at, governorate, is_banned, last_login_at').eq('role', 'student'),
      supabase.from('subscriptions').select('id, status, plan_name, created_at, expires_at, amount_egp'),
      supabase.from('payments').select('id, amount_egp, payment_method, status, created_at'),
      supabase.from('exam_results').select('id, score, subject_id, created_at'),
      supabase.from('subjects').select('id, name_ar, is_published'),
      supabase.from('chat_messages').select('id, created_at, tokens_used'),
      supabase.from('users').select('id, created_at').eq('role', 'student').order('created_at', { ascending: false }).limit(30),
    ]);

    const students = studentsRes.data || [];
    const subs = subsRes.data || [];
    const payments = (paymentsRes.data || []).filter((p: any) => p.status === 'completed');
    const exams = examsRes.data || [];
    const subjects = subjectsRes.data || [];
    const chats = chatRes.data || [];
    
    // Calculate metrics
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    
    const totalRevenue = payments.reduce((sum: number, p: any) => sum + (p.amount_egp || 0), 0);
    const monthlyRevenue = payments
      .filter((p: any) => { const d = new Date(p.created_at); return d.getMonth() === thisMonth && d.getFullYear() === thisYear; })
      .reduce((sum: number, p: any) => sum + (p.amount_egp || 0), 0);
    
    const activeSubs = subs.filter((s: any) => s.status === 'active').length;
    const trialSubs = subs.filter((s: any) => s.status === 'trial').length;
    const expiredSubs = subs.filter((s: any) => s.status === 'expired').length;
    
    // Governorate distribution
    const govCounts: Record<string, number> = {};
    students.forEach((s: any) => { 
      const gov = s.governorate || 'غير محدد'; 
      govCounts[gov] = (govCounts[gov] || 0) + 1; 
    });
    const governorateData = Object.entries(govCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    
    // Monthly registrations (last 6 months)
    const monthlyRegs: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(thisYear, thisMonth - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyRegs[key] = 0;
    }
    students.forEach((s: any) => {
      const d = new Date(s.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyRegs[key] !== undefined) monthlyRegs[key]++;
    });
    
    // Subject popularity (by exam count)
    const subjectExamCounts: Record<string, number> = {};
    exams.forEach((e: any) => { subjectExamCounts[e.subject_id] = (subjectExamCounts[e.subject_id] || 0) + 1; });
    const subjectPopularity = subjects.map((s: any) => ({
      name: s.name_ar,
      exams: subjectExamCounts[s.id] || 0,
    })).sort((a: any, b: any) => b.exams - a.exams);
    
    // Average exam score
    const avgScore = exams.length > 0 
      ? Math.round(exams.reduce((sum: number, e: any) => sum + (e.score || 0), 0) / exams.length) 
      : 0;
    
    // AI chat usage
    const totalMessages = chats.length;
    const totalTokens = chats.reduce((sum: number, c: any) => sum + (c.tokens_used || 0), 0);
    
    // Payment method breakdown
    const paymentMethods: Record<string, { count: number; total: number }> = {};
    payments.forEach((p: any) => {
      const method = p.payment_method || 'unknown';
      if (!paymentMethods[method]) paymentMethods[method] = { count: 0, total: 0 };
      paymentMethods[method].count++;
      paymentMethods[method].total += p.amount_egp || 0;
    });

    // New students this week
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const newThisWeek = students.filter((s: any) => new Date(s.created_at) > weekAgo).length;

    // Churn risk (students not active in 14 days)
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const atRisk = students.filter((s: any) => s.last_login_at && new Date(s.last_login_at) < twoWeeksAgo).length;

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          total_students: students.length,
          active_subscriptions: activeSubs,
          trial_subscriptions: trialSubs,
          expired_subscriptions: expiredSubs,
          total_revenue: totalRevenue,
          monthly_revenue: monthlyRevenue,
          total_exams: exams.length,
          avg_score: avgScore,
          total_messages: totalMessages,
          total_tokens: totalTokens,
          new_this_week: newThisWeek,
          at_risk: atRisk,
        },
        governorate_distribution: governorateData,
        monthly_registrations: Object.entries(monthlyRegs).map(([month, count]) => ({ month, count })),
        subject_popularity: subjectPopularity,
        payment_methods: Object.entries(paymentMethods).map(([method, data]) => ({ method, ...data })),
      }
    });
  } catch (error) {
    console.error('[Analytics] Error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
